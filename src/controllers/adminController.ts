import { Request, Response } from 'express';
import prisma from '../config/database';

const db = prisma as any;

export const getPendingPayments = async (req: Request, res: Response) => {
  try {
    const pendingListings = await db.property.findMany({
      where: { paymentStatus: 'pending' },
      include: { owner: true }
    });

    const formattedListings = pendingListings.map((l: any) => ({
      ...l,
      user_name: l.owner.name,
      user_email: l.owner.email,
    }));

    res.status(200).json({ listings: formattedListings });
  } catch (error) {
    console.error('Error fetching pending payments:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const processPayment = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { action } = req.body;

    if (action === 'approve') {
      await db.property.update({
        where: { id },
        data: { paymentStatus: 'approved', isPremium: true }
      });
    } else if (action === 'reject') {
      await db.property.update({
        where: { id },
        data: { paymentStatus: 'rejected', isPremium: false }
      });
    }

    res.status(200).json({ message: `Payment ${action}d successfully` });
  } catch (error) {
    console.error('Error processing payment:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const getUsers = async (req: Request, res: Response) => {
  try {
    const users = await db.user.findMany({
      orderBy: { createdAt: 'desc' }
    });
    res.json({ users });
  } catch (error) {
    console.error("Error fetching users:", error);
    res.status(500).json({ error: "Failed to fetch users" });
  }
};

export const updateUserRole = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { role } = req.body;
    const user = await db.user.update({
      where: { id },
      data: { role }
    });
    res.json({ message: "User role updated", user });
  } catch (error) {
    console.error("Error updating user role:", error);
    res.status(500).json({ error: "Failed to update user role" });
  }
};

export const deleteUser = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    await db.user.delete({ where: { id } });
    res.json({ message: "User deleted successfully" });
  } catch (error) {
    console.error("Error deleting user:", error);
    res.status(500).json({ error: "Failed to delete user" });
  }
};

export const getDashboardStats = async (req: Request, res: Response) => {
  try {
    const [propertiesCount, usersCount, postsCount, bookingsCount] = await Promise.all([
      db.property.count(),
      db.user.count(),
      db.post.count(),
      db.booking.count()
    ]);

    res.json({
      stats: {
        properties: propertiesCount,
        users: usersCount,
        posts: postsCount,
        bookings: bookingsCount
      }
    });
  } catch (error) {
    console.error("Error fetching dashboard stats:", error);
    res.status(500).json({ error: "Failed to fetch stats" });
  }
};

