import { Router } from 'express';
import { chat, submitFeedback, getHistory, getFactoryContext } from '../controllers/ai.controller.js';
import { authenticate, authorize } from '../middleware/auth.js';

const router = Router();
router.use(authenticate);

router.get('/context', getFactoryContext);
router.get('/chat/history', getHistory);
router.post('/chat', chat);
router.patch('/chat/:id/feedback', submitFeedback);

export default router;