import { Router } from 'express';
import { getSuppliers, getSupplier, createSupplier, updateSupplier, linkMaterial, getSupplierPerformance } from '../controllers/supplier.controller.js';
import { authenticate, authorize } from '../middleware/auth.js';

const router = Router();
router.use(authenticate);

router.get('/', getSuppliers);
router.get('/:id', getSupplier);
router.get('/:id/performance', getSupplierPerformance);
router.post('/', authorize('ORG_ADMIN', 'PRODUCTION_MANAGER', 'STORE_KEEPER'), createSupplier);
router.patch('/:id', authorize('ORG_ADMIN', 'PRODUCTION_MANAGER', 'STORE_KEEPER'), updateSupplier);
router.post('/:id/materials', authorize('ORG_ADMIN', 'STORE_KEEPER'), linkMaterial);

export default router;