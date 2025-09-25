import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import dotenv from 'dotenv';
import { Request, Response } from 'express';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(helmet());
app.use(cors({
  origin: process.env.CORS_ORIGIN || 'http://localhost:3000',
  credentials: true
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Basic health check endpoint
app.get('/health', (req: Request, res: Response) => {
  res.status(200).json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    service: 'SafeRoute AI Backend',
    version: '1.0.0',
    environment: process.env.NODE_ENV || 'development'
  });
});

// API routes will be added here
app.use('/api', (req: Request, res: Response, next) => {
  console.log(`${req.method} ${req.path} - ${new Date().toISOString()}`);
  next();
});

// Placeholder API routes
app.get('/api', (req: Request, res: Response) => {
  res.json({
    message: 'SafeRoute AI API',
    version: '1.0.0',
    endpoints: [
      'GET /health - Health check',
      'POST /api/routes/calculate - Calculate safe routes',
      'GET /api/routes/:routeId - Get route details',
      'GET /api/routes/:routeId/safety - Get route safety assessment',
      'POST /api/safety/score - Calculate safety score',
      'GET /api/safety/area/:gridId - Get area safety data',
      'GET /api/safety/alerts - Get current safety alerts',
      'GET /api/safety/crime-data - Get Cape Town crime statistics'
    ]
  });
});

// Error handling middleware
app.use((err: Error, req: Request, res: Response, next: any) => {
  console.error('Error:', err.message);
  res.status(500).json({
    error: 'INTERNAL_SERVER_ERROR',
    message: 'An unexpected error occurred',
    timestamp: new Date().toISOString(),
    requestId: req.headers['x-request-id'] || 'unknown'
  });
});

// 404 handler
app.use('*', (req: Request, res: Response) => {
  res.status(404).json({
    error: 'NOT_FOUND',
    message: `Endpoint ${req.method} ${req.originalUrl} not found`,
    timestamp: new Date().toISOString()
  });
});

// Start server
app.listen(PORT, () => {
  console.log(`SafeRoute AI Backend running on port ${PORT}`);
  console.log(`Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log(`Health check: http://localhost:${PORT}/health`);
  console.log(`API docs: http://localhost:${PORT}/api`);
});

export default app;