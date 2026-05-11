import prisma from '../config/db.js';
import { ok, created, getPagination, paginatedResponse } from '../utils/helpers.js';
import { AppError } from '../middleware/errorHandler.js';
import { auditLog } from '../middleware/requestLogger.js';
import { pushOrgNotification } from '../utils/notifications.js';

// GET /shipments
export const getShipments = async (req, res, next) => {
    try {
        const { page, limit, skip } = getPagination(req.query);
        const { status, orderId } = req.query;

        const where = {
            order: { organizationId: req.orgId },
            ...(status ? { status } : {}),
            ...(orderId ? { orderId } : {}),
        };

        const [shipments, total] = await Promise.all([
            prisma.shipment.findMany({
                where, skip, take: limit,
                include: {
                    order: { select: { id: true, orderNumber: true, customer: { select: { name: true } } } },
                    _count: { select: { packingLists: true } },
                },
                orderBy: { createdAt: 'desc' },
            }),
            prisma.shipment.count({ where }),
        ]);
        ok(res, paginatedResponse(shipments, total, page, limit));
    } catch (err) { next(err); }
};

// GET /shipments/:id
export const getShipment = async (req, res, next) => {
    try {
        const shipment = await prisma.shipment.findFirstOrThrow({
            where: { id: req.params.id, order: { organizationId: req.orgId } },
            include: {
                order: { include: { customer: true } },
                packingLists: { orderBy: { cartonNo: 'asc' } },
            },
        });
        ok(res, shipment);
    } catch (err) { next(err); }
};

// POST /shipments
export const createShipment = async (req, res, next) => {
    try {
        const { orderId, carrier, estimatedArrival, weight, cartons, totalPieces, packingListItems, notes } = req.body;

        await prisma.order.findFirstOrThrow({ where: { id: orderId, organizationId: req.orgId, status: 'READY_TO_SHIP' } });

        const count = await prisma.shipment.count();
        const shipmentNumber = `SHP-${new Date().getFullYear()}-${String(count + 1).padStart(5, '0')}`;

        const shipment = await prisma.$transaction(async (tx) => {
            const s = await tx.shipment.create({
                data: { orderId, shipmentNumber, carrier, estimatedArrival: estimatedArrival ? new Date(estimatedArrival) : null, weight, cartons, totalPieces, notes, status: 'PENDING' },
            });

            if (packingListItems?.length) {
                await tx.packingList.createMany({
                    data: packingListItems.map((p) => ({ shipmentId: s.id, ...p })),
                });
            }

            return s;
        });

        await auditLog({ orgId: req.orgId, userId: req.user.id, action: 'SHIPMENT_CREATED', entityType: 'Shipment', entityId: shipment.id, newValues: shipment, req });
        created(res, shipment);
    } catch (err) { next(err); }
};

// PATCH /shipments/:id/status
export const updateShipmentStatus = async (req, res, next) => {
    try {
        const { status, trackingNumber, notes } = req.body;
        const old = await prisma.shipment.findFirstOrThrow({ where: { id: req.params.id, order: { organizationId: req.orgId } } });

        const validTransitions = {
            PENDING: ['PACKED'],
            PACKED: ['DISPATCHED'],
            DISPATCHED: ['IN_TRANSIT'],
            IN_TRANSIT: ['DELIVERED', 'RETURNED'],
        };
        if (!validTransitions[old.status]?.includes(status)) {
            throw new AppError(`Cannot transition shipment from ${old.status} to ${status}`, 400);
        }

        const shipment = await prisma.$transaction(async (tx) => {
            const s = await tx.shipment.update({
                where: { id: req.params.id },
                data: {
                    status,
                    trackingNumber: trackingNumber || old.trackingNumber,
                    ...(status === 'DISPATCHED' ? { shippedAt: new Date() } : {}),
                    ...(status === 'DELIVERED' ? { actualArrival: new Date() } : {}),
                },
            });

            // Sync order status
            if (status === 'DISPATCHED') {
                await tx.order.update({ where: { id: old.orderId }, data: { status: 'SHIPPED', shippedDate: new Date() } });
            }
            if (status === 'DELIVERED') {
                await tx.order.update({ where: { id: old.orderId }, data: { status: 'DELIVERED' } });
            }

            return s;
        });

        await pushOrgNotification(req.app, {
            orgId: req.orgId,
            roles: ['ORG_ADMIN', 'PRODUCTION_MANAGER'],
            type: 'SHIPMENT_UPDATE',
            title: `Shipment ${shipment.shipmentNumber} → ${status}`,
            body: notes || `Shipment status updated to ${status}`,
            referenceId: shipment.id,
            referenceType: 'Shipment',
        });

        ok(res, shipment, `Shipment updated to ${status}`);
    } catch (err) { next(err); }
};

// POST /shipments/:id/packing-list — add carton entries
export const addPackingList = async (req, res, next) => {
    try {
        const { items } = req.body; // [{ cartonNo, styleCode, size, color, quantity, grossWeight, netWeight }]
        await prisma.packingList.createMany({
            data: items.map((i) => ({ shipmentId: req.params.id, ...i })),
        });
        ok(res, null, 'Packing list added');
    } catch (err) { next(err); }
};