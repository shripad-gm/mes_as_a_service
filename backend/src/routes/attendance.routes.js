import { Router } from 'express';
import { markAttendance, getAttendance, getDailySummary, applyLeave, approveLeave, getShifts, createShift } from '../controllers/attendance.controller.js';
import { authenticate, authorize } from '../middleware/auth.js';

const router = Router();
router.use(authenticate);

router.get('/summary', getDailySummary);
router.get('/shifts', getShifts);
router.post('/shifts', authorize('ORG_ADMIN', 'PRODUCTION_MANAGER'), createShift);
router.get('/', getAttendance);
router.post('/mark', authorize('ORG_ADMIN', 'PRODUCTION_MANAGER', 'SUPERVISOR'), markAttendance);
router.post('/leave-request', applyLeave);
router.patch('/leave-request/:id/approve', authorize('ORG_ADMIN', 'PRODUCTION_MANAGER'), approveLeave);

export default router;