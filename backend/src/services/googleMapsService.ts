// Google Maps Platform APIs Integration Service
// Integrates Google Routes API and other Maps APIs for route calculation
// Based on research.md: Routes API + Maps JavaScript API with Custom Safety Overlays

import {
  Route,
  RouteSegment,
  Location,
  RouteCalculationRequest,
  RouteCalculationResponse,
  TravelMode
} from '../types/index.js';

import { SafetyScoringService } from './safetyScoringService.js';

interface GoogleRoutesRequest {
  origin: {
    location: {
      latLng: {
        latitude: number;
        longitude: number;
      };
    };
  };
  destination: {
    location: {
      latLng: {
        latitude: number;
        longitude: number;
      };
    };
  };
  travelMode: 'DRIVE' | 'WALK' | 'BICYCLE' | 'TRANSIT';
  routingPreference?: 'TRAFFIC_AWARE' | 'TRAFFIC_AWARE_OPTIMAL' | 'TRAFFIC_UNAWARE';
  computeAlternativeRoutes?: boolean;
  avoidTolls?: boolean;
  avoidHighways?: boolean;
  avoidFerries?: boolean;
}

interface GoogleRoutesResponse {
  routes: GoogleRoute[];
  fallbackInfo?: {
    routingMode: string;
    reason: string;
  };
}

interface GoogleRoute {
  routeToken: string;
  legs: GoogleLeg[];
  distanceMeters: number;
  duration: string;
  staticDuration: string;
  polyline: {
    encodedPolyline: string;
  };
  routeLabels?: string[];
  warnings?: string[];
}

interface GoogleLeg {
  startLocation: {
    latLng: {
      latitude: number;
      longitude: number;
    };
  };
  endLocation: {
    latLng: {
      latitude: number;
      longitude: number;
    };
  };
  steps: GoogleStep[];
  distanceMeters: number;
  duration: string;
}

interface GoogleStep {
  startLocation: {
    latLng: {
      latitude: number;
      longitude: number;
    };
  };
  endLocation: {
    latLng: {
      latitude: number;
      longitude: number;
    };
  };
  distanceMeters: number;
  staticDuration: string;
  polyline: {
    encodedPolyline: string;
  };
  navigationInstruction?: {
    maneuver: string;
    instructions: string;
  };
}

export class GoogleMapsService {
  private apiKey: string;
  private routesApiUrl = 'https://routes.googleapis.com/directions/v2:computeRoutes';
  private safetyScoringService: SafetyScoringService;

  constructor() {
    this.apiKey = process.env.GOOGLE_MAPS_API_KEY || '';
    if (!this.apiKey) {
      console.warn('Google Maps API key not found in environment variables');
    }
    this.safetyScoringService = new SafetyScoringService();
  }

  /**
   * Calculate multiple route alternatives using Google Routes API
   * @param request Route calculation parameters
   * @returns Routes with safety scores and recommendations
   */
  public async calculateRoutes(request: RouteCalculationRequest): Promise<RouteCalculationResponse> {
    const startTime = Date.now();

    try {
      // Validate Cape Town bounds
      this.validateCapeTownBounds(request.origin);
      this.validateCapeTownBounds(request.destination);

      // Prepare Google Routes API request
      const googleRequest = this.buildGoogleRoutesRequest(request);

      // Call Google Routes API
      const googleResponse = await this.callGoogleRoutesApi(googleRequest);

      // Convert Google routes to our format
      const routes = await this.convertGoogleRoutesToOurFormat(
        googleResponse.routes,
        request
      );

      // Calculate safety scores for all routes
      const routesWithSafety = await this.addSafetyScoresToRoutes(
        routes,
        request.timeContext
      );

      // Rank routes by preference (fastest, safest, balanced)
      const rankedRoutes = this.rankRoutesByPreference(
        routesWithSafety,
        request.preferences
      );

      const calculationTime = Date.now() - startTime;

      return {
        routes: rankedRoutes,
        metadata: {
          calculationTime,
          routesRequested: request.options?.maxRoutes || 3,
          routesReturned: rankedRoutes.length,
          dataSource: 'google_routes_api',
          fallbackUsed: !!googleResponse.fallbackInfo,
          apiVersion: 'v2'
        }
      };

    } catch (error: any) {
      console.error('Google Routes API error:', error);

      // Fallback to basic route if API fails
      if (error.message?.includes('API_KEY') || error.message?.includes('PERMISSION_DENIED')) {
        return this.generateFallbackRoute(request);
      }

      throw new Error(`Route calculation failed: ${error.message}`);
    }
  }

  /**
   * Get detailed route information by route ID/token
   * @param routeId Google route token or our route ID
   * @param includeTrafficUpdates Whether to include real-time traffic
   * @returns Detailed route with current conditions
   */
  public async getRouteDetails(routeId: string, includeTrafficUpdates: boolean = false): Promise<Route> {
    try {
      // For now, return cached route info
      // In production, this would fetch updated route data from Google
      throw new Error('Route details lookup not yet implemented - use calculateRoutes for fresh data');
    } catch (error: any) {
      throw new Error(`Failed to get route details: ${error.message}`);
    }
  }

  /**
   * Validate that location is within Cape Town metropolitan bounds
   */
  private validateCapeTownBounds(location: Location): void {
    const CAPE_TOWN_BOUNDS = {
      minLat: -34.5,
      maxLat: -33.5,
      minLng: 18.0,
      maxLng: 19.0
    };

    if (location.latitude < CAPE_TOWN_BOUNDS.minLat ||
        location.latitude > CAPE_TOWN_BOUNDS.maxLat ||
        location.longitude < CAPE_TOWN_BOUNDS.minLng ||
        location.longitude > CAPE_TOWN_BOUNDS.maxLng) {
      throw new Error(`Location ${location.address || 'provided'} is outside Cape Town metropolitan area`);
    }
  }

  /**
   * Build Google Routes API request from our format
   */
  private buildGoogleRoutesRequest(request: RouteCalculationRequest): GoogleRoutesRequest {
    const travelModeMap: Record<TravelMode, 'DRIVE' | 'WALK' | 'BICYCLE' | 'TRANSIT'> = {
      driving: 'DRIVE',
      walking: 'WALK',
      cycling: 'BICYCLE',
      transit: 'TRANSIT'
    };

    return {
      origin: {
        location: {
          latLng: {
            latitude: request.origin.latitude,
            longitude: request.origin.longitude
          }
        }
      },
      destination: {
        location: {
          latLng: {
            latitude: request.destination.latitude,
            longitude: request.destination.longitude
          }
        }
      },
      travelMode: travelModeMap[request.preferences?.travelMode || 'driving'],
      routingPreference: 'TRAFFIC_AWARE_OPTIMAL',
      computeAlternativeRoutes: true,
      avoidTolls: request.preferences?.avoidTolls || false,
      avoidHighways: request.preferences?.avoidHighways || false,
      avoidFerries: true // No ferries in Cape Town metro routing
    };
  }

  /**
   * Make the actual API call to Google Routes
   */
  private async callGoogleRoutesApi(request: GoogleRoutesRequest): Promise<GoogleRoutesResponse> {
    const response = await fetch(this.routesApiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Goog-Api-Key': this.apiKey,
        'X-Goog-FieldMask': 'routes.routeToken,routes.legs,routes.distanceMeters,routes.duration,routes.staticDuration,routes.polyline,routes.routeLabels,routes.warnings'
      },
      body: JSON.stringify(request)
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Google Routes API error:', response.status, errorText);

      if (response.status === 403) {
        throw new Error('PERMISSION_DENIED: Check Google Routes API key and permissions');
      } else if (response.status === 400) {
        throw new Error('INVALID_REQUEST: Invalid route request parameters');
      } else if (response.status === 429) {
        throw new Error('QUOTA_EXCEEDED: Google Routes API quota exceeded');
      } else {
        throw new Error(`Google Routes API error: ${response.status}`);
      }
    }

    return await response.json();
  }

  /**
   * Convert Google routes format to our internal format
   */
  private async convertGoogleRoutesToOurFormat(
    googleRoutes: GoogleRoute[],
    request: RouteCalculationRequest
  ): Promise<Route[]> {
    const routes: Route[] = [];

    for (let i = 0; i < googleRoutes.length; i++) {
      const googleRoute = googleRoutes[i];

      // Convert route legs to our segments format
      const segments = this.convertLegsToSegments(googleRoute.legs);

      // Calculate waypoints from segments
      const waypoints = segments.map(segment => segment.startLocation);
      waypoints.push(segments[segments.length - 1].endLocation);

      const route: Route = {
        id: `google-route-${Date.now()}-${i}`,
        origin: request.origin,
        destination: request.destination,
        waypoints,
        totalDistance: googleRoute.distanceMeters,
        estimatedDuration: this.parseDurationString(googleRoute.duration),
        safetyScore: {
          // Placeholder - will be calculated later
          overall: 0,
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
        segments,
        alternativeRank: i + 1, // Will be re-ranked later
        googleRouteId: googleRoute.routeToken,
        createdAt: new Date(),
        lastUpdated: new Date()
      };

      routes.push(route);
    }

    return routes;
  }

  /**
   * Convert Google route legs to our route segments
   */
  private convertLegsToSegments(legs: GoogleLeg[]): RouteSegment[] {
    const segments: RouteSegment[] = [];

    for (let legIndex = 0; legIndex < legs.length; legIndex++) {
      const leg = legs[legIndex];

      // For each leg, create segments from steps
      for (let stepIndex = 0; stepIndex < leg.steps.length; stepIndex++) {
        const step = leg.steps[stepIndex];

        const segment: RouteSegment = {
          id: `segment-${legIndex}-${stepIndex}`,
          startLocation: {
            latitude: step.startLocation.latLng.latitude,
            longitude: step.startLocation.latLng.longitude,
            address: `Step ${stepIndex + 1} start`
          },
          endLocation: {
            latitude: step.endLocation.latLng.latitude,
            longitude: step.endLocation.latLng.longitude,
            address: `Step ${stepIndex + 1} end`
          },
          distance: step.distanceMeters,
          duration: this.parseDurationString(step.staticDuration),
          safetyScore: {
            // Placeholder - will be calculated by safety service
            overall: 0,
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
          roadType: this.inferRoadType(step),
          lightingLevel: 'medium' // Will be updated by safety analysis
        };

        segments.push(segment);
      }
    }

    return segments;
  }

  /**
   * Parse Google duration string (e.g., "1234s") to seconds
   */
  private parseDurationString(duration: string): number {
    if (duration.endsWith('s')) {
      return parseInt(duration.slice(0, -1));
    }
    return 0;
  }

  /**
   * Infer road type from Google step information
   */
  private inferRoadType(step: GoogleStep): 'highway' | 'arterial' | 'local' | 'residential' {
    const maneuver = step.navigationInstruction?.maneuver?.toLowerCase() || '';
    const instructions = step.navigationInstruction?.instructions?.toLowerCase() || '';

    if (instructions.includes('highway') || instructions.includes('freeway') ||
        instructions.includes('n1') || instructions.includes('n2') || instructions.includes('m3')) {
      return 'highway';
    } else if (instructions.includes('main') || instructions.includes('road') ||
               maneuver.includes('merge') || step.distanceMeters > 2000) {
      return 'arterial';
    } else if (instructions.includes('street') || instructions.includes('avenue') ||
               step.distanceMeters > 500) {
      return 'local';
    } else {
      return 'residential';
    }
  }

  /**
   * Add safety scores to all routes using SafetyScoringService
   */
  private async addSafetyScoresToRoutes(
    routes: Route[],
    timeContext?: any
  ): Promise<Route[]> {
    const routesWithSafety: Route[] = [];

    for (const route of routes) {
      const routeWithSafety = await this.safetyScoringService.calculateRouteSafety(
        route,
        timeContext
      );
      routesWithSafety.push(routeWithSafety);
    }

    return routesWithSafety;
  }

  /**
   * Rank routes by user preference (fastest, safest, balanced)
   */
  private rankRoutesByPreference(
    routes: Route[],
    preferences?: any
  ): Route[] {
    const safetyPriority = preferences?.safetyPriority || 50; // 0-100 scale

    // Calculate composite score for each route
    const routesWithScores = routes.map(route => {
      // Normalize values for comparison
      const maxDuration = Math.max(...routes.map(r => r.estimatedDuration));
      const maxDistance = Math.max(...routes.map(r => r.totalDistance));

      const speedScore = 100 - (route.estimatedDuration / maxDuration) * 100;
      const distanceScore = 100 - (route.totalDistance / maxDistance) * 100;
      const safetyScore = route.safetyScore.overall;

      // Weighted composite score based on user preference
      const safetyWeight = safetyPriority / 100;
      const speedWeight = (100 - safetyPriority) / 100;

      const compositeScore =
        (safetyScore * safetyWeight) +
        (speedScore * speedWeight * 0.7) +
        (distanceScore * speedWeight * 0.3);

      return {
        ...route,
        compositeScore
      };
    });

    // Sort by composite score (highest first)
    routesWithScores.sort((a, b) => b.compositeScore - a.compositeScore);

    // Assign alternative ranks and labels
    return routesWithScores.map((route, index) => ({
      ...route,
      alternativeRank: index + 1
    }));
  }

  /**
   * Generate fallback route when Google API fails
   */
  private async generateFallbackRoute(request: RouteCalculationRequest): Promise<RouteCalculationResponse> {
    console.log('Using fallback route generation due to API failure');

    // Create a simple direct route as fallback
    const fallbackRoute: Route = {
      id: `fallback-route-${Date.now()}`,
      origin: request.origin,
      destination: request.destination,
      waypoints: [request.origin, request.destination],
      totalDistance: this.calculateHaversineDistance(
        request.origin.latitude,
        request.origin.longitude,
        request.destination.latitude,
        request.destination.longitude
      ) * 1000, // Convert to meters
      estimatedDuration: 1800, // Default 30 minutes
      safetyScore: {
        overall: 65, // Conservative fallback score
        crimeRisk: 65,
        timeFactor: 65,
        populationDensity: 65,
        lightingLevel: 65,
        historicalIncidents: 0,
        confidenceLevel: 40, // Low confidence for fallback
        explanation: 'Fallback route - limited safety data available',
        lastCalculated: new Date(),
        factors: []
      },
      segments: [{
        id: 'fallback-segment-1',
        startLocation: request.origin,
        endLocation: request.destination,
        distance: this.calculateHaversineDistance(
          request.origin.latitude,
          request.origin.longitude,
          request.destination.latitude,
          request.destination.longitude
        ) * 1000,
        duration: 1800,
        safetyScore: {
          overall: 65,
          crimeRisk: 65,
          timeFactor: 65,
          populationDensity: 65,
          lightingLevel: 65,
          historicalIncidents: 0,
          confidenceLevel: 40,
          explanation: 'Fallback segment safety estimate',
          lastCalculated: new Date(),
          factors: []
        },
        roadType: 'local',
        lightingLevel: 'medium'
      }],
      alternativeRank: 1,
      createdAt: new Date(),
      lastUpdated: new Date()
    };

    return {
      routes: [fallbackRoute],
      metadata: {
        calculationTime: 100,
        routesRequested: 1,
        routesReturned: 1,
        dataSource: 'fallback',
        fallbackUsed: true,
        apiVersion: 'fallback'
      }
    };
  }

  /**
   * Calculate straight-line distance using Haversine formula
   */
  private calculateHaversineDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
    const R = 6371; // Earth's radius in kilometers
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
      Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  }
}

export default GoogleMapsService;