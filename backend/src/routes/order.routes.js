import { Router } from 'express';
import { getOrders, getOrder, createOrder, updateOrder, updateOrderStatus, assignOrder, getDashboard } from '../controllers/order.controller.js';
import { authenticate, authorize } from '../middleware/auth.js';

const router = Router();
router.use(authenticate);

router.get('/dashboard', getDashboard);
router.get('/', getOrders);
router.get('/:id', getOrder);
router.post('/', authorize('ORG_ADMIN', 'PRODUCTION_MANAGER'), createOrder);
router.patch('/:id', authorize('ORG_ADMIN', 'PRODUCTION_MANAGER'), updateOrder);
router.patch('/:id/status', authorize('ORG_ADMIN', 'PRODUCTION_MANAGER'), updateOrderStatus);
router.post('/:id/assign', authorize('ORG_ADMIN', 'PRODUCTION_MANAGER'), assignOrder);

export default router;