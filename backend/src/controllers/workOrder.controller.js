import prisma from '../config/db.js';
import { ok, created, getPagination, paginatedResponse } from '../utils/helpers.js';
import { AppError } from '../middleware/errorHandler.js';
import { auditLog } from '../middleware/requestLogger.js';
import { pushOrgNotification } from '../utils/notifications.js';

// GET /work-orders
const getWorkOrders = async (req, res, next) => {
  try {
    const { page, limit, skip } = getPagination(req.query);
    const { status, orderId, facilityId } = req.query;

    const where = {
      order: { organizationId: req.orgId },
      ...(status ? { status } : {}),
      ...(orderId ? { orderId } : {}),
      ...(facilityId ? { facilityId } : {}),
    };

    const [wos, total] = await Promise.all([
      prisma.workOrder.findMany({
        where, skip, take: limit,
        include: {
          order: { select: { id: true, orderNumber: true, customer: { select: { name: true } } } },
          _count: { select: { operations: true, qualityChecks: true } },
        },
        orderBy: [{ plannedStartDate: 'asc' }],
      }),
      prisma.workOrder.count({ where }),
    ]);
    ok(res, paginatedResponse(wos, total, page, limit));
  } catch (err) { next(err); }
};

// GET /work-orders/:id
const getWorkOrder = async (req, res, next) => {
  try {
    const wo = await prisma.workOrder.findFirstOrThrow({
      where: { id: req.params.id, order: { organizationId: req.orgId } },
      include: {
        order: { include: { customer: true } },
        lineItems: { include: { orderLineItem: { include: { styleVariant: true } } } },
        operations: {
          include: {
            workCenter: true,
            employee: { select: { id: true, fullName: true, employeeCode: true } },
          },
          orderBy: { sequence: 'asc' },
        },
        qualityChecks: { orderBy: { inspectedAt: 'desc' }, take: 5 },
        materialIssuances: true,
      },
    });
    ok(res, wo);
  } catch (err) { next(err); }
};

// POST /work-orders — create WO from order, auto-generate operations from routing
const createWorkOrder = async (req, res, next) => {
  try {
    const { orderId, facilityId, plannedStartDate, plannedEndDate, lineItems, priority } = req.body;

    const order = await prisma.order.findFirstOrThrow({ where: { id: orderId, organizationId: req.orgId } });
    if (!['CONFIRMED', 'IN_PRODUCTION'].includes(order.status)) {
      throw new AppError('Order must be CONFIRMED to create work order', 400);
    }

    const count = await prisma.workOrder.count({ where: { order: { organizationId: req.orgId } } });
    const workOrderNumber = `WO-${new Date().getFullYear()}-${String(count + 1).padStart(5, '0')}`;
    const totalPieces = lineItems.reduce((s, li) => s + li.quantityPlanned, 0);

    const wo = await prisma.$transaction(async (tx) => {
      const workOrder = await tx.workOrder.create({
        data: {
          orderId,
          facilityId,
          workOrderNumber,
          plannedStartDate: new Date(plannedStartDate),
          plannedEndDate: new Date(plannedEndDate),
          totalPieces,
          priority: priority || order.priority,
          status: 'PLANNED',
        },
      });

      // Create WO line items
      await tx.workOrderItem.createMany({
        data: lineItems.map((li) => ({
          workOrderId: workOrder.id,
          orderLineItemId: li.orderLineItemId,
          size: li.size,
          quantityPlanned: li.quantityPlanned,
        })),
      });

      // Auto-generate operations from each line item's style routing
      for (const li of lineItems) {
        const orderLineItem = await tx.orderLineItem.findUnique({
          where: { id: li.orderLineItemId },
          include: { styleVariant: { include: { routings: { orderBy: { sequence: 'asc' } } } } },
        });

        if (orderLineItem?.styleVariant?.routings?.length) {
          await tx.workOrderOperation.createMany({
            data: orderLineItem.styleVariant.routings.map((r) => ({
              workOrderId: workOrder.id,
              routingId: r.id,
              operationName: r.operationName,
              sequence: r.sequence,
              plannedPieces: li.quantityPlanned,
              smv: r.smv,
              status: 'PENDING',
            })),
          });
        }
      }

      // Update order status to IN_PRODUCTION
      await tx.order.update({ where: { id: orderId }, data: { status: 'IN_PRODUCTION' } });

      return tx.workOrder.findUnique({
        where: { id: workOrder.id },
        include: { operations: { orderBy: { sequence: 'asc' } } },
      });
    });

    await auditLog({ orgId: req.orgId, userId: req.user.id, action: 'WORK_ORDER_CREATED', entityType: 'WorkOrder', entityId: wo.id, newValues: wo, req });
    created(res, wo);
  } catch (err) { next(err); }
};

// PATCH /work-orders/:id/release — PLANNED → RELEASED
const releaseWorkOrder = async (req, res, next) => {
  try {
    const wo = await prisma.workOrder.findFirstOrThrow({ where: { id: req.params.id, order: { organizationId: req.orgId } } });
    if (wo.status !== 'PLANNED') throw new AppError('Only PLANNED work orders can be released', 400);

    const updated = await prisma.workOrder.update({
      where: { id: req.params.id },
      data: { status: 'RELEASED', actualStartDate: new Date() },
    });

    await pushOrgNotification(req.app, {
      orgId: req.orgId,
      roles: ['SUPERVISOR', 'FLOOR_OPERATOR'],
      type: 'ORDER_STATUS_CHANGE',
      title: `Work Order ${updated.workOrderNumber} Released`,
      body: 'Work order is ready for production.',
      referenceId: updated.id,
      referenceType: 'WorkOrder',
    });

    ok(res, updated, 'Work order released');
  } catch (err) { next(err); }
};

// PATCH /work-orders/:id/operations/:opId — update operation progress
const updateOperation = async (req, res, next) => {
  try {
    const { status, completedPieces, assignedEmployeeId, workCenterId, actualStartTime, actualEndTime, notes } = req.body;

    const op = await prisma.workOrderOperation.update({
      where: { id: req.params.opId },
      data: { status, completedPieces, assignedEmployeeId, workCenterId, actualStartTime, actualEndTime, notes },
    });

    // Recalculate efficiency if we have actual time
    if (op.smv && op.completedPieces && op.actualStartTime && op.actualEndTime) {
      const actualMinutes = (new Date(op.actualEndTime) - new Date(op.actualStartTime)) / 60000;
      const efficiency = ((op.smv * op.completedPieces) / actualMinutes) * 100;
      await prisma.workOrderOperation.update({ where: { id: op.id }, data: { actualMinutes, efficiency } });
    }

    // Check if all operations complete → update WO status
    const allOps = await prisma.workOrderOperation.findMany({ where: { workOrderId: op.workOrderId } });
    const allDone = allOps.every((o) => o.status === 'COMPLETE' || o.status === 'SKIPPED');
    if (allDone) {
      await prisma.workOrder.update({ where: { id: op.workOrderId }, data: { status: 'PARTIALLY_COMPLETE' } });
    }

    ok(res, op);
  } catch (err) { next(err); }
};

// POST /work-orders/:id/material-issue
const issueMaterial = async (req, res, next) => {
  try {
    const { materialId, issuedQty, unit, notes } = req.body;

    const issuance = await prisma.$transaction(async (tx) => {
      const record = await tx.materialIssuance.create({
        data: { workOrderId: req.params.id, materialId, issuedQty, unit, issuedById: req.user.id, notes },
      });
      await tx.stockMovement.create({
        data: { materialId, movementType: 'ISSUE_PRODUCTION', quantity: -issuedQty, unit, referenceId: req.params.id, referenceType: 'WORK_ORDER', performedById: req.user.id },
      });
      return record;
    });

    created(res, issuance, 'Material issued to work order');
  } catch (err) { next(err); }
};

export { getWorkOrders, getWorkOrder, createWorkOrder, releaseWorkOrder, updateOperation, issueMaterial };