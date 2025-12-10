// Error Handling Middleware and Validation
// Centralized error handling for SafeRoute AI API
// Provides consistent error responses and validation

import { Request, Response, NextFunction } from 'express';
import { ErrorResponse } from '../types/index.js';

// Error types for classification
export enum ErrorType {
  VALIDATION_ERROR = 'VALIDATION_ERROR',
  AUTHENTICATION_ERROR = 'AUTHENTICATION_ERROR',
  AUTHORIZATION_ERROR = 'AUTHORIZATION_ERROR',
  NOT_FOUND_ERROR = 'NOT_FOUND_ERROR',
  EXTERNAL_API_ERROR = 'EXTERNAL_API_ERROR',
  DATABASE_ERROR = 'DATABASE_ERROR',
  RATE_LIMIT_ERROR = 'RATE_LIMIT_ERROR',
  INTERNAL_SERVER_ERROR = 'INTERNAL_SERVER_ERROR'
}

// Custom error class for API errors
export class APIError extends Error {
  public statusCode: number;
  public type: ErrorType;
  public details?: any;
  public isOperational: boolean;

  constructor(
    message: string,
    statusCode: number = 500,
    type: ErrorType = ErrorType.INTERNAL_SERVER_ERROR,
    details?: any,
    isOperational: boolean = true
  ) {
    super(message);
    this.name = this.constructor.name;
    this.statusCode = statusCode;
    this.type = type;
    this.details = details;
    this.isOperational = isOperational;

    Error.captureStackTrace(this, this.constructor);
  }
}

// Common API errors
export class ValidationError extends APIError {
  constructor(message: string, details?: any) {
    super(message, 400, ErrorType.VALIDATION_ERROR, details);
  }
}

export class NotFoundError extends APIError {
  constructor(message: string = 'Resource not found') {
    super(message, 404, ErrorType.NOT_FOUND_ERROR);
  }
}

export class ExternalAPIError extends APIError {
  constructor(message: string, service: string, details?: any) {
    super(`${service} API error: ${message}`, 502, ErrorType.EXTERNAL_API_ERROR, {
      service,
      ...details
    });
  }
}

export class RateLimitError extends APIError {
  constructor(message: string = 'Rate limit exceeded') {
    super(message, 429, ErrorType.RATE_LIMIT_ERROR);
  }
}

/**
 * Main error handling middleware
 * Should be the last middleware in the chain
 */
export const errorHandler = (
  error: Error,
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  // Generate unique request ID for tracking
  const requestId = req.headers['x-request-id'] as string || generateRequestId();

  // Log the error for debugging
  logError(error, req, requestId);

  // Handle known API errors
  if (error instanceof APIError) {
    const errorResponse: ErrorResponse = {
      error: error.type,
      message: error.message,
      details: error.details,
      timestamp: new Date(),
      requestId
    };

    res.status(error.statusCode).json(errorResponse);
    return;
  }

  // Handle validation errors from express-validator
  if (error.name === 'ValidationError' || error.message.includes('validation')) {
    const errorResponse: ErrorResponse = {
      error: ErrorType.VALIDATION_ERROR,
      message: 'Invalid request data',
      details: error.message,
      timestamp: new Date(),
      requestId
    };

    res.status(400).json(errorResponse);
    return;
  }

  // Handle Google API errors
  if (error.message.includes('Google') || error.message.includes('API_KEY')) {
    const service = error.message.includes('Routes') ? 'Google Routes' :
                   error.message.includes('Gemini') ? 'Google AI' : 'Google API';

    const errorResponse: ErrorResponse = {
      error: ErrorType.EXTERNAL_API_ERROR,
      message: 'External service temporarily unavailable',
      details: {
        service,
        fallbackAvailable: true
      },
      timestamp: new Date(),
      requestId
    };

    res.status(502).json(errorResponse);
    return;
  }

  // Handle location boundary errors
  if (error.message.includes('Cape Town') || error.message.includes('bounds')) {
    const errorResponse: ErrorResponse = {
      error: ErrorType.VALIDATION_ERROR,
      message: 'Location must be within Cape Town metropolitan area',
      details: {
        bounds: {
          minLat: -34.5,
          maxLat: -33.5,
          minLng: 18.0,
          maxLng: 19.0
        }
      },
      timestamp: new Date(),
      requestId
    };

    res.status(400).json(errorResponse);
    return;
  }

  // Handle route calculation errors
  if (error.message.includes('route') || error.message.includes('calculation')) {
    const errorResponse: ErrorResponse = {
      error: ErrorType.EXTERNAL_API_ERROR,
      message: 'Route calculation failed - trying alternative method',
      details: {
        fallbackAvailable: true,
        suggestedAction: 'Retry with different parameters'
      },
      timestamp: new Date(),
      requestId
    };

    res.status(502).json(errorResponse);
    return;
  }

  // Handle unexpected errors
  const errorResponse: ErrorResponse = {
    error: ErrorType.INTERNAL_SERVER_ERROR,
    message: process.env.NODE_ENV === 'production'
      ? 'An unexpected error occurred'
      : error.message,
    details: process.env.NODE_ENV === 'production' ? undefined : {
      stack: error.stack,
      name: error.name
    },
    timestamp: new Date(),
    requestId
  };

  res.status(500).json(errorResponse);
};

/**
 * Async error wrapper to catch errors in async route handlers
 */
export const asyncHandler = (fn: Function) => {
  return (req: Request, res: Response, next: NextFunction) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
};

/**
 * Request validation middleware
 */
export const validateRequest = (schema: any) => {
  return (req: Request, res: Response, next: NextFunction) => {
    try {
      // Validate request body against schema
      const validation = validateRequestData(req.body, schema);

      if (!validation.isValid) {
        throw new ValidationError('Request validation failed', validation.errors);
      }

      next();
    } catch (error) {
      next(error);
    }
  };
};

/**
 * Location bounds validation middleware specifically for Cape Town
 */
export const validateCapeTownLocation = (req: Request, res: Response, next: NextFunction) => {
  try {
    const { origin, destination } = req.body;

    if (origin) {
      validateLocationBounds(origin, 'origin');
    }

    if (destination) {
      validateLocationBounds(destination, 'destination');
    }

    next();
  } catch (error) {
    next(error);
  }
};

/**
 * Rate limiting error handler
 */
export const rateLimitHandler = (req: Request, res: Response) => {
  const errorResponse: ErrorResponse = {
    error: ErrorType.RATE_LIMIT_ERROR,
    message: 'Too many requests - please try again later',
    details: {
      retryAfter: '60 seconds',
      limit: '100 requests per hour'
    },
    timestamp: new Date(),
    requestId: generateRequestId()
  };

  res.status(429).json(errorResponse);
};

/**
 * 404 handler for unknown routes
 */
export const notFoundHandler = (req: Request, res: Response) => {
  const errorResponse: ErrorResponse = {
    error: ErrorType.NOT_FOUND_ERROR,
    message: `Route ${req.method} ${req.path} not found`,
    details: {
      availableRoutes: [
        'POST /api/routes/calculate',
        'GET /api/routes/:id',
        'POST /api/safety/score',
        'GET /api/safety/crime-data'
      ]
    },
    timestamp: new Date(),
    requestId: generateRequestId()
  };

  res.status(404).json(errorResponse);
};

/**
 * Request timeout handler
 */
export const timeoutHandler = (timeoutMs: number = 30000) => {
  return (req: Request, res: Response, next: NextFunction) => {
    const timeout = setTimeout(() => {
      if (!res.headersSent) {
        const errorResponse: ErrorResponse = {
          error: ErrorType.INTERNAL_SERVER_ERROR,
          message: 'Request timeout - operation took too long',
          details: {
            timeoutMs,
            suggestedAction: 'Retry with simpler parameters'
          },
          timestamp: new Date(),
          requestId: generateRequestId()
        };

        res.status(408).json(errorResponse);
      }
    }, timeoutMs);

    // Clear timeout on response completion
    res.on('finish', () => clearTimeout(timeout));
    res.on('close', () => clearTimeout(timeout));

    next();
  };
};

// Helper functions

/**
 * Validate location is within Cape Town bounds
 */
function validateLocationBounds(location: any, fieldName: string): void {
  const CAPE_TOWN_BOUNDS = {
    minLat: -34.5,
    maxLat: -33.5,
    minLng: 18.0,
    maxLng: 19.0
  };

  if (!location || typeof location.latitude !== 'number' || typeof location.longitude !== 'number') {
    throw new ValidationError(`${fieldName} must have valid latitude and longitude coordinates`);
  }

  const { latitude, longitude } = location;

  if (latitude < CAPE_TOWN_BOUNDS.minLat ||
      latitude > CAPE_TOWN_BOUNDS.maxLat ||
      longitude < CAPE_TOWN_BOUNDS.minLng ||
      longitude > CAPE_TOWN_BOUNDS.maxLng) {
    throw new ValidationError(
      `${fieldName} must be within Cape Town metropolitan area`,
      {
        provided: { latitude, longitude },
        bounds: CAPE_TOWN_BOUNDS
      }
    );
  }
}

/**
 * Basic request data validation
 */
function validateRequestData(data: any, schema: any): { isValid: boolean; errors?: any } {
  // Simple validation - in production, use a library like Joi or Yup
  const errors: any = {};
  let isValid = true;

  for (const [field, rules] of Object.entries(schema)) {
    const value = data[field];
    const fieldRules = rules as any;

    // Required field check
    if (fieldRules.required && (value === undefined || value === null)) {
      errors[field] = `${field} is required`;
      isValid = false;
      continue;
    }

    // Type check
    if (value !== undefined && fieldRules.type && typeof value !== fieldRules.type) {
      errors[field] = `${field} must be of type ${fieldRules.type}`;
      isValid = false;
    }

    // Min/max for numbers
    if (fieldRules.min !== undefined && typeof value === 'number' && value < fieldRules.min) {
      errors[field] = `${field} must be at least ${fieldRules.min}`;
      isValid = false;
    }

    if (fieldRules.max !== undefined && typeof value === 'number' && value > fieldRules.max) {
      errors[field] = `${field} must be no more than ${fieldRules.max}`;
      isValid = false;
    }

    // Array validation
    if (fieldRules.isArray && value && !Array.isArray(value)) {
      errors[field] = `${field} must be an array`;
      isValid = false;
    }
  }

  return { isValid, errors: isValid ? undefined : errors };
}

/**
 * Generate unique request ID for tracking
 */
function generateRequestId(): string {
  return `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

/**
 * Log error for debugging and monitoring
 */
function logError(error: Error, req: Request, requestId: string): void {
  const logData = {
    requestId,
    timestamp: new Date().toISOString(),
    method: req.method,
    path: req.path,
    userAgent: req.get('User-Agent'),
    ip: req.ip,
    error: {
      name: error.name,
      message: error.message,
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
    }
  };

  // In production, this would go to a logging service
  console.error('[ERROR]', JSON.stringify(logData, null, 2));

  // For critical errors, could send to monitoring service
  if (error instanceof APIError && !error.isOperational) {
    console.error('[CRITICAL]', 'Non-operational error:', error);
    // Send to monitoring service like Sentry, DataDog, etc.
  }
}

// Common validation schemas
export const validationSchemas = {
  routeCalculation: {
    origin: { required: true, type: 'object' },
    destination: { required: true, type: 'object' },
    preferences: { required: false, type: 'object' },
    options: { required: false, type: 'object' }
  },
  safetyScore: {
    location: { required: true, type: 'object' },
    timeContext: { required: false, type: 'object' },
    factors: { required: false, type: 'object' }
  },
  locationCoordinates: {
    latitude: { required: true, type: 'number', min: -90, max: 90 },
    longitude: { required: true, type: 'number', min: -180, max: 180 }
  }
};

export default {
  errorHandler,
  asyncHandler,
  validateRequest,
  validateCapeTownLocation,
  rateLimitHandler,
  notFoundHandler,
  timeoutHandler,
  APIError,
  ValidationError,
  NotFoundError,
  ExternalAPIError,
  RateLimitError,
  validationSchemas
};