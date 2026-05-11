import prisma from '../config/db.js';
import { ok, created, getPagination, paginatedResponse, calcDhu } from '../utils/helpers.js';
import { pushOrgNotification } from '../utils/notifications.js';

// GET /quality/checks
const getChecks = async (req, res, next) => {
  try {
    const { page, limit, skip } = getPagination(req.query);
    const { workOrderId, result, checkType, checkStage } = req.query;

    const where = {
      workOrder: { order: { organizationId: req.orgId } },
      ...(workOrderId ? { workOrderId } : {}),
      ...(result ? { result } : {}),
      ...(checkType ? { checkType } : {}),
      ...(checkStage ? { checkStage } : {}),
    };

    const [checks, total] = await Promise.all([
      prisma.qualityCheck.findMany({
        where, skip, take: limit,
        include: {
          workOrder: { select: { id: true, workOrderNumber: true } },
          inspector: { select: { id: true, fullName: true } },
          _count: { select: { defectFindings: true } },
        },
        orderBy: { inspectedAt: 'desc' },
      }),
      prisma.qualityCheck.count({ where }),
    ]);
    ok(res, paginatedResponse(checks, total, page, limit));
  } catch (err) { next(err); }
};

// GET /quality/checks/:id
const getCheck = async (req, res, next) => {
  try {
    const check = await prisma.qualityCheck.findFirstOrThrow({
      where: { id: req.params.id, workOrder: { order: { organizationId: req.orgId } } },
      include: {
        defectFindings: { include: { defectType: true } },
        inspector: { select: { id: true, fullName: true } },
        workOrder: { include: { order: { select: { orderNumber: true, customer: { select: { name: true } } } } } },
      },
    });
    ok(res, check);
  } catch (err) { next(err); }
};

// POST /quality/checks
const createCheck = async (req, res, next) => {
  try {
    const { workOrderId, checkType, checkStage, sampleSize, aqlLevel, passedCount, failedCount, reworkCount, imageUrls, notes, defectFindings } = req.body;

    const totalDefects = (defectFindings || []).reduce((s, d) => s + d.count, 0);
    const result = failedCount === 0 ? 'PASS' : failedCount / sampleSize <= (aqlLevel || 0.025) ? 'CONDITIONAL_PASS' : 'FAIL';

    const check = await prisma.$transaction(async (tx) => {
      const qc = await tx.qualityCheck.create({
        data: {
          workOrderId,
          inspectorId: req.user.id,
          checkType,
          checkStage,
          sampleSize,
          aqlLevel,
          passedCount: passedCount || sampleSize - failedCount - reworkCount,
          failedCount: failedCount || 0,
          reworkCount: reworkCount || 0,
          result,
          imageUrls: imageUrls || [],
          notes,
        },
      });

      if (defectFindings?.length) {
        await tx.defectFinding.createMany({
          data: defectFindings.map((d) => ({
            qualityCheckId: qc.id,
            defectTypeId: d.defectTypeId,
            count: d.count,
            location: d.location,
            imageUrl: d.imageUrl,
            isReworkable: d.isReworkable ?? true,
            notes: d.notes,
          })),
        });
      }

      // Update WO rejected/rework pieces
      await tx.workOrder.update({
        where: { id: workOrderId },
        data: { rejectedPieces: { increment: failedCount || 0 }, reworkPieces: { increment: reworkCount || 0 } },
      });

      return qc;
    });

    // Alert on fail
    if (result === 'FAIL') {
      await pushOrgNotification(req.app, {
        orgId: req.orgId,
        roles: ['ORG_ADMIN', 'PRODUCTION_MANAGER', 'SUPERVISOR'],
        type: 'QUALITY_FAILURE',
        title: `Quality Check FAILED — ${checkStage}`,
        body: `${failedCount} pieces failed out of ${sampleSize} sampled. DHU: ${calcDhu(totalDefects, sampleSize)}`,
        referenceId: check.id,
        referenceType: 'QualityCheck',
      });
    }

    // Emit real-time
    const io = req.app.get('io');
    if (io) io.to(`org:${req.orgId}`).emit('quality_update', { workOrderId, result });

    created(res, check);
  } catch (err) { next(err); }
};

// GET /quality/defect-types
const getDefectTypes = async (req, res, next) => {
  try {
    const types = await prisma.defectType.findMany({
      where: { organizationId: req.orgId, isActive: true },
      orderBy: [{ category: 'asc' }, { name: 'asc' }],
    });
    ok(res, types);
  } catch (err) { next(err); }
};

const createDefectType = async (req, res, next) => {
  try {
    const dt = await prisma.defectType.create({ data: { organizationId: req.orgId, ...req.body } });
    created(res, dt);
  } catch (err) { next(err); }
};

// GET /quality/analytics  — DHU trends, top defects
const getAnalytics = async (req, res, next) => {
  try {
    const { from, to, workOrderId } = req.query;
    const dateFilter = { ...(from ? { gte: new Date(from) } : {}), ...(to ? { lte: new Date(to) } : {}) };

    const [checks, topDefects] = await Promise.all([
      // Aggregate checks over time
      prisma.qualityCheck.findMany({
        where: {
          workOrder: { order: { organizationId: req.orgId } },
          ...(workOrderId ? { workOrderId } : {}),
          ...(from || to ? { inspectedAt: dateFilter } : {}),
        },
        select: { inspectedAt: true, sampleSize: true, passedCount: true, failedCount: true, reworkCount: true, result: true, checkStage: true },
        orderBy: { inspectedAt: 'asc' },
      }),
      // Top defect types
      prisma.defectFinding.groupBy({
        by: ['defectTypeId'],
        where: { qualityCheck: { workOrder: { order: { organizationId: req.orgId } }, ...(from || to ? { inspectedAt: dateFilter } : {}) } },
        _sum: { count: true },
        orderBy: { _sum: { count: 'desc' } },
        take: 10,
      }),
    ]);

    // Resolve defect type names
    const defectTypeIds = topDefects.map((d) => d.defectTypeId);
    const defectTypes = await prisma.defectType.findMany({ where: { id: { in: defectTypeIds } }, select: { id: true, name: true, category: true, severity: true } });
    const dtMap = Object.fromEntries(defectTypes.map((d) => [d.id, d]));

    const totalSampled = checks.reduce((s, c) => s + c.sampleSize, 0);
    const totalFailed = checks.reduce((s, c) => s + c.failedCount, 0);
    const passRate = totalSampled > 0 ? Math.round(((totalSampled - totalFailed) / totalSampled) * 100) : 0;

    ok(res, {
      totalChecks: checks.length,
      totalSampled,
      totalFailed,
      passRate,
      overallDhu: calcDhu(totalFailed, totalSampled),
      resultBreakdown: checks.reduce((acc, c) => { acc[c.result] = (acc[c.result] || 0) + 1; return acc; }, {}),
      topDefects: topDefects.map((d) => ({ ...d, defectType: dtMap[d.defectTypeId], total: d._sum.count })),
      trend: checks.map((c) => ({ date: c.inspectedAt, dhu: calcDhu(c.failedCount, c.sampleSize), result: c.result })),
    });
  } catch (err) { next(err); }
};

// POST /quality/cv-inspection
const createCvInspection = async (req, res, next) => {
  try {
    const { workOrderId, imageUrl, thumbnailUrl, modelVersion, predictions } = req.body;

    const overallResult = predictions.some((p) => p.confidence > 0.85 && p.severity === 'CRITICAL') ? 'FAIL'
      : predictions.some((p) => p.confidence > 0.75) ? 'CONDITIONAL_PASS' : 'PASS';

    const inspection = await prisma.cvInspection.create({
      data: { workOrderId, imageUrl, thumbnailUrl, modelVersion, predictions, overallResult },
    });

    created(res, inspection);
  } catch (err) { next(err); }
};

export { getChecks, getCheck, createCheck, getDefectTypes, createDefectType, getAnalytics, createCvInspection };