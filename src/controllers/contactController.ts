import { Request, Response } from 'express';
import prisma from '../config/database';

const db = prisma as any;

export const createInquiry = async (req: Request, res: Response) => {
  try {
    const { name, email, subject, message } = req.body;

    if (!name || !email || !message) {
      return res.status(400).json({ error: "Name, email, and message are required" });
    }

    const inquiry = await db.inquiry.create({
      data: { name, email, subject, message }
    });

    res.status(201).json({ message: "Inquiry sent successfully", inquiry });
  } catch (error) {
    console.error("Error creating inquiry:", error);
    res.status(500).json({ error: "Failed to send inquiry" });
  }
};

export const getInquiries = async (req: Request, res: Response) => {
  try {
    const inquiries = await db.inquiry.findMany({
      orderBy: { createdAt: 'desc' }
    });
    res.json({ inquiries });
  } catch (error) {
    console.error("Error fetching inquiries:", error);
    res.status(500).json({ error: "Failed to fetch inquiries" });
  }
};

export const updateInquiryStatus = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { status } = req.body;
    const inquiry = await db.inquiry.update({
      where: { id },
      data: { status }
    });
    res.json({ message: "Inquiry status updated", inquiry });
  } catch (error) {
    console.error("Error updating inquiry status:", error);
    res.status(500).json({ error: "Failed to update inquiry status" });
  }
};

export const deleteInquiry = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    await db.inquiry.delete({ where: { id } });
    res.json({ message: "Inquiry deleted successfully" });
  } catch (error) {
    console.error("Error deleting inquiry:", error);
    res.status(500).json({ error: "Failed to delete inquiry" });
  }
};
