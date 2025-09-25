// Core Data Types for SafeRoute AI
// Based on data-model.md specification

export interface Location {
  id?: string;
  latitude: number;
  longitude: number;
  address?: string;
  neighborhood?: string;
  type?: LocationType;
  safetyMetrics?: LocationSafetyMetrics;
  amenities?: Amenity[];
  googlePlaceId?: string;
  validatedAt?: Date;
}

export type LocationType =
  | 'residential'
  | 'commercial'
  | 'industrial'
  | 'recreational'
  | 'transport_hub'
  | 'landmark';

export interface LocationSafetyMetrics {
  currentRiskLevel: number;
  historicalIncidents: number;
  lightingQuality: number;
  footTraffic: number;
  emergencyServiceDistance: number;
  cctvCoverage: boolean;
}

export interface Amenity {
  type: 'parking' | 'lighting' | 'security' | 'emergency' | 'transport';
  description: string;
  available: boolean;
  hours?: string;
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

export interface CrimeData {
  id: string;
  location: Location;
  gridCell: string;
  timeframe: DateRange;
  crimeStats: CrimeStatistic[];
  riskLevel: 'low' | 'medium' | 'high' | 'critical';
  populationDensity: number;
  economicIndicators: EconomicData;
  lastUpdated: Date;
  dataSource: 'saps' | 'synthetic' | 'crowdsourced';
}

export interface CrimeStatistic {
  type: 'violent' | 'property' | 'petty' | 'vehicular';
  subtype: string;
  incidentCount: number;
  severity: number;
  timePattern: HourlyPattern;
  confidence: number;
}

export interface HourlyPattern {
  [hour: string]: number;
}

export interface EconomicData {
  averageIncome: number;
  unemploymentRate: number;
  businessDensity: number;
  lightingInfrastructure: number;
}

export interface User {
  id: string;
  sessionId: string;
  preferences: UserPreferences;
  usageHistory: NavigationSession[];
  location: Location;
  createdAt: Date;
  lastActive: Date;
}

export interface UserPreferences {
  safetyPriority: number;
  riskTolerance: 'low' | 'medium' | 'high';
  avoidAreas: string[];
  preferredTravelModes: TravelMode[];
  notificationSettings: NotificationPrefs;
  accessibilityNeeds: string[];
}

export interface NotificationPrefs {
  safetyAlerts: boolean;
  routeUpdates: boolean;
  arrivalNotifications: boolean;
  emergencyContacts: string[];
}

export type TravelMode = 'driving' | 'walking' | 'transit' | 'cycling';

export interface NavigationSession {
  id: string;
  userId: string;
  selectedRoute: Route;
  currentLocation: Location;
  startTime: Date;
  estimatedArrival: Date;
  actualArrival?: Date;
  status: NavigationStatus;
  alerts: SafetyAlert[];
  routeDeviations: RouteDeviation[];
  userFeedback?: SessionFeedback;
}

export type NavigationStatus = 'planning' | 'active' | 'paused' | 'completed' | 'cancelled';

export interface SafetyAlert {
  id: string;
  type: 'high_crime_area' | 'poor_lighting' | 'route_deviation' | 'emergency';
  severity: 'info' | 'warning' | 'critical';
  message: string;
  location: Location;
  timestamp: Date;
  acknowledged: boolean;
  actionTaken?: string;
}

export interface RouteDeviation {
  timestamp: Date;
  originalLocation: Location;
  actualLocation: Location;
  distanceFromRoute: number;
  reason?: string;
  safetyImpact: number;
}

export interface SessionFeedback {
  safetyRating: number;
  routeQuality: number;
  comments?: string;
  wouldRecommend: boolean;
  reportedIncidents: IncidentReport[];
}

export interface IncidentReport {
  type: string;
  location: Location;
  timestamp: Date;
  description: string;
  severity: number;
  verified: boolean;
}

// Supporting Types
export interface DateRange {
  start: Date;
  end: Date;
}

export interface Coordinates {
  latitude: number;
  longitude: number;
  accuracy?: number;
}

export interface Address {
  street: string;
  suburb: string;
  city: string;
  province: string;
  postalCode: string;
  country: string;
}

// API Request/Response Types
export interface RouteRequest {
  origin: Location;
  destination: Location;
  waypoints?: Location[];
  preferences?: UserPreferences;
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

export interface SafetyScoreRequest {
  location: Location;
  route?: Location[];
  timeContext?: TimeContext;
  factors?: ScoringFactors;
  userContext?: UserContext;
}

export interface TimeContext {
  currentTime?: string;
  travelDuration?: number;
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
  travelMode?: TravelMode;
  vulnerabilityFactors?: string[];
  riskTolerance?: 'low' | 'medium' | 'high';
}

export interface SafetyScoreResponse {
  safetyScore: SafetyScore;
  recommendations?: SafetyRecommendation[];
  alerts?: SafetyAlert[];
  metadata: ScoringMetadata;
}

export interface SafetyRecommendation {
  type: 'route_change' | 'time_change' | 'precaution' | 'alert_contact';
  priority: 'low' | 'medium' | 'high' | 'critical';
  description: string;
  actionable: boolean;
  estimatedImprovement?: number;
  aiGenerated?: boolean;
}

export interface ResponseMetadata {
  calculatedAt: Date;
  processingTime?: number;
  dataConfidence: number;
  apiVersion: string;
}

export interface ScoringMetadata {
  calculationTime?: number;
  dataSourcesUsed?: string[];
  aiModelVersion?: string;
  confidenceFactors?: Record<string, number>;
}

export interface ErrorResponse {
  error: string;
  message: string;
  details?: any;
  timestamp: Date;
  requestId?: string;
}

// Google Maps Service Types
export interface RouteCalculationRequest {
  origin: Location;
  destination: Location;
  waypoints?: Location[];
  preferences?: {
    safetyPriority?: number;
    travelMode?: TravelMode;
    avoidTolls?: boolean;
    avoidHighways?: boolean;
  };
  timeContext?: TimeContext;
  options?: {
    maxRoutes?: number;
  };
}

export interface RouteCalculationResponse {
  routes: Route[];
  metadata: {
    calculationTime: number;
    routesRequested: number;
    routesReturned: number;
    dataSource: string;
    fallbackUsed: boolean;
    apiVersion: string;
  };
}

// AI Explanation Service Types
export interface AIExplanationRequest {
  safetyScore: SafetyScore;
  location: Location;
  crimeData?: CrimeData;
  timeContext?: TimeContext;
}

export interface AIExplanationResponse {
  explanation: string;
  recommendations: SafetyRecommendation[];
  confidence: number;
  generatedAt: Date;
  metadata: {
    promptTokens: number;
    responseTokens: number;
    model: string;
    temperature: number;
  };
}