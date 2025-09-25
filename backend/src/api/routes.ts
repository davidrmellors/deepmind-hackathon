import { Router, Request, Response } from 'express';
import {
  RouteRequest,
  RouteResponse,
  Route,
  Location,
  SafetyScore,
  RouteSegment,
  ResponseMetadata,
  ErrorResponse
} from '../types';
import { SafetyScoringService } from '../services/safetyScoringService';
import { LocationService } from '../services/locationService';
import { v4 as uuidv4 } from 'uuid';

const router = Router();

// In-memory storage for calculated routes (for demo purposes)
const routeCache = new Map<string, Route>();
const safetyScoringService = new SafetyScoringService();
const locationService = new LocationService();

/**
 * POST /api/routes/calculate
 * Calculate safe routes between two locations
 */
router.post('/calculate', async (req: Request, res: Response) => {
  try {
    const startTime = Date.now();
    const routeRequest: RouteRequest = req.body;

    // Validate request
    if (!routeRequest.origin || !routeRequest.destination) {
      const error: ErrorResponse = {
        error: 'MISSING_REQUIRED_FIELDS',
        message: 'Both origin and destination are required',
        timestamp: new Date(),
        requestId: req.headers['x-request-id'] as string || uuidv4()
      };
      return res.status(400).json(error);
    }

    // Validate Cape Town bounds
    const isOriginValid = locationService.isWithinCapeTownBounds(routeRequest.origin.latitude, routeRequest.origin.longitude);
    const isDestinationValid = locationService.isWithinCapeTownBounds(routeRequest.destination.latitude, routeRequest.destination.longitude);

    if (!isOriginValid) {
      const error: ErrorResponse = {
        error: 'INVALID_LOCATION',
        message: 'Origin location is outside Cape Town metropolitan area',
        details: { location: 'origin', bounds: 'Cape Town: lat(-34.5, -33.5), lng(18.0, 19.0)' },
        timestamp: new Date(),
        requestId: req.headers['x-request-id'] as string || uuidv4()
      };
      return res.status(400).json(error);
    }

    if (!isDestinationValid) {
      const error: ErrorResponse = {
        error: 'INVALID_LOCATION',
        message: 'Destination location is outside Cape Town metropolitan area',
        details: { location: 'destination', bounds: 'Cape Town: lat(-34.5, -33.5), lng(18.0, 19.0)' },
        timestamp: new Date(),
        requestId: req.headers['x-request-id'] as string || uuidv4()
      };
      return res.status(400).json(error);
    }

    // Generate multiple route alternatives (simulating Google Routes API)
    const routes = await generateRouteAlternatives(routeRequest);

    // Calculate safety scores for each route
    for (let i = 0; i < routes.length; i++) {
      routes[i] = await safetyScoringService.calculateRouteSafety(routes[i]);
    }

    // Rank routes
    const rankedRoutes = rankRoutes(routes, routeRequest.preferences?.safetyPriority || 50);

    const processingTime = Date.now() - startTime;

    // Prepare response
    const response: RouteResponse = {
      routes: rankedRoutes,
      alternatives: {
        fastest: rankedRoutes.find(r => r.alternativeRank === 1)?.id,
        safest: rankedRoutes.find(r => r.safetyScore.overall === Math.max(...rankedRoutes.map(r => r.safetyScore.overall)))?.id,
        balanced: rankedRoutes.find(r => r.alternativeRank === 2)?.id
      },
      metadata: {
        calculatedAt: new Date(),
        processingTime,
        dataConfidence: 85,
        apiVersion: '1.0.0'
      }
    };

    // Cache routes for later retrieval
    rankedRoutes.forEach(route => routeCache.set(route.id, route));

    res.status(200).json(response);

  } catch (error) {
    console.error('Route calculation error:', error);
    const errorResponse: ErrorResponse = {
      error: 'CALCULATION_FAILED',
      message: 'Failed to calculate routes',
      details: { error: error instanceof Error ? error.message : 'Unknown error' },
      timestamp: new Date(),
      requestId: req.headers['x-request-id'] as string || uuidv4()
    };
    res.status(500).json(errorResponse);
  }
});

/**
 * GET /api/routes/:routeId
 * Get route details by ID
 */
router.get('/:routeId', async (req: Request, res: Response) => {
  try {
    const { routeId } = req.params;

    const route = routeCache.get(routeId);
    if (!route) {
      const error: ErrorResponse = {
        error: 'ROUTE_NOT_FOUND',
        message: `Route with ID ${routeId} not found`,
        timestamp: new Date(),
        requestId: req.headers['x-request-id'] as string || uuidv4()
      };
      return res.status(404).json(error);
    }

    res.status(200).json(route);

  } catch (error) {
    console.error('Route retrieval error:', error);
    const errorResponse: ErrorResponse = {
      error: 'RETRIEVAL_FAILED',
      message: 'Failed to retrieve route',
      details: { error: error instanceof Error ? error.message : 'Unknown error' },
      timestamp: new Date(),
      requestId: req.headers['x-request-id'] as string || uuidv4()
    };
    res.status(500).json(errorResponse);
  }
});

/**
 * GET /api/routes/:routeId/safety
 * Get current safety assessment for route
 */
router.get('/:routeId/safety', async (req: Request, res: Response) => {
  try {
    const { routeId } = req.params;
    const currentTime = req.query.currentTime as string;

    const route = routeCache.get(routeId);
    if (!route) {
      const error: ErrorResponse = {
        error: 'ROUTE_NOT_FOUND',
        message: `Route with ID ${routeId} not found`,
        timestamp: new Date(),
        requestId: req.headers['x-request-id'] as string || uuidv4()
      };
      return res.status(404).json(error);
    }

    // Recalculate safety score with current time context if provided
    let safetyScore = route.safetyScore;
    if (currentTime) {
      const timeContextDate = new Date(currentTime);
      const updatedRoute = await safetyScoringService.calculateRouteSafety(route, { currentTime: timeContextDate.toISOString() });
      safetyScore = updatedRoute.safetyScore;
    }

    res.status(200).json(safetyScore);

  } catch (error) {
    console.error('Safety assessment error:', error);
    const errorResponse: ErrorResponse = {
      error: 'SAFETY_ASSESSMENT_FAILED',
      message: 'Failed to assess route safety',
      details: { error: error instanceof Error ? error.message : 'Unknown error' },
      timestamp: new Date(),
      requestId: req.headers['x-request-id'] as string || uuidv4()
    };
    res.status(500).json(errorResponse);
  }
});

// Helper functions

async function generateRouteAlternatives(request: RouteRequest): Promise<Route[]> {
  const maxRoutes = request.options?.maxRoutes || 3;
  const routes: Route[] = [];

  // For demo purposes, we'll generate synthetic routes
  // In a real implementation, this would call Google Routes API

  const baseDistance = calculateDistance(request.origin, request.destination);
  const baseDuration = Math.round(baseDistance * 0.06); // ~60 seconds per km

  for (let i = 0; i < maxRoutes; i++) {
    const routeId = `route_${i === 0 ? 'fastest' : i === 1 ? 'safest' : 'balanced'}_${uuidv4().slice(0, 8)}`;

    // Generate variations for different route types
    const distanceMultiplier = i === 0 ? 1.0 : i === 1 ? 1.15 : 1.08; // Fastest, safest, balanced
    const durationMultiplier = i === 0 ? 1.0 : i === 1 ? 1.2 : 1.1;

    const route: Route = {
      id: routeId,
      origin: request.origin,
      destination: request.destination,
      waypoints: request.waypoints || [],
      totalDistance: Math.round(baseDistance * distanceMultiplier),
      estimatedDuration: Math.round(baseDuration * durationMultiplier),
      safetyScore: {
        overall: 0, // Will be calculated later
        crimeRisk: 0,
        timeFactor: 0,
        populationDensity: 0,
        lightingLevel: 0,
        historicalIncidents: 0,
        confidenceLevel: 0,
        explanation: '',
        lastCalculated: new Date(),
        factors: []
      },
      segments: await generateRouteSegments(request.origin, request.destination, i),
      alternativeRank: i + 1,
      createdAt: new Date(),
      lastUpdated: new Date()
    };

    routes.push(route);
  }

  return routes;
}

async function generateRouteSegments(origin: Location, destination: Location, routeIndex: number): Promise<RouteSegment[]> {
  const segments: RouteSegment[] = [];
  const numSegments = 3 + routeIndex; // Different routes have different segment counts

  for (let i = 0; i < numSegments; i++) {
    const progress = (i + 1) / numSegments;
    const startLat = origin.latitude + (destination.latitude - origin.latitude) * (i / numSegments);
    const startLng = origin.longitude + (destination.longitude - origin.longitude) * (i / numSegments);
    const endLat = origin.latitude + (destination.latitude - origin.latitude) * progress;
    const endLng = origin.longitude + (destination.longitude - origin.longitude) * progress;

    const segment: RouteSegment = {
      id: `segment_${i + 1}_${uuidv4().slice(0, 6)}`,
      startLocation: {
        latitude: startLat,
        longitude: startLng,
        address: i === 0 ? origin.address : undefined
      },
      endLocation: {
        latitude: endLat,
        longitude: endLng,
        address: i === numSegments - 1 ? destination.address : undefined
      },
      distance: Math.round(calculateDistance({ latitude: startLat, longitude: startLng }, { latitude: endLat, longitude: endLng })),
      duration: Math.round(calculateDistance({ latitude: startLat, longitude: startLng }, { latitude: endLat, longitude: endLng }) * 0.06),
      safetyScore: {
        overall: 0, // Will be calculated
        crimeRisk: 0,
        timeFactor: 0,
        populationDensity: 0,
        lightingLevel: 0,
        historicalIncidents: 0,
        confidenceLevel: 0,
        explanation: '',
        lastCalculated: new Date(),
        factors: []
      },
      roadType: i === 0 ? 'arterial' : routeIndex === 0 ? 'highway' : 'local',
      lightingLevel: routeIndex === 1 ? 'high' : 'medium'
    };

    segments.push(segment);
  }

  return segments;
}

function calculateDistance(point1: Location, point2: Location): number {
  // Haversine formula for calculating distance between two points
  const R = 6371000; // Earth's radius in meters
  const dLat = (point2.latitude - point1.latitude) * Math.PI / 180;
  const dLng = (point2.longitude - point1.longitude) * Math.PI / 180;
  const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(point1.latitude * Math.PI / 180) * Math.cos(point2.latitude * Math.PI / 180) *
    Math.sin(dLng / 2) * Math.sin(dLng / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

function rankRoutes(routes: Route[], safetyPriority: number): Route[] {
  // Sort routes based on safety priority vs time efficiency
  return routes.sort((a, b) => {
    const safetyWeight = safetyPriority / 100;
    const timeWeight = 1 - safetyWeight;

    // Normalize scores (higher safety score is better, lower duration is better)
    const aScore = a.safetyScore.overall * safetyWeight + (1 - a.estimatedDuration / Math.max(...routes.map(r => r.estimatedDuration))) * timeWeight * 100;
    const bScore = b.safetyScore.overall * safetyWeight + (1 - b.estimatedDuration / Math.max(...routes.map(r => r.estimatedDuration))) * timeWeight * 100;

    return bScore - aScore; // Higher score is better
  });
}

export default router;