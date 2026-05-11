import prisma from '../config/db.js';
import { ok, created, getPagination, paginatedResponse } from '../utils/helpers.js';
import { AppError } from '../middleware/errorHandler.js';
import { auditLog } from '../middleware/requestLogger.js';
import { pushOrgNotification } from '../utils/notifications.js';

// GET /orders
const getOrders = async (req, res, next) => {
  try {
    const { page, limit, skip } = getPagination(req.query);
    const { status, priority, customerId, search, from, to } = req.query;

    const where = {
      organizationId: req.orgId,
      ...(status ? { status } : {}),
      ...(priority ? { priority } : {}),
      ...(customerId ? { customerId } : {}),
      ...(from || to ? { orderDate: { ...(from ? { gte: new Date(from) } : {}), ...(to ? { lte: new Date(to) } : {}) } } : {}),
      ...(search ? { OR: [{ orderNumber: { contains: search, mode: 'insensitive' } }, { buyerPoNumber: { contains: search, mode: 'insensitive' } }] } : {}),
    };

    const [orders, total] = await Promise.all([
      prisma.order.findMany({
        where, skip, take: limit,
        include: {
          customer: { select: { id: true, name: true, code: true } },
          _count: { select: { lineItems: true, workOrders: true } },
        },
        orderBy: [{ priority: 'asc' }, { requiredDate: 'asc' }],
      }),
      prisma.order.count({ where }),
    ]);

    ok(res, paginatedResponse(orders, total, page, limit));
  } catch (err) { next(err); }
};

// GET /orders/:id
const getOrder = async (req, res, next) => {
  try {
    const order = await prisma.order.findFirstOrThrow({
      where: { id: req.params.id, organizationId: req.orgId },
      include: {
        customer: true,
        lineItems: {
          include: { styleVariant: { include: { productLine: true } } },
        },
        workOrders: {
          select: { id: true, workOrderNumber: true, status: true, plannedStartDate: true, plannedEndDate: true, totalPieces: true, completedPieces: true },
        },
        assignments: { include: { user: { select: { id: true, fullName: true, role: true } } } },
        shipments: { select: { id: true, shipmentNumber: true, status: true, shippedAt: true } },
      },
    });
    ok(res, order);
  } catch (err) { next(err); }
};

// POST /orders
const createOrder = async (req, res, next) => {
  try {
    const { customerId, requiredDate, promisedDate, priority, orderType, buyerPoNumber, incoterms, destinationCountry, specialInstructions, currency, lineItems } = req.body;

    // Auto-generate order number
    const count = await prisma.order.count({ where: { organizationId: req.orgId } });
    const orderNumber = `ORD-${new Date().getFullYear()}-${String(count + 1).padStart(5, '0')}`;

    const order = await prisma.$transaction(async (tx) => {
      const o = await tx.order.create({
        data: {
          organizationId: req.orgId,
          customerId,
          orderNumber,
          requiredDate: new Date(requiredDate),
          promisedDate: promisedDate ? new Date(promisedDate) : null,
          priority,
          orderType,
          buyerPoNumber,
          incoterms,
          destinationCountry,
          specialInstructions,
          currency,
          status: 'DRAFT',
        },
      });

      if (lineItems?.length) {
        await tx.orderLineItem.createMany({
          data: lineItems.map((li) => ({
            orderId: o.id,
            styleVariantId: li.styleVariantId,
            size: li.size,
            color: li.color,
            quantityOrdered: li.quantityOrdered,
            unitPrice: li.unitPrice,
            totalPrice: li.quantityOrdered * li.unitPrice,
            notes: li.notes,
          })),
        });

        // Update total pieces & amount
        const totalPieces = lineItems.reduce((s, li) => s + li.quantityOrdered, 0);
        const totalAmount = lineItems.reduce((s, li) => s + li.quantityOrdered * li.unitPrice, 0);
        await tx.order.update({ where: { id: o.id }, data: { totalPieces, totalAmount } });
      }

      return tx.order.findUnique({ where: { id: o.id }, include: { lineItems: true, customer: true } });
    });

    await auditLog({ orgId: req.orgId, userId: req.user.id, action: 'ORDER_CREATED', entityType: 'Order', entityId: order.id, newValues: order, req });
    created(res, order);
  } catch (err) { next(err); }
};

// PATCH /orders/:id/status  — lifecycle transitions
const updateOrderStatus = async (req, res, next) => {
  try {
    const { status, notes } = req.body;
    const old = await prisma.order.findFirstOrThrow({ where: { id: req.params.id, organizationId: req.orgId } });

    const validTransitions = {
      DRAFT: ['CONFIRMED', 'CANCELLED'],
      CONFIRMED: ['IN_PRODUCTION', 'ON_HOLD', 'CANCELLED'],
      IN_PRODUCTION: ['QC_PENDING', 'ON_HOLD'],
      QC_PENDING: ['READY_TO_SHIP', 'IN_PRODUCTION'],
      READY_TO_SHIP: ['SHIPPED'],
      SHIPPED: ['DELIVERED'],
      ON_HOLD: ['CONFIRMED', 'CANCELLED'],
    };

    if (!validTransitions[old.status]?.includes(status)) {
      throw new AppError(`Cannot transition from ${old.status} to ${status}`, 400, 'INVALID_TRANSITION');
    }

    const order = await prisma.order.update({
      where: { id: req.params.id },
      data: { status, ...(status === 'SHIPPED' ? { shippedDate: new Date() } : {}) },
    });

    await auditLog({ orgId: req.orgId, userId: req.user.id, action: `ORDER_${status}`, entityType: 'Order', entityId: order.id, oldValues: { status: old.status }, newValues: { status }, req });

    // Notify relevant users
    await pushOrgNotification(req.app, {
      orgId: req.orgId,
      roles: ['ORG_ADMIN', 'PRODUCTION_MANAGER'],
      type: 'ORDER_STATUS_CHANGE',
      title: `Order ${order.orderNumber} → ${status}`,
      body: notes || `Status updated to ${status}`,
      referenceId: order.id,
      referenceType: 'Order',
    });

    ok(res, order, `Order status updated to ${status}`);
  } catch (err) { next(err); }
};

// PATCH /orders/:id
const updateOrder = async (req, res, next) => {
  try {
    const order = await prisma.order.update({ where: { id: req.params.id }, data: req.body });
    ok(res, order);
  } catch (err) { next(err); }
};

// POST /orders/:id/assign
const assignOrder = async (req, res, next) => {
  try {
    const { userId, role } = req.body;
    const assignment = await prisma.orderAssignment.upsert({
      where: { orderId_userId: { orderId: req.params.id, userId } },
      create: { orderId: req.params.id, userId, role },
      update: { role },
    });
    ok(res, assignment);
  } catch (err) { next(err); }
};

// GET /orders/dashboard — summary counts for home screen
const getDashboard = async (req, res, next) => {
  try {
    const [statusCounts, overdue, todayDue] = await Promise.all([
      prisma.order.groupBy({
        by: ['status'],
        where: { organizationId: req.orgId },
        _count: { id: true },
      }),
      prisma.order.count({
        where: { organizationId: req.orgId, requiredDate: { lt: new Date() }, status: { notIn: ['DELIVERED', 'CANCELLED', 'SHIPPED'] } },
      }),
      prisma.order.count({
        where: {
          organizationId: req.orgId,
          requiredDate: { gte: new Date(new Date().setHours(0, 0, 0, 0)), lte: new Date(new Date().setHours(23, 59, 59, 999)) },
          status: { notIn: ['DELIVERED', 'CANCELLED'] },
        },
      }),
    ]);

    ok(res, {
      byStatus: Object.fromEntries(statusCounts.map((s) => [s.status, s._count.id])),
      overdue,
      todayDue,
    });
  } catch (err) { next(err); }
};

export { getOrders, getOrder, createOrder, updateOrder, updateOrderStatus, assignOrder, getDashboard };