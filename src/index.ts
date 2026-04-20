import express from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import dotenv from 'dotenv';
import healthRoutes from './routes/health';
import listingsRoutes from './routes/listingsRoutes';
import authRoutes from './routes/authRoutes';
import pagesRoutes from './routes/pagesRoutes';
import pluginRoutes from './routes/pluginRoutes';
import paymentRoutes from './routes/paymentRoutes';
import messageRoutes from './routes/messageRoutes';
import postRoutes from './routes/postsRoutes';
import bookingRoutes from './routes/bookingsRoutes';
import settingsRoutes from './routes/settingsRoutes';
import contactRoutes from './routes/contactRoutes';
import { getSitemap, getRobots } from './controllers/seoController';
import { stripeWebhook } from './controllers/paymentController';
import { loadPlugins } from './utils/pluginLoader';
import { errorHandler } from './middlewares/errorMiddleware';
import { upload, handleUpload, getMedia, deleteMedia } from './controllers/uploadController';
import path from 'path';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:3000',
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));
app.use(cookieParser());

// Stripe Webhook needs raw body
app.post('/api/payments/webhook', express.raw({ type: 'application/json' }), stripeWebhook);

app.use(express.json());

// Serve static files from uploads folder
app.use('/api/uploads', express.static(path.join(process.cwd(), 'uploads')));

import adminRoutes from './routes/adminRoutes';

// Routes
app.get('/sitemap.xml', getSitemap);
app.get('/robots.txt', getRobots);
app.use('/api/health', healthRoutes);
app.use('/api/listings', listingsRoutes);
app.use('/api/properties', listingsRoutes); // Alias for the requested naming
app.use('/api/auth', authRoutes);
app.use('/api/pages', pagesRoutes);
app.use('/api/plugins-manage', pluginRoutes);
app.use('/api/payments', paymentRoutes);
app.use('/api/posts', postRoutes);
app.use('/api/bookings', bookingRoutes);
app.use('/api/settings', settingsRoutes);
app.use('/api/contact', contactRoutes);
app.use('/api/messages', messageRoutes);
app.use('/api/admin', adminRoutes);
app.post('/api/upload', upload.single('file'), handleUpload);
app.get('/api/media', getMedia);
app.delete('/api/media/:id', deleteMedia);

// Load dynamic plugins
loadPlugins(app);

// Global Error Handler
app.use(errorHandler);

// Only listen if not on Vercel
if (process.env.NODE_ENV !== 'production' && !process.env.VERCEL) {
  app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
  });
}

export default app;
