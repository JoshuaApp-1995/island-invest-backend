import { Router } from 'express';
import { getSettings, updateSettings } from '../controllers/settingsController';
import { authMiddleware, adminMiddleware } from '../middlewares/authMiddleware';

const router = Router();

// Public (to get site name/logo)
router.get('/', getSettings);

// Admin only
router.put('/', authMiddleware, adminMiddleware, updateSettings);

export default router;
