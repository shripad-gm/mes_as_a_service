import { Router } from 'express';
import { getUsers, getUser, createUser, updateUser } from '../controllers/user.controller.js';
import { authenticate, authorize } from '../middleware/auth.js';

const router = Router();

router.use(authenticate);

router.get('/', getUsers);
router.get('/:id', getUser);
router.post('/', authorize('ORG_ADMIN'), createUser);
router.patch('/:id', authorize('ORG_ADMIN'), updateUser);

export default router;