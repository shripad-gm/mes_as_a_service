import { Router } from 'express';
import { getWorkCenters, createWorkCenter, updateWorkCenter } from '../controllers/machine.controller.js';
import { authenticate, authorize } from '../middleware/auth.js';

const router = Router();
router.use(authenticate);

router.get('/', getWorkCenters);
router.post('/', authorize('ORG_ADMIN', 'PRODUCTION_MANAGER'), createWorkCenter);
router.patch('/:id', authorize('ORG_ADMIN', 'PRODUCTION_MANAGER'), updateWorkCenter);

export default router;