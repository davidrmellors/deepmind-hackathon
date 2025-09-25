import axios from 'axios';
import { RouteRequest, RouteResponse, Location, SafetyScore, Route } from '../types';

// Base URL for backend API (proxied through Create React App)
const API_BASE_URL = '/api';

class RoutingService {
  // Calculate safe routes between origin and destination
  static async calculateRoutes(request: RouteRequest): Promise<RouteResponse> {
    try {
      const response = await axios.post(`${API_BASE_URL}/routes/calculate`, request);
      return response.data;
    } catch (error) {
      console.error('Error calculating routes:', error);
      throw new Error('Failed to calculate routes');
    }
  }

  // Get detailed route information by ID
  static async getRoute(routeId: string): Promise<Route> {
    try {
      const response = await axios.get(`${API_BASE_URL}/routes/${routeId}`);
      return response.data;
    } catch (error) {
      console.error('Error fetching route:', error);
      throw new Error('Failed to fetch route details');
    }
  }

  // Get safety assessment for a specific route
  static async getRouteSafety(routeId: string, currentTime?: string): Promise<SafetyScore> {
    try {
      const params = currentTime ? { currentTime } : {};
      const response = await axios.get(`${API_BASE_URL}/routes/${routeId}/safety`, { params });
      return response.data;
    } catch (error) {
      console.error('Error fetching route safety:', error);
      throw new Error('Failed to fetch route safety');
    }
  }

  // Validate location within Cape Town bounds
  static async validateLocation(location: Location): Promise<boolean> {
    try {
      // This could call a backend endpoint if needed, but for now, client-side validation
      const { latitude, longitude } = location;
      return latitude >= -34.5 && latitude <= -33.5 && longitude >= 18.0 && longitude <= 19.0;
    } catch (error) {
      console.error('Error validating location:', error);
      return false;
    }
  }
}

export default RoutingService;
