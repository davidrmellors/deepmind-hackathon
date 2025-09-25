// Contract Test: GET /api/routes/{routeId}
// Based on routes-api.yaml specification

import request from 'supertest';
import app from '../../src/index';

describe('GET /api/routes/:routeId', () => {
  const validRouteId = 'route_fastest_001';
  const invalidRouteId = 'route_nonexistent_999';

  it('should return 200 with valid route details for existing route', async () => {
    const response = await request(app)
      .get(`/api/routes/${validRouteId}`)
      .expect(200);

    // Validate route structure matches Route schema from routes-api.yaml
    expect(response.body).toHaveProperty('id', validRouteId);
    expect(response.body).toHaveProperty('origin');
    expect(response.body).toHaveProperty('destination');
    expect(response.body).toHaveProperty('totalDistance');
    expect(response.body).toHaveProperty('estimatedDuration');
    expect(response.body).toHaveProperty('safetyScore');
    expect(response.body).toHaveProperty('segments');
    expect(response.body).toHaveProperty('alternativeRank');
    expect(response.body).toHaveProperty('createdAt');
    expect(response.body).toHaveProperty('lastUpdated');

    // Validate origin and destination structure
    expect(response.body.origin).toHaveProperty('latitude');
    expect(response.body.origin).toHaveProperty('longitude');
    expect(response.body.destination).toHaveProperty('latitude');
    expect(response.body.destination).toHaveProperty('longitude');

    // Validate Cape Town bounds
    expect(response.body.origin.latitude).toBeGreaterThanOrEqual(-34.5);
    expect(response.body.origin.latitude).toBeLessThanOrEqual(-33.5);
    expect(response.body.origin.longitude).toBeGreaterThanOrEqual(18.0);
    expect(response.body.origin.longitude).toBeLessThanOrEqual(19.0);

    // Validate numeric fields
    expect(typeof response.body.totalDistance).toBe('number');
    expect(response.body.totalDistance).toBeGreaterThan(0);
    expect(typeof response.body.estimatedDuration).toBe('number');
    expect(response.body.estimatedDuration).toBeGreaterThan(0);
    expect(typeof response.body.alternativeRank).toBe('number');
    expect(response.body.alternativeRank).toBeGreaterThanOrEqual(1);

    // Validate safety score structure
    expect(response.body.safetyScore).toHaveProperty('overall');
    expect(response.body.safetyScore).toHaveProperty('lastCalculated');
    expect(typeof response.body.safetyScore.overall).toBe('number');
    expect(response.body.safetyScore.overall).toBeGreaterThanOrEqual(0);
    expect(response.body.safetyScore.overall).toBeLessThanOrEqual(100);

    // Validate segments array
    expect(Array.isArray(response.body.segments)).toBe(true);
    if (response.body.segments.length > 0) {
      const segment = response.body.segments[0];
      expect(segment).toHaveProperty('id');
      expect(segment).toHaveProperty('startLocation');
      expect(segment).toHaveProperty('endLocation');
      expect(segment).toHaveProperty('distance');
      expect(segment).toHaveProperty('duration');
      expect(segment).toHaveProperty('safetyScore');
      expect(segment).toHaveProperty('roadType');
      expect(segment).toHaveProperty('lightingLevel');

      // Validate road type enum
      expect(['highway', 'arterial', 'local', 'residential']).toContain(segment.roadType);

      // Validate lighting level enum
      expect(['high', 'medium', 'low', 'none']).toContain(segment.lightingLevel);
    }

    // Validate date formats
    expect(new Date(response.body.createdAt)).toBeInstanceOf(Date);
    expect(new Date(response.body.lastUpdated)).toBeInstanceOf(Date);
  });

  it('should return 404 for non-existent route ID', async () => {
    const response = await request(app)
      .get(`/api/routes/${invalidRouteId}`)
      .expect(404);

    expect(response.body).toHaveProperty('error');
    expect(response.body).toHaveProperty('message');
    expect(response.body.error).toBe('ROUTE_NOT_FOUND');
    expect(response.body.message).toContain(invalidRouteId);
  });

  it('should return 400 for invalid route ID format', async () => {
    const malformedRouteId = 'invalid-format-123!@#';

    const response = await request(app)
      .get(`/api/routes/${malformedRouteId}`)
      .expect(400);

    expect(response.body).toHaveProperty('error');
    expect(response.body).toHaveProperty('message');
    expect(response.body.error).toBe('INVALID_ROUTE_ID');
  });

  it('should include waypoints if route has intermediate stops', async () => {
    const response = await request(app)
      .get(`/api/routes/${validRouteId}`)
      .expect(200);

    if (response.body.waypoints && response.body.waypoints.length > 0) {
      expect(Array.isArray(response.body.waypoints)).toBe(true);
      const waypoint = response.body.waypoints[0];
      expect(waypoint).toHaveProperty('latitude');
      expect(waypoint).toHaveProperty('longitude');
    }
  });

  it('should include googleRouteId if available', async () => {
    const response = await request(app)
      .get(`/api/routes/${validRouteId}`)
      .expect(200);

    if (response.body.googleRouteId) {
      expect(typeof response.body.googleRouteId).toBe('string');
      expect(response.body.googleRouteId).toBeTruthy();
    }
  });

  it('should return consistent data structure across multiple requests', async () => {
    const response1 = await request(app)
      .get(`/api/routes/${validRouteId}`)
      .expect(200);

    const response2 = await request(app)
      .get(`/api/routes/${validRouteId}`)
      .expect(200);

    // Route details should be identical (cached)
    expect(response1.body.id).toBe(response2.body.id);
    expect(response1.body.totalDistance).toBe(response2.body.totalDistance);
    expect(response1.body.estimatedDuration).toBe(response2.body.estimatedDuration);
    expect(response1.body.createdAt).toBe(response2.body.createdAt);
  });

  it('should handle URL encoding in route ID', async () => {
    const encodedRouteId = encodeURIComponent('route_test_001');

    const response = await request(app)
      .get(`/api/routes/${encodedRouteId}`)
      .expect(200);

    expect(response.body.id).toBe('route_test_001');
  });
});