import prisma from '../config/db.js';
import { ok, created, getPagination, paginatedResponse } from '../utils/helpers.js';

// GET /suppliers
export const getSuppliers = async (req, res, next) => {
    try {
        const { page, limit, skip } = getPagination(req.query);
        const { search, isActive } = req.query;

        const where = {
            organizationId: req.orgId,
            ...(isActive !== undefined ? { isActive: isActive === 'true' } : {}),
            ...(search ? { OR: [{ name: { contains: search, mode: 'insensitive' } }, { code: { contains: search, mode: 'insensitive' } }] } : {}),
        };

        const [suppliers, total] = await Promise.all([
            prisma.supplier.findMany({
                where, skip, take: limit,
                include: { _count: { select: { materials: true, purchaseOrders: true } } },
                orderBy: { name: 'asc' },
            }),
            prisma.supplier.count({ where }),
        ]);
        ok(res, paginatedResponse(suppliers, total, page, limit));
    } catch (err) { next(err); }
};

// GET /suppliers/:id
export const getSupplier = async (req, res, next) => {
    try {
        const supplier = await prisma.supplier.findFirstOrThrow({
            where: { id: req.params.id, organizationId: req.orgId },
            include: {
                materials: { include: { material: { select: { id: true, name: true, code: true, unit: true } } } },
                purchaseOrders: { orderBy: { createdAt: 'desc' }, take: 5, select: { id: true, poNumber: true, status: true, totalAmount: true, createdAt: true } },
            },
        });
        ok(res, supplier);
    } catch (err) { next(err); }
};

// POST /suppliers
export const createSupplier = async (req, res, next) => {
    try {
        const count = await prisma.supplier.count({ where: { organizationId: req.orgId } });
        const code = req.body.code || `SUP-${String(count + 1).padStart(4, '0')}`;
        const supplier = await prisma.supplier.create({
            data: { organizationId: req.orgId, ...req.body, code },
        });
        created(res, supplier);
    } catch (err) { next(err); }
};

// PATCH /suppliers/:id
export const updateSupplier = async (req, res, next) => {
    try {
        const supplier = await prisma.supplier.update({ where: { id: req.params.id }, data: req.body });
        ok(res, supplier);
    } catch (err) { next(err); }
};

// POST /suppliers/:id/materials  — link material to supplier with pricing
export const linkMaterial = async (req, res, next) => {
    try {
        const { materialId, supplierCode, unitCost, minOrderQty, leadTimeDays, isPreferred } = req.body;
        const link = await prisma.supplierMaterial.upsert({
            where: { supplierId_materialId: { supplierId: req.params.id, materialId } },
            create: { supplierId: req.params.id, materialId, supplierCode, unitCost, minOrderQty, leadTimeDays, isPreferred },
            update: { supplierCode, unitCost, minOrderQty, leadTimeDays, isPreferred },
        });
        ok(res, link);
    } catch (err) { next(err); }
};

// GET /suppliers/:id/performance — lead time, on-time delivery rate
export const getSupplierPerformance = async (req, res, next) => {
    try {
        const pos = await prisma.purchaseOrder.findMany({
            where: { supplierId: req.params.id, status: { in: ['RECEIVED', 'PARTIALLY_RECEIVED'] } },
            include: { grns: { select: { receivedDate: true } } },
            orderBy: { createdAt: 'desc' },
            take: 20,
        });

        const onTime = pos.filter((po) => {
            if (!po.expectedDate || !po.grns.length) return false;
            const received = po.grns[0].receivedDate;
            return new Date(received) <= new Date(po.expectedDate);
        });

        ok(res, {
            totalOrders: pos.length,
            onTimeDeliveries: onTime.length,
            onTimeRate: pos.length > 0 ? Math.round((onTime.length / pos.length) * 100) : 0,
            avgLeadDays: pos.length > 0
                ? Math.round(pos.reduce((s, po) => {
                    if (!po.grns.length || !po.createdAt) return s;
                    return s + (new Date(po.grns[0].receivedDate) - new Date(po.createdAt)) / 86400000;
                }, 0) / pos.length)
                : 0,
        });
    } catch (err) { next(err); }
};