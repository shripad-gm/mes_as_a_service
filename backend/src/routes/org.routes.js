import { Router } from 'express';
import { getMyOrg, updateMyOrg } from '../controllers/org.controller.js';
import { authenticate, authorize } from '../middleware/auth.js';

const router = Router();

router.use(authenticate);

router.get('/me', getMyOrg);
router.patch('/me', authorize('ORG_ADMIN'), updateMyOrg);

export default router;