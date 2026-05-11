import prisma from '../config/db.js';
import { ok, created, getPagination, paginatedResponse } from '../utils/helpers.js';

// GET /customers
export const getCustomers = async (req, res, next) => {
    try {
        const { page, limit, skip } = getPagination(req.query);
        const { search, isActive } = req.query;

        const where = {
            organizationId: req.orgId,
            ...(isActive !== undefined ? { isActive: isActive === 'true' } : {}),
            ...(search ? { OR: [{ name: { contains: search, mode: 'insensitive' } }, { code: { contains: search, mode: 'insensitive' } }, { email: { contains: search, mode: 'insensitive' } }] } : {}),
        };

        const [customers, total] = await Promise.all([
            prisma.customer.findMany({
                where, skip, take: limit,
                include: { _count: { select: { orders: true } } },
                orderBy: { name: 'asc' },
            }),
            prisma.customer.count({ where }),
        ]);
        ok(res, paginatedResponse(customers, total, page, limit));
    } catch (err) { next(err); }
};

// GET /customers/:id
export const getCustomer = async (req, res, next) => {
    try {
        const customer = await prisma.customer.findFirstOrThrow({
            where: { id: req.params.id, organizationId: req.orgId },
            include: {
                orders: {
                    orderBy: { orderDate: 'desc' },
                    take: 10,
                    select: { id: true, orderNumber: true, status: true, totalPieces: true, totalAmount: true, requiredDate: true, orderDate: true },
                },
            },
        });

        // Compute lifetime value
        const ltv = await prisma.order.aggregate({
            where: { customerId: customer.id, status: { not: 'CANCELLED' } },
            _sum: { totalAmount: true },
            _count: { id: true },
        });

        ok(res, { ...customer, lifetimeValue: ltv._sum.totalAmount || 0, totalOrders: ltv._count.id });
    } catch (err) { next(err); }
};

// POST /customers
export const createCustomer = async (req, res, next) => {
    try {
        const count = await prisma.customer.count({ where: { organizationId: req.orgId } });
        const code = req.body.code || `CUS-${String(count + 1).padStart(4, '0')}`;
        const customer = await prisma.customer.create({
            data: { organizationId: req.orgId, ...req.body, code },
        });
        created(res, customer);
    } catch (err) { next(err); }
};

// PATCH /customers/:id
export const updateCustomer = async (req, res, next) => {
    try {
        const customer = await prisma.customer.update({ where: { id: req.params.id }, data: req.body });
        ok(res, customer);
    } catch (err) { next(err); }
};

// GET /customers/:id/order-history  — full order stats per customer
export const getOrderHistory = async (req, res, next) => {
    try {
        const { from, to } = req.query;
        const where = {
            customerId: req.params.id,
            organizationId: req.orgId,
            ...(from || to ? { orderDate: { ...(from ? { gte: new Date(from) } : {}), ...(to ? { lte: new Date(to) } : {}) } } : {}),
        };

        const [orders, agg] = await Promise.all([
            prisma.order.findMany({ where, orderBy: { orderDate: 'desc' }, select: { id: true, orderNumber: true, status: true, totalPieces: true, totalAmount: true, orderDate: true, requiredDate: true, shippedDate: true } }),
            prisma.order.aggregate({ where, _sum: { totalAmount: true, totalPieces: true }, _count: { id: true } }),
        ]);

        ok(res, { orders, summary: { totalOrders: agg._count.id, totalPieces: agg._sum.totalPieces || 0, totalRevenue: agg._sum.totalAmount || 0 } });
    } catch (err) { next(err); }
};