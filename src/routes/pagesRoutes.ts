import { Router } from 'express';
import { 
  getPages, 
  getPageBySlug, 
  createPage, 
  updatePage, 
  deletePage 
} from '../controllers/pagesController';
import { authMiddleware, adminMiddleware } from '../middlewares/authMiddleware';

const router = Router();

// Public routes
router.get('/', getPages);
router.get('/:slug', getPageBySlug);

// Admin routes
router.post('/', authMiddleware, adminMiddleware, createPage);
router.put('/:id', authMiddleware, adminMiddleware, updatePage);
router.delete('/:id', authMiddleware, adminMiddleware, deletePage);

export default router;
