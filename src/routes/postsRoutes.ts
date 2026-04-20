import { Router } from 'express';
import { 
  getPosts, 
  getPostBySlug, 
  createPost, 
  updatePost, 
  deletePost 
} from '../controllers/postsController';
import { authMiddleware, adminMiddleware } from '../middlewares/authMiddleware';

const router = Router();

// Public routes
router.get('/', getPosts);
router.get('/:slug', getPostBySlug);

// Admin routes
router.post('/', authMiddleware, adminMiddleware, createPost);
router.put('/:id', authMiddleware, adminMiddleware, updatePost);
router.delete('/:id', authMiddleware, adminMiddleware, deletePost);

export default router;
