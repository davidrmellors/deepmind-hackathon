# Data Model: AI-Powered Safety Route Advisor

**Version**: 1.0
**Date**: September 24, 2025
**Source**: Derived from feature specification entities

## Core Entities

### Route
Represents a path between two locations with safety and navigation data.

```typescript
interface Route {
  id: string;                    // Unique route identifier
  origin: Location;              // Starting point
  destination: Location;         // End point
  waypoints: Location[];         // Intermediate points along route
  totalDistance: number;         // Distance in meters
  estimatedDuration: number;     // Travel time in seconds
  safetyScore: SafetyScore;      // Overall route safety rating
  segments: RouteSegment[];      // Route broken into segments
  alternativeRank: number;       // 1=fastest, 2=safest, 3=balanced
  googleRouteId?: string;        // Google Routes API reference
  createdAt: Date;
  lastUpdated: Date;
}

interface RouteSegment {
  id: string;
  startLocation: Location;
  endLocation: Location;
  distance: number;              // Segment distance in meters
  duration: number;              // Segment travel time in seconds
  safetyScore: SafetyScore;      // Segment-specific safety rating
  roadType: 'highway' | 'arterial' | 'local' | 'residential';
  lightingLevel: 'high' | 'medium' | 'low' | 'none';
}
```

**Validation Rules**:
- `origin` and `destination` must be within Cape Town metropolitan bounds
- `totalDistance` must be positive
- `estimatedDuration` must be positive
- `safetyScore.overall` must be between 0-100
- `segments` must form continuous path from origin to destination

**State Transitions**:
- CALCULATING → READY → SELECTED → NAVIGATING → COMPLETED

### SafetyScore
Comprehensive safety assessment for routes or locations.

```typescript
interface SafetyScore {
  overall: number;               // Composite score 0-100 (100=safest)
  crimeRisk: number;            // Crime-based risk 0-100
  timeFactor: number;           // Time-of-day adjustment 0-100
  populationDensity: number;    // Area activity level 0-100
  lightingLevel: number;        // Street lighting quality 0-100
  historicalIncidents: number;  // Past incident count in area
  confidenceLevel: number;      // Data reliability 0-100
  explanation: string;          // AI-generated safety summary
  lastCalculated: Date;
  factors: SafetyFactor[];      // Detailed contributing factors
}

interface SafetyFactor {
  type: 'crime' | 'lighting' | 'population' | 'time' | 'weather' | 'events';
  impact: 'positive' | 'negative' | 'neutral';
  weight: number;               // Contribution to overall score 0-1
  description: string;          // Human-readable explanation
  value: number;                // Raw factor value
}
```

**Validation Rules**:
- All score fields must be between 0-100
- `confidenceLevel` must reflect data quality
- `factors` must sum to approximately 1.0 in weight
- `explanation` must be present for user display

### CrimeData
Historical and synthetic crime statistics for Cape Town areas.

```typescript
interface CrimeData {
  id: string;
  location: Location;
  gridCell: string;             // 1km x 1km grid identifier
  timeframe: DateRange;         // Data validity period
  crimeStats: CrimeStatistic[];
  riskLevel: 'low' | 'medium' | 'high' | 'critical';
  populationDensity: number;    // People per km²
  economicIndicators: EconomicData;
  lastUpdated: Date;
  dataSource: 'saps' | 'synthetic' | 'crowdsourced';
}

interface CrimeStatistic {
  type: 'violent' | 'property' | 'petty' | 'vehicular';
  subtype: string;              // e.g., 'hijacking', 'burglary', 'pickpocketing'
  incidentCount: number;        // Number of incidents in timeframe
  severity: number;             // Impact severity 1-10
  timePattern: HourlyPattern;   // Crime occurrence by hour
  confidence: number;           // Data quality score 0-100
}

interface HourlyPattern {
  [hour: string]: number;       // Hour (0-23) -> incident frequency
}

interface EconomicData {
  averageIncome: number;
  unemploymentRate: number;
  businessDensity: number;      // Commercial establishments per km²
  lightingInfrastructure: number; // Street lighting quality index
}
```

**Validation Rules**:
- `location` must be within Cape Town bounds
- `crimeStats` incident counts must be non-negative
- `timePattern` must sum to 1.0 (probability distribution)
- `dataSource` must be tracked for transparency

### User
Person using the system with preferences and usage patterns.

```typescript
interface User {
  id: string;
  sessionId: string;            // Browser session identifier
  preferences: UserPreferences;
  usageHistory: NavigationSession[];
  location: Location;           // Current location
  createdAt: Date;
  lastActive: Date;
}

interface UserPreferences {
  safetyPriority: number;       // Safety vs speed preference 0-100
  riskTolerance: 'low' | 'medium' | 'high';
  avoidAreas: string[];         // Specific areas to avoid
  preferredTravelModes: TravelMode[];
  notificationSettings: NotificationPrefs;
  accessibilityNeeds: string[]; // Special routing requirements
}

interface NotificationPrefs {
  safetyAlerts: boolean;
  routeUpdates: boolean;
  arrivalNotifications: boolean;
  emergencyContacts: string[];
}

type TravelMode = 'driving' | 'walking' | 'transit' | 'cycling';
```

**Validation Rules**:
- `safetyPriority` must be between 0-100
- `emergencyContacts` must be valid phone numbers or emails
- `avoidAreas` must reference valid Cape Town locations

### Location
Geographic points with associated metadata and safety information.

```typescript
interface Location {
  id: string;
  latitude: number;             // WGS84 coordinates
  longitude: number;
  address: string;              // Human-readable address
  neighborhood: string;         // Cape Town suburb/area name
  type: LocationType;
  safetyMetrics: LocationSafetyMetrics;
  amenities: Amenity[];
  googlePlaceId?: string;       // Google Places API reference
  validatedAt: Date;
}

type LocationType = 'residential' | 'commercial' | 'industrial' |
                   'recreational' | 'transport_hub' | 'landmark';

interface LocationSafetyMetrics {
  currentRiskLevel: number;     // Real-time risk score 0-100
  historicalIncidents: number; // Incident count in last 12 months
  lightingQuality: number;     // Lighting assessment 0-100
  footTraffic: number;         // Pedestrian activity level 0-100
  emergencyServiceDistance: number; // Distance to nearest police/medical
  cctv Coverage: boolean;      // Surveillance presence
}

interface Amenity {
  type: 'parking' | 'lighting' | 'security' | 'emergency' | 'transport';
  description: string;
  available: boolean;
  hours?: string;              // Operating hours if applicable
}
```

**Validation Rules**:
- `latitude` must be within Cape Town bounds (-34.5, -33.5)
- `longitude` must be within Cape Town bounds (18.0, 19.0)
- `address` must be validated against real Cape Town addresses
- `safetyMetrics` scores must be between 0-100

### NavigationSession
Active routing session with real-time updates and user interaction.

```typescript
interface NavigationSession {
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

type NavigationStatus = 'planning' | 'active' | 'paused' | 'completed' | 'cancelled';

interface SafetyAlert {
  id: string;
  type: 'high_crime_area' | 'poor_lighting' | 'route_deviation' | 'emergency';
  severity: 'info' | 'warning' | 'critical';
  message: string;              // User-facing alert text
  location: Location;
  timestamp: Date;
  acknowledged: boolean;
  actionTaken?: string;         // User response to alert
}

interface RouteDeviation {
  timestamp: Date;
  originalLocation: Location;
  actualLocation: Location;
  distanceFromRoute: number;    // Meters off planned route
  reason?: string;              // If user provided feedback
  safetyImpact: number;        // Change in safety score -100 to +100
}

interface SessionFeedback {
  safetyRating: number;        // User's perceived safety 1-5
  routeQuality: number;        // Overall route satisfaction 1-5
  comments?: string;
  wouldRecommend: boolean;
  reportedIncidents: IncidentReport[];
}

interface IncidentReport {
  type: string;
  location: Location;
  timestamp: Date;
  description: string;
  severity: number;            // User-reported severity 1-10
  verified: boolean;           // Admin verification status
}
```

**Validation Rules**:
- `selectedRoute` must be valid and current
- `currentLocation` must be updated within last 30 seconds during active navigation
- `alerts` must be sorted by timestamp descending
- `userFeedback` ratings must be within specified ranges

## Supporting Data Types

### Common Types
```typescript
interface DateRange {
  start: Date;
  end: Date;
}

interface Coordinates {
  latitude: number;
  longitude: number;
  accuracy?: number;           // GPS accuracy in meters
}

interface Address {
  street: string;
  suburb: string;
  city: string;
  province: string;
  postalCode: string;
  country: string;
}
```

## Data Relationships

```
User (1) ──> (0..*) NavigationSession
NavigationSession (1) ──> (1) Route
Route (1) ──> (0..*) RouteSegment
Route (1) ──> (1) SafetyScore
Location (1) ──> (0..*) CrimeData
Location (1) ──> (1) LocationSafetyMetrics
SafetyScore (1) ──> (0..*) SafetyFactor
NavigationSession (1) ──> (0..*) SafetyAlert
```

## Data Storage Strategy

**Frontend (Browser)**:
- User preferences: localStorage
- Active session: sessionStorage
- Route cache: IndexedDB (for offline support)

**Backend (Node.js)**:
- Crime data: JSON files with in-memory caching
- User sessions: Memory store (Redis for production)
- Route calculations: Transient (not persisted)

**External APIs**:
- Google Maps: Real-time route data
- Weather services: Environmental factors
- Gemini AI: Safety explanations

---

**Model Version**: 1.0
**Last Updated**: September 24, 2025
**Next Review**: Post-implementation feedback integration