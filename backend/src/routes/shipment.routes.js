import { Router } from 'express';
import { getShipments, getShipment, createShipment, updateShipmentStatus, addPackingList } from '../controllers/shipment.controller.js';
import { authenticate, authorize } from '../middleware/auth.js';

const router = Router();
router.use(authenticate);

router.get('/', getShipments);
router.get('/:id', getShipment);
router.post('/', authorize('ORG_ADMIN', 'PRODUCTION_MANAGER'), createShipment);
router.patch('/:id/status', authorize('ORG_ADMIN', 'PRODUCTION_MANAGER'), updateShipmentStatus);
router.post('/:id/packing-list', authorize('ORG_ADMIN', 'PRODUCTION_MANAGER'), addPackingList);

export default router;