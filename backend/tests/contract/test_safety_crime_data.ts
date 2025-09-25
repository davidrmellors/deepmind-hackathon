// Contract Test: GET /api/safety/crime-data
// Based on safety-api.yaml specification

import request from 'supertest';
import app from '../../src/index';

describe('GET /api/safety/crime-data', () => {
  const validAreas = ['V&A Waterfront', 'Camps Bay', 'City Bowl', 'Sea Point'];
  const invalidArea = 'Johannesburg'; // Outside Cape Town
  const validCrimeTypes = ['violent', 'property', 'petty', 'vehicular'];
  const validTimeframes = ['1month', '3months', '6months', '1year'];

  it('should return 200 with Cape Town crime statistics', async () => {
    const response = await request(app)
      .get('/api/safety/crime-data')
      .expect(200);

    // Validate CrimeDataResponse structure
    expect(response.body).toHaveProperty('statistics');
    expect(response.body).toHaveProperty('metadata');

    // Validate statistics array
    expect(Array.isArray(response.body.statistics)).toBe(true);

    if (response.body.statistics.length > 0) {
      const stat = response.body.statistics[0];

      // Validate CrimeStatistic structure
      expect(stat).toHaveProperty('type');
      expect(stat).toHaveProperty('subtype');
      expect(stat).toHaveProperty('incidentCount');
      expect(stat).toHaveProperty('severity');

      // Validate type enum
      expect(validCrimeTypes).toContain(stat.type);

      // Validate subtype is meaningful
      expect(typeof stat.subtype).toBe('string');
      expect(stat.subtype.length).toBeGreaterThan(0);

      // Validate numeric fields
      expect(typeof stat.incidentCount).toBe('number');
      expect(stat.incidentCount).toBeGreaterThanOrEqual(0);
      expect(typeof stat.severity).toBe('number');
      expect(stat.severity).toBeGreaterThanOrEqual(1);
      expect(stat.severity).toBeLessThanOrEqual(10);

      // Validate confidence if present
      if (stat.confidence !== undefined) {
        expect(stat.confidence).toBeGreaterThanOrEqual(0);
        expect(stat.confidence).toBeLessThanOrEqual(100);
      }

      // Validate time pattern if present
      if (stat.timePattern) {
        expect(typeof stat.timePattern).toBe('object');

        // Should have hourly distribution
        Object.keys(stat.timePattern).forEach(hour => {
          const hourNum = parseInt(hour);
          expect(hourNum).toBeGreaterThanOrEqual(0);
          expect(hourNum).toBeLessThanOrEqual(23);
          expect(typeof stat.timePattern[hour]).toBe('number');
          expect(stat.timePattern[hour]).toBeGreaterThanOrEqual(0);
        });
      }
    }

    // Validate metadata
    expect(response.body.metadata).toHaveProperty('lastUpdated');
    expect(response.body.metadata).toHaveProperty('dataQuality');
    expect(response.body.metadata).toHaveProperty('source');

    expect(new Date(response.body.metadata.lastUpdated)).toBeInstanceOf(Date);
    expect(response.body.metadata.dataQuality).toBeGreaterThanOrEqual(0);
    expect(response.body.metadata.dataQuality).toBeLessThanOrEqual(100);
    expect(typeof response.body.metadata.source).toBe('string');
  });

  it('should filter by specific Cape Town area', async () => {
    for (const area of validAreas) {
      const response = await request(app)
        .get('/api/safety/crime-data')
        .query({ area })
        .expect(200);

      expect(response.body).toHaveProperty('area', area);
      expect(response.body.statistics).toBeDefined();

      // Statistics should be relevant to the specific area
      if (response.body.statistics.length > 0) {
        expect(Array.isArray(response.body.statistics)).toBe(true);
      }
    }
  });

  it('should filter by crime type', async () => {
    for (const crimeType of validCrimeTypes) {
      const response = await request(app)
        .get('/api/safety/crime-data')
        .query({ crimeType })
        .expect(200);

      expect(response.body.statistics).toBeDefined();

      // All returned statistics should match the requested crime type
      response.body.statistics.forEach((stat: any) => {
        expect(stat.type).toBe(crimeType);
      });
    }
  });

  it('should respect timeframe parameter', async () => {
    for (const timeframe of validTimeframes) {
      const response = await request(app)
        .get('/api/safety/crime-data')
        .query({ timeframe })
        .expect(200);

      expect(response.body).toHaveProperty('timeframe', timeframe);
      expect(response.body.statistics).toBeDefined();

      // Longer timeframes should generally have higher incident counts
      const totalIncidents = response.body.statistics.reduce(
        (sum: number, stat: any) => sum + stat.incidentCount, 0
      );
      expect(totalIncidents).toBeGreaterThanOrEqual(0);
    }
  });

  it('should include trends analysis when available', async () => {
    const response = await request(app)
      .get('/api/safety/crime-data')
      .query({ timeframe: '6months' })
      .expect(200);

    if (response.body.trends) {
      expect(response.body.trends).toHaveProperty('overall');
      expect(response.body.trends).toHaveProperty('changePercent');

      // Validate trend direction enum
      expect(['improving', 'stable', 'worsening']).toContain(response.body.trends.overall);

      // Validate change percentage is a number
      expect(typeof response.body.trends.changePercent).toBe('number');
      // Change percent should be reasonable (between -100% and +500%)
      expect(response.body.trends.changePercent).toBeGreaterThanOrEqual(-100);
      expect(response.body.trends.changePercent).toBeLessThanOrEqual(500);
    }
  });

  it('should handle invalid area gracefully', async () => {
    const response = await request(app)
      .get('/api/safety/crime-data')
      .query({ area: invalidArea })
      .expect(400);

    expect(response.body).toHaveProperty('error');
    expect(response.body.error).toBe('INVALID_AREA');
    expect(response.body.message).toContain('Cape Town');
  });

  it('should handle invalid crime type', async () => {
    const response = await request(app)
      .get('/api/safety/crime-data')
      .query({ crimeType: 'invalid_crime_type' })
      .expect(400);

    expect(response.body).toHaveProperty('error');
    expect(response.body.error).toBe('INVALID_CRIME_TYPE');
  });

  it('should handle invalid timeframe', async () => {
    const response = await request(app)
      .get('/api/safety/crime-data')
      .query({ timeframe: 'invalid_timeframe' })
      .expect(400);

    expect(response.body).toHaveProperty('error');
    expect(response.body.error).toBe('INVALID_TIMEFRAME');
  });

  it('should combine multiple query parameters correctly', async () => {
    const response = await request(app)
      .get('/api/safety/crime-data')
      .query({
        area: 'V&A Waterfront',
        crimeType: 'property',
        timeframe: '3months'
      })
      .expect(200);

    expect(response.body.area).toBe('V&A Waterfront');
    expect(response.body.timeframe).toBe('3months');

    // All statistics should be property crimes
    response.body.statistics.forEach((stat: any) => {
      expect(stat.type).toBe('property');
    });
  });

  it('should return comprehensive data for different crime types', async () => {
    const crimeTypeResponses = await Promise.all(
      validCrimeTypes.map(crimeType =>
        request(app)
          .get('/api/safety/crime-data')
          .query({ crimeType })
      )
    );

    // All requests should succeed
    crimeTypeResponses.forEach((response, index) => {
      expect(response.status).toBe(200);
      expect(response.body.statistics).toBeDefined();

      // Each crime type should have relevant subtypes
      const crimeType = validCrimeTypes[index];
      response.body.statistics.forEach((stat: any) => {
        expect(stat.type).toBe(crimeType);
        expect(stat.subtype).toBeDefined();

        // Validate severity makes sense for crime type
        if (crimeType === 'violent') {
          expect(stat.severity).toBeGreaterThanOrEqual(5); // Violent crimes should be higher severity
        } else if (crimeType === 'petty') {
          expect(stat.severity).toBeLessThanOrEqual(5); // Petty crimes should be lower severity
        }
      });
    });
  });

  it('should provide time pattern analysis for crimes', async () => {
    const response = await request(app)
      .get('/api/safety/crime-data')
      .query({ area: 'V&A Waterfront' })
      .expect(200);

    // Look for statistics with time patterns
    const statsWithPatterns = response.body.statistics.filter((stat: any) => stat.timePattern);

    if (statsWithPatterns.length > 0) {
      const stat = statsWithPatterns[0];

      // Time pattern should cover 24 hours
      const hours = Object.keys(stat.timePattern).map(h => parseInt(h)).sort((a, b) => a - b);
      expect(hours.length).toBeGreaterThan(0);

      // Values should sum to approximately 1.0 (probability distribution)
      const totalProbability = Object.values(stat.timePattern)
        .reduce((sum: number, prob: any) => sum + prob, 0);
      expect(totalProbability).toBeCloseTo(1.0, 1);

      // Some hours should have higher crime rates than others
      const values = Object.values(stat.timePattern) as number[];
      const maxValue = Math.max(...values);
      const minValue = Math.min(...values);
      expect(maxValue).toBeGreaterThan(minValue); // Should have variation across hours
    }
  });

  it('should handle URL encoded area names', async () => {
    const encodedArea = encodeURIComponent('V&A Waterfront');

    const response = await request(app)
      .get('/api/safety/crime-data')
      .query({ area: encodedArea })
      .expect(200);

    expect(response.body.area).toBe('V&A Waterfront');
  });

  it('should provide consistent data quality metrics', async () => {
    const response = await request(app)
      .get('/api/safety/crime-data')
      .expect(200);

    // Data quality should be reasonable for synthetic data
    expect(response.body.metadata.dataQuality).toBeGreaterThan(50);

    // Source should indicate synthetic for hackathon
    expect(response.body.metadata.source).toMatch(/synthetic|demo|hackathon/i);

    // Last updated should be recent
    const lastUpdated = new Date(response.body.metadata.lastUpdated);
    const now = new Date();
    const timeDifference = now.getTime() - lastUpdated.getTime();
    expect(timeDifference).toBeLessThan(24 * 60 * 60 * 1000); // Less than 24 hours
  });
});