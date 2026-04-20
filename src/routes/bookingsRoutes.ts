import { Router } from 'express';
import { 
  getBookings, 
  createBooking, 
  updateBookingStatus, 
  deleteBooking 
} from '../controllers/bookingsController';
import { authMiddleware, adminMiddleware } from '../middlewares/authMiddleware';

const router = Router();

// Admin/Protected routes
router.get('/', authMiddleware, getBookings);
router.post('/', authMiddleware, createBooking);
router.patch('/:id/status', authMiddleware, updateBookingStatus);
router.delete('/:id', authMiddleware, adminMiddleware, deleteBooking);

export default router;
