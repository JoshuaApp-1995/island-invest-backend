import { Request, Response } from 'express';
import prisma from '../config/database';
import { AuthRequest } from '../middlewares/authMiddleware';

const db = prisma as any;

export const addReview = async (req: AuthRequest, res: Response) => {
  try {
    const { id: propertyId } = req.params;
    const userId = req.user?.userId;
    const { rating, comment } = req.body;

    if (!userId) return res.status(401).json({ error: "Unauthorized" });
    if (!rating || rating < 1 || rating > 5) {
      return res.status(400).json({ error: "Rating must be between 1 and 5" });
    }

    const existingProperty = await db.property.findUnique({ where: { id: propertyId } });
    if (!existingProperty) return res.status(404).json({ error: "Property not found" });

    // Check if user already reviewed
    const existingReview = await db.review.findUnique({
      where: {
        userId_propertyId: {
          userId,
          propertyId
        }
      }
    });

    if (existingReview) {
      return res.status(400).json({ error: "You have already reviewed this property." });
    }

    const review = await db.review.create({
      data: {
        rating,
        comment,
        userId,
        propertyId
      },
      include: {
        user: {
          select: { id: true, name: true, avatarUrl: true }
        }
      }
    });

    res.status(201).json({ message: "Review added successfully", review });
  } catch (error) {
    console.error("Error adding review:", error);
    res.status(500).json({ error: "Failed to add review" });
  }
};

export const getReviews = async (req: Request, res: Response) => {
  try {
    const { id: propertyId } = req.params;

    const reviews = await db.review.findMany({
      where: { propertyId },
      include: {
        user: {
          select: { id: true, name: true, avatarUrl: true }
        }
      },
      orderBy: { createdAt: 'desc' }
    });

    // Calculate average rating
    const avgRating = reviews.length > 0 
      ? reviews.reduce((acc: number, rev: any) => acc + rev.rating, 0) / reviews.length 
      : 0;

    res.json({ reviews, averageRating: avgRating, totalReviews: reviews.length });
  } catch (error) {
    console.error("Error fetching reviews:", error);
    res.status(500).json({ error: "Failed to fetch reviews" });
  }
};
