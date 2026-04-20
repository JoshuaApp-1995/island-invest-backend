import { Request, Response } from 'express';
import prisma from '../config/database';

const db = prisma as any;

export const getSettings = async (req: Request, res: Response) => {
  try {
    let settings = await db.settings.findUnique({
      where: { id: 'site-settings' }
    });

    if (!settings) {
      // Initialize if not exists
      settings = await db.settings.create({
        data: { id: 'site-settings', siteName: 'IslandInvest' }
      });
    }

    res.json({ settings });
  } catch (error) {
    console.error("Error fetching settings:", error);
    res.status(500).json({ error: "Failed to fetch settings" });
  }
};

export const updateSettings = async (req: Request, res: Response) => {
  try {
    const { siteName, logo, contactEmail } = req.body;

    const settings = await db.settings.upsert({
      where: { id: 'site-settings' },
      update: { siteName, logo, contactEmail },
      create: { id: 'site-settings', siteName, logo, contactEmail }
    });

    res.json({ message: "Settings updated successfully", settings });
  } catch (error) {
    console.error("Error updating settings:", error);
    res.status(500).json({ error: "Failed to update settings" });
  }
};
