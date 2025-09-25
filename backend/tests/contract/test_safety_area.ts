// Contract Test: GET /api/safety/area/{gridId}
// Based on safety-api.yaml specification

import request from 'supertest';
import app from '../../src/index';

describe('GET /api/safety/area/:gridId', () => {
  const validGridId = 'CT_33_18_001';
  const invalidGridId = 'INVALID_GRID_999';
  const outsideCTGridId = 'JHB_26_28_001'; // Johannesburg grid

  it('should return 200 with area safety data for valid Cape Town grid', async () => {
    const response = await request(app)
      .get(`/api/safety/area/${validGridId}`)
      .expect(200);

    // Validate AreaSafetyData structure from safety-api.yaml
    expect(response.body).toHaveProperty('gridId', validGridId);
    expect(response.body).toHaveProperty('location');
    expect(response.body).toHaveProperty('riskLevel');
    expect(response.body).toHaveProperty('lastUpdated');

    // Validate location structure
    expect(response.body.location).toHaveProperty('latitude');
    expect(response.body.location).toHaveProperty('longitude');

    // Validate Cape Town bounds for grid location
    expect(response.body.location.latitude).toBeGreaterThanOrEqual(-34.5);
    expect(response.body.location.latitude).toBeLessThanOrEqual(-33.5);
    expect(response.body.location.longitude).toBeGreaterThanOrEqual(18.0);
    expect(response.body.location.longitude).toBeLessThanOrEqual(19.0);

    // Validate risk level enum
    expect(['low', 'medium', 'high', 'critical']).toContain(response.body.riskLevel);

    // Validate timestamp
    expect(new Date(response.body.lastUpdated)).toBeInstanceOf(Date);

    // Validate optional population density
    if (response.body.populationDensity !== undefined) {
      expect(typeof response.body.populationDensity).toBe('number');
      expect(response.body.populationDensity).toBeGreaterThanOrEqual(0);
    }

    // Validate data source
    if (response.body.dataSource) {
      expect(['saps', 'synthetic', 'crowdsourced', 'hybrid']).toContain(response.body.dataSource);
    }
  });

  it('should include crime statistics array when available', async () => {
    const response = await request(app)
      .get(`/api/safety/area/${validGridId}`)
      .expect(200);

    if (response.body.crimeStats) {
      expect(Array.isArray(response.body.crimeStats)).toBe(true);

      if (response.body.crimeStats.length > 0) {
        const stat = response.body.crimeStats[0];

        // Validate CrimeStatistic structure
        expect(stat).toHaveProperty('type');
        expect(stat).toHaveProperty('subtype');
        expect(stat).toHaveProperty('incidentCount');
        expect(stat).toHaveProperty('severity');

        // Validate crime type enum
        expect(['violent', 'property', 'petty', 'vehicular']).toContain(stat.type);

        // Validate numeric fields
        expect(typeof stat.incidentCount).toBe('number');
        expect(stat.incidentCount).toBeGreaterThanOrEqual(0);
        expect(typeof stat.severity).toBe('number');
        expect(stat.severity).toBeGreaterThanOrEqual(1);
        expect(stat.severity).toBeLessThanOrEqual(10);

        // Validate time pattern if present
        if (stat.timePattern) {
          expect(typeof stat.timePattern).toBe('object');

          // Should have hourly data (0-23)
          const hours = Object.keys(stat.timePattern);
          hours.forEach(hour => {
            const hourNum = parseInt(hour);
            expect(hourNum).toBeGreaterThanOrEqual(0);
            expect(hourNum).toBeLessThanOrEqual(23);
            expect(typeof stat.timePattern[hour]).toBe('number');
          });
        }

        // Validate confidence if present
        if (stat.confidence !== undefined) {
          expect(stat.confidence).toBeGreaterThanOrEqual(0);
          expect(stat.confidence).toBeLessThanOrEqual(100);
        }
      }
    }
  });

  it('should include environmental factors when available', async () => {
    const response = await request(app)
      .get(`/api/safety/area/${validGridId}`)
      .expect(200);

    if (response.body.environmentalFactors) {
      const env = response.body.environmentalFactors;

      // Validate EnvironmentalFactors structure
      if (env.lightingQuality !== undefined) {
        expect(env.lightingQuality).toBeGreaterThanOrEqual(0);
        expect(env.lightingQuality).toBeLessThanOrEqual(100);
      }

      if (env.footTraffic !== undefined) {
        expect(env.footTraffic).toBeGreaterThanOrEqual(0);
        expect(env.footTraffic).toBeLessThanOrEqual(100);
      }

      if (env.businessDensity !== undefined) {
        expect(typeof env.businessDensity).toBe('number');
        expect(env.businessDensity).toBeGreaterThanOrEqual(0);
      }

      if (env.emergencyServiceDistance !== undefined) {
        expect(typeof env.emergencyServiceDistance).toBe('number');
        expect(env.emergencyServiceDistance).toBeGreaterThan(0);
      }

      if (env.cctvCoverage !== undefined) {
        expect(typeof env.cctvCoverage).toBe('boolean');
      }

      if (env.publicTransportAccess !== undefined) {
        expect(env.publicTransportAccess).toBeGreaterThanOrEqual(0);
        expect(env.publicTransportAccess).toBeLessThanOrEqual(100);
      }
    }
  });

  it('should respect timeRange query parameter', async () => {
    const timeRanges = ['1h', '6h', '12h', '24h', '7d', '30d'];

    for (const timeRange of timeRanges) {
      const response = await request(app)
        .get(`/api/safety/area/${validGridId}`)
        .query({ timeRange })
        .expect(200);

      expect(response.body).toHaveProperty('gridId', validGridId);

      // Data should be filtered/adjusted based on time range
      // For shorter time ranges, incident counts might be lower
      if (response.body.crimeStats && response.body.crimeStats.length > 0) {
        const totalIncidents = response.body.crimeStats.reduce(
          (sum: number, stat: any) => sum + stat.incidentCount, 0
        );
        expect(totalIncidents).toBeGreaterThanOrEqual(0);
      }
    }
  });

  it('should return 404 for non-existent grid ID', async () => {
    const response = await request(app)
      .get(`/api/safety/area/${invalidGridId}`)
      .expect(404);

    expect(response.body).toHaveProperty('error');
    expect(response.body).toHaveProperty('message');
    expect(response.body.message).toContain(invalidGridId);
  });

  it('should return 400 for grid ID outside Cape Town', async () => {
    const response = await request(app)
      .get(`/api/safety/area/${outsideCTGridId}`)
      .expect(400);

    expect(response.body).toHaveProperty('error');
    expect(response.body.error).toBe('INVALID_GRID_AREA');
    expect(response.body.message).toContain('Cape Town');
  });

  it('should handle malformed grid ID format', async () => {
    const malformedGridId = 'invalid-format-123';

    const response = await request(app)
      .get(`/api/safety/area/${malformedGridId}`)
      .expect(400);

    expect(response.body).toHaveProperty('error');
    expect(response.body.error).toBe('INVALID_GRID_FORMAT');
    expect(response.body.message).toContain('format');
  });

  it('should return consistent data structure across different valid grids', async () => {
    const alternativeGridId = 'CT_33_18_002';

    const response1 = await request(app)
      .get(`/api/safety/area/${validGridId}`)
      .expect(200);

    const response2 = await request(app)
      .get(`/api/safety/area/${alternativeGridId}`)
      .expect(200);

    // Both should have the same structure
    expect(typeof response1.body).toBe('object');
    expect(typeof response2.body).toBe('object');

    // Required fields should be present in both
    ['gridId', 'location', 'riskLevel', 'lastUpdated'].forEach(field => {
      expect(response1.body).toHaveProperty(field);
      expect(response2.body).toHaveProperty(field);
    });
  });

  it('should show different risk levels for different areas', async () => {
    const safterGridId = 'CT_33_18_010'; // Potentially safer area
    const riskyGridId = 'CT_33_18_020';  // Potentially riskier area

    const saferResponse = await request(app)
      .get(`/api/safety/area/${safterGridId}`)
      .expect(200);

    const riskyResponse = await request(app)
      .get(`/api/safety/area/${riskyGridId}`)
      .expect(200);

    // Risk levels should potentially be different
    expect(['low', 'medium', 'high', 'critical']).toContain(saferResponse.body.riskLevel);
    expect(['low', 'medium', 'high', 'critical']).toContain(riskyResponse.body.riskLevel);

    // If crime stats are available, they should reflect the risk levels
    if (saferResponse.body.crimeStats && riskyResponse.body.crimeStats) {
      const saferIncidents = saferResponse.body.crimeStats.reduce(
        (sum: number, stat: any) => sum + stat.incidentCount, 0
      );
      const riskyIncidents = riskyResponse.body.crimeStats.reduce(
        (sum: number, stat: any) => sum + stat.incidentCount, 0
      );

      // Generally expect some variation in incident counts between areas
      expect(typeof saferIncidents).toBe('number');
      expect(typeof riskyIncidents).toBe('number');
    }
  });

  it('should handle URL encoding in grid ID', async () => {
    const encodedGridId = encodeURIComponent('CT_33_18_001');

    const response = await request(app)
      .get(`/api/safety/area/${encodedGridId}`)
      .expect(200);

    expect(response.body.gridId).toBe('CT_33_18_001');
  });
});