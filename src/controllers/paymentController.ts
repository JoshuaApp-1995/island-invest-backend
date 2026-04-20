import { Request, Response } from 'express';
import Stripe from 'stripe';
import prisma from '../config/database';
import { AuthRequest } from '../middlewares/authMiddleware';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || '', {
  apiVersion: '2023-10-16' as any,
});

const db = prisma as any;

export const createCheckoutSession = async (req: AuthRequest, res: Response) => {
  try {
    const { propertyId, type, checkIn, checkOut } = req.body;
    const userId = req.user?.userId;

    if (!propertyId || !userId) {
      return res.status(400).json({ error: "Property ID and authentication are required" });
    }

    const property = await db.property.findUnique({
      where: { id: propertyId }
    });

    if (!property) {
      return res.status(404).json({ error: "Property not found" });
    }

    // --- CASE: PREMIUM UPGRADE ---
    if (type === 'premium_upgrade') {
      if (property.ownerId !== userId) {
        return res.status(403).json({ error: "Unauthorized" });
      }

      const session = await stripe.checkout.sessions.create({
        payment_method_types: ['card'],
        line_items: [
          {
            price_data: {
              currency: 'usd',
              product_data: {
                name: `Premium Listing: ${property.title}`,
                description: 'Feature your property on the home page and top of search results.',
              },
              unit_amount: 2500, // $25.00
            },
            quantity: 1,
          },
        ],
        mode: 'payment',
        success_url: `${process.env.FRONTEND_URL}/dashboard/properties?success=true`,
        cancel_url: `${process.env.FRONTEND_URL}/dashboard/properties?canceled=true`,
        metadata: {
          propertyId: propertyId,
          userId: userId,
          type: 'premium_upgrade'
        },
      });

      return res.json({ id: session.id, url: session.url });
    }

    // --- CASE: BOOKING PAYMENT ---
    if (type === 'booking') {
      if (!checkIn || !checkOut) {
        return res.status(400).json({ error: "Check-in and Check-out dates are required for bookings" });
      }

      const days = Math.ceil((new Date(checkOut).getTime() - new Date(checkIn).getTime()) / (1000 * 60 * 60 * 24));
      const totalAmount = property.price * days;

      // Create pending booking
      const booking = await db.booking.create({
        data: {
          propertyId,
          userId,
          checkIn: new Date(checkIn),
          checkOut: new Date(checkOut),
          totalPrice: totalAmount,
          status: 'pending',
          paymentStatus: 'unpaid'
        }
      });

      const session = await stripe.checkout.sessions.create({
        payment_method_types: ['card'],
        line_items: [
          {
            price_data: {
              currency: 'usd',
              product_data: {
                name: `Booking: ${property.title}`,
                description: `Rental from ${checkIn} to ${checkOut} (${days} nights)`,
              },
              unit_amount: Math.round(totalAmount * 100), // cents
            },
            quantity: 1,
          },
        ],
        mode: 'payment',
        success_url: `${process.env.FRONTEND_URL}/listings/${property.slug}?booking_success=true`,
        cancel_url: `${process.env.FRONTEND_URL}/listings/${property.slug}?booking_canceled=true`,
        metadata: {
          bookingId: booking.id,
          propertyId: propertyId,
          userId: userId,
          type: 'booking_payment'
        },
      });

      return res.json({ id: session.id, url: session.url });
    }

    res.status(400).json({ error: "Invalid payment type" });
  } catch (error) {
    console.error("Stripe Session Error:", error);
    res.status(500).json({ error: "Failed to create checkout session" });
  }
};

export const stripeWebhook = async (req: Request, res: Response) => {
  const sig = req.headers['stripe-signature'] as string;
  let event;

  try {
    event = stripe.webhooks.constructEvent(
      req.body,
      sig,
      process.env.STRIPE_WEBHOOK_SECRET || ''
    );
  } catch (err: any) {
    console.error(`Webhook Error: ${err.message}`);
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }

  if (event.type === 'checkout.session.completed') {
    const session = event.data.object as Stripe.Checkout.Session;
    const { propertyId, bookingId, type } = session.metadata || {};

    if (type === 'premium_upgrade' && propertyId) {
      await db.property.update({
        where: { id: propertyId },
        data: {
          isPremium: true,
          paymentStatus: 'paid'
        }
      });
    }

    if (type === 'booking_payment' && bookingId) {
      await db.booking.update({
        where: { id: bookingId },
        data: {
          status: 'accepted',
          paymentStatus: 'paid'
        }
      });
    }
  }

  res.json({ received: true });
};
