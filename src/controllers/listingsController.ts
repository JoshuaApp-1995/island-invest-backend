import { Request, Response } from 'express';
import prisma from '../config/database';
import { AuthRequest } from '../middlewares/authMiddleware';
import { slugify } from '../utils/slugify';

const db = prisma as any;

const normalizeListing = (listing: any) => {
  if (!listing) return null;
  return {
    ...listing,
    user_id: listing.ownerId,
    is_premium: listing.isPremium,
    payment_status: listing.paymentStatus,
    payment_receipt: listing.paymentReceipt,
    created_at: listing.createdAt,
    updated_at: listing.updatedAt,
    images: listing.media || [],
    owner: listing.owner ? {
      ...listing.owner,
      avatar_url: listing.owner.avatarUrl
    } : undefined
  };
};

export const getListings = async (req: Request, res: Response) => {
  try {
    const authReq = req as AuthRequest;
    const { category, location, search, minPrice, maxPrice, status, slug } = req.query;
    let userId = req.query.userId as string;

    // Handle /me route
    if (req.path === '/me' && authReq.user) {
      userId = authReq.user.userId;
    }
    const limit = parseInt((req.query.limit as string) || "20");
    const offset = parseInt((req.query.offset as string) || "0");

    const where: any = {};
    
    if (slug) where.slug = slug;
    if (category) where.category = category;
    if (userId) where.ownerId = userId;
    
    if (status) {
      where.status = status;
    } else if (!userId && !slug) {
      where.status = 'published';
    }

    if (location) {
      where.location = { contains: String(location), mode: 'insensitive' };
    }

    if (search) {
      where.OR = [
        { title: { contains: String(search), mode: 'insensitive' } },
        { description: { contains: String(search), mode: 'insensitive' } }
      ];
    }

    if (minPrice || maxPrice) {
      where.price = {};
      if (minPrice) where.price.gte = parseFloat(minPrice as string);
      if (maxPrice) where.price.lte = parseFloat(maxPrice as string);
    }

    const listings = await db.property.findMany({
      where,
      include: {
        media: true,
        owner: {
          select: { id: true, name: true, avatarUrl: true }
        },
        reviews: {
          select: { rating: true }
        }
      },
      orderBy: [
        { isPremium: 'desc' },
        { createdAt: 'desc' }
      ],
      take: limit,
      skip: offset
    });

    const normalized = listings.map(normalizeListing);

    res.json({ listings: normalized });
  } catch (error) {
    console.error("Error fetching listings:", error);
    res.status(500).json({ error: "Failed to fetch listings" });
  }
};

export const getListingBySlug = async (req: Request, res: Response) => {
  try {
    const { slug } = req.params;
    
    // Check if slug is a valid UUID
    const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(slug);

    const listing = await db.property.findFirst({
      where: {
        OR: [
          { slug: slug },
          ...(isUuid ? [{ id: slug }] : [])
        ]
      },
      include: {
        media: true,
        owner: {
          select: { id: true, name: true, avatarUrl: true, email: true, phone: true }
        },
        bookings: true,
        reviews: {
          include: { user: { select: { id: true, name: true, avatarUrl: true } } },
          orderBy: { createdAt: 'desc' }
        }
      }
    });

    if (!listing) {
      return res.status(404).json({ error: "Listing not found" });
    }

    res.json({ listing: normalizeListing(listing) });
  } catch (error) {
    console.error("Error fetching listing by slug:", error);
    res.status(500).json({ error: "Failed to fetch listing" });
  }
};

export const getListingById = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const listing = await db.property.findUnique({
      where: { id },
      include: {
        media: true,
        owner: {
          select: { id: true, name: true, avatarUrl: true, email: true, phone: true }
        },
        bookings: true
      }
    });

    if (!listing) {
      return res.status(404).json({ error: "Listing not found" });
    }

    res.json({ listing: normalizeListing(listing) });
  } catch (error) {
    console.error("Error fetching listing:", error);
    res.status(500).json({ error: "Failed to fetch listing" });
  }
};

export const createListing = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?.userId;
    const {
      title,
      description,
      category,
      price,
      currency,
      location,
      latitude,
      longitude,
      phone,
      whatsapp,
      media,
      status = "published",
      metaTitle,
      metaDescription,
      keywords,
      slug: providedSlug
    } = req.body;

    if (!title || !description || !category || !price || !location || !userId) {
      return res.status(400).json({ error: "Missing required fields" });
    }

    let slug = providedSlug || slugify(title);
    
    // Ensure slug uniqueness
    const existing = await db.property.findUnique({ where: { slug } });
    if (existing) {
      slug = `${slug}-${Date.now().toString().slice(-4)}`;
    }

    const listing = await db.property.create({
      data: {
        title,
        description,
        category,
        price: parseFloat(price),
        currency: currency || "USD",
        location,
        latitude: latitude ? parseFloat(latitude) : null,
        longitude: longitude ? parseFloat(longitude) : null,
        phone,
        whatsapp,
        status,
        slug,
        metaTitle,
        metaDescription,
        keywords,
        ownerId: userId,
        media: {
          create: media?.map((m: any, index: number) => ({
            url: m.url,
            pathname: m.pathname,
            type: m.pathname.match(/\.(mp4|webm|ogg|mov)$/i) ? "video" : "image",
            position: index
          }))
        }
      },
      include: { media: true }
    });

    res.status(201).json({ listing: normalizeListing(listing) });
  } catch (error) {
    console.error("Error creating listing:", error);
    res.status(500).json({ error: "Failed to create listing" });
  }
};

export const updateListing = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const userId = req.user?.userId;
    const {
      title,
      description,
      category,
      price,
      currency,
      location,
      latitude,
      longitude,
      phone,
      whatsapp,
      status,
      media,
      metaTitle,
      metaDescription,
      keywords
    } = req.body;

    // Check ownership
    const existing = await db.property.findUnique({ where: { id } });
    if (!existing) return res.status(404).json({ error: "Listing not found" });
    
    if (existing.ownerId !== userId && req.user?.role !== 'ADMIN') {
      return res.status(403).json({ error: "Unauthorized" });
    }

    // Update listing
    const updated = await db.property.update({
      where: { id },
      data: {
        title,
        description,
        category,
        price: price ? parseFloat(price) : undefined,
        currency,
        location,
        latitude: latitude ? parseFloat(latitude) : undefined,
        longitude: longitude ? parseFloat(longitude) : undefined,
        phone,
        whatsapp,
        status,
        metaTitle,
        metaDescription,
        keywords
      }
    });

    // Handle media update if provided
    if (media) {
      await db.media.deleteMany({ where: { propertyId: id } });
      await db.media.createMany({
        data: media.map((m: any, index: number) => ({
          propertyId: id,
          url: m.url,
          pathname: m.pathname,
          type: m.pathname.match(/\.(mp4|webm|ogg|mov)$/i) ? "video" : "image",
          position: index
        }))
      });
    }

    // Fetch the final state with media
    const finalListing = await db.property.findUnique({
      where: { id },
      include: { media: true }
    });

    res.json({ message: "Listing updated successfully", listing: normalizeListing(finalListing) });
  } catch (error) {
    console.error("Error updating listing:", error);
    res.status(500).json({ error: "Failed to update listing" });
  }
};

export const deleteListing = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const userId = req.user?.userId;

    const existing = await db.property.findUnique({ where: { id } });
    if (!existing) return res.status(404).json({ error: "Listing not found" });
    
    if (existing.ownerId !== userId && req.user?.role !== 'ADMIN') {
      return res.status(403).json({ error: "Unauthorized" });
    }

    await db.property.delete({ where: { id } });

    res.json({ message: "Listing deleted successfully" });
  } catch (error) {
    console.error("Error deleting listing:", error);
    res.status(500).json({ error: "Failed to delete listing" });
  }
};
