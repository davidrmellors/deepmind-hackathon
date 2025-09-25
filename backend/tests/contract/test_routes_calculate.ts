// Contract Test: POST /api/routes/calculate
// Based on routes-api.yaml specification

import request from 'supertest';
import app from '../../src/index';
import { RouteRequest, RouteResponse } from '../../src/types';

describe('POST /api/routes/calculate', () => {
  const validRequest: RouteRequest = {
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
      avoidTolls: false,
      optimizeFor: 'balanced'
    }
  };

  it('should return 200 with valid route calculation request', async () => {
    const response = await request(app)
      .post('/api/routes/calculate')
      .send(validRequest)
      .expect(200);

    // Validate response structure matches RouteResponse schema
    expect(response.body).toHaveProperty('routes');
    expect(response.body).toHaveProperty('metadata');
    expect(Array.isArray(response.body.routes)).toBe(true);
    expect(response.body.routes.length).toBeGreaterThan(0);
    expect(response.body.routes.length).toBeLessThanOrEqual(3);

    // Validate individual route structure
    const route = response.body.routes[0];
    expect(route).toHaveProperty('id');
    expect(route).toHaveProperty('origin');
    expect(route).toHaveProperty('destination');
    expect(route).toHaveProperty('totalDistance');
    expect(route).toHaveProperty('estimatedDuration');
    expect(route).toHaveProperty('safetyScore');
    expect(route).toHaveProperty('segments');
    expect(route).toHaveProperty('alternativeRank');

    // Validate safety score structure
    expect(route.safetyScore).toHaveProperty('overall');
    expect(route.safetyScore).toHaveProperty('explanation');
    expect(route.safetyScore).toHaveProperty('lastCalculated');
    expect(typeof route.safetyScore.overall).toBe('number');
    expect(route.safetyScore.overall).toBeGreaterThanOrEqual(0);
    expect(route.safetyScore.overall).toBeLessThanOrEqual(100);

    // Validate metadata
    expect(response.body.metadata).toHaveProperty('calculatedAt');
    expect(response.body.metadata).toHaveProperty('dataConfidence');
  });

  it('should return 400 for missing origin', async () => {
    const invalidRequest = { ...validRequest };
    delete invalidRequest.origin;

    const response = await request(app)
      .post('/api/routes/calculate')
      .send(invalidRequest)
      .expect(400);

    expect(response.body).toHaveProperty('error');
    expect(response.body).toHaveProperty('message');
  });

  it('should return 400 for missing destination', async () => {
    const invalidRequest = { ...validRequest };
    delete invalidRequest.destination;

    const response = await request(app)
      .post('/api/routes/calculate')
      .send(invalidRequest)
      .expect(400);

    expect(response.body).toHaveProperty('error');
    expect(response.body).toHaveProperty('message');
  });

  it('should return 400 for coordinates outside Cape Town bounds', async () => {
    const invalidRequest: RouteRequest = {
      ...validRequest,
      origin: {
        latitude: -26.2041, // Johannesburg coordinates
        longitude: 28.0473,
        address: "Johannesburg, South Africa"
      }
    };

    const response = await request(app)
      .post('/api/routes/calculate')
      .send(invalidRequest)
      .expect(400);

    expect(response.body.error).toBe('INVALID_LOCATION');
    expect(response.body.message).toContain('Cape Town');
  });

  it('should handle maxRoutes parameter correctly', async () => {
    const requestWith1Route: RouteRequest = {
      ...validRequest,
      options: { maxRoutes: 1 }
    };

    const response = await request(app)
      .post('/api/routes/calculate')
      .send(requestWith1Route)
      .expect(200);

    expect(response.body.routes).toHaveLength(1);
  });

  it('should include alternative route rankings', async () => {
    const response = await request(app)
      .post('/api/routes/calculate')
      .send(validRequest)
      .expect(200);

    if (response.body.alternatives) {
      expect(response.body.alternatives).toHaveProperty('fastest');
      expect(response.body.alternatives).toHaveProperty('safest');
      expect(response.body.alternatives).toHaveProperty('balanced');
    }

    // Verify alternative ranks are different
    const ranks = response.body.routes.map((route: any) => route.alternativeRank);
    const uniqueRanks = new Set(ranks);
    expect(uniqueRanks.size).toBe(ranks.length); // All ranks should be unique
  });

  it('should return processing time in metadata', async () => {
    const startTime = Date.now();

    const response = await request(app)
      .post('/api/routes/calculate')
      .send(validRequest)
      .expect(200);

    const endTime = Date.now();

    if (response.body.metadata.processingTime) {
      expect(response.body.metadata.processingTime).toBeGreaterThan(0);
      expect(response.body.metadata.processingTime).toBeLessThan(endTime - startTime);
    }
  });
});