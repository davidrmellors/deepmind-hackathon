// Integration Test: Basic route calculation scenario
// Based on quickstart.md Test Scenario 1

import request from 'supertest';
import app from '../../src/index';

describe('Integration: Basic Route Calculation Scenario', () => {
  const routeRequest = {
    origin: {
      latitude: -33.9249,
      longitude: 18.4241,
      address: "V&A Waterfront, Cape Town"
    },
    destination: {
      latitude: -33.9588,
      longitude: 18.4718,
      address: "Camps Bay Beach, Cape Town"
    },
    preferences: {
      safetyPriority: 70,
      riskTolerance: 'medium',
      preferredTravelModes: ['driving'],
      avoidAreas: [],
      notificationSettings: {
        safetyAlerts: true,
        routeUpdates: true,
        arrivalNotifications: true,
        emergencyContacts: []
      },
      accessibilityNeeds: []
    },
    options: {
      maxRoutes: 3,
      optimizeFor: 'balanced'
    }
  };

  it('should complete end-to-end route calculation workflow', async () => {
    // Step 1: Calculate routes (POST /api/routes/calculate)
    const calculateResponse = await request(app)
      .post('/api/routes/calculate')
      .send(routeRequest)
      .expect(200);

    // Verify basic response structure
    expect(calculateResponse.body).toHaveProperty('routes');
    expect(calculateResponse.body).toHaveProperty('metadata');
    expect(Array.isArray(calculateResponse.body.routes)).toBe(true);
    expect(calculateResponse.body.routes.length).toBeGreaterThanOrEqual(1);
    expect(calculateResponse.body.routes.length).toBeLessThanOrEqual(3);

    // Verify route calculation time requirement (<3 seconds from quickstart.md)
    const calculationTime = calculateResponse.body.metadata.processingTime;
    if (calculationTime) {
      expect(calculationTime).toBeLessThan(3000); // Less than 3 seconds
    }

    // Step 2: Verify route alternatives with different characteristics
    const routes = calculateResponse.body.routes;

    // Should have different alternative ranks
    const ranks = routes.map((route: any) => route.alternativeRank);
    const uniqueRanks = new Set(ranks);
    expect(uniqueRanks.size).toBe(ranks.length);

    // Safety scores should vary between routes (>10 point variance)
    if (routes.length > 1) {
      const safetyScores = routes.map((route: any) => route.safetyScore.overall);
      const maxScore = Math.max(...safetyScores);
      const minScore = Math.min(...safetyScores);
      expect(maxScore - minScore).toBeGreaterThan(10);
    }

    // Step 3: Get detailed route information (GET /api/routes/{routeId})
    const fastestRoute = routes.find((route: any) => route.alternativeRank === 1);
    expect(fastestRoute).toBeDefined();

    const routeDetailResponse = await request(app)
      .get(`/api/routes/${fastestRoute.id}`)
      .expect(200);

    expect(routeDetailResponse.body.id).toBe(fastestRoute.id);
    expect(routeDetailResponse.body.totalDistance).toBe(fastestRoute.totalDistance);
    expect(routeDetailResponse.body.estimatedDuration).toBe(fastestRoute.estimatedDuration);

    // Step 4: Get safety assessment for route (GET /api/routes/{routeId}/safety)
    const safetyResponse = await request(app)
      .get(`/api/routes/${fastestRoute.id}/safety`)
      .query({ currentTime: '2025-09-24T14:00:00Z' })
      .expect(200);

    expect(safetyResponse.body).toHaveProperty('overall');
    expect(safetyResponse.body).toHaveProperty('explanation');
    expect(safetyResponse.body.overall).toBeGreaterThanOrEqual(0);
    expect(safetyResponse.body.overall).toBeLessThanOrEqual(100);

    // Step 5: Verify AI explanation contains meaningful content
    expect(typeof safetyResponse.body.explanation).toBe('string');
    expect(safetyResponse.body.explanation.length).toBeGreaterThan(20);
    expect(safetyResponse.body.explanation).toMatch(/safety|crime|lighting|route|area/i);

    // Step 6: Verify route segments have color-coded safety information
    expect(Array.isArray(fastestRoute.segments)).toBe(true);
    if (fastestRoute.segments.length > 0) {
      const segment = fastestRoute.segments[0];
      expect(segment).toHaveProperty('safetyScore');
      expect(segment.safetyScore).toHaveProperty('overall');
      expect(segment.safetyScore.overall).toBeGreaterThanOrEqual(0);
      expect(segment.safetyScore.overall).toBeLessThanOrEqual(100);
    }
  });

  it('should handle route alternative selection workflow', async () => {
    // Calculate routes
    const calculateResponse = await request(app)
      .post('/api/routes/calculate')
      .send(routeRequest)
      .expect(200);

    const routes = calculateResponse.body.routes;

    if (routes.length > 1) {
      // Test selecting different route alternatives
      for (const route of routes) {
        // Get route details
        const detailResponse = await request(app)
          .get(`/api/routes/${route.id}`)
          .expect(200);

        expect(detailResponse.body.alternativeRank).toBe(route.alternativeRank);

        // Get safety information
        const safetyResponse = await request(app)
          .get(`/api/routes/${route.id}/safety`)
          .expect(200);

        expect(safetyResponse.body.overall).toBe(route.safetyScore.overall);
      }
    }
  });

  it('should handle route preferences impact on recommendations', async () => {
    // Test with safety-prioritized preferences
    const safetyPriorityRequest = {
      ...routeRequest,
      preferences: {
        ...routeRequest.preferences,
        safetyPriority: 90,
        riskTolerance: 'low'
      },
      options: {
        ...routeRequest.options,
        optimizeFor: 'safety'
      }
    };

    const safetyResponse = await request(app)
      .post('/api/routes/calculate')
      .send(safetyPriorityRequest)
      .expect(200);

    // Test with time-prioritized preferences
    const timePriorityRequest = {
      ...routeRequest,
      preferences: {
        ...routeRequest.preferences,
        safetyPriority: 30,
        riskTolerance: 'high'
      },
      options: {
        ...routeRequest.options,
        optimizeFor: 'time'
      }
    };

    const timeResponse = await request(app)
      .post('/api/routes/calculate')
      .send(timePriorityRequest)
      .expect(200);

    // Safety-prioritized routes should generally have higher safety scores
    if (safetyResponse.body.routes.length > 0 && timeResponse.body.routes.length > 0) {
      const safestFromSafety = Math.max(...safetyResponse.body.routes.map((r: any) => r.safetyScore.overall));
      const safestFromTime = Math.max(...timeResponse.body.routes.map((r: any) => r.safetyScore.overall));

      // Safety-optimized should generally produce safer routes
      expect(safestFromSafety).toBeGreaterThanOrEqual(safestFromTime - 5); // Allow 5 point tolerance
    }
  });

  it('should complete workflow within performance requirements', async () => {
    const startTime = Date.now();

    // Complete full workflow
    const calculateResponse = await request(app)
      .post('/api/routes/calculate')
      .send(routeRequest)
      .expect(200);

    const routeId = calculateResponse.body.routes[0].id;

    await request(app)
      .get(`/api/routes/${routeId}`)
      .expect(200);

    await request(app)
      .get(`/api/routes/${routeId}/safety`)
      .expect(200);

    const endTime = Date.now();
    const totalTime = endTime - startTime;

    // Complete workflow should be under 5 seconds
    expect(totalTime).toBeLessThan(5000);
  });

  it('should handle map display data requirements', async () => {
    const calculateResponse = await request(app)
      .post('/api/routes/calculate')
      .send(routeRequest)
      .expect(200);

    const route = calculateResponse.body.routes[0];

    // Verify route has data needed for map display
    expect(route).toHaveProperty('origin');
    expect(route).toHaveProperty('destination');
    expect(route).toHaveProperty('segments');

    // Verify segments have coordinates for map rendering
    if (route.segments.length > 0) {
      route.segments.forEach((segment: any) => {
        expect(segment.startLocation).toHaveProperty('latitude');
        expect(segment.startLocation).toHaveProperty('longitude');
        expect(segment.endLocation).toHaveProperty('latitude');
        expect(segment.endLocation).toHaveProperty('longitude');

        // Coordinates should be within Cape Town bounds
        expect(segment.startLocation.latitude).toBeGreaterThanOrEqual(-34.5);
        expect(segment.startLocation.latitude).toBeLessThanOrEqual(-33.5);
        expect(segment.startLocation.longitude).toBeGreaterThanOrEqual(18.0);
        expect(segment.startLocation.longitude).toBeLessThanOrEqual(19.0);
      });
    }

    // Verify route has color coding information (lighting levels)
    if (route.segments.length > 0) {
      const segment = route.segments[0];
      expect(['high', 'medium', 'low', 'none']).toContain(segment.lightingLevel);
    }
  });

  it('should provide consistent results across multiple requests', async () => {
    // Make multiple identical requests
    const responses = await Promise.all([
      request(app).post('/api/routes/calculate').send(routeRequest),
      request(app).post('/api/routes/calculate').send(routeRequest),
      request(app).post('/api/routes/calculate').send(routeRequest)
    ]);

    // All should succeed
    responses.forEach(response => {
      expect(response.status).toBe(200);
      expect(response.body.routes).toBeDefined();
      expect(response.body.routes.length).toBeGreaterThan(0);
    });

    // Route characteristics should be consistent
    const firstRoutes = responses[0].body.routes;
    responses.slice(1).forEach(response => {
      expect(response.body.routes.length).toBe(firstRoutes.length);

      // Same origin/destination should produce similar total distances
      response.body.routes.forEach((route: any, index: number) => {
        const firstRoute = firstRoutes[index];
        const distanceDifference = Math.abs(route.totalDistance - firstRoute.totalDistance);
        expect(distanceDifference).toBeLessThan(firstRoute.totalDistance * 0.1); // Within 10%
      });
    });
  });
});