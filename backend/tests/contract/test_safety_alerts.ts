// Contract Test: GET /api/safety/alerts
// Based on safety-api.yaml specification

import request from 'supertest';
import app from '../../src/index';

describe('GET /api/safety/alerts', () => {
  const validLocation = '-33.9249,18.4241'; // V&A Waterfront coordinates
  const outsideCTLocation = '-26.2041,28.0473'; // Johannesburg coordinates

  it('should return 200 with current alerts for Cape Town', async () => {
    const response = await request(app)
      .get('/api/safety/alerts')
      .expect(200);

    // Validate AlertsResponse structure
    expect(response.body).toHaveProperty('alerts');
    expect(response.body).toHaveProperty('metadata');

    // Validate alerts array
    expect(Array.isArray(response.body.alerts)).toBe(true);

    // Validate metadata
    expect(response.body.metadata).toHaveProperty('totalCount');
    expect(response.body.metadata).toHaveProperty('lastUpdated');
    expect(typeof response.body.metadata.totalCount).toBe('number');
    expect(response.body.metadata.totalCount).toBeGreaterThanOrEqual(0);
    expect(new Date(response.body.metadata.lastUpdated)).toBeInstanceOf(Date);

    // If alerts exist, validate their structure
    if (response.body.alerts.length > 0) {
      const alert = response.body.alerts[0];

      // Validate SafetyAlert structure
      expect(alert).toHaveProperty('id');
      expect(alert).toHaveProperty('type');
      expect(alert).toHaveProperty('severity');
      expect(alert).toHaveProperty('message');
      expect(alert).toHaveProperty('location');
      expect(alert).toHaveProperty('timestamp');

      // Validate type enum
      expect(['high_crime_area', 'poor_lighting', 'recent_incident', 'road_closure', 'emergency']).toContain(alert.type);

      // Validate severity enum
      expect(['info', 'warning', 'critical']).toContain(alert.severity);

      // Validate message
      expect(typeof alert.message).toBe('string');
      expect(alert.message.length).toBeGreaterThan(5);

      // Validate location structure
      expect(alert.location).toHaveProperty('latitude');
      expect(alert.location).toHaveProperty('longitude');
      expect(alert.location.latitude).toBeGreaterThanOrEqual(-34.5);
      expect(alert.location.latitude).toBeLessThanOrEqual(-33.5);
      expect(alert.location.longitude).toBeGreaterThanOrEqual(18.0);
      expect(alert.location.longitude).toBeLessThanOrEqual(19.0);

      // Validate timestamp
      expect(new Date(alert.timestamp)).toBeInstanceOf(Date);

      // Validate optional fields
      if (alert.expiresAt) {
        expect(new Date(alert.expiresAt)).toBeInstanceOf(Date);
        expect(new Date(alert.expiresAt).getTime()).toBeGreaterThan(new Date(alert.timestamp).getTime());
      }

      if (alert.source) {
        expect(['system', 'user_report', 'official', 'ai_analysis']).toContain(alert.source);
      }

      if (alert.verified !== undefined) {
        expect(typeof alert.verified).toBe('boolean');
      }
    }
  });

  it('should filter alerts by location and radius', async () => {
    const radius = 1000; // 1km

    const response = await request(app)
      .get('/api/safety/alerts')
      .query({ location: validLocation, radius })
      .expect(200);

    expect(response.body).toHaveProperty('alerts');
    expect(response.body.metadata).toHaveProperty('searchRadius', radius);
    expect(response.body.metadata).toHaveProperty('centerLocation');

    // Validate center location
    expect(response.body.metadata.centerLocation).toHaveProperty('latitude', -33.9249);
    expect(response.body.metadata.centerLocation).toHaveProperty('longitude', 18.4241);

    // All alerts should be within the specified radius
    response.body.alerts.forEach((alert: any) => {
      const distance = calculateDistance(
        -33.9249, 18.4241,
        alert.location.latitude, alert.location.longitude
      );
      expect(distance).toBeLessThanOrEqual(radius);
    });
  });

  it('should filter alerts by minimum severity level', async () => {
    const severityLevels = ['info', 'warning', 'critical'];

    for (const minSeverity of severityLevels) {
      const response = await request(app)
        .get('/api/safety/alerts')
        .query({ severity: minSeverity })
        .expect(200);

      // All returned alerts should meet minimum severity
      response.body.alerts.forEach((alert: any) => {
        const severityRank = severityLevels.indexOf(alert.severity);
        const minSeverityRank = severityLevels.indexOf(minSeverity);
        expect(severityRank).toBeGreaterThanOrEqual(minSeverityRank);
      });
    }
  });

  it('should handle location parameter validation', async () => {
    const invalidFormats = [
      'invalid-coordinates',
      '123.456', // Missing longitude
      '-33.9249,invalid', // Invalid longitude
      '91.0,18.4241', // Invalid latitude (outside valid range)
      '-33.9249,181.0' // Invalid longitude (outside valid range)
    ];

    for (const invalidLocation of invalidFormats) {
      const response = await request(app)
        .get('/api/safety/alerts')
        .query({ location: invalidLocation })
        .expect(400);

      expect(response.body).toHaveProperty('error');
      expect(response.body.error).toBe('INVALID_LOCATION_FORMAT');
    }
  });

  it('should handle radius parameter validation', async () => {
    const invalidRadii = [50, 15000, -100]; // Below min, above max, negative

    for (const invalidRadius of invalidRadii) {
      const response = await request(app)
        .get('/api/safety/alerts')
        .query({ location: validLocation, radius: invalidRadius })
        .expect(400);

      expect(response.body).toHaveProperty('error');
      expect(response.body.error).toBe('INVALID_RADIUS');
    }
  });

  it('should return empty alerts for location outside Cape Town', async () => {
    const response = await request(app)
      .get('/api/safety/alerts')
      .query({ location: outsideCTLocation })
      .expect(200);

    // Should return empty alerts array for locations outside Cape Town
    expect(response.body.alerts).toHaveLength(0);
    expect(response.body.metadata.totalCount).toBe(0);
  });

  it('should sort alerts by timestamp descending (most recent first)', async () => {
    const response = await request(app)
      .get('/api/safety/alerts')
      .expect(200);

    if (response.body.alerts.length > 1) {
      for (let i = 0; i < response.body.alerts.length - 1; i++) {
        const currentTime = new Date(response.body.alerts[i].timestamp).getTime();
        const nextTime = new Date(response.body.alerts[i + 1].timestamp).getTime();
        expect(currentTime).toBeGreaterThanOrEqual(nextTime);
      }
    }
  });

  it('should handle multiple query parameters together', async () => {
    const response = await request(app)
      .get('/api/safety/alerts')
      .query({
        location: validLocation,
        radius: 2000,
        severity: 'warning'
      })
      .expect(200);

    expect(response.body.metadata.searchRadius).toBe(2000);
    expect(response.body.metadata.centerLocation.latitude).toBe(-33.9249);

    // All alerts should meet both location and severity criteria
    response.body.alerts.forEach((alert: any) => {
      // Check distance
      const distance = calculateDistance(
        -33.9249, 18.4241,
        alert.location.latitude, alert.location.longitude
      );
      expect(distance).toBeLessThanOrEqual(2000);

      // Check severity (warning or critical)
      expect(['warning', 'critical']).toContain(alert.severity);
    });
  });

  it('should return different alert counts for different areas', async () => {
    const waterfrontLocation = '-33.9249,18.4241'; // V&A Waterfront
    const campsBayLocation = '-33.9588,18.4718';   // Camps Bay

    const waterfrontResponse = await request(app)
      .get('/api/safety/alerts')
      .query({ location: waterfrontLocation, radius: 1000 })
      .expect(200);

    const campsBayResponse = await request(app)
      .get('/api/safety/alerts')
      .query({ location: campsBayLocation, radius: 1000 })
      .expect(200);

    // Different areas might have different alert counts
    expect(typeof waterfrontResponse.body.metadata.totalCount).toBe('number');
    expect(typeof campsBayResponse.body.metadata.totalCount).toBe('number');

    // Both should be valid responses
    expect(waterfrontResponse.body.metadata.totalCount).toBeGreaterThanOrEqual(0);
    expect(campsBayResponse.body.metadata.totalCount).toBeGreaterThanOrEqual(0);
  });

  it('should include alert expiration handling', async () => {
    const response = await request(app)
      .get('/api/safety/alerts')
      .expect(200);

    // Active alerts should not be expired
    const now = new Date();
    response.body.alerts.forEach((alert: any) => {
      if (alert.expiresAt) {
        expect(new Date(alert.expiresAt).getTime()).toBeGreaterThan(now.getTime());
      }
    });
  });

  it('should handle concurrent requests efficiently', async () => {
    const startTime = Date.now();

    // Make multiple concurrent requests
    const requests = Array(5).fill(null).map(() =>
      request(app).get('/api/safety/alerts').query({ location: validLocation })
    );

    const responses = await Promise.all(requests);

    const endTime = Date.now();
    const totalTime = endTime - startTime;

    // All requests should succeed
    responses.forEach(response => {
      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('alerts');
      expect(response.body).toHaveProperty('metadata');
    });

    // Should handle concurrent requests reasonably fast (under 5 seconds total)
    expect(totalTime).toBeLessThan(5000);
  });
});

// Helper function to calculate distance between two coordinates
function calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371000; // Earth's radius in meters
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}