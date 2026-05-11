import prisma from '../config/db.js';
import { ok, created, getPagination, paginatedResponse } from '../utils/helpers.js';

// POST /ai/chat  — log a query + response (call your AI service before saving)
export const chat = async (req, res, next) => {
    try {
        const { sessionId, query, response, ragContext, modelUsed, latencyMs } = req.body;

        const log = await prisma.aiAssistantLog.create({
            data: {
                organizationId: req.orgId,
                userId: req.user.id,
                sessionId,
                query,
                response,
                ragContext: ragContext || undefined,
                modelUsed,
                latencyMs,
            },
        });

        ok(res, log);
    } catch (err) { next(err); }
};

// PATCH /ai/chat/:id/feedback  — thumbs up/down
export const submitFeedback = async (req, res, next) => {
    try {
        const { feedback } = req.body; // -1, 0, or 1
        const log = await prisma.aiAssistantLog.update({
            where: { id: req.params.id },
            data: { feedback },
        });
        ok(res, log);
    } catch (err) { next(err); }
};

// GET /ai/chat/history  — past sessions for the user
export const getHistory = async (req, res, next) => {
    try {
        const { page, limit, skip } = getPagination(req.query);
        const { sessionId } = req.query;

        const where = {
            organizationId: req.orgId,
            userId: req.user.id,
            ...(sessionId ? { sessionId } : {}),
        };

        const [logs, total] = await Promise.all([
            prisma.aiAssistantLog.findMany({
                where, skip, take: limit,
                select: { id: true, sessionId: true, query: true, response: true, modelUsed: true, latencyMs: true, feedback: true, createdAt: true },
                orderBy: { createdAt: 'desc' },
            }),
            prisma.aiAssistantLog.count({ where }),
        ]);

        ok(res, paginatedResponse(logs, total, page, limit));
    } catch (err) { next(err); }
};

// GET /ai/context  — fetch live factory context for RAG injection
// Returns aggregated KPIs + alerts to inject into AI prompt
export const getFactoryContext = async (req, res, next) => {
    try {
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        const [activeWOs, lowStockMaterials, recentQcFails, machineBreakdowns, overdueOrders] = await Promise.all([
            prisma.workOrder.findMany({
                where: { order: { organizationId: req.orgId }, status: { in: ['RELEASED', 'IN_PROGRESS'] } },
                select: { workOrderNumber: true, status: true, totalPieces: true, completedPieces: true, plannedEndDate: true },
                take: 10,
            }),
            prisma.$queryRaw`
        SELECT m.name, m.code, m.unit, m."minStockLevel",
          COALESCE(SUM(sm.quantity), 0) as current_stock
        FROM materials m
        LEFT JOIN stock_movements sm ON sm."materialId" = m.id
        WHERE m."organizationId" = ${req.orgId} AND m."isActive" = true
        GROUP BY m.id, m.name, m.code, m.unit, m."minStockLevel"
        HAVING COALESCE(SUM(sm.quantity), 0) <= m."minStockLevel"
        LIMIT 5
      `,
            prisma.qualityCheck.findMany({
                where: { workOrder: { order: { organizationId: req.orgId } }, result: 'FAIL', inspectedAt: { gte: today } },
                select: { workOrder: { select: { workOrderNumber: true } }, checkStage: true, failedCount: true, sampleSize: true },
                take: 5,
            }),
            prisma.machineDowntime.findMany({
                where: { machine: { workCenter: { organizationId: req.orgId } }, endTime: null },
                select: { machine: { select: { name: true, workCenter: { select: { name: true } } } }, reason: true, startTime: true },
                take: 5,
            }),
            prisma.order.findMany({
                where: { organizationId: req.orgId, requiredDate: { lt: new Date() }, status: { notIn: ['DELIVERED', 'CANCELLED', 'SHIPPED'] } },
                select: { orderNumber: true, requiredDate: true, status: true, customer: { select: { name: true } } },
                take: 5,
            }),
        ]);

        // Build a concise context string for RAG
        const contextText = `
FACTORY LIVE CONTEXT (${new Date().toISOString()}):
Active Work Orders: ${activeWOs.length}
${activeWOs.map((wo) => `- ${wo.workOrderNumber}: ${wo.completedPieces}/${wo.totalPieces} pieces, ends ${wo.plannedEndDate?.toISOString().split('T')[0]}`).join('\n')}

Low Stock Materials: ${lowStockMaterials.length}
${lowStockMaterials.map((m) => `- ${m.name} (${m.code}): ${m.current_stock} ${m.unit} (min: ${m.minStockLevel})`).join('\n')}

Today's QC Failures: ${recentQcFails.length}
${recentQcFails.map((q) => `- WO ${q.workOrder.workOrderNumber} at ${q.checkStage}: ${q.failedCount}/${q.sampleSize} failed`).join('\n')}

Active Machine Breakdowns: ${machineBreakdowns.length}
${machineBreakdowns.map((d) => `- ${d.machine.name} at ${d.machine.workCenter.name}: ${d.reason} since ${d.startTime}`).join('\n')}

Overdue Orders: ${overdueOrders.length}
${overdueOrders.map((o) => `- ${o.orderNumber} for ${o.customer.name}: due ${o.requiredDate?.toISOString().split('T')[0]}, status ${o.status}`).join('\n')}
    `.trim();

        ok(res, {
            contextText,
            structured: { activeWOs, lowStockMaterials, recentQcFails, machineBreakdowns, overdueOrders },
        });
    } catch (err) { next(err); }
};