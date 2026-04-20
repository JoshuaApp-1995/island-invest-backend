import { Response } from 'express';
import { AuthRequest } from '../middlewares/authMiddleware';
import prisma from '../config/database';
import axios from 'axios';

const db = prisma as any;

const getPayPalAccessToken = async () => {
  const auth = Buffer.from(`${process.env.PAYPAL_CLIENT_ID}:${process.env.PAYPAL_CLIENT_SECRET}`).toString('base64');
  const response = await axios({
    url: `${process.env.PAYPAL_API_URL || 'https://api-m.sandbox.paypal.com'}/v1/oauth2/token`,
    method: 'post',
    data: 'grant_type=client_credentials',
    headers: {
      Authorization: `Basic ${auth}`,
    },
  });
  return response.data.access_token;
};

export const createPayPalOrder = async (req: AuthRequest, res: Response) => {
  try {
    const { propertyId, checkIn, checkOut } = req.body;
    const userId = req.user?.userId;

    if (!propertyId || !userId || !checkIn || !checkOut) {
      return res.status(400).json({ error: "Missing required fields" });
    }

    const property = await db.property.findUnique({ where: { id: propertyId } });
    if (!property) return res.status(404).json({ error: "Property not found" });

    const days = Math.ceil((new Date(checkOut).getTime() - new Date(checkIn).getTime()) / (1000 * 60 * 60 * 24));
    const totalAmount = property.price * days;

    const accessToken = await getPayPalAccessToken();
    const response = await axios({
      url: `${process.env.PAYPAL_API_URL || 'https://api-m.sandbox.paypal.com'}/v2/checkout/orders`,
      method: 'post',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${accessToken}`,
      },
      data: {
        intent: 'CAPTURE',
        purchase_units: [
          {
            amount: {
              currency_code: property.currency || 'USD',
              value: totalAmount.toFixed(2),
            },
            description: `Booking for ${property.title} from ${checkIn} to ${checkOut}`,
          },
        ],
      },
    });

    // Create pending booking
    const booking = await db.booking.create({
      data: {
        propertyId,
        userId,
        checkIn: new Date(checkIn),
        checkOut: new Date(checkOut),
        totalPrice: totalAmount,
        status: 'pending',
        paymentStatus: 'unpaid',
        stripeSessionId: response.data.id // Reuse field for PayPal Order ID
      }
    });

    res.json(response.data);
  } catch (error: any) {
    console.error("PayPal Order Error:", error.response?.data || error.message);
    res.status(500).json({ error: "Failed to create PayPal order" });
  }
};

export const capturePayPalOrder = async (req: AuthRequest, res: Response) => {
  try {
    const { orderID } = req.body;
    if (!orderID) return res.status(400).json({ error: "Order ID is required" });

    const accessToken = await getPayPalAccessToken();
    const response = await axios({
      url: `${process.env.PAYPAL_API_URL || 'https://api-m.sandbox.paypal.com'}/v2/checkout/orders/${orderID}/capture`,
      method: 'post',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${accessToken}`,
      },
    });

    if (response.data.status === 'COMPLETED') {
      // Update booking
      await db.booking.updateMany({
        where: { stripeSessionId: orderID },
        data: {
          status: 'accepted',
          paymentStatus: 'paid'
        }
      });
      return res.json({ success: true, data: response.data });
    }

    res.status(400).json({ error: "Payment not completed" });
  } catch (error: any) {
    console.error("PayPal Capture Error:", error.response?.data || error.message);
    res.status(500).json({ error: "Failed to capture PayPal order" });
  }
};
