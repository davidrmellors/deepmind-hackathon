// Contract Test: GET /api/routes/{routeId}/safety
// Based on routes-api.yaml specification

import request from 'supertest';
import app from '../../src/index';

describe('GET /api/routes/:routeId/safety', () => {
  const validRouteId = 'route_fastest_001';
  const invalidRouteId = 'route_nonexistent_999';
  const currentTime = '2025-09-24T20:30:00Z';
  const dayTime = '2025-09-24T14:00:00Z';

  it('should return 200 with current safety assessment for valid route', async () => {
    const response = await request(app)
      .get(`/api/routes/${validRouteId}/safety`)
      .query({ currentTime })
      .expect(200);

    // Validate SafetyScore schema structure
    expect(response.body).toHaveProperty('overall');
    expect(response.body).toHaveProperty('lastCalculated');
    expect(response.body).toHaveProperty('explanation');
    expect(response.body).toHaveProperty('confidenceLevel');

    // Validate overall score range
    expect(typeof response.body.overall).toBe('number');
    expect(response.body.overall).toBeGreaterThanOrEqual(0);
    expect(response.body.overall).toBeLessThanOrEqual(100);

    // Validate confidence level
    expect(typeof response.body.confidenceLevel).toBe('number');
    expect(response.body.confidenceLevel).toBeGreaterThanOrEqual(0);
    expect(response.body.confidenceLevel).toBeLessThanOrEqual(100);

    // Validate AI explanation exists and is meaningful
    expect(typeof response.body.explanation).toBe('string');
    expect(response.body.explanation.length).toBeGreaterThan(10);

    // Validate detailed score factors
    if (response.body.crimeRisk !== undefined) {
      expect(response.body.crimeRisk).toBeGreaterThanOrEqual(0);
      expect(response.body.crimeRisk).toBeLessThanOrEqual(100);
    }

    if (response.body.timeFactor !== undefined) {
      expect(response.body.timeFactor).toBeGreaterThanOrEqual(0);
      expect(response.body.timeFactor).toBeLessThanOrEqual(100);
    }

    if (response.body.populationDensity !== undefined) {
      expect(response.body.populationDensity).toBeGreaterThanOrEqual(0);
      expect(response.body.populationDensity).toBeLessThanOrEqual(100);
    }

    if (response.body.lightingLevel !== undefined) {
      expect(response.body.lightingLevel).toBeGreaterThanOrEqual(0);
      expect(response.body.lightingLevel).toBeLessThanOrEqual(100);
    }

    // Validate historical incidents count
    if (response.body.historicalIncidents !== undefined) {
      expect(typeof response.body.historicalIncidents).toBe('number');
      expect(response.body.historicalIncidents).toBeGreaterThanOrEqual(0);
    }

    // Validate timestamp format
    expect(new Date(response.body.lastCalculated)).toBeInstanceOf(Date);
  });

  it('should return different scores for day vs night time', async () => {
    // Get nighttime score
    const nightResponse = await request(app)
      .get(`/api/routes/${validRouteId}/safety`)
      .query({ currentTime: '2025-09-24T22:00:00Z' })
      .expect(200);

    // Get daytime score
    const dayResponse = await request(app)
      .get(`/api/routes/${validRouteId}/safety`)
      .query({ currentTime: dayTime })
      .expect(200);

    // Safety scores should be different between day and night
    // Generally, night scores should be lower (but not always, depending on area)
    expect(nightResponse.body.overall).not.toBe(dayResponse.body.overall);

    // Time factors should be different
    if (nightResponse.body.timeFactor && dayResponse.body.timeFactor) {
      expect(nightResponse.body.timeFactor).not.toBe(dayResponse.body.timeFactor);
    }

    // Explanations should reference time-based factors
    expect(nightResponse.body.explanation).toMatch(/night|dark|evening|late/i);
    expect(dayResponse.body.explanation).toMatch(/day|light|afternoon|morning/i);
  });

  it('should include detailed safety factors array', async () => {
    const response = await request(app)
      .get(`/api/routes/${validRouteId}/safety`)
      .query({ currentTime })
      .expect(200);

    if (response.body.factors) {
      expect(Array.isArray(response.body.factors)).toBe(true);
      expect(response.body.factors.length).toBeGreaterThan(0);

      const factor = response.body.factors[0];
      expect(factor).toHaveProperty('type');
      expect(factor).toHaveProperty('impact');
      expect(factor).toHaveProperty('weight');
      expect(factor).toHaveProperty('description');
      expect(factor).toHaveProperty('value');

      // Validate factor type enum
      expect(['crime', 'lighting', 'population', 'time', 'weather', 'events']).toContain(factor.type);

      // Validate impact enum
      expect(['positive', 'negative', 'neutral']).toContain(factor.impact);

      // Validate weight range
      expect(typeof factor.weight).toBe('number');
      expect(factor.weight).toBeGreaterThanOrEqual(0);
      expect(factor.weight).toBeLessThanOrEqual(1);

      // Validate description exists
      expect(typeof factor.description).toBe('string');
      expect(factor.description.length).toBeGreaterThan(5);

      // Sum of all factor weights should be approximately 1.0
      const totalWeight = response.body.factors.reduce((sum: number, f: any) => sum + f.weight, 0);
      expect(totalWeight).toBeCloseTo(1.0, 1);
    }
  });

  it('should return 404 for non-existent route ID', async () => {
    const response = await request(app)
      .get(`/api/routes/${invalidRouteId}/safety`)
      .query({ currentTime })
      .expect(404);

    expect(response.body).toHaveProperty('error', 'ROUTE_NOT_FOUND');
    expect(response.body).toHaveProperty('message');
    expect(response.body.message).toContain(invalidRouteId);
  });

  it('should use current time if currentTime query parameter is missing', async () => {
    const response = await request(app)
      .get(`/api/routes/${validRouteId}/safety`)
      .expect(200);

    expect(response.body).toHaveProperty('overall');
    expect(response.body).toHaveProperty('lastCalculated');

    // Should be calculated within the last few seconds
    const calculatedTime = new Date(response.body.lastCalculated);
    const now = new Date();
    const timeDifference = now.getTime() - calculatedTime.getTime();
    expect(timeDifference).toBeLessThan(10000); // Less than 10 seconds
  });

  it('should handle invalid currentTime format gracefully', async () => {
    const response = await request(app)
      .get(`/api/routes/${validRouteId}/safety`)
      .query({ currentTime: 'invalid-date-format' })
      .expect(400);

    expect(response.body).toHaveProperty('error', 'INVALID_TIME_FORMAT');
    expect(response.body).toHaveProperty('message');
  });

  it('should return updated safety score on subsequent requests', async () => {
    // First request
    const response1 = await request(app)
      .get(`/api/routes/${validRouteId}/safety`)
      .query({ currentTime })
      .expect(200);

    // Wait a moment and make second request
    await new Promise(resolve => setTimeout(resolve, 100));

    const response2 = await request(app)
      .get(`/api/routes/${validRouteId}/safety`)
      .query({ currentTime })
      .expect(200);

    // Scores may be the same if cached, but lastCalculated should be recent
    const time1 = new Date(response1.body.lastCalculated);
    const time2 = new Date(response2.body.lastCalculated);

    // Both timestamps should be recent
    const now = new Date();
    expect(now.getTime() - time1.getTime()).toBeLessThan(10000);
    expect(now.getTime() - time2.getTime()).toBeLessThan(10000);
  });

  it('should validate Cape Town time zone in calculations', async () => {
    // Cape Town is UTC+2, test with local time
    const capeTimeZone = '2025-09-24T20:30:00+02:00';

    const response = await request(app)
      .get(`/api/routes/${validRouteId}/safety`)
      .query({ currentTime: capeTimeZone })
      .expect(200);

    expect(response.body).toHaveProperty('overall');
    expect(response.body.explanation).toMatch(/evening|night/i); // Should recognize it's evening in Cape Town
  });
});