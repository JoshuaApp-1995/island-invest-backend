import { Request, Response } from 'express';
import prisma from '../config/database';

export const getPages = async (req: Request, res: Response) => {
  try {
    const pages = await prisma.page.findMany({
      orderBy: { createdAt: 'desc' }
    });
    res.status(200).json({ pages });
  } catch (error) {
    console.error("Error fetching pages:", error);
    res.status(500).json({ error: "Failed to fetch pages" });
  }
};

export const getPageBySlug = async (req: Request, res: Response) => {
  try {
    const { slug } = req.params;
    const page = await prisma.page.findUnique({
      where: { slug }
    });

    if (!page) {
      return res.status(404).json({ error: "Page not found" });
    }

    res.status(200).json({ page });
  } catch (error) {
    console.error("Error fetching page:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
};

export const createPage = async (req: Request, res: Response) => {
  try {
    const { title, slug, published, content } = req.body;

    if (!title || !slug) {
      return res.status(400).json({ error: "Title and slug are required" });
    }

    const page = await prisma.page.create({
      data: {
        title,
        slug,
        published: published ?? true,
        content: content || [],
      }
    });

    res.status(201).json({ message: "Page created successfully", id: page.id });
  } catch (error: any) {
    console.error("Error creating page:", error);
    if (error.code === 'P2002') {
      return res.status(400).json({ error: "Slug already exists" });
    }
    res.status(500).json({ error: "Failed to create page" });
  }
};

export const updatePage = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { title, slug, published, content } = req.body;

    await prisma.page.update({
      where: { id },
      data: {
        title,
        slug,
        published,
        content,
        updatedAt: new Date(),
      }
    });

    res.status(200).json({ message: "Page updated successfully" });
  } catch (error) {
    console.error("Error updating page:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
};

export const deletePage = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    await prisma.page.delete({
      where: { id }
    });
    res.status(200).json({ message: "Page deleted successfully" });
  } catch (error) {
    console.error("Error deleting page:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
};
