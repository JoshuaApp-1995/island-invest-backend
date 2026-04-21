import { Router } from 'express';
import { login, register, getMe, googleAuth, facebookAuth } from '../controllers/authController';
import { authMiddleware } from '../middlewares/authMiddleware';

const router = Router();

router.post('/register', register);
router.post('/login', login);
router.post('/google', googleAuth);
router.post('/facebook', facebookAuth);
router.get('/me', authMiddleware, getMe);

export default router;
