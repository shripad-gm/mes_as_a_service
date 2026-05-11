import prisma from '../config/db.js';
import { ok, calcEfficiency, calcDhu, calcOee, startOfDay, endOfDay, startOfMonth } from '../utils/helpers.js';

// GET /kpi/dashboard — master KPI card data (one call for home screen)
export const getDashboard = async (req, res, next) => {
    try {
        const { facilityId } = req.query;
        const dayStart = startOfDay();
        const dayEnd = endOfDay();
        const monthStart = startOfMonth();

        const orgWhere = { organizationId: req.orgId };
        const facilityFilter = facilityId ? { facilityId } : {};

        const [
            todayLogs,
            monthOrders,
            activeWOs,
            lowStockCount,
            machineBreakdowns,
            todayQc,
            todayAttendance,
            totalEmployees,
        ] = await Promise.all([
            // Today's production
            prisma.productionLog.aggregate({
                where: { workOrder: { order: orgWhere }, logTime: { gte: dayStart, lte: dayEnd } },
                _sum: { piecesCompleted: true, defectivePieces: true },
            }),
            // Month orders stats
            prisma.order.aggregate({
                where: { ...orgWhere, orderDate: { gte: monthStart } },
                _count: { id: true },
                _sum: { totalAmount: true, totalPieces: true },
            }),
            // Active work orders
            prisma.workOrder.count({
                where: { order: orgWhere, status: { in: ['RELEASED', 'IN_PROGRESS'] } },
            }),
            // Low stock materials
            prisma.$queryRaw`
        SELECT COUNT(*) as count FROM (
          SELECT m.id, m."minStockLevel",
            COALESCE(SUM(sm.quantity), 0) as current_stock
          FROM materials m
          LEFT JOIN stock_movements sm ON sm."materialId" = m.id
          WHERE m."organizationId" = ${req.orgId} AND m."isActive" = true
          GROUP BY m.id, m."minStockLevel"
          HAVING COALESCE(SUM(sm.quantity), 0) <= m."minStockLevel"
        ) sub
      `,
            // Machine breakdowns today
            prisma.machineDowntime.count({
                where: { machine: { workCenter: orgWhere }, startTime: { gte: dayStart }, reason: 'BREAKDOWN' },
            }),
            // Today's QC summary
            prisma.qualityCheck.groupBy({
                by: ['result'],
                where: { workOrder: { order: orgWhere }, inspectedAt: { gte: dayStart, lte: dayEnd } },
                _count: { id: true },
            }),
            // Today's present count
            prisma.attendance.count({
                where: { employee: orgWhere, date: dayStart, status: { in: ['PRESENT', 'LATE', 'HALF_DAY'] } },
            }),
            prisma.employee.count({ where: { ...orgWhere, isActive: true } }),
        ]);

        const todayPieces = todayLogs._sum.piecesCompleted || 0;
        const todayDefects = todayLogs._sum.defectivePieces || 0;
        const qcByResult = Object.fromEntries(todayQc.map((q) => [q.result, q._count.id]));

        ok(res, {
            production: {
                todayPieces,
                todayDefects,
                todayDhu: calcDhu(todayDefects, todayPieces),
            },
            orders: {
                monthCount: monthOrders._count.id,
                monthRevenue: monthOrders._sum.totalAmount || 0,
                monthPieces: monthOrders._sum.totalPieces || 0,
                activeWorkOrders: activeWOs,
            },
            quality: {
                todayChecks: todayQc.reduce((s, q) => s + q._count.id, 0),
                passRate: (qcByResult.PASS || 0),
                failCount: (qcByResult.FAIL || 0),
            },
            inventory: {
                lowStockAlerts: Number(lowStockCount[0]?.count || 0),
            },
            machines: {
                breakdownsToday: machineBreakdowns,
            },
            workforce: {
                presentToday: todayAttendance,
                totalActive: totalEmployees,
                attendanceRate: totalEmployees > 0 ? Math.round((todayAttendance / totalEmployees) * 100) : 0,
            },
        });
    } catch (err) { next(err); }
};

// GET /kpi/efficiency  — line efficiency over time
export const getEfficiencyTrend = async (req, res, next) => {
    try {
        const { from, to, granularity = 'daily', workCenterId } = req.query;
        const dateFilter = { ...(from ? { gte: new Date(from) } : { gte: startOfMonth() }), ...(to ? { lte: new Date(to) } : {}) };

        const ops = await prisma.workOrderOperation.findMany({
            where: {
                workOrder: { order: { organizationId: req.orgId } },
                status: 'COMPLETE',
                actualMinutes: { gt: 0 },
                actualEndTime: dateFilter,
                ...(workCenterId ? { workCenterId } : {}),
            },
            select: { smv: true, completedPieces: true, actualMinutes: true, actualEndTime: true },
            orderBy: { actualEndTime: 'asc' },
        });

        // Group by day/week/month
        const groups = {};
        for (const op of ops) {
            const d = new Date(op.actualEndTime);
            let key;
            if (granularity === 'weekly') {
                const weekStart = new Date(d); weekStart.setDate(d.getDate() - d.getDay());
                key = weekStart.toISOString().split('T')[0];
            } else if (granularity === 'monthly') {
                key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
            } else {
                key = d.toISOString().split('T')[0];
            }
            if (!groups[key]) groups[key] = { date: key, totalSMV: 0, totalMinutes: 0, pieces: 0 };
            groups[key].totalSMV += (op.smv || 0) * op.completedPieces;
            groups[key].totalMinutes += op.actualMinutes || 0;
            groups[key].pieces += op.completedPieces;
        }

        const trend = Object.values(groups).map((g) => ({
            ...g,
            efficiency: g.totalMinutes > 0 ? Math.round((g.totalSMV / g.totalMinutes) * 100) : 0,
        }));

        ok(res, trend);
    } catch (err) { next(err); }
};

// GET /kpi/dhu  — Defects per Hundred Units trend
export const getDhuTrend = async (req, res, next) => {
    try {
        const { from, to, checkStage } = req.query;
        const dateFilter = { ...(from ? { gte: new Date(from) } : { gte: startOfMonth() }), ...(to ? { lte: new Date(to) } : {}) };

        const checks = await prisma.qualityCheck.findMany({
            where: {
                workOrder: { order: { organizationId: req.orgId } },
                inspectedAt: dateFilter,
                ...(checkStage ? { checkStage } : {}),
            },
            select: { inspectedAt: true, sampleSize: true, failedCount: true, checkStage: true },
            orderBy: { inspectedAt: 'asc' },
        });

        const daily = {};
        for (const c of checks) {
            const key = new Date(c.inspectedAt).toISOString().split('T')[0];
            if (!daily[key]) daily[key] = { date: key, totalPieces: 0, totalDefects: 0 };
            daily[key].totalPieces += c.sampleSize;
            daily[key].totalDefects += c.failedCount;
        }

        const trend = Object.values(daily).map((d) => ({
            ...d,
            dhu: calcDhu(d.totalDefects, d.totalPieces),
        }));

        ok(res, trend);
    } catch (err) { next(err); }
};

// GET /kpi/oee  — Overall Equipment Effectiveness
export const getOee = async (req, res, next) => {
    try {
        const { from, to, workCenterId } = req.query;
        const dayStart = from ? new Date(from) : startOfMonth();
        const dayEnd = to ? new Date(to) : new Date();

        const totalMinutes = (dayEnd - dayStart) / 60000;

        const [downtimes, logs, plannedPieces, actualPieces, defectPieces] = await Promise.all([
            prisma.machineDowntime.aggregate({
                where: {
                    machine: { workCenter: { organizationId: req.orgId, ...(workCenterId ? { id: workCenterId } : {}) } },
                    startTime: { gte: dayStart },
                    endTime: { lte: dayEnd, not: null },
                },
                _sum: { durationMinutes: true },
            }),
            prisma.productionLog.aggregate({
                where: {
                    workCenter: { organizationId: req.orgId, ...(workCenterId ? { id: workCenterId } : {}) },
                    logTime: { gte: dayStart, lte: dayEnd },
                },
                _sum: { piecesCompleted: true, defectivePieces: true },
            }),
            prisma.workOrderOperation.aggregate({
                where: {
                    workCenter: { organizationId: req.orgId, ...(workCenterId ? { id: workCenterId } : {}) },
                    plannedStartTime: { gte: dayStart },
                    plannedEndTime: { lte: dayEnd },
                },
                _sum: { plannedPieces: true },
            }),
            prisma.productionLog.aggregate({
                where: { workCenter: { organizationId: req.orgId }, logTime: { gte: dayStart, lte: dayEnd } },
                _sum: { piecesCompleted: true },
            }),
            prisma.productionLog.aggregate({
                where: { workCenter: { organizationId: req.orgId }, logTime: { gte: dayStart, lte: dayEnd } },
                _sum: { defectivePieces: true },
            }),
        ]);

        const downtimeMin = downtimes._sum.durationMinutes || 0;
        const availableMin = totalMinutes - downtimeMin;
        const availability = totalMinutes > 0 ? availableMin / totalMinutes : 0;

        const actual = actualPieces._sum.piecesCompleted || 0;
        const planned = plannedPieces._sum.plannedPieces || 1;
        const performance = Math.min(actual / planned, 1);

        const defects = defectPieces._sum.defectivePieces || 0;
        const quality = actual > 0 ? (actual - defects) / actual : 1;

        ok(res, {
            availability: Math.round(availability * 100),
            performance: Math.round(performance * 100),
            quality: Math.round(quality * 100),
            oee: Math.round(calcOee(availability, performance, quality) * 100),
            downtimeMinutes: downtimeMin,
            periodDays: Math.round((dayEnd - dayStart) / 86400000),
        });
    } catch (err) { next(err); }
};

// GET /kpi/order-fulfillment  — on-time delivery rate, lead time avg
export const getOrderFulfillment = async (req, res, next) => {
    try {
        const { from, to } = req.query;
        const dateFilter = { ...(from ? { gte: new Date(from) } : { gte: startOfMonth() }), ...(to ? { lte: new Date(to) } : {}) };

        const orders = await prisma.order.findMany({
            where: {
                organizationId: req.orgId,
                status: { in: ['SHIPPED', 'DELIVERED'] },
                shippedDate: dateFilter,
            },
            select: { requiredDate: true, promisedDate: true, shippedDate: true, totalPieces: true, completedPieces: true, orderDate: true },
        });

        const onTime = orders.filter((o) => o.shippedDate && o.requiredDate && new Date(o.shippedDate) <= new Date(o.requiredDate));
        const avgLeadDays = orders.length > 0
            ? orders.reduce((s, o) => s + (new Date(o.shippedDate) - new Date(o.orderDate)) / 86400000, 0) / orders.length
            : 0;

        ok(res, {
            totalShipped: orders.length,
            onTimeDeliveries: onTime.length,
            onTimeRate: orders.length > 0 ? Math.round((onTime.length / orders.length) * 100) : 0,
            avgLeadDays: Math.round(avgLeadDays * 10) / 10,
        });
    } catch (err) { next(err); }
};

// POST /kpi/snapshots  — save computed KPI snapshot
export const saveSnapshot = async (req, res, next) => {
    try {
        const { snapshotDate, granularity, metric, value, unit, dimensionKey, dimensionValue, facilityId } = req.body;
        const snapshot = await prisma.kpiSnapshot.upsert({
            where: {
                organizationId_snapshotDate_granularity_metric_dimensionKey_dimensionValue: {
                    organizationId: req.orgId,
                    snapshotDate: new Date(snapshotDate),
                    granularity,
                    metric,
                    dimensionKey: dimensionKey || '',
                    dimensionValue: dimensionValue || '',
                },
            },
            create: { organizationId: req.orgId, facilityId, snapshotDate: new Date(snapshotDate), granularity, metric, value, unit, dimensionKey, dimensionValue },
            update: { value, unit },
        });
        ok(res, snapshot);
    } catch (err) { next(err); }
};

// GET /kpi/snapshots  — historical KPI data for charting
export const getSnapshots = async (req, res, next) => {
    try {
        const { metric, granularity, from, to, dimensionKey } = req.query;
        const snapshots = await prisma.kpiSnapshot.findMany({
            where: {
                organizationId: req.orgId,
                ...(metric ? { metric } : {}),
                ...(granularity ? { granularity } : {}),
                ...(dimensionKey ? { dimensionKey } : {}),
                ...(from || to ? { snapshotDate: { ...(from ? { gte: new Date(from) } : {}), ...(to ? { lte: new Date(to) } : {}) } } : {}),
            },
            orderBy: { snapshotDate: 'asc' },
        });
        ok(res, snapshots);
    } catch (err) { next(err); }
};