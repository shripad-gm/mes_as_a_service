import prisma from '../config/db.js';
import { ok, created, getPagination, paginatedResponse } from '../utils/helpers.js';
import { pushOrgNotification } from '../utils/notifications.js';

// ─── WORK CENTERS ────────────────────────────────────────────

const getWorkCenters = async (req, res, next) => {
  try {
    const { facilityId, type } = req.query;
    const wcs = await prisma.workCenter.findMany({
      where: { organizationId: req.orgId, isActive: true, ...(facilityId ? { facilityId } : {}), ...(type ? { type } : {}) },
      include: {
        machines: { select: { id: true, name: true, status: true } },
        _count: { select: { operations: true } },
      },
      orderBy: { name: 'asc' },
    });
    ok(res, wcs);
  } catch (err) { next(err); }
};

const createWorkCenter = async (req, res, next) => {
  try {
    const wc = await prisma.workCenter.create({ data: { organizationId: req.orgId, ...req.body } });
    created(res, wc);
  } catch (err) { next(err); }
};

const updateWorkCenter = async (req, res, next) => {
  try {
    const wc = await prisma.workCenter.update({ where: { id: req.params.id }, data: req.body });
    ok(res, wc);
  } catch (err) { next(err); }
};

// ─── MACHINES ────────────────────────────────────────────────

const getMachines = async (req, res, next) => {
  try {
    const { page, limit, skip } = getPagination(req.query);
    const { workCenterId, status } = req.query;

    const where = {
      workCenter: { organizationId: req.orgId },
      ...(workCenterId ? { workCenterId } : {}),
      ...(status ? { status } : {}),
    };

    const [machines, total] = await Promise.all([
      prisma.machine.findMany({
        where, skip, take: limit,
        include: {
          workCenter: { select: { id: true, name: true } },
          machineType: { select: { id: true, name: true } },
          _count: { select: { downtimeLogs: true, maintenanceLogs: true } },
        },
        orderBy: { name: 'asc' },
      }),
      prisma.machine.count({ where }),
    ]);
    ok(res, paginatedResponse(machines, total, page, limit));
  } catch (err) { next(err); }
};

const createMachine = async (req, res, next) => {
  try {
    const machine = await prisma.machine.create({ data: req.body });
    created(res, machine);
  } catch (err) { next(err); }
};

const updateMachine = async (req, res, next) => {
  try {
    const machine = await prisma.machine.update({ where: { id: req.params.id }, data: req.body });
    ok(res, machine);
  } catch (err) { next(err); }
};

// ─── DOWNTIME ────────────────────────────────────────────────

// POST /machines/:id/downtime/start
const startDowntime = async (req, res, next) => {
  try {
    const { reason, description } = req.body;
    const machineId = req.params.id;

    const downtime = await prisma.$transaction(async (tx) => {
      const dt = await tx.machineDowntime.create({
        data: { machineId, startTime: new Date(), reason, description, reportedById: req.user.id },
      });
      await tx.machine.update({ where: { id: machineId }, data: { status: reason === 'BREAKDOWN' ? 'BREAKDOWN' : 'MAINTENANCE' } });
      return dt;
    });

    // Alert production managers
    await pushOrgNotification(req.app, {
      orgId: req.orgId,
      roles: ['ORG_ADMIN', 'PRODUCTION_MANAGER', 'SUPERVISOR'],
      type: 'MACHINE_BREAKDOWN',
      title: `Machine Downtime: ${reason}`,
      body: description || `Machine reported ${reason}`,
      referenceId: machineId,
      referenceType: 'Machine',
    });

    created(res, downtime, 'Downtime recorded');
  } catch (err) { next(err); }
};

// PATCH /machines/downtime/:downtimeId/resolve
const resolveDowntime = async (req, res, next) => {
  try {
    const { resolutionNotes } = req.body;
    const endTime = new Date();

    const dt = await prisma.machineDowntime.findUniqueOrThrow({ where: { id: req.params.downtimeId } });
    const durationMinutes = (endTime - new Date(dt.startTime)) / 60000;

    const updated = await prisma.$transaction(async (tx) => {
      const resolved = await tx.machineDowntime.update({
        where: { id: req.params.downtimeId },
        data: { endTime, resolutionNotes, resolvedById: req.user.id, durationMinutes },
      });
      await tx.machine.update({ where: { id: dt.machineId }, data: { status: 'IDLE' } });
      return resolved;
    });

    ok(res, updated, 'Downtime resolved');
  } catch (err) { next(err); }
};

// POST /machines/:id/maintenance
const logMaintenance = async (req, res, next) => {
  try {
    const { type, description, cost, partsReplaced, nextDueDate } = req.body;
    const log = await prisma.maintenanceLog.create({
      data: { machineId: req.params.id, type, description, cost, partsReplaced, nextDueDate: nextDueDate ? new Date(nextDueDate) : null, performedById: req.user.id },
    });

    if (nextDueDate) {
      await prisma.machine.update({ where: { id: req.params.id }, data: { lastServiceDate: new Date(), nextServiceDate: new Date(nextDueDate) } });
    }

    created(res, log);
  } catch (err) { next(err); }
};

// GET /machines/maintenance-due — machines overdue for service
const maintenanceDue = async (req, res, next) => {
  try {
    const machines = await prisma.machine.findMany({
      where: {
        workCenter: { organizationId: req.orgId },
        nextServiceDate: { lte: new Date() },
        status: { not: 'DECOMMISSIONED' },
      },
      include: { workCenter: { select: { name: true } } },
      orderBy: { nextServiceDate: 'asc' },
    });
    ok(res, machines);
  } catch (err) { next(err); }
};

export { getWorkCenters, createWorkCenter, updateWorkCenter, getMachines, createMachine, updateMachine, startDowntime, resolveDowntime, logMaintenance, maintenanceDue };