import { Request, Response } from 'express';
import prisma from '../config/database';

// Casting prisma to any temporarily to bypass the lock on Prisma Client generation
const db = prisma as any;

export const getBookings = async (req: Request, res: Response) => {
  try {
    const bookings = await db.booking.findMany({
      include: {
        property: true,
        user: {
          select: { id: true, name: true, email: true }
        }
      },
      orderBy: { createdAt: 'desc' }
    });
    res.json({ bookings });
  } catch (error) {
    console.error("Error fetching bookings:", error);
    res.status(500).json({ error: "Failed to fetch bookings" });
  }
};

export const createBooking = async (req: Request, res: Response) => {
  try {
    const { propertyId, userId, checkIn, checkOut } = req.body;

    if (!propertyId || !userId || !checkIn || !checkOut) {
      return res.status(400).json({ error: "All fields are required" });
    }

    const booking = await db.booking.create({
      data: {
        propertyId,
        userId,
        checkIn: new Date(checkIn),
        checkOut: new Date(checkOut),
        status: 'pending'
      }
    });

    res.status(201).json({ message: "Booking request sent", booking });
  } catch (error) {
    console.error("Error creating booking:", error);
    res.status(500).json({ error: "Failed to create booking" });
  }
};

export const updateBookingStatus = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { status } = req.body; // accepted, rejected

    if (!['accepted', 'rejected', 'cancelled'].includes(status)) {
      return res.status(400).json({ error: "Invalid status" });
    }

    const booking = await db.booking.update({
      where: { id },
      data: { status, updatedAt: new Date() }
    });

    res.json({ message: `Booking ${status}`, booking });
  } catch (error) {
    console.error("Error updating booking:", error);
    res.status(500).json({ error: "Failed to update booking" });
  }
};

export const deleteBooking = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    await db.booking.delete({
      where: { id }
    });
    res.json({ message: "Booking deleted successfully" });
  } catch (error) {
    console.error("Error deleting booking:", error);
    res.status(500).json({ error: "Failed to delete booking" });
  }
};
