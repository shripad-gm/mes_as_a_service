import prisma from '../config/db.js';
import { ok, created, getPagination, paginatedResponse } from '../utils/helpers.js';
import { AppError } from '../middleware/errorHandler.js';
import { auditLog } from '../middleware/requestLogger.js';

// GET /purchase-orders
export const getPurchaseOrders = async (req, res, next) => {
    try {
        const { page, limit, skip } = getPagination(req.query);
        const { status, supplierId, from, to } = req.query;

        const where = {
            supplier: { organizationId: req.orgId },
            ...(status ? { status } : {}),
            ...(supplierId ? { supplierId } : {}),
            ...(from || to ? { createdAt: { ...(from ? { gte: new Date(from) } : {}), ...(to ? { lte: new Date(to) } : {}) } } : {}),
        };

        const [pos, total] = await Promise.all([
            prisma.purchaseOrder.findMany({
                where, skip, take: limit,
                include: {
                    supplier: { select: { id: true, name: true, code: true } },
                    _count: { select: { lineItems: true, grns: true } },
                },
                orderBy: { createdAt: 'desc' },
            }),
            prisma.purchaseOrder.count({ where }),
        ]);
        ok(res, paginatedResponse(pos, total, page, limit));
    } catch (err) { next(err); }
};

// GET /purchase-orders/:id
export const getPurchaseOrder = async (req, res, next) => {
    try {
        const po = await prisma.purchaseOrder.findFirstOrThrow({
            where: { id: req.params.id, supplier: { organizationId: req.orgId } },
            include: {
                supplier: true,
                lineItems: true,
                grns: { include: { stockEntries: true } },
            },
        });
        ok(res, po);
    } catch (err) { next(err); }
};

// POST /purchase-orders
export const createPurchaseOrder = async (req, res, next) => {
    try {
        const { supplierId, expectedDate, currency, notes, lineItems } = req.body;

        const count = await prisma.purchaseOrder.count();
        const poNumber = `PO-${new Date().getFullYear()}-${String(count + 1).padStart(5, '0')}`;
        const totalAmount = (lineItems || []).reduce((s, li) => s + li.quantity * li.unitCost, 0);

        const po = await prisma.$transaction(async (tx) => {
            const order = await tx.purchaseOrder.create({
                data: {
                    supplierId,
                    poNumber,
                    expectedDate: expectedDate ? new Date(expectedDate) : null,
                    currency: currency || 'INR',
                    notes,
                    totalAmount,
                    status: 'DRAFT',
                },
            });
            if (lineItems?.length) {
                await tx.purchaseOrderItem.createMany({
                    data: lineItems.map((li) => ({
                        purchaseOrderId: order.id,
                        materialId: li.materialId,
                        description: li.description,
                        quantity: li.quantity,
                        unit: li.unit,
                        unitCost: li.unitCost,
                        totalCost: li.quantity * li.unitCost,
                    })),
                });
            }
            return tx.purchaseOrder.findUnique({ where: { id: order.id }, include: { lineItems: true, supplier: true } });
        });

        await auditLog({ orgId: req.orgId, userId: req.user.id, action: 'PO_CREATED', entityType: 'PurchaseOrder', entityId: po.id, newValues: po, req });
        created(res, po);
    } catch (err) { next(err); }
};

// PATCH /purchase-orders/:id/status
export const updatePoStatus = async (req, res, next) => {
    try {
        const { status } = req.body;
        const old = await prisma.purchaseOrder.findFirstOrThrow({ where: { id: req.params.id, supplier: { organizationId: req.orgId } } });

        const validTransitions = {
            DRAFT: ['SENT', 'CANCELLED'],
            SENT: ['ACKNOWLEDGED', 'CANCELLED'],
            ACKNOWLEDGED: ['PARTIALLY_RECEIVED', 'RECEIVED', 'CANCELLED'],
            PARTIALLY_RECEIVED: ['RECEIVED', 'CANCELLED'],
        };
        if (!validTransitions[old.status]?.includes(status)) {
            throw new AppError(`Cannot transition PO from ${old.status} to ${status}`, 400);
        }

        const po = await prisma.purchaseOrder.update({ where: { id: req.params.id }, data: { status } });
        ok(res, po);
    } catch (err) { next(err); }
};

// POST /purchase-orders/:id/grn — receive goods against PO
export const createGrn = async (req, res, next) => {
    try {
        const { invoiceNumber, vehicleNumber, notes, stockEntries } = req.body;

        const count = await prisma.goodsReceiptNote.count();
        const grnNumber = `GRN-${new Date().getFullYear()}-${String(count + 1).padStart(5, '0')}`;

        const po = await prisma.purchaseOrder.findFirstOrThrow({ where: { id: req.params.id, supplier: { organizationId: req.orgId } } });

        const grn = await prisma.$transaction(async (tx) => {
            const g = await tx.goodsReceiptNote.create({
                data: {
                    supplierId: po.supplierId,
                    purchaseOrderId: po.id,
                    grnNumber,
                    invoiceNumber,
                    vehicleNumber,
                    notes,
                    receivedById: req.user.id,
                },
            });

            // Create stock entries + movements for each item received
            for (const se of (stockEntries || [])) {
                const entry = await tx.stockEntry.create({
                    data: {
                        materialId: se.materialId,
                        grnId: g.id,
                        quantity: se.quantity,
                        unit: se.unit,
                        batchNumber: se.batchNumber,
                        supplierLotNo: se.supplierLotNo,
                        qualityStatus: 'PENDING_INSPECTION',
                    },
                });
                await tx.stockMovement.create({
                    data: {
                        materialId: se.materialId,
                        stockEntryId: entry.id,
                        movementType: 'RECEIPT',
                        quantity: se.quantity,
                        unit: se.unit,
                        referenceId: g.id,
                        referenceType: 'GRN',
                        performedById: req.user.id,
                    },
                });
                // Update PO line received qty
                if (se.poLineItemId) {
                    await tx.purchaseOrderItem.update({
                        where: { id: se.poLineItemId },
                        data: { receivedQty: { increment: se.quantity } },
                    });
                }
            }

            // Check if PO fully received
            const poItems = await tx.purchaseOrderItem.findMany({ where: { purchaseOrderId: po.id } });
            const allReceived = poItems.every((i) => i.receivedQty >= i.quantity);
            await tx.purchaseOrder.update({
                where: { id: po.id },
                data: { status: allReceived ? 'RECEIVED' : 'PARTIALLY_RECEIVED' },
            });

            return g;
        });

        created(res, grn, 'GRN created and stock updated');
    } catch (err) { next(err); }
};