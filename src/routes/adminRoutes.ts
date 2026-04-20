import { Router } from 'express';
import { authMiddleware, adminMiddleware } from '../middlewares/authMiddleware';
import { 
  getPendingPayments, 
  processPayment, 
  getUsers, 
  updateUserRole, 
  deleteUser, 
  getDashboardStats 
} from '../controllers/adminController';

const router = Router();

router.get('/pending-payments', authMiddleware, adminMiddleware, getPendingPayments);
router.post('/payments/:id', authMiddleware, adminMiddleware, processPayment);
router.get('/users', authMiddleware, adminMiddleware, getUsers);
router.patch('/users/:id/role', authMiddleware, adminMiddleware, updateUserRole);
router.delete('/users/:id', authMiddleware, adminMiddleware, deleteUser);
router.get('/stats', authMiddleware, adminMiddleware, getDashboardStats);

export default router;
