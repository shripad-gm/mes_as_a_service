import prisma from '../config/db.js';
import { ok, created } from '../utils/helpers.js';
import { AppError } from '../middleware/errorHandler.js';

// GET /integrations
export const getIntegrations = async (req, res, next) => {
    try {
        const integrations = await prisma.integration.findMany({
            where: { organizationId: req.orgId },
            // Never send config JSON (has credentials) to client
            select: { id: true, type: true, name: true, isActive: true, webhookUrl: true, lastSyncAt: true, createdAt: true },
        });
        ok(res, integrations);
    } catch (err) { next(err); }
};

// POST /integrations  — setup or update an integration
export const upsertIntegration = async (req, res, next) => {
    try {
        const { type, name, webhookUrl, configJson } = req.body;

        const integration = await prisma.integration.upsert({
            where: { organizationId_type: { organizationId: req.orgId, type } },
            create: { organizationId: req.orgId, type, name, webhookUrl, configJson, isActive: false },
            update: { name, webhookUrl, configJson },
            select: { id: true, type: true, name: true, isActive: true, webhookUrl: true, lastSyncAt: true },
        });

        created(res, integration);
    } catch (err) { next(err); }
};

// PATCH /integrations/:id/toggle  — enable or disable
export const toggleIntegration = async (req, res, next) => {
    try {
        const integration = await prisma.integration.findFirstOrThrow({
            where: { id: req.params.id, organizationId: req.orgId },
        });

        const updated = await prisma.integration.update({
            where: { id: req.params.id },
            data: { isActive: !integration.isActive },
            select: { id: true, type: true, name: true, isActive: true },
        });

        ok(res, updated, `Integration ${updated.isActive ? 'enabled' : 'disabled'}`);
    } catch (err) { next(err); }
};

// POST /integrations/webhook/:type  — incoming webhook (Shopify order, etc.)
export const receiveWebhook = async (req, res, next) => {
    try {
        const { type } = req.params;
        const integration = await prisma.integration.findFirst({
            where: { organizationId: req.orgId, type, isActive: true },
        });
        if (!integration) throw new AppError('Integration not active', 400);

        // Update last sync timestamp
        await prisma.integration.update({
            where: { id: integration.id },
            data: { lastSyncAt: new Date() },
        });

        // Type-specific processing hooks (extend as needed)
        switch (type) {
            case 'SHOPIFY':
                // TODO: parse Shopify order webhook → create Order in DB
                console.log('Shopify webhook received:', JSON.stringify(req.body).slice(0, 200));
                break;
            case 'WHATSAPP':
                console.log('WhatsApp webhook received:', JSON.stringify(req.body).slice(0, 200));
                break;
            default:
                console.log(`Webhook received for type ${type}`);
        }

        res.json({ received: true });
    } catch (err) { next(err); }
};