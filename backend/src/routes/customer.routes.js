import { Router } from 'express';
import { getCustomers, getCustomer, createCustomer, updateCustomer, getOrderHistory } from '../controllers/customer.controller.js';
import { authenticate, authorize } from '../middleware/auth.js';

const router = Router();
router.use(authenticate);

router.get('/', getCustomers);
router.get('/:id', getCustomer);
router.get('/:id/order-history', getOrderHistory);
router.post('/', authorize('ORG_ADMIN', 'PRODUCTION_MANAGER'), createCustomer);
router.patch('/:id', authorize('ORG_ADMIN', 'PRODUCTION_MANAGER'), updateCustomer);

export default router;