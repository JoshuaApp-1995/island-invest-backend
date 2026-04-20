import { Router } from 'express';
import { createInquiry, getInquiries, updateInquiryStatus, deleteInquiry } from '../controllers/contactController';
import { authMiddleware, adminMiddleware } from '../middlewares/authMiddleware';

const router = Router();

router.post('/', createInquiry);
router.get('/', authMiddleware, adminMiddleware, getInquiries);
router.patch('/:id/status', authMiddleware, adminMiddleware, updateInquiryStatus);
router.delete('/:id', authMiddleware, adminMiddleware, deleteInquiry);

export default router;
