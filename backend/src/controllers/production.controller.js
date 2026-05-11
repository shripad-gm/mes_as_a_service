import prisma from '../config/db.js';
import { ok, created, calcEfficiency, startOfDay, endOfDay } from '../utils/helpers.js';
import { pushOrgNotification } from '../utils/notifications.js';

// POST /production/log  — hourly/shift production log entry
const createLog = async (req, res, next) => {
  try {
    const { workOrderId, workOrderOpId, employeeId, workCenterId, machineId, piecesCompleted, defectivePieces, logType, notes } = req.body;

    const log = await prisma.$transaction(async (tx) => {
      const entry = await tx.productionLog.create({
        data: { workOrderId, workOrderOpId, employeeId, workCenterId, machineId, piecesCompleted, defectivePieces, logType: logType || 'HOURLY_UPDATE', notes },
      });

      // Update WO completed pieces
      const wo = await tx.workOrder.findUnique({ where: { id: workOrderId } });
      const newCompleted = wo.completedPieces + piecesCompleted;
      const newRejected = wo.rejectedPieces + (defectivePieces || 0);

      const status = newCompleted >= wo.totalPieces ? 'COMPLETE' : 'IN_PROGRESS';
      await tx.workOrder.update({
        where: { id: workOrderId },
        data: { completedPieces: newCompleted, rejectedPieces: newRejected, status, ...(status === 'COMPLETE' ? { actualEndDate: new Date() } : { actualStartDate: wo.actualStartDate || new Date() }) },
      });

      // Update op completed pieces too
      if (workOrderOpId) {
        await tx.workOrderOperation.update({
          where: { id: workOrderOpId },
          data: { completedPieces: { increment: piecesCompleted } },
        });
      }

      return entry;
    });

    // Emit real-time update via Socket.IO
    const io = req.app.get('io');
    if (io) io.to(`org:${req.orgId}`).emit('production_update', { workOrderId, piecesCompleted, defectivePieces });

    created(res, log, 'Production log recorded');
  } catch (err) { next(err); }
};

// GET /production/floor-dashboard  — live status of all work centers today
const floorDashboard = async (req, res, next) => {
  try {
    const { facilityId } = req.query;
    const dayStart = startOfDay();
    const dayEnd = endOfDay();

    const workCenters = await prisma.workCenter.findMany({
      where: { organizationId: req.orgId, isActive: true, ...(facilityId ? { facilityId } : {}) },
      include: {
        machines: { select: { id: true, name: true, status: true } },
        operations: {
          where: { status: { in: ['IN_PROGRESS', 'PENDING'] } },
          include: {
            workOrder: { select: { id: true, workOrderNumber: true, totalPieces: true, completedPieces: true } },
            employee: { select: { id: true, fullName: true } },
          },
          orderBy: { sequence: 'asc' },
          take: 3,
        },
      },
    });

    // Get today's production for each work center
    const wcStats = await Promise.all(
      workCenters.map(async (wc) => {
        const logs = await prisma.productionLog.aggregate({
          where: { workCenterId: wc.id, logTime: { gte: dayStart, lte: dayEnd } },
          _sum: { piecesCompleted: true, defectivePieces: true },
        });

        const downtimes = await prisma.machineDowntime.aggregate({
          where: { machine: { workCenterId: wc.id }, startTime: { gte: dayStart }, endTime: { not: null } },
          _sum: { durationMinutes: true },
        });

        return {
          ...wc,
          todayProduction: logs._sum.piecesCompleted || 0,
          todayDefects: logs._sum.defectivePieces || 0,
          downtimeMinutes: downtimes._sum.durationMinutes || 0,
        };
      })
    );

    ok(res, wcStats);
  } catch (err) { next(err); }
};

// GET /production/bottlenecks  — operations falling behind
const getBottlenecks = async (req, res, next) => {
  try {
    const ops = await prisma.workOrderOperation.findMany({
      where: {
        workOrder: { order: { organizationId: req.orgId } },
        status: 'IN_PROGRESS',
        plannedEndTime: { lt: new Date() },
      },
      include: {
        workOrder: { select: { id: true, workOrderNumber: true, order: { select: { orderNumber: true, requiredDate: true } } } },
        workCenter: { select: { id: true, name: true } },
        employee: { select: { id: true, fullName: true } },
      },
      orderBy: { plannedEndTime: 'asc' },
    });

    ok(res, ops);
  } catch (err) { next(err); }
};

// GET /production/efficiency — efficiency by work center / employee
const getEfficiency = async (req, res, next) => {
  try {
    const { from, to, workCenterId, groupBy = 'workCenter' } = req.query;
    const dateFilter = {
      ...(from ? { gte: new Date(from) } : {}),
      ...(to ? { lte: new Date(to) } : {}),
    };

    const ops = await prisma.workOrderOperation.findMany({
      where: {
        workOrder: { order: { organizationId: req.orgId } },
        status: 'COMPLETE',
        actualMinutes: { not: null },
        ...(workCenterId ? { workCenterId } : {}),
        ...(from || to ? { actualEndTime: dateFilter } : {}),
      },
      include: {
        workCenter: { select: { id: true, name: true } },
        employee: { select: { id: true, fullName: true, employeeCode: true } },
      },
    });

    // Group and aggregate
    const groups = {};
    for (const op of ops) {
      const key = groupBy === 'employee'
        ? op.assignedEmployeeId || 'unassigned'
        : op.workCenterId || 'unassigned';

      const label = groupBy === 'employee'
        ? op.employee?.fullName || 'Unassigned'
        : op.workCenter?.name || 'Unassigned';

      if (!groups[key]) groups[key] = { id: key, name: label, totalSMV: 0, totalMinutes: 0, pieces: 0 };
      groups[key].totalSMV += (op.smv || 0) * op.completedPieces;
      groups[key].totalMinutes += op.actualMinutes || 0;
      groups[key].pieces += op.completedPieces;
    }

    const result = Object.values(groups).map((g) => ({
      ...g,
      efficiency: g.totalMinutes > 0 ? Math.round((g.totalSMV / g.totalMinutes) * 100) : 0,
    })).sort((a, b) => b.efficiency - a.efficiency);

    ok(res, result);
  } catch (err) { next(err); }
};

// GET /production/work-orders/:id/timeline
const getTimeline = async (req, res, next) => {
  try {
    const logs = await prisma.productionLog.findMany({
      where: { workOrderId: req.params.id },
      include: {
        employee: { select: { id: true, fullName: true } },
        workCenter: { select: { id: true, name: true } },
      },
      orderBy: { logTime: 'asc' },
    });
    ok(res, logs);
  } catch (err) { next(err); }
};

export { createLog, floorDashboard, getBottlenecks, getEfficiency, getTimeline };