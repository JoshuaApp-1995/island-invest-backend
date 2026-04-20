import { Request, Response } from 'express';
import prisma from '../config/database';

const db = prisma as any;

export const getSitemap = async (req: Request, res: Response) => {
  try {
    const [properties, posts] = await Promise.all([
      db.property.findMany({ where: { status: 'published' }, select: { slug: true, updatedAt: true } }),
      db.post.findMany({ where: { published: true }, select: { slug: true, updatedAt: true } })
    ]);

    const baseUrl = process.env.FRONTEND_URL || 'https://islandinvest.com';

    let xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <url>
    <loc>${baseUrl}/</loc>
    <changefreq>daily</changefreq>
    <priority>1.0</priority>
  </url>
  <url>
    <loc>${baseUrl}/listings</loc>
    <changefreq>daily</changefreq>
    <priority>0.9</priority>
  </url>
  <url>
    <loc>${baseUrl}/blog</loc>
    <changefreq>daily</changefreq>
    <priority>0.9</priority>
  </url>`;

    properties.forEach((p: any) => {
      xml += `
  <url>
    <loc>${baseUrl}/listings/${p.slug}</loc>
    <lastmod>${new Date(p.updatedAt || Date.now()).toISOString().split('T')[0]}</lastmod>
    <changefreq>weekly</changefreq>
    <priority>0.8</priority>
  </url>`;
    });

    posts.forEach((p: any) => {
      xml += `
  <url>
    <loc>${baseUrl}/blog/${p.slug}</loc>
    <lastmod>${new Date(p.updatedAt).toISOString().split('T')[0]}</lastmod>
    <changefreq>monthly</changefreq>
    <priority>0.7</priority>
  </url>`;
    });

    xml += '\n</urlset>';

    res.header('Content-Type', 'application/xml');
    res.send(xml);
  } catch (error) {
    console.error("Error generating sitemap:", error);
    res.status(500).send("Error generating sitemap");
  }
};

export const getRobots = (req: Request, res: Response) => {
  const baseUrl = process.env.FRONTEND_URL || 'https://islandinvest.com';
  const robots = `User-agent: *
Allow: /
Disallow: /dashboard/
Disallow: /api/

Sitemap: ${baseUrl}/sitemap.xml`;

  res.header('Content-Type', 'text/plain');
  res.send(robots);
};
