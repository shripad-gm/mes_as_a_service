import { Router } from 'express';
import { getChecks, getCheck, createCheck, getDefectTypes, createDefectType, getAnalytics, createCvInspection } from '../controllers/quality.controller.js';
import { authenticate, authorize } from '../middleware/auth.js';

const router = Router();
router.use(authenticate);

router.get('/analytics', getAnalytics);
router.get('/defect-types', getDefectTypes);
router.post('/defect-types', authorize('ORG_ADMIN', 'PRODUCTION_MANAGER'), createDefectType);
router.get('/checks', getChecks);
router.get('/checks/:id', getCheck);
router.post('/checks', authorize('ORG_ADMIN', 'PRODUCTION_MANAGER', 'SUPERVISOR', 'QUALITY_INSPECTOR'), createCheck);
router.post('/cv-inspection', authorize('ORG_ADMIN', 'PRODUCTION_MANAGER', 'QUALITY_INSPECTOR'), createCvInspection);

export default router;