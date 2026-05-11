import { Router } from 'express';
import { getWorkOrders, getWorkOrder, createWorkOrder, releaseWorkOrder, updateOperation, issueMaterial } from '../controllers/workOrder.controller.js';
import { authenticate, authorize } from '../middleware/auth.js';

const router = Router();
router.use(authenticate);

router.get('/', getWorkOrders);
router.get('/:id', getWorkOrder);
router.post('/', authorize('ORG_ADMIN', 'PRODUCTION_MANAGER'), createWorkOrder);
router.patch('/:id/release', authorize('ORG_ADMIN', 'PRODUCTION_MANAGER', 'SUPERVISOR'), releaseWorkOrder);
router.patch('/:id/operations/:opId', authorize('ORG_ADMIN', 'PRODUCTION_MANAGER', 'SUPERVISOR'), updateOperation);
router.post('/:id/material-issue', authorize('ORG_ADMIN', 'PRODUCTION_MANAGER', 'STORE_KEEPER'), issueMaterial);

export default router;