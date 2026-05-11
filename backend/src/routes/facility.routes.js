import { Router } from 'express';
import { getFacilities, createFacility, updateFacility, addFloor } from '../controllers/org.controller.js';
import { authenticate, authorize } from '../middleware/auth.js';

const router = Router();

router.use(authenticate);

router.get('/', getFacilities);
router.post('/', authorize('ORG_ADMIN', 'PRODUCTION_MANAGER'), createFacility);
router.patch('/:id', authorize('ORG_ADMIN', 'PRODUCTION_MANAGER'), updateFacility);
router.post('/:id/floors', authorize('ORG_ADMIN', 'PRODUCTION_MANAGER'), addFloor);

export default router;