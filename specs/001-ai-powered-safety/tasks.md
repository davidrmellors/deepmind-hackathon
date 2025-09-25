# Tasks: AI-Powered Safety Route Advisor for Cape Town

**Input**: Design documents from `/specs/001-ai-powered-safety/`
**Prerequisites**: plan.md (✅), research.md (✅), data-model.md (✅), contracts/ (✅), quickstart.md (✅)

## Execution Flow (main)
```
1. Load plan.md from feature directory
   → ✅ Found: React 18 + Express.js web app, Google Maps APIs, 6-hour hackathon timeline
2. Load design documents:
   → ✅ data-model.md: 6 entities (Route, SafetyScore, CrimeData, User, Location, NavigationSession)
   → ✅ contracts/: routes-api.yaml (3 endpoints), safety-api.yaml (4 endpoints)
   → ✅ research.md: Synthetic crime data, client-side scoring, Google AI integration
   → ✅ quickstart.md: 4 test scenarios for validation
3. Generate tasks by category:
   → Setup: Project init, dependencies, TypeScript interfaces
   → Tests: 7 contract tests, 4 integration tests
   → Core: 6 data models, API services, Google Maps integration
   → Integration: Safety scoring, AI explanations, mobile responsiveness
   → Polish: Performance optimization, demo preparation
4. Apply task rules:
   → Different files = [P] for parallel execution
   → Contract tests before implementation (TDD)
   → Models before services before endpoints
5. ✅ Tasks numbered T001-T030 with dependencies
6. ✅ Parallel execution groups identified
```

## Path Conventions
**Web application structure** (frontend + backend):
- **Backend**: `backend/src/`, `backend/tests/`
- **Frontend**: `frontend/src/`, `frontend/tests/`
- **Shared**: Root-level configs, documentation

## Phase 3.1: Setup & Foundation (Hours 0-1)
- [ ] T001 Create project structure with frontend/ and backend/ directories
- [ ] T002 [P] Initialize backend Express.js project with TypeScript and basic dependencies
- [ ] T003 [P] Initialize frontend React project with TypeScript and Google Maps dependencies
- [ ] T004 [P] Configure environment variables for Google Maps API and Google AI API keys
- [ ] T005 [P] Create TypeScript interfaces from data-model.md in backend/src/types/index.ts
- [ ] T006 [P] Set up basic Express.js server with health endpoint in backend/src/index.ts

## Phase 3.2: Tests First (TDD) ⚠️ MUST COMPLETE BEFORE 3.3
**CRITICAL: These tests MUST be written and MUST FAIL before ANY implementation**
- [ ] T007 [P] Contract test POST /api/routes/calculate in backend/tests/contract/test_routes_calculate.ts
- [ ] T008 [P] Contract test GET /api/routes/{routeId} in backend/tests/contract/test_routes_get.ts
- [ ] T009 [P] Contract test GET /api/routes/{routeId}/safety in backend/tests/contract/test_routes_safety.ts
- [ ] T010 [P] Contract test POST /api/safety/score in backend/tests/contract/test_safety_score.ts
- [ ] T011 [P] Contract test GET /api/safety/area/{gridId} in backend/tests/contract/test_safety_area.ts
- [ ] T012 [P] Contract test GET /api/safety/alerts in backend/tests/contract/test_safety_alerts.ts
- [ ] T013 [P] Contract test GET /api/safety/crime-data in backend/tests/contract/test_safety_crime_data.ts
- [ ] T014 [P] Integration test basic route calculation scenario from quickstart.md in backend/tests/integration/test_route_calculation.ts
- [ ] T015 [P] Integration test time-based safety variation scenario in backend/tests/integration/test_time_safety.ts
- [ ] T016 [P] Integration test mobile responsive interface scenario in frontend/tests/integration/test_mobile_interface.ts
- [ ] T017 [P] Integration test error handling scenario in backend/tests/integration/test_error_handling.ts

## Phase 3.3: Core Implementation - Backend (Hours 1-3, ONLY after tests are failing)
- [ ] T018 [P] Generate synthetic Cape Town crime data in backend/src/data/crime-generator.ts
- [ ] T019 [P] CrimeData model and service in backend/src/services/crimeDataService.ts
- [ ] T020 [P] SafetyScore calculation algorithm in backend/src/services/safetyScoringService.ts
- [ ] T021 [P] Location validation service for Cape Town bounds in backend/src/services/locationService.ts
- [ ] T022 POST /api/routes/calculate endpoint in backend/src/api/routes.ts
- [ ] T023 GET /api/routes/{routeId} endpoint in backend/src/api/routes.ts
- [ ] T024 GET /api/routes/{routeId}/safety endpoint in backend/src/api/routes.ts
- [ ] T025 POST /api/safety/score endpoint in backend/src/api/safety.ts
- [ ] T026 GET /api/safety/area/{gridId} endpoint in backend/src/api/safety.ts
- [ ] T027 GET /api/safety/alerts endpoint in backend/src/api/safety.ts
- [ ] T028 GET /api/safety/crime-data endpoint in backend/src/api/safety.ts

## Phase 3.4: Core Implementation - Frontend (Hours 2-4, parallel with backend)
- [ ] T029 [P] MapView component with Google Maps integration in frontend/src/components/MapView.tsx
- [ ] T030 [P] RouteSelector component for displaying route alternatives in frontend/src/components/RouteSelector.tsx
- [ ] T031 [P] SafetyIndicator component for safety scores in frontend/src/components/SafetyIndicator.tsx
- [ ] T032 [P] LocationInput component for origin/destination in frontend/src/components/LocationInput.tsx
- [ ] T033 Main App component integrating all components in frontend/src/App.tsx
- [ ] T034 RoutingService for API communication in frontend/src/services/routingService.ts
- [ ] T035 SafetyService for safety data in frontend/src/services/safetyService.ts
- [ ] T036 Mobile responsive design with Material-UI breakpoints in frontend/src/styles/

## Phase 3.5: Integration & AI (Hours 4-5)
- [ ] T037 Google Routes API integration in backend/src/services/googleMapsService.ts
- [ ] T038 Google AI (Gemini) integration for safety explanations in backend/src/services/aiExplanationService.ts
- [ ] T039 Real-time safety score updates with time factors in backend/src/services/safetyScoringService.ts
- [ ] T040 Route segment safety analysis in backend/src/services/routeAnalysisService.ts
- [ ] T041 Error handling middleware and validation in backend/src/middleware/errorHandler.ts
- [ ] T042 CORS configuration and security headers in backend/src/middleware/security.ts
- [ ] T043 Frontend error boundaries and user feedback in frontend/src/components/ErrorBoundary.tsx

## Phase 3.6: Polish & Demo Prep (Hours 5-6)
- [ ] T044 [P] Performance optimization - route caching in frontend/src/services/cacheService.ts
- [ ] T045 [P] Unit tests for safety scoring algorithm in backend/tests/unit/test_safety_scoring.ts
- [ ] T046 [P] User preferences storage in browser localStorage in frontend/src/services/storageService.ts
- [ ] T047 Run quickstart scenario validation from quickstart.md
- [ ] T048 Performance testing - ensure <2 second route calculation
- [ ] T049 Mobile testing on Chrome DevTools device emulator
- [ ] T050 Demo data preparation with realistic Cape Town routes
- [ ] T051 Final integration testing and bug fixes
- [ ] T052 Demo presentation preparation and deployment

## Dependencies
**Sequential Dependencies**:
- Setup (T001-T006) before tests (T007-T017)
- Tests (T007-T017) before implementation (T018-T043)
- T018 (crime data) blocks T019-T020 (services using crime data)
- T022-T024 (route endpoints) require T020 (safety scoring) and T037 (Google Maps)
- T025-T028 (safety endpoints) require T019-T020 (crime and safety services)
- T029-T032 (components) before T033 (main app integration)
- T034-T035 (frontend services) before component integration
- Backend APIs (T022-T028) before frontend service implementation (T034-T035)

**Parallel Opportunities**:
- T002-T006: Different projects, can run simultaneously
- T007-T017: Different test files, independent contract validation
- T018-T021: Different service files, independent data layer
- T029-T032: Different React components, independent UI elements
- T044-T046: Different optimization areas, independent improvements

## Parallel Execution Examples
```bash
# Launch contract tests together (T007-T013):
Task: "Contract test POST /api/routes/calculate in backend/tests/contract/test_routes_calculate.ts"
Task: "Contract test GET /api/routes/{routeId} in backend/tests/contract/test_routes_get.ts"
Task: "Contract test POST /api/safety/score in backend/tests/contract/test_safety_score.ts"
Task: "Contract test GET /api/safety/crime-data in backend/tests/contract/test_safety_crime_data.ts"

# Launch backend services together (T018-T021):
Task: "Generate synthetic Cape Town crime data in backend/src/data/crime-generator.ts"
Task: "CrimeData model and service in backend/src/services/crimeDataService.ts"
Task: "SafetyScore calculation algorithm in backend/src/services/safetyScoringService.ts"
Task: "Location validation service for Cape Town bounds in backend/src/services/locationService.ts"

# Launch frontend components together (T029-T032):
Task: "MapView component with Google Maps integration in frontend/src/components/MapView.tsx"
Task: "RouteSelector component for displaying route alternatives in frontend/src/components/RouteSelector.tsx"
Task: "SafetyIndicator component for safety scores in frontend/src/components/SafetyIndicator.tsx"
Task: "LocationInput component for origin/destination in frontend/src/components/LocationInput.tsx"
```

## Validation Checklist
**Contract Coverage**:
- [x] All 7 API endpoints have corresponding contract tests (T007-T013)
- [x] All 4 quickstart scenarios have integration tests (T014-T017)
- [x] All 6 data model entities have TypeScript interfaces (T005)

**Implementation Coverage**:
- [x] All contract tests come before implementation tasks
- [x] Each API endpoint has implementation task (T022-T028)
- [x] Frontend components cover complete user journey (T029-T036)
- [x] AI integration addresses safety explanation requirement (T038)

**Dependencies Verified**:
- [x] Parallel tasks ([P]) are truly independent (different files)
- [x] Sequential dependencies properly ordered
- [x] No task modifies same file as another [P] task
- [x] TDD pattern enforced (tests before implementation)

## Timeline Optimization for 6-Hour Hackathon
**Hour 0-1**: Foundation setup (T001-T006) - Full team collaboration
**Hour 1-2**: Test writing (T007-T017) - Can split frontend/backend
**Hour 2-3**: Backend core (T018-T028) - Backend developer focus
**Hour 3-4**: Frontend core (T029-T036) - Frontend developer focus
**Hour 4-5**: Integration (T037-T043) - Full team collaboration
**Hour 5-6**: Polish & demo (T044-T052) - Full team collaboration

**3-Person Team Allocation**:
- **Person 1**: Backend focus (APIs, safety scoring, Google integration)
- **Person 2**: Frontend focus (React components, Maps UI, mobile responsiveness)
- **Person 3**: Integration focus (testing, AI integration, demo preparation)

## Notes
- [P] tasks can run in parallel (different files, no dependencies)
- Verify all contract tests fail before starting implementation
- Commit after each major task completion
- Focus on MVP functionality first, enhancements if time permits
- Use synthetic crime data for demo - real SAPS data not available
- Target Cape Town metropolitan area only (lat: -34.5 to -33.5, lng: 18.0 to 19.0)
- Prioritize "Basic Route Calculation" and "Time-Based Safety Variation" scenarios for demo

---

**Generated**: September 25, 2025
**Task Count**: 52 tasks
**Estimated Duration**: 6 hours (hackathon timeline)
**Team Size**: 3 developers
**Success Criteria**: Working route calculation with safety scoring, mobile-responsive interface, AI-powered explanations