import { Request, Response } from 'express';
import prisma from '../config/database';
import { slugify } from '../utils/slugify';

const db = prisma as any;

export const getPosts = async (req: Request, res: Response) => {
  try {
    const posts = await db.post.findMany({
      orderBy: { createdAt: 'desc' }
    });
    res.json({ posts });
  } catch (error) {
    console.error("Error fetching posts:", error);
    res.status(500).json({ error: "Failed to fetch posts" });
  }
};

export const getPostBySlug = async (req: Request, res: Response) => {
  try {
    const { slug } = req.params;
    const post = await db.post.findUnique({
      where: { slug }
    });

    if (!post) {
      return res.status(404).json({ error: "Post not found" });
    }

    res.json({ post });
  } catch (error) {
    console.error("Error fetching post:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
};

export const createPost = async (req: Request, res: Response) => {
  try {
    const { title, slug: providedSlug, content, category, tags, image, metaTitle, metaDescription, keywords, published } = req.body;

    if (!title || !content) {
      return res.status(400).json({ error: "Title and content are required" });
    }

    let slug = providedSlug || slugify(title);
    
    // Ensure slug uniqueness
    const existing = await db.post.findUnique({ where: { slug } });
    if (existing) {
      slug = `${slug}-${Date.now().toString().slice(-4)}`;
    }

    const post = await db.post.create({
      data: {
        title,
        slug,
        content,
        category: category || 'General',
        tags: tags || [],
        image,
        metaTitle,
        metaDescription,
        keywords,
        published: published ?? true,
      }
    });

    res.status(201).json({ message: "Post created successfully", post });
  } catch (error: any) {
    console.error("Error creating post:", error);
    res.status(500).json({ error: "Failed to create post" });
  }
};

export const updatePost = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { title, slug, content, category, tags, image, metaTitle, metaDescription, keywords, published } = req.body;

    const post = await db.post.update({
      where: { id },
      data: {
        title,
        slug,
        content,
        category,
        tags,
        image,
        metaTitle,
        metaDescription,
        keywords,
        published,
        updatedAt: new Date(),
      }
    });

    res.json({ message: "Post updated successfully", post });
  } catch (error) {
    console.error("Error updating post:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
};

export const deletePost = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    await db.post.delete({
      where: { id }
    });
    res.json({ message: "Post deleted successfully" });
  } catch (error) {
    console.error("Error deleting post:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
};

