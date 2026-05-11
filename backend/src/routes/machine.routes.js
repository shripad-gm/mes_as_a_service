import { Router } from 'express';
import { getMachines, createMachine, updateMachine, startDowntime, resolveDowntime, logMaintenance, maintenanceDue } from '../controllers/machine.controller.js';
import { authenticate, authorize } from '../middleware/auth.js';

const router = Router();
router.use(authenticate);

router.get('/maintenance-due', maintenanceDue);
router.get('/', getMachines);
router.post('/', authorize('ORG_ADMIN', 'PRODUCTION_MANAGER'), createMachine);
router.patch('/:id', authorize('ORG_ADMIN', 'PRODUCTION_MANAGER'), updateMachine);
router.post('/:id/downtime/start', startDowntime);
router.patch('/downtime/:downtimeId/resolve', authorize('ORG_ADMIN', 'PRODUCTION_MANAGER', 'SUPERVISOR'), resolveDowntime);
router.post('/:id/maintenance', authorize('ORG_ADMIN', 'PRODUCTION_MANAGER'), logMaintenance);

export default router;