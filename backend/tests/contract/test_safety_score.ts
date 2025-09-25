// Contract Test: POST /api/safety/score
// Based on safety-api.yaml specification

import request from 'supertest';
import app from '../../src/index';
import { SafetyScoreRequest } from '../../src/types';

describe('POST /api/safety/score', () => {
  const validRequest: SafetyScoreRequest = {
    location: {
      latitude: -33.9249,
      longitude: 18.4241,
      address: "V&A Waterfront, Cape Town"
    },
    timeContext: {
      currentTime: '2025-09-24T20:30:00Z',
      travelDuration: 1800,
      dayOfWeek: 'tuesday',
      isHoliday: false
    },
    factors: {
      includeCrimeData: true,
      includeEnvironmental: true,
      includeRealTime: true,
      includeHistorical: true,
      aiAnalysis: true
    },
    userContext: {
      travelMode: 'driving',
      vulnerabilityFactors: ['tourist'],
      riskTolerance: 'medium'
    }
  };

  it('should return 200 with comprehensive safety score for valid request', async () => {
    const response = await request(app)
      .post('/api/safety/score')
      .send(validRequest)
      .expect(200);

    // Validate SafetyScoreResponse structure
    expect(response.body).toHaveProperty('safetyScore');
    expect(response.body).toHaveProperty('metadata');

    // Validate SafetyScore structure
    const score = response.body.safetyScore;
    expect(score).toHaveProperty('overall');
    expect(score).toHaveProperty('lastCalculated');
    expect(typeof score.overall).toBe('number');
    expect(score.overall).toBeGreaterThanOrEqual(0);
    expect(score.overall).toBeLessThanOrEqual(100);

    // Validate detailed score components
    if (score.crimeRisk !== undefined) {
      expect(score.crimeRisk).toBeGreaterThanOrEqual(0);
      expect(score.crimeRisk).toBeLessThanOrEqual(100);
    }

    if (score.timeFactor !== undefined) {
      expect(score.timeFactor).toBeGreaterThanOrEqual(0);
      expect(score.timeFactor).toBeLessThanOrEqual(100);
    }

    if (score.populationDensity !== undefined) {
      expect(score.populationDensity).toBeGreaterThanOrEqual(0);
      expect(score.populationDensity).toBeLessThanOrEqual(100);
    }

    if (score.lightingLevel !== undefined) {
      expect(score.lightingLevel).toBeGreaterThanOrEqual(0);
      expect(score.lightingLevel).toBeLessThanOrEqual(100);
    }

    // Validate metadata
    const metadata = response.body.metadata;
    expect(metadata).toHaveProperty('calculationTime');
    if (metadata.calculationTime) {
      expect(typeof metadata.calculationTime).toBe('number');
      expect(metadata.calculationTime).toBeGreaterThan(0);
    }

    if (metadata.dataSourcesUsed) {
      expect(Array.isArray(metadata.dataSourcesUsed)).toBe(true);
    }

    if (metadata.aiModelVersion) {
      expect(typeof metadata.aiModelVersion).toBe('string');
    }
  });

  it('should include recommendations when available', async () => {
    const response = await request(app)
      .post('/api/safety/score')
      .send(validRequest)
      .expect(200);

    if (response.body.recommendations) {
      expect(Array.isArray(response.body.recommendations)).toBe(true);

      if (response.body.recommendations.length > 0) {
        const recommendation = response.body.recommendations[0];
        expect(recommendation).toHaveProperty('type');
        expect(recommendation).toHaveProperty('priority');
        expect(recommendation).toHaveProperty('description');
        expect(recommendation).toHaveProperty('actionable');

        // Validate recommendation type enum
        expect(['route_change', 'time_change', 'precaution', 'alert_contact']).toContain(recommendation.type);

        // Validate priority enum
        expect(['low', 'medium', 'high', 'critical']).toContain(recommendation.priority);

        // Validate description exists
        expect(typeof recommendation.description).toBe('string');
        expect(recommendation.description.length).toBeGreaterThan(5);

        // Validate actionable is boolean
        expect(typeof recommendation.actionable).toBe('boolean');

        if (recommendation.estimatedImprovement !== undefined) {
          expect(recommendation.estimatedImprovement).toBeGreaterThanOrEqual(0);
          expect(recommendation.estimatedImprovement).toBeLessThanOrEqual(100);
        }
      }
    }
  });

  it('should include safety alerts when conditions warrant', async () => {
    const highRiskRequest: SafetyScoreRequest = {
      ...validRequest,
      location: {
        latitude: -33.9500, // Different area that might have alerts
        longitude: 18.4500,
        address: "High Risk Area, Cape Town"
      },
      timeContext: {
        ...validRequest.timeContext,
        currentTime: '2025-09-24T23:30:00Z' // Late night
      }
    };

    const response = await request(app)
      .post('/api/safety/score')
      .send(highRiskRequest)
      .expect(200);

    if (response.body.alerts) {
      expect(Array.isArray(response.body.alerts)).toBe(true);

      if (response.body.alerts.length > 0) {
        const alert = response.body.alerts[0];
        expect(alert).toHaveProperty('id');
        expect(alert).toHaveProperty('type');
        expect(alert).toHaveProperty('severity');
        expect(alert).toHaveProperty('message');
        expect(alert).toHaveProperty('location');
        expect(alert).toHaveProperty('timestamp');

        // Validate alert type enum
        expect(['high_crime_area', 'poor_lighting', 'recent_incident', 'road_closure', 'emergency']).toContain(alert.type);

        // Validate severity enum
        expect(['info', 'warning', 'critical']).toContain(alert.severity);

        // Validate message exists
        expect(typeof alert.message).toBe('string');
        expect(alert.message.length).toBeGreaterThan(10);

        // Validate timestamp
        expect(new Date(alert.timestamp)).toBeInstanceOf(Date);
      }
    }
  });

  it('should return 400 for missing location', async () => {
    const invalidRequest = { ...validRequest };
    delete invalidRequest.location;

    const response = await request(app)
      .post('/api/safety/score')
      .send(invalidRequest)
      .expect(400);

    expect(response.body).toHaveProperty('error');
    expect(response.body).toHaveProperty('message');
  });

  it('should return 400 for location outside Cape Town bounds', async () => {
    const invalidRequest: SafetyScoreRequest = {
      ...validRequest,
      location: {
        latitude: -26.2041, // Johannesburg
        longitude: 28.0473,
        address: "Johannesburg, South Africa"
      }
    };

    const response = await request(app)
      .post('/api/safety/score')
      .send(invalidRequest)
      .expect(400);

    expect(response.body.error).toBe('INVALID_LOCATION');
    expect(response.body.message).toContain('Cape Town');
  });

  it('should handle route-based scoring when route array provided', async () => {
    const routeRequest: SafetyScoreRequest = {
      ...validRequest,
      route: [
        { latitude: -33.9249, longitude: 18.4241 },
        { latitude: -33.9350, longitude: 18.4350 },
        { latitude: -33.9588, longitude: 18.4718 }
      ]
    };

    const response = await request(app)
      .post('/api/safety/score')
      .send(routeRequest)
      .expect(200);

    expect(response.body.safetyScore).toHaveProperty('overall');

    // Route-based scoring might include different factors
    if (response.body.safetyScore.factors) {
      expect(Array.isArray(response.body.safetyScore.factors)).toBe(true);
    }
  });

  it('should respect scoring factors configuration', async () => {
    const minimalRequest: SafetyScoreRequest = {
      location: validRequest.location,
      factors: {
        includeCrimeData: false,
        includeEnvironmental: false,
        includeRealTime: false,
        includeHistorical: false,
        aiAnalysis: false
      }
    };

    const response = await request(app)
      .post('/api/safety/score')
      .send(minimalRequest)
      .expect(200);

    expect(response.body.safetyScore).toHaveProperty('overall');

    // Should still provide a basic score even with minimal factors
    expect(response.body.safetyScore.confidenceLevel).toBeLessThan(80); // Lower confidence due to limited factors
  });

  it('should consider user context in scoring', async () => {
    const touristRequest: SafetyScoreRequest = {
      ...validRequest,
      userContext: {
        travelMode: 'walking',
        vulnerabilityFactors: ['tourist', 'alone'],
        riskTolerance: 'low'
      }
    };

    const localRequest: SafetyScoreRequest = {
      ...validRequest,
      userContext: {
        travelMode: 'driving',
        vulnerabilityFactors: [],
        riskTolerance: 'high'
      }
    };

    const touristResponse = await request(app)
      .post('/api/safety/score')
      .send(touristRequest)
      .expect(200);

    const localResponse = await request(app)
      .post('/api/safety/score')
      .send(localRequest)
      .expect(200);

    // Tourist scores should generally be more conservative
    // (Lower scores due to higher vulnerability)
    if (touristResponse.body.safetyScore.overall !== localResponse.body.safetyScore.overall) {
      expect(touristResponse.body.safetyScore.explanation).toContain('tourist');
    }
  });

  it('should provide different scores for different times of day', async () => {
    const nightRequest: SafetyScoreRequest = {
      ...validRequest,
      timeContext: {
        ...validRequest.timeContext,
        currentTime: '2025-09-24T23:00:00Z'
      }
    };

    const dayRequest: SafetyScoreRequest = {
      ...validRequest,
      timeContext: {
        ...validRequest.timeContext,
        currentTime: '2025-09-24T14:00:00Z'
      }
    };

    const nightResponse = await request(app)
      .post('/api/safety/score')
      .send(nightRequest)
      .expect(200);

    const dayResponse = await request(app)
      .post('/api/safety/score')
      .send(dayRequest)
      .expect(200);

    // Scores should be different due to time factors
    expect(nightResponse.body.safetyScore.overall).not.toBe(dayResponse.body.safetyScore.overall);

    if (nightResponse.body.safetyScore.timeFactor && dayResponse.body.safetyScore.timeFactor) {
      expect(nightResponse.body.safetyScore.timeFactor).not.toBe(dayResponse.body.safetyScore.timeFactor);
    }
  });
});