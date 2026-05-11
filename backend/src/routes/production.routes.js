import { Router } from 'express';
import { createLog, floorDashboard, getBottlenecks, getEfficiency, getTimeline } from '../controllers/production.controller.js';
import { authenticate, authorize } from '../middleware/auth.js';

const router = Router();
router.use(authenticate);

router.get('/floor-dashboard', floorDashboard);
router.get('/bottlenecks', getBottlenecks);
router.get('/efficiency', getEfficiency);
router.get('/work-orders/:id/timeline', getTimeline);
router.post('/log', authorize('ORG_ADMIN', 'PRODUCTION_MANAGER', 'SUPERVISOR', 'FLOOR_OPERATOR'), createLog);

export default router;