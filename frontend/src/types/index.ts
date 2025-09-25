export interface Location {
  latitude: number;
  longitude: number;
  address?: string;
  neighborhood?: string;
  type?: 'residential' | 'commercial' | 'industrial' | 'recreational' | 'transport_hub' | 'landmark';
  googlePlaceId?: string;
}

export interface SafetyScore {
  overall: number;
  crimeRisk: number;
  timeFactor: number;
  populationDensity: number;
  lightingLevel: number;
  historicalIncidents: number;
  confidenceLevel: number;
  explanation: string;
  lastCalculated: Date;
  factors: SafetyFactor[];
}

export interface SafetyFactor {
  type: 'crime' | 'lighting' | 'population' | 'time' | 'weather' | 'events';
  impact: 'positive' | 'negative' | 'neutral';
  weight: number;
  description: string;
  value: number;
}

export interface Route {
  id: string;
  origin: Location;
  destination: Location;
  waypoints?: Location[];
  totalDistance: number;
  estimatedDuration: number;
  safetyScore: SafetyScore;
  segments: RouteSegment[];
  alternativeRank: number;
  googleRouteId?: string;
  createdAt: Date;
  lastUpdated: Date;
}

export interface RouteSegment {
  id: string;
  startLocation: Location;
  endLocation: Location;
  distance: number;
  duration: number;
  safetyScore: SafetyScore;
  roadType: 'highway' | 'arterial' | 'local' | 'residential';
  lightingLevel: 'high' | 'medium' | 'low' | 'none';
}

export interface UserPreferences {
  safetyPriority: number;
  riskTolerance: 'low' | 'medium' | 'high';
  travelMode: 'driving' | 'walking' | 'transit' | 'cycling';
  avoidAreas?: string[];
}

export interface RouteRequest {
  origin: Location;
  destination: Location;
  waypoints?: Location[];
  preferences: UserPreferences;
  options?: RouteOptions;
}

export interface RouteOptions {
  maxRoutes?: number;
  avoidTolls?: boolean;
  avoidHighways?: boolean;
  optimizeFor?: 'time' | 'safety' | 'balanced';
}

export interface RouteResponse {
  routes: Route[];
  alternatives?: {
    fastest?: string;
    safest?: string;
    balanced?: string;
  };
  metadata: ResponseMetadata;
}

export interface ResponseMetadata {
  calculatedAt: string;
  processingTime: number;
  dataConfidence: number;
  apiVersion: string;
}

export interface SafetyScoreRequest {
  location: Location;
  route?: Location[];
  timeContext: TimeContext;
  factors?: ScoringFactors;
  userContext?: UserContext;
}

export interface TimeContext {
  currentTime: string;
  travelDuration: number;
  dayOfWeek?: string;
  isHoliday?: boolean;
}

export interface ScoringFactors {
  includeCrimeData?: boolean;
  includeEnvironmental?: boolean;
  includeRealTime?: boolean;
  includeHistorical?: boolean;
  aiAnalysis?: boolean;
}

export interface UserContext {
  travelMode: string;
  vulnerabilityFactors?: string[];
  riskTolerance: string;
}

export interface SafetyScoreResponse {
  safetyScore: SafetyScore;
  recommendations: SafetyRecommendation[];
  alerts: SafetyAlert[];
  metadata: ScoringMetadata;
}

export interface SafetyRecommendation {
  type: 'route_change' | 'time_change' | 'precaution' | 'alert_contact';
  priority: 'low' | 'medium' | 'high' | 'critical';
  description: string;
  actionable: boolean;
  estimatedImprovement: number;
}

export interface SafetyAlert {
  id: string;
  type: 'high_crime_area' | 'poor_lighting' | 'recent_incident' | 'road_closure' | 'emergency';
  severity: 'info' | 'warning' | 'critical';
  message: string;
  location: Location;
  timestamp: string;
  expiresAt?: string;
  source?: string;
  verified?: boolean;
}

export interface ScoringMetadata {
  calculationTime: number;
  dataSourcesUsed: string[];
  aiModelVersion: string;
  confidenceFactors: Record<string, number>;
}
