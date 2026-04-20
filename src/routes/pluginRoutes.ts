import { Router } from 'express';
import { getPlugins, togglePlugin } from '../controllers/pluginsController';
import { authMiddleware, adminMiddleware } from '../middlewares/authMiddleware';

const router = Router();

router.get('/', authMiddleware, adminMiddleware, getPlugins);
router.put('/:id/toggle', authMiddleware, adminMiddleware, togglePlugin);

export default router;
