import { Express } from 'express';
import { sql } from '../config/neon';
import fs from 'fs';
import path from 'path';
import crypto from 'crypto';

export const loadPlugins = async (app: Express) => {
  console.log('Loading plugins...');
  
  const pluginsDir = path.join(__dirname, '../plugins');
  if (!fs.existsSync(pluginsDir)) {
    console.log('No plugins directory found.');
    return;
  }

  const pluginFolders = fs.readdirSync(pluginsDir);

  for (const folder of pluginFolders) {
    const pluginPath = path.join(pluginsDir, folder);
    if (fs.statSync(pluginPath).isDirectory()) {
      try {
        // Check if plugin is enabled in database
        const pluginRecord = await (sql as any)`
          SELECT enabled FROM "Plugin" WHERE name = ${folder}
        `;

        if (pluginRecord && pluginRecord.length > 0 && pluginRecord[0].enabled) {
          const plugin = require(pluginPath);
          if (plugin && typeof plugin.register === 'function') {
            plugin.register(app);
            console.log(`Plugin "${folder}" loaded successfully.`);
          }
        } else if (pluginRecord.length === 0) {
          // Auto-register new plugin as disabled
          await (sql as any)`
            INSERT INTO "Plugin" (id, name, enabled, "createdAt", "updatedAt")
            VALUES (${crypto.randomUUID()}, ${folder}, false, NOW(), NOW())
          `;
          console.log(`New plugin "${folder}" detected and registered as disabled.`);
        }
      } catch (error) {
        console.error(`Failed to load plugin "${folder}":`, error);
      }
    }
  }
};
