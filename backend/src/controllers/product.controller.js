import prisma from '../config/db.js';
import { ok, created, getPagination, paginatedResponse } from '../utils/helpers.js';

// ─── PRODUCT LINES ───────────────────────────────────────────

const getProductLines = async (req, res, next) => {
  try {
    const { page, limit, skip } = getPagination(req.query);
    const { category, search } = req.query;

    const where = {
      organizationId: req.orgId,
      isActive: true,
      ...(category ? { category } : {}),
      ...(search ? { name: { contains: search, mode: 'insensitive' } } : {}),
    };

    const [lines, total] = await Promise.all([
      prisma.productLine.findMany({
        where, skip, take: limit,
        include: { _count: { select: { styleVariants: true } } },
        orderBy: { name: 'asc' },
      }),
      prisma.productLine.count({ where }),
    ]);
    ok(res, paginatedResponse(lines, total, page, limit));
  } catch (err) { next(err); }
};

const createProductLine = async (req, res, next) => {
  try {
    const line = await prisma.productLine.create({
      data: { organizationId: req.orgId, ...req.body },
    });
    created(res, line);
  } catch (err) { next(err); }
};

const updateProductLine = async (req, res, next) => {
  try {
    const line = await prisma.productLine.update({ where: { id: req.params.id }, data: req.body });
    ok(res, line);
  } catch (err) { next(err); }
};

// ─── STYLE VARIANTS ──────────────────────────────────────────

const getStyleVariants = async (req, res, next) => {
  try {
    const { page, limit, skip } = getPagination(req.query);
    const { productLineId, search, season } = req.query;

    const where = {
      productLine: { organizationId: req.orgId },
      isActive: true,
      ...(productLineId ? { productLineId } : {}),
      ...(season ? { seasonTag: season } : {}),
      ...(search ? { OR: [{ styleCode: { contains: search, mode: 'insensitive' } }, { name: { contains: search, mode: 'insensitive' } }] } : {}),
    };

    const [variants, total] = await Promise.all([
      prisma.styleVariant.findMany({
        where, skip, take: limit,
        include: {
          productLine: { select: { id: true, name: true, category: true } },
          _count: { select: { bom: true, routings: true } },
        },
        orderBy: { styleCode: 'asc' },
      }),
      prisma.styleVariant.count({ where }),
    ]);
    ok(res, paginatedResponse(variants, total, page, limit));
  } catch (err) { next(err); }
};

const getStyleVariant = async (req, res, next) => {
  try {
    const variant = await prisma.styleVariant.findFirstOrThrow({
      where: { id: req.params.id, productLine: { organizationId: req.orgId } },
      include: {
        productLine: true,
        bom: { include: { material: { select: { id: true, name: true, code: true, unit: true } } } },
        routings: { orderBy: { sequence: 'asc' } },
      },
    });
    ok(res, variant);
  } catch (err) { next(err); }
};

const createStyleVariant = async (req, res, next) => {
  try {
    const variant = await prisma.styleVariant.create({ data: req.body });
    created(res, variant);
  } catch (err) { next(err); }
};

const updateStyleVariant = async (req, res, next) => {
  try {
    const variant = await prisma.styleVariant.update({ where: { id: req.params.id }, data: req.body });
    ok(res, variant);
  } catch (err) { next(err); }
};

// ─── BOM ─────────────────────────────────────────────────────

const getBom = async (req, res, next) => {
  try {
    const bom = await prisma.billOfMaterial.findMany({
      where: { styleVariantId: req.params.variantId },
      include: { material: true },
      orderBy: { createdAt: 'asc' },
    });
    ok(res, bom);
  } catch (err) { next(err); }
};

const upsertBomItem = async (req, res, next) => {
  try {
    const { styleVariantId, materialId, quantity, unit, wastePercentage, notes } = req.body;
    const item = await prisma.billOfMaterial.upsert({
      where: { styleVariantId_materialId: { styleVariantId, materialId } },
      create: { styleVariantId, materialId, quantity, unit, wastePercentage, notes },
      update: { quantity, unit, wastePercentage, notes },
    });
    ok(res, item);
  } catch (err) { next(err); }
};

const deleteBomItem = async (req, res, next) => {
  try {
    await prisma.billOfMaterial.delete({ where: { id: req.params.id } });
    ok(res, null, 'BOM item deleted');
  } catch (err) { next(err); }
};

// ─── ROUTING ─────────────────────────────────────────────────

const getRoutings = async (req, res, next) => {
  try {
    const routings = await prisma.productionRouting.findMany({
      where: { styleVariantId: req.params.variantId },
      orderBy: { sequence: 'asc' },
    });
    ok(res, routings);
  } catch (err) { next(err); }
};

const createRouting = async (req, res, next) => {
  try {
    const routing = await prisma.productionRouting.create({ data: req.body });
    created(res, routing);
  } catch (err) { next(err); }
};

const updateRouting = async (req, res, next) => {
  try {
    const routing = await prisma.productionRouting.update({ where: { id: req.params.id }, data: req.body });
    ok(res, routing);
  } catch (err) { next(err); }
};

const deleteRouting = async (req, res, next) => {
  try {
    await prisma.productionRouting.delete({ where: { id: req.params.id } });
    ok(res, null, 'Routing deleted');
  } catch (err) { next(err); }
};

export {
  getProductLines, createProductLine, updateProductLine,
  getStyleVariants, getStyleVariant, createStyleVariant, updateStyleVariant,
  getBom, upsertBomItem, deleteBomItem,
  getRoutings, createRouting, updateRouting, deleteRouting,
};