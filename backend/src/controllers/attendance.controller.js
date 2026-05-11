import prisma from '../config/db.js';
import { ok, created, getPagination, paginatedResponse, startOfDay, endOfDay } from '../utils/helpers.js';

// POST /attendance/mark  — mark single or bulk attendance
const markAttendance = async (req, res, next) => {
  try {
    const { records } = req.body; // [{ employeeId, date, status, checkInTime, checkOutTime, shiftId, overtimeMin }]

    const upserts = await Promise.all(
      records.map((r) =>
        prisma.attendance.upsert({
          where: { employeeId_date: { employeeId: r.employeeId, date: new Date(r.date) } },
          create: { ...r, date: new Date(r.date) },
          update: { status: r.status, checkInTime: r.checkInTime, checkOutTime: r.checkOutTime, overtimeMin: r.overtimeMin, shiftId: r.shiftId },
        })
      )
    );

    ok(res, upserts, `${upserts.length} attendance records saved`);
  } catch (err) { next(err); }
};

// GET /attendance  — query by date / employee / department
const getAttendance = async (req, res, next) => {
  try {
    const { page, limit, skip } = getPagination(req.query);
    const { date, from, to, employeeId, status } = req.query;

    const where = {
      employee: { organizationId: req.orgId },
      ...(employeeId ? { employeeId } : {}),
      ...(status ? { status } : {}),
      ...(date ? { date: new Date(date) } : {}),
      ...(from || to ? { date: { ...(from ? { gte: new Date(from) } : {}), ...(to ? { lte: new Date(to) } : {}) } } : {}),
    };

    const [records, total] = await Promise.all([
      prisma.attendance.findMany({
        where, skip, take: limit,
        include: { employee: { select: { id: true, fullName: true, employeeCode: true } }, shift: true },
        orderBy: [{ date: 'desc' }, { employee: { fullName: 'asc' } }],
      }),
      prisma.attendance.count({ where }),
    ]);
    ok(res, paginatedResponse(records, total, page, limit));
  } catch (err) { next(err); }
};

// GET /attendance/summary  — daily headcount + absenteeism
const getDailySummary = async (req, res, next) => {
  try {
    const date = req.query.date ? new Date(req.query.date) : new Date();

    const [counts, totalActive] = await Promise.all([
      prisma.attendance.groupBy({
        by: ['status'],
        where: { date, employee: { organizationId: req.orgId } },
        _count: { id: true },
      }),
      prisma.employee.count({ where: { organizationId: req.orgId, isActive: true } }),
    ]);

    const byStatus = Object.fromEntries(counts.map((c) => [c.status, c._count.id]));
    const present = (byStatus.PRESENT || 0) + (byStatus.LATE || 0) + (byStatus.HALF_DAY || 0);

    ok(res, { date, totalActive, present, absent: byStatus.ABSENT || 0, leave: byStatus.LEAVE || 0, byStatus, attendanceRate: totalActive > 0 ? Math.round((present / totalActive) * 100) : 0 });
  } catch (err) { next(err); }
};

// POST /attendance/leave-request
const applyLeave = async (req, res, next) => {
  try {
    const { employeeId, leaveType, fromDate, toDate, reason } = req.body;
    const leave = await prisma.leaveRequest.create({
      data: { employeeId, leaveType, fromDate: new Date(fromDate), toDate: new Date(toDate), reason },
    });
    created(res, leave);
  } catch (err) { next(err); }
};

// PATCH /attendance/leave-request/:id/approve
const approveLeave = async (req, res, next) => {
  try {
    const { status } = req.body; // APPROVED | REJECTED
    const leave = await prisma.leaveRequest.update({
      where: { id: req.params.id },
      data: { status, approvedById: req.user.id },
    });
    ok(res, leave);
  } catch (err) { next(err); }
};

// GET /attendance/shifts
const getShifts = async (req, res, next) => {
  try {
    const shifts = await prisma.shift.findMany({
      where: { organizationId: req.orgId, isActive: true },
    });
    ok(res, shifts);
  } catch (err) { next(err); }
};

const createShift = async (req, res, next) => {
  try {
    const shift = await prisma.shift.create({ data: { organizationId: req.orgId, ...req.body } });
    created(res, shift);
  } catch (err) { next(err); }
};

export { markAttendance, getAttendance, getDailySummary, applyLeave, approveLeave, getShifts, createShift };