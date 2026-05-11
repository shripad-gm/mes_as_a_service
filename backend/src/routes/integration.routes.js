import { Router } from 'express';
import { getIntegrations, upsertIntegration, toggleIntegration, receiveWebhook } from '../controllers/integration.controller.js';
import { authenticate, authorize } from '../middleware/auth.js';

const router = Router();

// Webhook endpoint is unauthenticated (external services call it)
router.post('/webhook/:type', receiveWebhook);

router.use(authenticate);

router.get('/', getIntegrations);
router.post('/', authorize('ORG_ADMIN'), upsertIntegration);
router.patch('/:id/toggle', authorize('ORG_ADMIN'), toggleIntegration);

export default router;