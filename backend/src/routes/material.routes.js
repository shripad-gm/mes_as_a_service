import { Router } from 'express';
import { getMaterials, getMaterial, createMaterial, updateMaterial, stockIn, adjustStock, stockSummary, getMovements } from '../controllers/material.controller.js';
import { authenticate, authorize } from '../middleware/auth.js';

const router = Router();
router.use(authenticate);

router.get('/stock-summary', stockSummary);
router.get('/', getMaterials);
router.get('/:id', getMaterial);
router.get('/:id/movements', getMovements);
router.post('/', authorize('ORG_ADMIN', 'PRODUCTION_MANAGER', 'STORE_KEEPER'), createMaterial);
router.patch('/:id', authorize('ORG_ADMIN', 'PRODUCTION_MANAGER', 'STORE_KEEPER'), updateMaterial);
router.post('/:id/stock-in', authorize('ORG_ADMIN', 'PRODUCTION_MANAGER', 'STORE_KEEPER'), stockIn);
router.post('/:id/adjust', authorize('ORG_ADMIN', 'STORE_KEEPER'), adjustStock);

export default router;