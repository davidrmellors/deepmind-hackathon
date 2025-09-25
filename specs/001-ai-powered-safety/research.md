# Research Analysis: AI-Powered Safety Route Advisor for Cape Town

**Date**: September 24, 2025
**Research Scope**: Technology stack and data source analysis for hackathon implementation

## Crime Data Sources for Cape Town

### Decision: Synthetic Crime Model with SAPS-Based Statistical Distribution
**Rationale**: Real-time crime APIs are not publicly available from SAPS or City of Cape Town. For hackathon purposes, a realistic synthetic model provides demonstration value without compromising on safety algorithm design.

**Implementation Approach**:
- Use SAPS Crime Statistics (2024) to create neighborhood risk profiles
- Generate time-of-day multipliers based on crime pattern analysis
- Create JSON dataset with Cape Town suburbs mapped to safety indices
- Include factors: population density, lighting, economic indicators

**Alternatives Considered**:
- SAPS Crime Statistics API (not publicly available)
- Social media sentiment analysis (too complex for 6-hour timeline)
- Crowdsourced safety reports (requires user base)

## Google Maps Platform APIs

### Decision: Routes API + Maps JavaScript API with Custom Safety Overlays
**Rationale**: Routes API provides multiple route alternatives with detailed geometry, while Maps JavaScript API enables custom safety visualizations and responsive mobile interface.

**Implementation Approach**:
- Routes API: Generate 2-3 route alternatives with detailed waypoints
- Maps JavaScript API: Display routes with color-coded safety segments
- Directions Service: Fallback for basic routing functionality
- Places API: Enhanced location search for Cape Town landmarks

**Rate Limits & Costs**:
- Routes API: $5 per 1000 requests (hackathon free credits available)
- Maps JavaScript API: Free tier sufficient for prototype
- Expected usage: <200 requests during hackathon demo

**Alternatives Considered**:
- OpenStreetMap with Leaflet (lacks advanced routing features)
- Mapbox (higher learning curve, cost considerations)

## AI/ML Integration for Safety Scoring

### Decision: Client-Side Composite Safety Scoring with Google AI Platform Enhancement
**Rationale**: Hybrid approach balances real-time performance with AI-powered insights while keeping implementation feasible for hackathon timeline.

**Core Algorithm**:
```
SafetyScore = (CrimeRiskScore * 0.4) + (TimeFactorScore * 0.3) + (PopulationDensityScore * 0.2) + (LightingScore * 0.1)
```

**Google AI Integration**:
- Use Gemini API for natural language safety explanations
- ML Kit for location-based risk assessment refinement
- Vertex AI for future crime pattern prediction (if time permits)

**Implementation Approach**:
- Pre-compute crime grid for Cape Town (1km x 1km cells)
- Real-time factors: current time, weather conditions, events
- Client-side calculation for <200ms response time

**Alternatives Considered**:
- TensorFlow.js crime prediction models (too complex)
- Server-side ML processing (latency concerns)
- Rule-based scoring only (insufficient AI integration)

## Frontend Technology Stack

### Decision: React 18 + Google Maps React + Material-UI
**Rationale**: Familiar stack for rapid development, excellent mobile responsiveness, strong mapping integration, and comprehensive UI components.

**Architecture**:
```
Frontend (React 18)
├── Components
│   ├── MapView (Google Maps React)
│   ├── RouteSelector (Material-UI Cards)
│   ├── SafetyIndicator (Custom viz)
│   └── Navigation (Material-UI App Bar)
├── Services
│   ├── RoutingService (Google Routes API)
│   ├── SafetyService (Custom scoring)
│   └── LocationService (Geolocation API)
└── State Management (React Context)
```

**Mobile Responsiveness**:
- Material-UI responsive breakpoints
- Touch-optimized route selection
- Progressive Web App (PWA) capabilities
- Offline fallback for core functionality

**Real-time Updates**:
- Polling for safety condition updates (30-second intervals)
- WebSocket connection for live traffic/incident data (if available)
- Service Worker for background updates

**Alternatives Considered**:
- Vue.js + Leaflet (team less familiar with Vue)
- React Native (mobile-only, eliminates web access)
- Vanilla JavaScript (slower development, no component library)

## Backend Technology Stack

### Decision: Express.js + Node.js with In-Memory Data Store
**Rationale**: Minimal setup overhead, JavaScript consistency across stack, sufficient for hackathon prototype scale.

**Architecture**:
```
Backend (Express.js)
├── Routes
│   ├── /api/routes (route calculation)
│   ├── /api/safety (safety scoring)
│   └── /api/locations (Cape Town data)
├── Services
│   ├── CrimeDataService (synthetic data)
│   ├── GoogleMapsService (API wrapper)
│   └── SafetyScoringService (ML integration)
└── Data (JSON files + in-memory cache)
```

**Alternatives Considered**:
- FastAPI + Python (requires ML libraries setup)
- Serverless functions (cold start latency)
- Static JSON files only (limited dynamic scoring)

## Implementation Timeline (6-Hour Hackathon)

**Phase 1 (0-2 hours): Core Setup**
- Project initialization and Google APIs setup
- Basic React components and routing
- Crime data JSON generation
- Google Maps integration

**Phase 2 (2-4 hours): Core Features**
- Route calculation and display
- Safety scoring algorithm
- Mobile-responsive UI
- Basic navigation interface

**Phase 3 (4-6 hours): Enhancement & Demo Prep**
- AI-powered safety explanations
- UI polish and testing
- Demo scenario preparation
- Performance optimization

## Risk Mitigation

**High Priority Risks**:
1. Google API rate limiting → Pre-cache common routes
2. Mobile performance issues → Optimize bundle size, lazy loading
3. Complex safety algorithm → Start with simple weighted scoring
4. Time constraints → MVP-first approach, feature flags for enhancements

**Fallback Plans**:
- Static route data if API fails
- Basic color-coding if AI integration fails
- Simplified UI if responsive design issues
- Demo video if live demo fails

---

**Research Completed**: September 24, 2025
**Next Phase**: Design contracts and data models based on these technical decisions