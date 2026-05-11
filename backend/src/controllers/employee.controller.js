import prisma from '../config/db.js';
import { ok, created, getPagination, paginatedResponse } from '../utils/helpers.js';

// GET /employees
const getEmployees = async (req, res, next) => {
  try {
    const { page, limit, skip } = getPagination(req.query);
    const { facilityId, skillLevel, search, isActive } = req.query;

    const where = {
      organizationId: req.orgId,
      ...(facilityId ? { facilityId } : {}),
      ...(skillLevel ? { skillLevel } : {}),
      ...(isActive !== undefined ? { isActive: isActive === 'true' } : {}),
      ...(search ? { OR: [{ fullName: { contains: search, mode: 'insensitive' } }, { employeeCode: { contains: search, mode: 'insensitive' } }, { phone: { contains: search } }] } : {}),
    };

    const [employees, total] = await Promise.all([
      prisma.employee.findMany({
        where, skip, take: limit,
        select: {
          id: true, employeeCode: true, fullName: true, phone: true, gender: true,
          designation: true, department: true, skillLevel: true, isActive: true,
          joiningDate: true, facility: { select: { name: true } },
        },
        orderBy: { fullName: 'asc' },
      }),
      prisma.employee.count({ where }),
    ]);
    ok(res, paginatedResponse(employees, total, page, limit));
  } catch (err) { next(err); }
};

// GET /employees/:id
const getEmployee = async (req, res, next) => {
  try {
    const emp = await prisma.employee.findFirstOrThrow({
      where: { id: req.params.id, organizationId: req.orgId },
      include: {
        skills: true,
        workCenters: { include: { workCenter: { select: { id: true, name: true, type: true } } } },
        facility: true,
        leaveRequests: { orderBy: { fromDate: 'desc' }, take: 5 },
        incentives: { orderBy: { createdAt: 'desc' }, take: 6 },
      },
    });
    ok(res, emp);
  } catch (err) { next(err); }
};

// POST /employees
const createEmployee = async (req, res, next) => {
  try {
    const count = await prisma.employee.count({ where: { organizationId: req.orgId } });
    const employeeCode = req.body.employeeCode || `EMP-${String(count + 1).padStart(4, '0')}`;

    const emp = await prisma.employee.create({
      data: { organizationId: req.orgId, ...req.body, employeeCode },
    });
    created(res, emp);
  } catch (err) { next(err); }
};

// PATCH /employees/:id
const updateEmployee = async (req, res, next) => {
  try {
    const emp = await prisma.employee.update({ where: { id: req.params.id }, data: req.body });
    ok(res, emp);
  } catch (err) { next(err); }
};

// POST /employees/:id/skills
const upsertSkill = async (req, res, next) => {
  try {
    const { operationType, skillLevel, certifiedAt } = req.body;
    const skill = await prisma.employeeSkill.upsert({
      where: { employeeId_operationType: { employeeId: req.params.id, operationType } },
      create: { employeeId: req.params.id, operationType, skillLevel, certifiedAt: certifiedAt ? new Date(certifiedAt) : null, certifiedBy: req.user.id },
      update: { skillLevel, certifiedAt: certifiedAt ? new Date(certifiedAt) : null },
    });
    ok(res, skill);
  } catch (err) { next(err); }
};

// GET /employees/available — employees with skills matching an operation type
const getAvailableForOperation = async (req, res, next) => {
  try {
    const { operationType, date } = req.query;

    // Find employees with this skill
    const skilled = await prisma.employeeSkill.findMany({
      where: { operationType, employee: { organizationId: req.orgId, isActive: true } },
      include: { employee: { select: { id: true, fullName: true, employeeCode: true, skillLevel: true } } },
      orderBy: { skillLevel: 'desc' },
    });

    // Exclude absent employees on that date
    let available = skilled.map((s) => s.employee);
    if (date) {
      const absences = await prisma.attendance.findMany({
        where: {
          date: new Date(date),
          status: { in: ['ABSENT', 'LEAVE'] },
          employeeId: { in: available.map((e) => e.id) },
        },
        select: { employeeId: true },
      });
      const absentIds = new Set(absences.map((a) => a.employeeId));
      available = available.filter((e) => !absentIds.has(e.id));
    }

    ok(res, available);
  } catch (err) { next(err); }
};

// GET /employees/:id/performance — pieces produced + efficiency
const getPerformance = async (req, res, next) => {
  try {
    const { from, to } = req.query;
    const dateFilter = { ...(from ? { gte: new Date(from) } : {}), ...(to ? { lte: new Date(to) } : {}) };

    const [logs, ops] = await Promise.all([
      prisma.productionLog.aggregate({
        where: { employeeId: req.params.id, ...(from || to ? { logTime: dateFilter } : {}) },
        _sum: { piecesCompleted: true, defectivePieces: true },
        _count: { id: true },
      }),
      prisma.workOrderOperation.findMany({
        where: { assignedEmployeeId: req.params.id, status: 'COMPLETE', ...(from || to ? { actualEndTime: dateFilter } : {}) },
        select: { smv: true, completedPieces: true, actualMinutes: true, efficiency: true },
      }),
    ]);

    const avgEfficiency = ops.length > 0
      ? ops.reduce((s, o) => s + (o.efficiency || 0), 0) / ops.length
      : 0;

    ok(res, {
      totalPieces: logs._sum.piecesCompleted || 0,
      totalDefects: logs._sum.defectivePieces || 0,
      logCount: logs._count.id,
      avgEfficiency: Math.round(avgEfficiency * 100) / 100,
      dhu: logs._sum.piecesCompleted > 0 ? Math.round(((logs._sum.defectivePieces || 0) / logs._sum.piecesCompleted) * 100 * 100) / 100 : 0,
    });
  } catch (err) { next(err); }
};

export { getEmployees, getEmployee, createEmployee, updateEmployee, upsertSkill, getAvailableForOperation, getPerformance };