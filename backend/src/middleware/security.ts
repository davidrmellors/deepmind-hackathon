// CORS Configuration and Security Headers Middleware
// Provides security configurations for SafeRoute AI API
// Implements CORS, rate limiting, and security headers

import { Request, Response, NextFunction } from 'express';
import rateLimit from 'express-rate-limit';
import helmet from 'helmet';

/**
 * CORS configuration for SafeRoute AI
 * Allows frontend to communicate with backend API
 */
export const corsOptions = {
  origin: function (origin: string | undefined, callback: Function) {
    // Allow requests with no origin (mobile apps, Postman, etc.)
    if (!origin) return callback(null, true);

    // Define allowed origins for different environments
    const allowedOrigins = [
      'http://localhost:3000',           // Local development frontend
      'http://localhost:3001',           // Local development backend
      'http://127.0.0.1:3000',
      'http://127.0.0.1:3001',
      // Add production domains here
      'https://saferoute-ai.vercel.app',  // Example production frontend
      'https://api.saferoute-ai.com'      // Example production API
    ];

    // For development, be more permissive
    if (process.env.NODE_ENV === 'development') {
      // Allow localhost with any port
      if (origin.includes('localhost') || origin.includes('127.0.0.1')) {
        return callback(null, true);
      }
    }

    if (allowedOrigins.includes(origin)) {
      return callback(null, true);
    }

    // Log unauthorized origin attempts
    console.warn(`CORS blocked origin: ${origin}`);
    return callback(new Error(`Origin ${origin} not allowed by CORS`), false);
  },
  credentials: true,                     // Allow cookies/auth headers
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: [
    'Origin',
    'X-Requested-With',
    'Content-Type',
    'Accept',
    'Authorization',
    'X-API-Key',
    'X-Request-ID',
    'Cache-Control'
  ],
  exposedHeaders: [
    'X-Request-ID',
    'X-Rate-Limit-Remaining',
    'X-Rate-Limit-Reset'
  ],
  maxAge: 86400                         // 24 hours preflight cache
};

/**
 * Custom CORS middleware with additional safety checks
 */
export const corsMiddleware = (req: Request, res: Response, next: NextFunction) => {
  const origin = req.get('Origin');

  // Security: Block requests with suspicious headers
  if (req.get('X-Forwarded-Proto') && req.get('X-Forwarded-Proto') !== 'https' && process.env.NODE_ENV === 'production') {
    return res.status(400).json({ error: 'HTTPS required in production' });
  }

  // Add CORS headers manually for more control
  if (origin && corsOptions.origin) {
    corsOptions.origin(origin, (err: Error | null, allowed: boolean) => {
      if (err || !allowed) {
        return res.status(403).json({
          error: 'CORS_BLOCKED',
          message: 'Origin not allowed',
          timestamp: new Date()
        });
      }

      res.header('Access-Control-Allow-Origin', origin);
      res.header('Access-Control-Allow-Credentials', 'true');
      res.header('Access-Control-Allow-Methods', corsOptions.methods.join(', '));
      res.header('Access-Control-Allow-Headers', corsOptions.allowedHeaders.join(', '));
      res.header('Access-Control-Expose-Headers', corsOptions.exposedHeaders.join(', '));
      res.header('Access-Control-Max-Age', corsOptions.maxAge.toString());

      next();
    });
  } else {
    next();
  }
};

/**
 * Rate limiting configuration for different API endpoints
 */
export const createRateLimit = (windowMs: number, max: number, message?: string) => {
  return rateLimit({
    windowMs,
    max,
    message: {
      error: 'RATE_LIMIT_EXCEEDED',
      message: message || 'Too many requests from this IP, please try again later',
      retryAfter: Math.ceil(windowMs / 1000),
      timestamp: new Date()
    },
    standardHeaders: true,    // Return rate limit info in `RateLimit-*` headers
    legacyHeaders: false,     // Disable `X-RateLimit-*` headers
    handler: (req: Request, res: Response) => {
      res.status(429).json({
        error: 'RATE_LIMIT_EXCEEDED',
        message: message || 'Too many requests from this IP, please try again later',
        retryAfter: Math.ceil(windowMs / 1000),
        timestamp: new Date(),
        requestId: req.get('X-Request-ID') || `req_${Date.now()}`
      });
    },
    skip: (req: Request) => {
      // Skip rate limiting for health checks
      return req.path === '/health' || req.path === '/api/health';
    }
  });
};

/**
 * Different rate limits for different endpoints
 */
export const rateLimits = {
  // General API rate limit
  general: createRateLimit(
    15 * 60 * 1000,  // 15 minutes
    100,             // limit each IP to 100 requests per windowMs
    'General API rate limit exceeded'
  ),

  // Route calculation is more expensive
  routeCalculation: createRateLimit(
    15 * 60 * 1000,  // 15 minutes
    30,              // limit each IP to 30 route calculations per 15 minutes
    'Route calculation rate limit exceeded - this operation is resource intensive'
  ),

  // Safety scoring is frequent but lighter
  safetyScoring: createRateLimit(
    15 * 60 * 1000,  // 15 minutes
    200,             // limit each IP to 200 safety requests per 15 minutes
    'Safety scoring rate limit exceeded'
  ),

  // AI explanations use external API quota
  aiExplanations: createRateLimit(
    60 * 60 * 1000,  // 1 hour
    50,              // limit each IP to 50 AI requests per hour
    'AI explanation rate limit exceeded - please reduce AI-enhanced requests'
  ),

  // Strict rate limit for authentication endpoints (if added later)
  auth: createRateLimit(
    15 * 60 * 1000,  // 15 minutes
    5,               // only 5 attempts per 15 minutes
    'Too many authentication attempts'
  )
};

/**
 * Security headers middleware using Helmet
 */
export const securityHeaders = helmet({
  // Content Security Policy
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'", "fonts.googleapis.com"],
      fontSrc: ["'self'", "fonts.gstatic.com"],
      scriptSrc: ["'self'"],
      imgSrc: ["'self'", "data:", "*.googleapis.com", "*.googleusercontent.com"],
      connectSrc: [
        "'self'",
        "*.googleapis.com",
        "generativelanguage.googleapis.com",
        "maps.googleapis.com"
      ],
      frameSrc: ["'none'"],
      objectSrc: ["'none'"],
      baseUri: ["'self'"],
      formAction: ["'self'"],
      upgradeInsecureRequests: process.env.NODE_ENV === 'production' ? [] : null
    }
  },

  // HTTP Strict Transport Security
  hsts: {
    maxAge: 31536000, // 1 year
    includeSubDomains: true,
    preload: true
  },

  // Prevent MIME type sniffing
  noSniff: true,

  // Prevent clickjacking
  frameguard: { action: 'deny' },

  // Hide X-Powered-By header
  hidePoweredBy: true,

  // Prevent XSS attacks
  xssFilter: true,

  // Referrer policy
  referrerPolicy: { policy: 'strict-origin-when-cross-origin' }
});

/**
 * API key validation middleware (for future premium features)
 */
export const validateApiKey = (req: Request, res: Response, next: NextFunction) => {
  // For hackathon demo, this is optional
  const apiKey = req.get('X-API-Key');

  // If no API key is provided, continue (open access for demo)
  if (!apiKey) {
    return next();
  }

  // Simple API key validation (in production, use proper key management)
  const validApiKeys = [
    process.env.DEMO_API_KEY,
    'demo-key-saferoute-2025',
    'hackathon-key-capetown'
  ].filter(Boolean);

  if (validApiKeys.includes(apiKey)) {
    // Valid API key - could add rate limit benefits here
    req.body._apiKeyValidated = true;
    return next();
  }

  return res.status(401).json({
    error: 'INVALID_API_KEY',
    message: 'Invalid API key provided',
    timestamp: new Date()
  });
};

/**
 * Request size limiting middleware
 */
export const requestSizeLimit = (maxSize: string = '1mb') => {
  return (req: Request, res: Response, next: NextFunction) => {
    const contentLength = req.get('Content-Length');

    if (contentLength) {
      const sizeInBytes = parseInt(contentLength);
      const maxSizeInBytes = parseSize(maxSize);

      if (sizeInBytes > maxSizeInBytes) {
        return res.status(413).json({
          error: 'REQUEST_TOO_LARGE',
          message: `Request size ${formatBytes(sizeInBytes)} exceeds limit of ${maxSize}`,
          timestamp: new Date()
        });
      }
    }

    next();
  };
};

/**
 * Request ID middleware - adds unique ID to each request
 */
export const requestId = (req: Request, res: Response, next: NextFunction) => {
  const existingId = req.get('X-Request-ID');
  const requestId = existingId || `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

  req.headers['x-request-id'] = requestId;
  res.set('X-Request-ID', requestId);

  next();
};

/**
 * Security middleware for specific routes
 */
export const routeSpecificSecurity = {
  // Extra security for route calculation (expensive operation)
  routeCalculation: [
    rateLimits.routeCalculation,
    requestSizeLimit('2mb'),
    (req: Request, res: Response, next: NextFunction) => {
      // Log expensive operations
      console.log(`[ROUTE_CALC] ${req.ip} - ${new Date().toISOString()}`);
      next();
    }
  ],

  // AI endpoints with special rate limiting
  aiEnhanced: [
    rateLimits.aiExplanations,
    requestSizeLimit('500kb'),
    (req: Request, res: Response, next: NextFunction) => {
      // Track AI API usage
      console.log(`[AI_REQUEST] ${req.ip} - ${req.path} - ${new Date().toISOString()}`);
      next();
    }
  ],

  // Public endpoints with basic protection
  public: [
    rateLimits.general,
    requestSizeLimit('1mb')
  ]
};

/**
 * Health check middleware - bypasses most security for monitoring
 */
export const healthCheckMiddleware = (req: Request, res: Response, next: NextFunction) => {
  if (req.path === '/health' || req.path === '/api/health') {
    // Skip API key validation and most rate limits for health checks
    return next();
  }
  next();
};

// Helper functions

function parseSize(size: string): number {
  const units: { [key: string]: number } = {
    'b': 1,
    'kb': 1024,
    'mb': 1024 * 1024,
    'gb': 1024 * 1024 * 1024
  };

  const match = size.toLowerCase().match(/^(\d+(?:\.\d+)?)\s*([a-z]+)?$/);
  if (!match) return 1048576; // Default 1MB

  const value = parseFloat(match[1]);
  const unit = match[2] || 'b';

  return Math.floor(value * (units[unit] || 1));
}

function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 B';

  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));

  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

export default {
  corsOptions,
  corsMiddleware,
  rateLimits,
  securityHeaders,
  validateApiKey,
  requestSizeLimit,
  requestId,
  routeSpecificSecurity,
  healthCheckMiddleware
};