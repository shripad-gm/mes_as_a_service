import { Router } from 'express';
import { getPurchaseOrders, getPurchaseOrder, createPurchaseOrder, updatePoStatus, createGrn } from '../controllers/purchaseOrder.controller.js';
import { authenticate, authorize } from '../middleware/auth.js';

const router = Router();
router.use(authenticate);

router.get('/', getPurchaseOrders);
router.get('/:id', getPurchaseOrder);
router.post('/', authorize('ORG_ADMIN', 'STORE_KEEPER'), createPurchaseOrder);
router.patch('/:id/status', authorize('ORG_ADMIN', 'STORE_KEEPER'), updatePoStatus);
router.post('/:id/grn', authorize('ORG_ADMIN', 'STORE_KEEPER'), createGrn);

export default router;