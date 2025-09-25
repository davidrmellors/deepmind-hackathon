// Integration Test: Time-based safety variation scenario
// Based on quickstart.md Test Scenario 2

import request from 'supertest';
import app from '../../src/index';

describe('Integration: Time-Based Safety Variation Scenario', () => {
  const baseRouteRequest = {
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
      maxRoutes: 3
    }
  };

  const daytimeScenarios = [
    { time: '2025-09-24T08:00:00Z', description: 'Morning rush hour' },
    { time: '2025-09-24T14:00:00Z', description: 'Afternoon peak' },
    { time: '2025-09-24T17:30:00Z', description: 'Evening rush hour' }
  ];

  const nighttimeScenarios = [
    { time: '2025-09-24T20:00:00Z', description: 'Early evening' },
    { time: '2025-09-24T22:30:00Z', description: 'Late evening' },
    { time: '2025-09-24T02:00:00Z', description: 'Late night' }
  ];

  it('should show safety score variation between day and night', async () => {
    // Calculate routes for daytime
    const dayResponse = await request(app)
      .post('/api/routes/calculate')
      .send(baseRouteRequest)
      .expect(200);

    const dayRouteId = dayResponse.body.routes[0].id;

    // Get daytime safety assessment
    const daySafetyResponse = await request(app)
      .get(`/api/routes/${dayRouteId}/safety`)
      .query({ currentTime: '2025-09-24T14:00:00Z' })
      .expect(200);

    // Get nighttime safety assessment for same route
    const nightSafetyResponse = await request(app)
      .get(`/api/routes/${dayRouteId}/safety`)
      .query({ currentTime: '2025-09-24T22:00:00Z' })
      .expect(200);

    // Verify different safety scores
    expect(daySafetyResponse.body.overall).not.toBe(nightSafetyResponse.body.overall);

    // Generally expect night scores to be lower (but allow exceptions for specific areas)
    const dayScore = daySafetyResponse.body.overall;
    const nightScore = nightSafetyResponse.body.overall;
    const scoreDifference = dayScore - nightScore;

    // Should show meaningful difference (at least 5 points)
    expect(Math.abs(scoreDifference)).toBeGreaterThanOrEqual(5);

    // Time factor should be different
    if (daySafetyResponse.body.timeFactor && nightSafetyResponse.body.timeFactor) {
      expect(daySafetyResponse.body.timeFactor).not.toBe(nightSafetyResponse.body.timeFactor);
    }

    // Explanations should reference time-specific factors
    expect(daySafetyResponse.body.explanation).toMatch(/day|light|daylight|morning|afternoon/i);
    expect(nightSafetyResponse.body.explanation).toMatch(/night|dark|evening|late/i);
  });

  it('should provide different route recommendations based on time', async () => {
    // Get day route recommendations
    const dayResponse = await request(app)
      .post('/api/routes/calculate')
      .send({
        ...baseRouteRequest,
        timeContext: {
          currentTime: '2025-09-24T14:00:00Z'
        }
      })
      .expect(200);

    // Get night route recommendations
    const nightResponse = await request(app)
      .post('/api/routes/calculate')
      .send({
        ...baseRouteRequest,
        timeContext: {
          currentTime: '2025-09-24T22:00:00Z'
        }
      })
      .expect(200);

    // Both should return routes
    expect(dayResponse.body.routes.length).toBeGreaterThan(0);
    expect(nightResponse.body.routes.length).toBeGreaterThan(0);

    // Find the "safest" route for each time period
    const dayFafestRoute = dayResponse.body.routes.reduce((safest: any, route: any) =>
      route.safetyScore.overall > safest.safetyScore.overall ? route : safest
    );

    const nightFafestRoute = nightResponse.body.routes.reduce((safest: any, route: any) =>
      route.safetyScore.overall > safest.safetyScore.overall ? route : safest
    );

    // Verify safety scores are different
    expect(dayFafestRoute.safetyScore.overall).not.toBe(nightFafestRoute.safetyScore.overall);

    // Route preferences may change - different routes might be recommended
    const dayRouteIds = dayResponse.body.routes.map((r: any) => r.id).sort();
    const nightRouteIds = nightResponse.body.routes.map((r: any) => r.id).sort();

    // At minimum, safety scores should be recalculated
    if (dayRouteIds.includes(nightRouteIds[0])) {
      // Same route IDs, but safety scores should differ
      const sameRouteDay = dayResponse.body.routes.find((r: any) => r.id === nightRouteIds[0]);
      const sameRouteNight = nightResponse.body.routes.find((r: any) => r.id === nightRouteIds[0]);
      expect(sameRouteDay.safetyScore.overall).not.toBe(sameRouteNight.safetyScore.overall);
    }
  });

  it('should demonstrate hourly safety variation patterns', async () => {
    // Test safety assessment across different hours
    const hourlyResults: any[] = [];

    const testHours = [
      '2025-09-24T06:00:00Z', // Early morning
      '2025-09-24T09:00:00Z', // Morning
      '2025-09-24T12:00:00Z', // Midday
      '2025-09-24T15:00:00Z', // Afternoon
      '2025-09-24T18:00:00Z', // Evening
      '2025-09-24T21:00:00Z', // Night
      '2025-09-24T00:00:00Z'  // Midnight
    ];

    // Calculate route first
    const routeResponse = await request(app)
      .post('/api/routes/calculate')
      .send(baseRouteRequest)
      .expect(200);

    const routeId = routeResponse.body.routes[0].id;

    // Get safety scores for different hours
    for (const hour of testHours) {
      const safetyResponse = await request(app)
        .get(`/api/routes/${routeId}/safety`)
        .query({ currentTime: hour })
        .expect(200);

      hourlyResults.push({
        hour,
        score: safetyResponse.body.overall,
        timeFactor: safetyResponse.body.timeFactor,
        explanation: safetyResponse.body.explanation
      });
    }

    // Verify we have variation across hours
    const scores = hourlyResults.map(r => r.score);
    const maxScore = Math.max(...scores);
    const minScore = Math.min(...scores);
    expect(maxScore - minScore).toBeGreaterThan(10); // Should have at least 10 point variation

    // Verify time factors change
    if (hourlyResults[0].timeFactor !== undefined) {
      const timeFactors = hourlyResults.map(r => r.timeFactor);
      const uniqueTimeFactors = new Set(timeFactors);
      expect(uniqueTimeFactors.size).toBeGreaterThan(1); // Should have different time factors
    }

    // Verify explanations reference appropriate time periods
    const morningResult = hourlyResults.find(r => r.hour.includes('T09:'));
    const nightResult = hourlyResults.find(r => r.hour.includes('T21:') || r.hour.includes('T00:'));

    if (morningResult) {
      expect(morningResult.explanation).toMatch(/morning|day|light/i);
    }
    if (nightResult) {
      expect(nightResult.explanation).toMatch(/evening|night|dark|late/i);
    }
  });

  it('should handle weekend vs weekday time variations', async () => {
    const routeResponse = await request(app)
      .post('/api/routes/calculate')
      .send(baseRouteRequest)
      .expect(200);

    const routeId = routeResponse.body.routes[0].id;

    // Weekday evening
    const weekdayResponse = await request(app)
      .get(`/api/routes/${routeId}/safety`)
      .query({ currentTime: '2025-09-24T20:00:00Z' }) // Wednesday evening
      .expect(200);

    // Weekend evening (same time)
    const weekendResponse = await request(app)
      .get(`/api/routes/${routeId}/safety`)
      .query({ currentTime: '2025-09-27T20:00:00Z' }) // Saturday evening
      .expect(200);

    // Safety scores may differ due to different activity patterns
    expect(typeof weekdayResponse.body.overall).toBe('number');
    expect(typeof weekendResponse.body.overall).toBe('number');

    // Both should be valid safety scores
    expect(weekdayResponse.body.overall).toBeGreaterThanOrEqual(0);
    expect(weekdayResponse.body.overall).toBeLessThanOrEqual(100);
    expect(weekendResponse.body.overall).toBeGreaterThanOrEqual(0);
    expect(weekendResponse.body.overall).toBeLessThanOrEqual(100);
  });

  it('should provide time-sensitive safety recommendations', async () => {
    // Test location-based safety scoring at different times
    const locationRequest = {
      location: {
        latitude: -33.9249,
        longitude: 18.4241,
        address: "V&A Waterfront, Cape Town"
      },
      timeContext: {
        currentTime: '2025-09-24T14:00:00Z', // Will be updated for each test
        travelDuration: 1800
      },
      factors: {
        includeCrimeData: true,
        includeEnvironmental: true,
        includeRealTime: true,
        aiAnalysis: true
      }
    };

    // Daytime scoring
    const dayScoreResponse = await request(app)
      .post('/api/safety/score')
      .send(locationRequest)
      .expect(200);

    // Nighttime scoring
    const nightScoreResponse = await request(app)
      .post('/api/safety/score')
      .send({
        ...locationRequest,
        timeContext: {
          ...locationRequest.timeContext,
          currentTime: '2025-09-24T22:00:00Z'
        }
      })
      .expect(200);

    // Should have different scores
    expect(dayScoreResponse.body.safetyScore.overall)
      .not.toBe(nightScoreResponse.body.safetyScore.overall);

    // Check if recommendations differ
    const dayRecommendations = dayScoreResponse.body.recommendations || [];
    const nightRecommendations = nightScoreResponse.body.recommendations || [];

    // Night time might have more precautionary recommendations
    if (nightRecommendations.length > 0) {
      const highPriorityNightRecommendations = nightRecommendations.filter(
        (rec: any) => rec.priority === 'high' || rec.priority === 'critical'
      );
      expect(Array.isArray(highPriorityNightRecommendations)).toBe(true);
    }
  });

  it('should handle time zone considerations for Cape Town', async () => {
    const routeResponse = await request(app)
      .post('/api/routes/calculate')
      .send(baseRouteRequest)
      .expect(200);

    const routeId = routeResponse.body.routes[0].id;

    // Test with different time zone formats
    const utcTime = '2025-09-24T20:00:00Z';
    const capeTimeZone = '2025-09-24T22:00:00+02:00'; // Cape Town is UTC+2

    const utcResponse = await request(app)
      .get(`/api/routes/${routeId}/safety`)
      .query({ currentTime: utcTime })
      .expect(200);

    const localResponse = await request(app)
      .get(`/api/routes/${routeId}/safety`)
      .query({ currentTime: capeTimeZone })
      .expect(200);

    // Both represent the same time, so scores should be the same
    expect(utcResponse.body.overall).toBe(localResponse.body.overall);
  });

  it('should complete time-based analysis within performance requirements', async () => {
    const startTime = Date.now();

    // Test multiple time periods quickly
    const routeResponse = await request(app)
      .post('/api/routes/calculate')
      .send(baseRouteRequest)
      .expect(200);

    const routeId = routeResponse.body.routes[0].id;

    // Get safety assessments for different times in parallel
    const timeAssessments = await Promise.all([
      request(app).get(`/api/routes/${routeId}/safety`).query({ currentTime: '2025-09-24T08:00:00Z' }),
      request(app).get(`/api/routes/${routeId}/safety`).query({ currentTime: '2025-09-24T14:00:00Z' }),
      request(app).get(`/api/routes/${routeId}/safety`).query({ currentTime: '2025-09-24T20:00:00Z' }),
      request(app).get(`/api/routes/${routeId}/safety`).query({ currentTime: '2025-09-24T23:00:00Z' })
    ]);

    const endTime = Date.now();
    const totalTime = endTime - startTime;

    // All should succeed
    timeAssessments.forEach(response => {
      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('overall');
    });

    // Should complete within reasonable time (under 5 seconds)
    expect(totalTime).toBeLessThan(5000);
  });
});