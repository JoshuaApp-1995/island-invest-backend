import { Router } from 'express';
import { getConversations, getMessages, sendMessage, startConversation } from '../controllers/messageController';
import { authMiddleware } from '../middlewares/authMiddleware';

const router = Router();

router.get('/conversations', authMiddleware, getConversations);
router.get('/conversations/:id', authMiddleware, getMessages);
router.post('/send', authMiddleware, sendMessage);
router.post('/start-conversation', authMiddleware, startConversation);

export default router;
