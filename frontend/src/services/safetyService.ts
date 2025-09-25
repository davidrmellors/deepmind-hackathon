import axios from 'axios';
import { SafetyScoreRequest, SafetyScoreResponse, SafetyScore, AreaSafetyData, SafetyAlert, CrimeDataResponse } from '../types';

// Base URL for backend API
const API_BASE_URL = '/api';

class SafetyService {
  // Calculate safety score for a location or route
  static async calculateSafetyScore(request: SafetyScoreRequest): Promise<SafetyScoreResponse> {
    try {
      const response = await axios.post(`${API_BASE_URL}/safety/score`, request);
      return response.data;
    } catch (error) {
      console.error('Error calculating safety score:', error);
      throw new Error('Failed to calculate safety score');
    }
  }

  // Get safety data for a specific grid area
  static async getAreaSafety(gridId: string, timeRange?: string): Promise<AreaSafetyData> {
    try {
      const params = timeRange ? { timeRange } : {};
      const response = await axios.get(`${API_BASE_URL}/safety/area/${gridId}`, { params });
      return response.data;
    } catch (error) {
      console.error('Error fetching area safety:', error);
      throw new Error('Failed to fetch area safety data');
    }
  }

  // Get current safety alerts near a location
  static async getSafetyAlerts(location?: string, radius: number = 2000, severity: string = 'info'): Promise<{ alerts: SafetyAlert[], metadata: any }> {
    try {
      const params = { location, radius, severity };
      const response = await axios.get(`${API_BASE_URL}/safety/alerts`, { params });
      return response.data;
    } catch (error) {
      console.error('Error fetching safety alerts:', error);
      throw new Error('Failed to fetch safety alerts');
    }
  }

  // Get crime data for Cape Town areas
  static async getCrimeData(area?: string, crimeType?: string, timeframe: string = '6months'): Promise<CrimeDataResponse> {
    try {
      const params = { area, crimeType, timeframe };
      const response = await axios.get(`${API_BASE_URL}/safety/crime-data`, { params });
      return response.data;
    } catch (error) {
      console.error('Error fetching crime data:', error);
      throw new Error('Failed to fetch crime data');
    }
  }

  // Client-side safety score computation (fallback or for real-time updates)
  static computeLocalSafetyScore(location: { latitude: number; longitude: number }, time: Date): SafetyScore {
    // Simple placeholder algorithm - in production, use more sophisticated logic
    const hour = time.getHours();
    const baseScore = 80; // Base safety score
    const timeAdjustment = hour >= 6 && hour <= 22 ? 0 : -15; // Night time penalty
    const locationAdjustment = this.isSafeNeighborhood(location) ? 10 : -10;

    return {
      overall: Math.max(0, Math.min(100, baseScore + timeAdjustment + locationAdjustment)),
      crimeRisk: 30,
      timeFactor: hour >= 6 && hour <= 22 ? 90 : 60,
      populationDensity: 70,
      lightingLevel: hour >= 18 || hour <= 6 ? 50 : 80,
      historicalIncidents: 5,
      confidenceLevel: 75,
      explanation: `Safety score adjusted for time of day and location factors.`,
      lastCalculated: new Date(),
      factors: [
        {
          type: 'time',
          impact: timeAdjustment < 0 ? 'negative' : 'positive',
          weight: 0.3,
          description: 'Time of day affects visibility and activity levels',
          value: timeAdjustment
        },
        {
          type: 'crime',
          impact: locationAdjustment < 0 ? 'negative' : 'positive',
          weight: 0.4,
          description: 'Historical crime data for the area',
          value: locationAdjustment
        }
      ]
    };
  }

  // Placeholder for neighborhood safety check
  private static isSafeNeighborhood(location: { latitude: number; longitude: number }): boolean {
    // In production, this would query cached data or backend
    // For demo, use simple lat/long based logic
    return location.latitude > -34.0 && location.longitude < 18.5; // Example safe area
  }
}

export default SafetyService;
