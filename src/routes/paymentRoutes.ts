import { Router } from 'express';
import { createCheckoutSession } from '../controllers/paymentController';
import { createPayPalOrder, capturePayPalOrder } from '../controllers/paypalController';
import { authMiddleware } from '../middlewares/authMiddleware';

const router = Router();

router.post('/create-checkout-session', authMiddleware, createCheckoutSession);

// PayPal Routes
router.post('/paypal/create-order', authMiddleware, createPayPalOrder);
router.post('/paypal/capture-order', authMiddleware, capturePayPalOrder);

export default router;
