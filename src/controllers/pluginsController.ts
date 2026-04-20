import { Request, Response } from 'express';
import { sql } from '../config/neon';

export const getPlugins = async (req: Request, res: Response) => {
  try {
    const plugins = await (sql as any)`SELECT * FROM "Plugin" ORDER BY name`;
    res.status(200).json({ plugins });
  } catch (error) {
    console.error("Error fetching plugins:", error);
    res.status(500).json({ error: "Failed to fetch plugins" });
  }
};

export const togglePlugin = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { enabled } = req.body;

    await (sql as any)`
      UPDATE "Plugin" 
      SET enabled = ${enabled}, "updatedAt" = NOW() 
      WHERE id = ${id}
    `;

    res.status(200).json({ message: `Plugin ${enabled ? 'enabled' : 'disabled'} successfully. Restart server to apply changes.` });
  } catch (error) {
    console.error("Error toggling plugin:", error);
    res.status(500).json({ error: "Failed to update plugin" });
  }
};
