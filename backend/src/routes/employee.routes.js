import { Router } from 'express';
import { getEmployees, getEmployee, createEmployee, updateEmployee, upsertSkill, getAvailableForOperation, getPerformance } from '../controllers/employee.controller.js';
import { authenticate, authorize } from '../middleware/auth.js';

const router = Router();
router.use(authenticate);

router.get('/available', getAvailableForOperation);
router.get('/', getEmployees);
router.get('/:id', getEmployee);
router.get('/:id/performance', getPerformance);
router.post('/', authorize('ORG_ADMIN', 'PRODUCTION_MANAGER'), createEmployee);
router.patch('/:id', authorize('ORG_ADMIN', 'PRODUCTION_MANAGER'), updateEmployee);
router.post('/:id/skills', authorize('ORG_ADMIN', 'PRODUCTION_MANAGER'), upsertSkill);

export default router;