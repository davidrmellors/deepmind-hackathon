# SafeRoute AI - Route Decision Documentation

## Overview
SafeRoute AI uses a multi-layered approach to calculate and rank safe routes between locations in Cape Town. The system integrates Google Maps APIs with custom safety scoring algorithms to provide users with informed route choices prioritizing both safety and efficiency.

## Route Decision Process

### 1. Route Generation (`/backend/src/api/routes.ts:195-241`)

The system generates route alternatives through the following process:

#### Initial Route Creation
- **Multiple alternatives**: System generates 3 route types by default:
  - **Fastest route** (index 0): Optimized for minimal travel time
  - **Safest route** (index 1): Prioritizes areas with better safety scores
  - **Balanced route** (index 2): Balances safety and time efficiency

#### Route Variations
- **Distance multipliers**:
  - Fastest: 1.0x base distance
  - Safest: 1.15x base distance (allows detours for safety)
  - Balanced: 1.08x base distance
- **Duration multipliers**:
  - Fastest: 1.0x base duration
  - Safest: 1.2x base duration
  - Balanced: 1.1x base duration

### 2. Google Maps Integration (`/backend/src/services/googleMapsService.ts:122-178`)

#### Google Routes API Integration
- **Primary source**: Google Routes API v2 for accurate routing
- **Request configuration**:
  - Routing preference: `TRAFFIC_AWARE_OPTIMAL`
  - Alternative routes: `computeAlternativeRoutes: true`
  - Travel modes: Support for driving, walking, cycling, transit

#### Route Conversion Process
- **Google route legs** → **Route segments** (`googleMapsService.ts:339-385`)
- Each Google step becomes a route segment with:
  - Start/end coordinates
  - Distance and duration
  - Inferred road type (highway, arterial, local, residential)
  - Placeholder safety scores (calculated separately)

#### Fallback Mechanism
- **Triggers**: API key issues, quota exceeded, service unavailable
- **Fallback route**: Direct route with conservative safety estimates
- **Limited data**: 40% confidence level, generic safety scores

### 3. Safety Scoring Algorithm (`/backend/src/services/safetyScoringService.ts:473-544`)

#### Core Safety Formula
```
SafetyScore = (CrimeRiskScore × 0.4) + (TimeFactorScore × 0.3) + (PopulationDensityScore × 0.2) + (LightingScore × 0.1)
```

#### Component Calculations

##### Crime Risk Score (40% weight)
- **Data source**: Crime data service with historical incident data
- **Base calculation**: `100 - (totalIncidents / maxIncidentsForArea) * 100`
- **Travel mode adjustments**:
  - Walking: -15 points for petty crime vulnerability
  - Driving: -10 points for vehicular crime
- **Risk level multipliers**:
  - Low: 1.0x, Medium: 0.8x, High: 0.6x, Critical: 0.4x

##### Time Factor Score (30% weight)
- **Daytime** (6AM-6PM): Base score 90
- **Early evening** (6PM-10PM): Base score 75
- **Night hours** (10PM-6AM): Base score 50
- **Crime pattern adjustment**: -20 points for high night crime areas
- **Weekend nights**: Additional -5 points

##### Population Density Score (20% weight)
- **Optimal range**: 5,000-15,000 people/km² (score: 85-90)
- **Too isolated**: <1,000 people/km² (score: 60)
- **Too dense**: >15,000 people/km² (score: 70)
- **Business density bonus**: Up to +20 points for commercial activity

##### Lighting Score (10% weight)
- **Base score**: Default 80, enhanced by location data
- **Nighttime cap**: Maximum 95 even with excellent lighting
- **Daytime boost**: Minimum 85 during daylight hours

### 4. Route Ranking System (`/backend/src/api/routes.ts:302-314`)

#### Ranking Algorithm
```
RouteScore = (SafetyScore × SafetyWeight) + (TimeEfficiency × TimeWeight)
```

#### User Preference Integration
- **Safety priority**: 0-100 scale from user preferences
- **Safety weight**: `safetyPriority / 100`
- **Time weight**: `(100 - safetyPriority) / 100`
- **Time efficiency**: Normalized inverse of duration

#### Route Alternatives Assignment
- **Primary route**: Highest composite score
- **Alternative labels**:
  - `fastest`: Route with minimum duration
  - `safest`: Route with highest safety score
  - `balanced`: Best compromise between safety and time

### 5. Real-Time Safety Updates (`/backend/src/services/safetyScoringService.ts:87-127`)

#### Real-Time Factors
- **Environmental conditions**: Weather, visibility, temperature
- **Traffic conditions**: Congestion, incidents, average speed
- **Event conditions**: Crowd density, emergency services activity

#### Cache Management
- **Cache duration**: 5 minutes for location-based scores
- **Update frequency**: 30-second intervals for real-time factors
- **Force refresh**: Available for immediate recalculation

#### Environmental Adjustments
- **Weather impact**: -5 points for poor visibility, -3 for rain, -4 for fog
- **Traffic impact**: +1 for moderate congestion (visibility), -2 per incident
- **Events impact**: +2 for high crowd density, -3 for emergency activity

### 6. Route Segment Analysis (`/backend/src/services/routeAnalysisService.ts:72-91`)

#### Segment-Level Safety Assessment
- **Granular analysis**: Each route segment evaluated independently
- **Risk factor identification**:
  - Crime hotspots
  - Poor visibility areas
  - Isolated locations
  - High traffic zones
  - Time-sensitive risks

#### Risk Thresholds
- **High risk**: Safety score below 40
- **Critical risk**: Safety score below 25
- **Segment buffer**: 200-meter radius for analysis

#### Recommendations Generation
- **Route-level recommendations**: Based on overall pattern analysis
- **Segment-specific advice**: Targeted precautions for problem areas
- **Time-based suggestions**: Alternative timing recommendations

## Route Selection Logic

### 1. User Preference Integration
- **Safety priority slider**: 0-100 scale affects route ranking weights
- **Travel mode**: Influences safety score calculations
- **Time constraints**: Affects acceptable safety/time trade-offs

### 2. Route Presentation Order
1. **Recommended route**: Highest composite score based on user preferences
2. **Alternative routes**: Ranked by composite score
3. **Special categories**:
   - Fastest available option
   - Safest available option
   - Most balanced option

### 3. Decision Factors Summary

| Factor | Weight | Key Considerations |
|--------|--------|--------------------|
| Crime Risk | 40% | Historical incidents, area risk level, travel mode vulnerability |
| Time of Day | 30% | Current time, crime patterns, lighting conditions |
| Population Density | 20% | Area activity, business presence, isolation risk |
| Lighting | 10% | Infrastructure quality, time-based visibility |
| Real-time | Variable | Weather, traffic, events, emergency activity |

### 4. Route Confidence Levels
- **High confidence** (>80%): Rich data sources, recent updates, clear patterns
- **Medium confidence** (50-80%): Limited data, older information, mixed signals
- **Low confidence** (<50%): Fallback routes, sparse data, high uncertainty

## API Integration Points

### Route Calculation Endpoint
- **POST** `/api/routes/calculate`: Main route calculation with safety scoring
- **GET** `/api/routes/:id/safety`: Real-time safety assessment for existing route
- **GET** `/api/routes/:id`: Detailed route information retrieval

### Frontend Integration
- **RoutingService** (`/frontend/src/services/routingService.ts`): API communication layer
- **Route selection UI**: Presents ranked alternatives with safety indicators
- **Real-time updates**: Periodic safety score refresh during navigation

## Error Handling and Fallbacks

### API Failures
1. **Google Routes API unavailable**: Generate geometric fallback route
2. **Safety data unavailable**: Use conservative default scores
3. **Invalid locations**: Validate Cape Town bounds, reject out-of-area requests

### Data Quality Issues
- **Missing crime data**: Apply regional averages with reduced confidence
- **Outdated information**: Reduce confidence scores, flag data age
- **Inconsistent readings**: Use median values, increase uncertainty margins

This documentation reflects the current implementation as of the latest codebase analysis and provides a comprehensive view of how SafeRoute AI makes route decisions prioritizing user safety in Cape Town.