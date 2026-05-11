import { Router } from 'express';
import { getDashboard, getEfficiencyTrend, getDhuTrend, getOee, getOrderFulfillment, saveSnapshot, getSnapshots } from '../controllers/kpi.controller.js';
import { authenticate, authorize } from '../middleware/auth.js';

const router = Router();
router.use(authenticate);

router.get('/dashboard', getDashboard);
router.get('/efficiency', getEfficiencyTrend);
router.get('/dhu', getDhuTrend);
router.get('/oee', getOee);
router.get('/order-fulfillment', getOrderFulfillment);
router.get('/snapshots', getSnapshots);
router.post('/snapshots', authorize('ORG_ADMIN', 'PRODUCTION_MANAGER'), saveSnapshot);

export default router;