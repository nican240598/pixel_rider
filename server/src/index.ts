import 'dotenv/config';
import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import morgan from 'morgan';
import path from 'path';
import { fileURLToPath } from 'url';

// Import middleware and routes
import { errorHandler } from './middleware/errorHandler.js';
import uploadRoutes from './routes/upload.js';

// Get __dirname for ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = parseInt(process.env.PORT || '5000', 10);
const NODE_ENV = process.env.NODE_ENV || 'development';
const CORS_ORIGIN = (process.env.CORS_ORIGIN || 'http://localhost:3000').split(',');

/**
 * ============================================
 * Middleware Setup
 * ============================================
 */

// Request logging
app.use(morgan(NODE_ENV === 'production' ? 'combined' : 'dev'));

// CORS configuration
app.use(
  cors({
    origin: CORS_ORIGIN,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
    credentials: true,
    maxAge: 86400,
  })
);

// Body parsers
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ limit: '10mb', extended: true }));

/**
 * ============================================
 * Static File Serving
 * ============================================
 */
// Serve uploaded files as static content
const uploadsDir = path.resolve(process.env.UPLOAD_DIR || './uploads');
app.use('/static', express.static(uploadsDir));

/**
 * ============================================
 * Health Check Endpoint
 * ============================================
 */
app.get('/health', (req: Request, res: Response): void => {
  res.status(200).json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    environment: NODE_ENV,
    uptime: process.uptime(),
  });
});

/**
 * ============================================
 * API Routes
 * ============================================
 */

// Upload API routes
app.use('/api/upload', uploadRoutes);

/**
 * ============================================
 * 404 Handler
 * ============================================
 */
app.use((req: Request, res: Response): void => {
  res.status(404).json({
    success: false,
    error: 'Endpoint not found',
    path: req.path,
    method: req.method,
  });
});

/**
 * ============================================
 * Error Handler (must be last)
 * ============================================
 */
app.use(errorHandler);

/**
 * ============================================
 * Server Start
 * ============================================
 */
const server = app.listen(PORT, () => {
  console.log(`
╔════════════════════════════════════════╗
║  🏍️  Pixel Rider Backend Server       ║
╠════════════════════════════════════════╣
║  Environment: ${NODE_ENV.padEnd(24)} ║
║  Port: ${PORT.toString().padEnd(33)} ║
║  API URL: http://localhost:${PORT}    ║
║  Uploads: ${uploadsDir.substring(0, 29).padEnd(29)} ║
╚════════════════════════════════════════╝
  `);
});

/**
 * Graceful shutdown
 */
process.on('SIGTERM', () => {
  console.log('SIGTERM signal received: closing HTTP server');
  server.close(() => {
    console.log('HTTP server closed');
    process.exit(0);
  });
});

process.on('SIGINT', () => {
  console.log('SIGINT signal received: closing HTTP server');
  server.close(() => {
    console.log('HTTP server closed');
    process.exit(0);
  });
});

export default app;
