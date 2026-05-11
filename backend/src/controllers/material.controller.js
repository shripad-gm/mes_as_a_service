import prisma from '../config/db.js';
import { ok, created, getPagination, paginatedResponse } from '../utils/helpers.js';
import { pushOrgNotification } from '../utils/notifications.js';
import { AppError } from '../middleware/errorHandler.js';

// GET /materials
const getMaterials = async (req, res, next) => {
  try {
    const { page, limit, skip } = getPagination(req.query);
    const { type, search, lowStock } = req.query;

    const where = {
      organizationId: req.orgId,
      isActive: true,
      ...(type ? { type } : {}),
      ...(search ? { OR: [{ name: { contains: search, mode: 'insensitive' } }, { code: { contains: search, mode: 'insensitive' } }] } : {}),
    };

    const [materials, total] = await Promise.all([
      prisma.material.findMany({
        where, skip, take: limit,
        include: {
          _count: { select: { stockEntries: true } },
        },
        orderBy: { name: 'asc' },
      }),
      prisma.material.count({ where }),
    ]);

    // Attach current stock level for each material
    const materialsWithStock = await Promise.all(
      materials.map(async (m) => {
        const stock = await getCurrentStock(m.id);
        return { ...m, currentStock: stock };
      })
    );

    // Filter low stock if requested
    const filtered = lowStock === 'true'
      ? materialsWithStock.filter((m) => m.currentStock <= m.minStockLevel)
      : materialsWithStock;

    ok(res, paginatedResponse(filtered, total, page, limit));
  } catch (err) { next(err); }
};

// Helper — sum stock movements for a material
const getCurrentStock = async (materialId) => {
  const agg = await prisma.stockMovement.aggregate({
    where: { materialId },
    _sum: { quantity: true },
  });
  return agg._sum.quantity || 0;
};

// GET /materials/:id
const getMaterial = async (req, res, next) => {
  try {
    const material = await prisma.material.findFirstOrThrow({
      where: { id: req.params.id, organizationId: req.orgId },
      include: {
        supplierMaterials: { include: { supplier: { select: { id: true, name: true, code: true } } } },
        stockEntries: { orderBy: { receivedDate: 'desc' }, take: 10 },
      },
    });
    const currentStock = await getCurrentStock(material.id);
    ok(res, { ...material, currentStock });
  } catch (err) { next(err); }
};

// POST /materials
const createMaterial = async (req, res, next) => {
  try {
    const material = await prisma.material.create({
      data: { organizationId: req.orgId, ...req.body },
    });
    created(res, material);
  } catch (err) { next(err); }
};

// PATCH /materials/:id
const updateMaterial = async (req, res, next) => {
  try {
    const material = await prisma.material.update({ where: { id: req.params.id }, data: req.body });
    ok(res, material);
  } catch (err) { next(err); }
};

// POST /materials/:id/stock-in  — receive stock
const stockIn = async (req, res, next) => {
  try {
    const { quantity, unit, batchNumber, receivedDate, supplierLotNo, grnId, notes } = req.body;
    const materialId = req.params.id;

    const material = await prisma.material.findFirstOrThrow({ where: { id: materialId, organizationId: req.orgId } });

    const entry = await prisma.$transaction(async (tx) => {
      const stockEntry = await tx.stockEntry.create({
        data: { materialId, quantity, unit, batchNumber, receivedDate: receivedDate || new Date(), supplierLotNo, grnId, notes },
      });
      await tx.stockMovement.create({
        data: { materialId, stockEntryId: stockEntry.id, movementType: 'RECEIPT', quantity, unit, referenceType: 'STOCK_ENTRY', referenceId: stockEntry.id, performedById: req.user.id },
      });
      return stockEntry;
    });

    // Check if stock now above min — no alert needed
    created(res, entry, 'Stock received');
  } catch (err) { next(err); }
};

// POST /materials/:id/adjust  — manual adjustment
const adjustStock = async (req, res, next) => {
  try {
    const { quantity, reason, notes } = req.body; // quantity can be negative
    const materialId = req.params.id;

    await prisma.material.findFirstOrThrow({ where: { id: materialId, organizationId: req.orgId } });

    const movement = await prisma.stockMovement.create({
      data: {
        materialId,
        movementType: quantity > 0 ? 'ADJUSTMENT_IN' : 'ADJUSTMENT_OUT',
        quantity,
        unit: req.body.unit,
        performedById: req.user.id,
        notes: `${reason}: ${notes || ''}`,
        referenceType: 'MANUAL_ADJUSTMENT',
      },
    });

    // Check low stock and notify
    const currentStock = await getCurrentStock(materialId);
    const material = await prisma.material.findUnique({ where: { id: materialId } });
    if (currentStock <= material.minStockLevel) {
      await pushOrgNotification(req.app, {
        orgId: req.orgId,
        roles: ['ORG_ADMIN', 'PRODUCTION_MANAGER', 'STORE_KEEPER'],
        type: 'LOW_STOCK_ALERT',
        title: 'Low Stock Alert',
        body: `${material.name} is below minimum stock level (${currentStock} ${material.unit})`,
        referenceId: materialId,
        referenceType: 'Material',
      });
    }

    ok(res, { movement, currentStock });
  } catch (err) { next(err); }
};

// GET /materials/stock-summary  — all materials with current levels
const stockSummary = async (req, res, next) => {
  try {
    const materials = await prisma.material.findMany({
      where: { organizationId: req.orgId, isActive: true },
      select: { id: true, name: true, code: true, type: true, unit: true, minStockLevel: true, maxStockLevel: true, unitCost: true },
    });

    const summary = await Promise.all(
      materials.map(async (m) => {
        const stock = await getCurrentStock(m.id);
        return {
          ...m,
          currentStock: stock,
          stockValue: stock * m.unitCost,
          status: stock <= 0 ? 'OUT_OF_STOCK' : stock <= m.minStockLevel ? 'LOW' : 'ADEQUATE',
        };
      })
    );

    ok(res, summary);
  } catch (err) { next(err); }
};

// GET /materials/:id/movements
const getMovements = async (req, res, next) => {
  try {
    const { page, limit, skip } = getPagination(req.query);
    const [movements, total] = await Promise.all([
      prisma.stockMovement.findMany({
        where: { materialId: req.params.id },
        skip, take: limit,
        orderBy: { createdAt: 'desc' },
      }),
      prisma.stockMovement.count({ where: { materialId: req.params.id } }),
    ]);
    ok(res, paginatedResponse(movements, total, page, limit));
  } catch (err) { next(err); }
};

export { getMaterials, getMaterial, createMaterial, updateMaterial, stockIn, adjustStock, stockSummary, getMovements };