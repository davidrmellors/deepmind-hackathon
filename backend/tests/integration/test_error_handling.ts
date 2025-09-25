// Integration Test: Error handling scenario
// Based on quickstart.md Test Scenario 4

import request from 'supertest';
import app from '../../src/index';

describe('Integration: Error Handling Scenario', () => {
  it('should handle invalid locations with appropriate error messages', async () => {
    // Test 1: Location outside Cape Town bounds
    const londonRequest = {
      origin: {
        latitude: 51.5074, // London coordinates
        longitude: -0.1278,
        address: "London, UK"
      },
      destination: {
        latitude: -33.9588,
        longitude: 18.4718,
        address: "Camps Bay Beach, Cape Town"
      }
    };

    const londonResponse = await request(app)
      .post('/api/routes/calculate')
      .send(londonRequest)
      .expect(400);

    expect(londonResponse.body).toHaveProperty('error', 'INVALID_LOCATION');
    expect(londonResponse.body).toHaveProperty('message');
    expect(londonResponse.body.message).toContain('Cape Town');
    expect(londonResponse.body.message).toMatch(/bounds|area|region/i);

    // Test 2: Gibberish text as location
    const gibberishRequest = {
      origin: {
        latitude: -33.9249,
        longitude: 18.4241,
        address: "V&A Waterfront, Cape Town"
      },
      destination: {
        latitude: -33.9588,
        longitude: 18.4718,
        address: "xyzabc123invalid456location789"
      }
    };

    // This might be handled differently - either 400 for invalid format or processed with warning
    const gibberishResponse = await request(app)
      .post('/api/routes/calculate')
      .send(gibberishRequest);

    expect([400, 200]).toContain(gibberishResponse.status);

    if (gibberishResponse.status === 400) {
      expect(gibberishResponse.body).toHaveProperty('error');
      expect(gibberishResponse.body.message).toMatch(/location.*not.*found|invalid.*location/i);
    }
  });

  it('should handle missing required parameters gracefully', async () => {
    // Test missing origin
    const missingOriginRequest = {
      destination: {
        latitude: -33.9588,
        longitude: 18.4718,
        address: "Camps Bay Beach, Cape Town"
      }
    };

    const missingOriginResponse = await request(app)
      .post('/api/routes/calculate')
      .send(missingOriginRequest)
      .expect(400);

    expect(missingOriginResponse.body).toHaveProperty('error');
    expect(missingOriginResponse.body).toHaveProperty('message');
    expect(missingOriginResponse.body.message).toMatch(/origin.*required|missing.*origin/i);

    // Test missing destination
    const missingDestinationRequest = {
      origin: {
        latitude: -33.9249,
        longitude: 18.4241,
        address: "V&A Waterfront, Cape Town"
      }
    };

    const missingDestinationResponse = await request(app)
      .post('/api/routes/calculate')
      .send(missingDestinationRequest)
      .expect(400);

    expect(missingDestinationResponse.body).toHaveProperty('error');
    expect(missingDestinationResponse.body.message).toMatch(/destination.*required|missing.*destination/i);

    // Test completely empty request
    const emptyResponse = await request(app)
      .post('/api/routes/calculate')
      .send({})
      .expect(400);

    expect(emptyResponse.body).toHaveProperty('error');
    expect(emptyResponse.body).toHaveProperty('message');
  });

  it('should handle invalid coordinate formats', async () => {
    // Test invalid latitude (out of range)
    const invalidLatRequest = {
      origin: {
        latitude: 91.0, // Invalid: > 90
        longitude: 18.4241,
        address: "Invalid coordinates"
      },
      destination: {
        latitude: -33.9588,
        longitude: 18.4718,
        address: "Camps Bay Beach, Cape Town"
      }
    };

    const invalidLatResponse = await request(app)
      .post('/api/routes/calculate')
      .send(invalidLatRequest)
      .expect(400);

    expect(invalidLatResponse.body).toHaveProperty('error');
    expect(invalidLatResponse.body.message).toMatch(/invalid.*coordinate|latitude.*range/i);

    // Test invalid longitude (out of range)
    const invalidLngRequest = {
      origin: {
        latitude: -33.9249,
        longitude: 181.0, // Invalid: > 180
        address: "Invalid coordinates"
      },
      destination: {
        latitude: -33.9588,
        longitude: 18.4718,
        address: "Camps Bay Beach, Cape Town"
      }
    };

    const invalidLngResponse = await request(app)
      .post('/api/routes/calculate')
      .send(invalidLngRequest)
      .expect(400);

    expect(invalidLngResponse.body).toHaveProperty('error');
    expect(invalidLngResponse.body.message).toMatch(/invalid.*coordinate|longitude.*range/i);
  });

  it('should handle malformed JSON requests', async () => {
    // Test with malformed JSON
    const malformedResponse = await request(app)
      .post('/api/routes/calculate')
      .set('Content-Type', 'application/json')
      .send('{"origin": {"latitude": -33.9249, "longitude": 18.4241} invalid json')
      .expect(400);

    expect(malformedResponse.body).toHaveProperty('error');
    expect(malformedResponse.body.message).toMatch(/invalid.*json|malformed.*request/i);
  });

  it('should handle non-existent route IDs', async () => {
    const nonExistentRouteId = 'route_nonexistent_999';

    // Test GET route details
    const getRouteResponse = await request(app)
      .get(`/api/routes/${nonExistentRouteId}`)
      .expect(404);

    expect(getRouteResponse.body).toHaveProperty('error', 'ROUTE_NOT_FOUND');
    expect(getRouteResponse.body).toHaveProperty('message');
    expect(getRouteResponse.body.message).toContain(nonExistentRouteId);

    // Test GET route safety
    const getSafetyResponse = await request(app)
      .get(`/api/routes/${nonExistentRouteId}/safety`)
      .expect(404);

    expect(getSafetyResponse.body).toHaveProperty('error', 'ROUTE_NOT_FOUND');
    expect(getSafetyResponse.body.message).toContain(nonExistentRouteId);
  });

  it('should handle invalid time formats', async () => {
    // First create a valid route
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
      }
    };

    const routeResponse = await request(app)
      .post('/api/routes/calculate')
      .send(routeRequest)
      .expect(200);

    const routeId = routeResponse.body.routes[0].id;

    // Test invalid time format
    const invalidTimeResponse = await request(app)
      .get(`/api/routes/${routeId}/safety`)
      .query({ currentTime: 'invalid-date-format' })
      .expect(400);

    expect(invalidTimeResponse.body).toHaveProperty('error', 'INVALID_TIME_FORMAT');
    expect(invalidTimeResponse.body).toHaveProperty('message');
  });

  it('should handle API endpoint errors gracefully', async () => {
    // Test non-existent endpoints
    const nonExistentEndpointResponse = await request(app)
      .get('/api/nonexistent/endpoint')
      .expect(404);

    expect(nonExistentEndpointResponse.body).toHaveProperty('error', 'NOT_FOUND');
    expect(nonExistentEndpointResponse.body.message).toContain('/api/nonexistent/endpoint');

    // Test wrong HTTP method
    const wrongMethodResponse = await request(app)
      .put('/api/routes/calculate') // Should be POST
      .send({})
      .expect(404);

    expect(wrongMethodResponse.body).toHaveProperty('error', 'NOT_FOUND');
  });

  it('should handle oversized requests', async () => {
    // Create a request with excessive waypoints
    const oversizedRequest = {
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
      waypoints: Array(100).fill(null).map((_, i) => ({
        latitude: -33.9249 + (i * 0.001),
        longitude: 18.4241 + (i * 0.001),
        address: `Waypoint ${i}`
      }))
    };

    const oversizedResponse = await request(app)
      .post('/api/routes/calculate')
      .send(oversizedRequest)
      .expect(400);

    expect(oversizedResponse.body).toHaveProperty('error');
    expect(oversizedResponse.body.message).toMatch(/too many.*waypoints|request.*too.*large/i);
  });

  it('should handle invalid safety score parameters', async () => {
    // Test invalid location for safety scoring
    const invalidSafetyRequest = {
      location: {
        latitude: 91.0, // Invalid
        longitude: 18.4241
      }
    };

    const invalidSafetyResponse = await request(app)
      .post('/api/safety/score')
      .send(invalidSafetyRequest)
      .expect(400);

    expect(invalidSafetyResponse.body).toHaveProperty('error');
    expect(invalidSafetyResponse.body).toHaveProperty('message');

    // Test missing location
    const missingSafetyRequest = {
      factors: {
        includeCrimeData: true
      }
    };

    const missingSafetyResponse = await request(app)
      .post('/api/safety/score')
      .send(missingSafetyRequest)
      .expect(400);

    expect(missingSafetyResponse.body).toHaveProperty('error');
    expect(missingSafetyResponse.body.message).toMatch(/location.*required/i);
  });

  it('should handle same origin and destination', async () => {
    const sameLocationRequest = {
      origin: {
        latitude: -33.9249,
        longitude: 18.4241,
        address: "V&A Waterfront, Cape Town"
      },
      destination: {
        latitude: -33.9249,
        longitude: 18.4241,
        address: "V&A Waterfront, Cape Town"
      }
    };

    const sameLocationResponse = await request(app)
      .post('/api/routes/calculate')
      .send(sameLocationRequest)
      .expect(400);

    expect(sameLocationResponse.body).toHaveProperty('error');
    expect(sameLocationResponse.body.message).toMatch(/same.*location|origin.*destination.*identical/i);
  });

  it('should provide helpful error messages with context', async () => {
    // Test boundary error message
    const boundaryRequest = {
      origin: {
        latitude: -25.7461, // Pretoria coordinates (outside Cape Town)
        longitude: 28.1881,
        address: "Pretoria, South Africa"
      },
      destination: {
        latitude: -33.9588,
        longitude: 18.4718,
        address: "Camps Bay Beach, Cape Town"
      }
    };

    const boundaryResponse = await request(app)
      .post('/api/routes/calculate')
      .send(boundaryRequest)
      .expect(400);

    // Should provide helpful context about Cape Town bounds
    expect(boundaryResponse.body.message).toMatch(/cape town.*metropolitan.*area/i);
    expect(boundaryResponse.body).toHaveProperty('details');

    if (boundaryResponse.body.details) {
      expect(boundaryResponse.body.details).toHaveProperty('validLatitudeRange');
      expect(boundaryResponse.body.details).toHaveProperty('validLongitudeRange');
    }
  });

  it('should handle concurrent error scenarios without crashes', async () => {
    // Test multiple error conditions simultaneously
    const errorRequests = [
      request(app).post('/api/routes/calculate').send({}), // Missing params
      request(app).get('/api/routes/invalid_route_id'),    // Invalid route ID
      request(app).post('/api/safety/score').send({}),     // Missing safety params
      request(app).get('/api/safety/area/invalid_grid'),   // Invalid grid
      request(app).get('/api/nonexistent/endpoint')        // Non-existent endpoint
    ];

    const responses = await Promise.allSettled(errorRequests);

    // All should resolve (not reject due to server crash)
    responses.forEach((result, index) => {
      expect(result.status).toBe('fulfilled');
      if (result.status === 'fulfilled') {
        expect(result.value.status).toBeGreaterThanOrEqual(400);
        expect(result.value.body).toHaveProperty('error');
        expect(result.value.body).toHaveProperty('message');
      }
    });
  });

  it('should maintain error response format consistency', async () => {
    // Test various error scenarios for consistent format
    const errorScenarios = [
      { request: () => request(app).post('/api/routes/calculate').send({}), expectedStatus: 400 },
      { request: () => request(app).get('/api/routes/nonexistent'), expectedStatus: 404 },
      { request: () => request(app).post('/api/safety/score').send({}), expectedStatus: 400 }
    ];

    for (const scenario of errorScenarios) {
      const response = await scenario.request().expect(scenario.expectedStatus);

      // All errors should have consistent structure
      expect(response.body).toHaveProperty('error');
      expect(response.body).toHaveProperty('message');
      expect(response.body).toHaveProperty('timestamp');
      expect(typeof response.body.error).toBe('string');
      expect(typeof response.body.message).toBe('string');
      expect(new Date(response.body.timestamp)).toBeInstanceOf(Date);

      // Should have request ID for debugging (if implemented)
      if (response.body.requestId) {
        expect(typeof response.body.requestId).toBe('string');
      }
    }
  });
});