# SafeRoute AI - Quickstart Guide

**Version**: 1.0
**Target**: Development team setup and validation
**Estimated Time**: 30 minutes
**Prerequisites**: Node.js 18+, Google Cloud account

## Quick Start Commands

```bash
# 1. Clone and setup
git clone <repository>
cd hackathon-test
git checkout 001-ai-powered-safety

# 2. Install dependencies
npm install
cd backend && npm install
cd ../frontend && npm install

# 3. Environment setup
cp .env.example .env
# Edit .env with Google API keys

# 4. Start development servers
npm run dev:backend    # Terminal 1: http://localhost:3001
npm run dev:frontend   # Terminal 2: http://localhost:3000

# 5. Verify installation
curl http://localhost:3001/health
open http://localhost:3000
```

## Primary User Journey Validation

### Test Scenario 1: Basic Route Calculation
**Goal**: Verify end-to-end route calculation with safety scoring

1. **Open application**: Navigate to http://localhost:3000
2. **Set origin**: Enter "V&A Waterfront, Cape Town" in origin field
3. **Set destination**: Enter "Camps Bay Beach, Cape Town" in destination field
4. **Calculate routes**: Click "Find Safe Routes" button
5. **Verify response**:
   - ✅ 2-3 route alternatives displayed
   - ✅ Each route shows safety score (0-100)
   - ✅ Estimated travel time displayed
   - ✅ Routes marked as "Fastest", "Safest", "Balanced"
6. **Select route**: Click on "Safest" route option
7. **View details**:
   - ✅ Route highlighted on map
   - ✅ Safety factors shown (crime, lighting, population)
   - ✅ AI explanation displayed

**Expected Results**:
- Route calculation completes in <3 seconds
- Safety scores differ between routes (variance >10 points)
- Map displays color-coded route segments
- AI explanation mentions specific safety factors

### Test Scenario 2: Time-Based Safety Variation
**Goal**: Verify safety scores change based on time of day

1. **Use same origin/destination** from Test 1
2. **Set time to daytime**: Use time picker for 2 PM
3. **Calculate routes**: Note safety scores
4. **Change to nighttime**: Set time picker to 10 PM
5. **Recalculate routes**: Compare safety scores
6. **Verify differences**:
   - ✅ Night scores generally lower than day scores
   - ✅ AI explanations mention time factors
   - ✅ Different route may be recommended as "safest"

**Expected Results**:
- Safety scores decrease by 10-20 points at night
- Route recommendations may change
- Explanations reference lighting and activity levels

### Test Scenario 3: Mobile Responsive Interface
**Goal**: Verify mobile usability on small screens

1. **Open Chrome DevTools**: Toggle device toolbar
2. **Select mobile device**: iPhone 12 Pro or similar
3. **Repeat Test Scenario 1**:
   - ✅ Interface adapts to mobile screen
   - ✅ Touch interactions work smoothly
   - ✅ Map is navigable with touch gestures
   - ✅ Route selection works on mobile

**Expected Results**:
- No horizontal scrolling required
- All buttons are touch-accessible (min 44px targets)
- Map zoom/pan works with touch gestures

### Test Scenario 4: Error Handling
**Goal**: Verify graceful handling of invalid inputs and API failures

1. **Test invalid locations**:
   - Enter "London, UK" as origin → ✅ Error message about Cape Town bounds
   - Enter gibberish text → ✅ "Location not found" error
2. **Test API failure simulation**:
   - Disconnect internet → ✅ Offline message displayed
   - Mock Google API rate limit → ✅ Fallback route displayed
3. **Test boundary conditions**:
   - Same origin and destination → ✅ Appropriate handling
   - Location outside Cape Town → ✅ Boundary error message

**Expected Results**:
- Clear, helpful error messages
- No application crashes
- Fallback options when possible

## API Contract Validation

### Backend Health Check
```bash
# Verify backend services
curl -X GET http://localhost:3001/health
# Expected: {"status": "healthy", "timestamp": "2025-09-24T..."}

curl -X GET http://localhost:3001/api/safety/crime-data?area=V%26A%20Waterfront
# Expected: Crime statistics JSON response
```

### Routes API Testing
```bash
# Test route calculation endpoint
curl -X POST http://localhost:3001/api/routes/calculate \
  -H "Content-Type: application/json" \
  -d '{
    "origin": {
      "latitude": -33.9249,
      "longitude": 18.4241,
      "address": "V&A Waterfront, Cape Town"
    },
    "destination": {
      "latitude": -33.9588,
      "longitude": 18.4718,
      "address": "Camps Bay Beach, Cape Town"
    },
    "preferences": {
      "safetyPriority": 70,
      "travelMode": "driving"
    },
    "options": {
      "maxRoutes": 3
    }
  }'

# Expected: JSON response with routes array, safety scores, metadata
```

### Safety API Testing
```bash
# Test safety scoring endpoint
curl -X POST http://localhost:3001/api/safety/score \
  -H "Content-Type: application/json" \
  -d '{
    "location": {
      "latitude": -33.9249,
      "longitude": 18.4241,
      "address": "V&A Waterfront, Cape Town"
    },
    "timeContext": {
      "currentTime": "2025-09-24T20:30:00Z"
    },
    "factors": {
      "includeCrimeData": true,
      "includeEnvironmental": true,
      "includeRealTime": true
    }
  }'

# Expected: JSON response with safetyScore object, recommendations, alerts
```

## Development Workflow Validation

### Frontend Development
```bash
# Hot reload test
cd frontend
echo "/* test change */" >> src/App.js
# Verify: Browser automatically refreshes

# Build test
npm run build
# Verify: Build completes without errors, creates dist/ folder

# Linting
npm run lint
# Verify: No ESLint errors or warnings
```

### Backend Development
```bash
# Test hot reload
cd backend
echo "// test change" >> src/index.js
# Verify: Server restarts automatically

# Run tests
npm test
# Verify: All tests pass

# API documentation
npm run docs
# Verify: OpenAPI docs generated and accessible
```

## Performance Validation

### Response Time Requirements
- Route calculation: <2 seconds for 3 alternatives
- Safety scoring: <500ms for single location
- Initial page load: <3 seconds on 3G connection
- Map rendering: <1 second for Cape Town viewport

### Test Commands
```bash
# Load testing (requires artillery)
npx artillery quick --count 10 --num 5 http://localhost:3001/health

# Frontend bundle analysis
cd frontend && npm run analyze
# Verify: Bundle size <2MB, no duplicate dependencies

# Memory usage check
node --inspect backend/src/index.js
# Monitor in Chrome DevTools for memory leaks
```

## Data Quality Validation

### Crime Data Verification
```bash
# Verify Cape Town crime data exists
curl http://localhost:3001/api/safety/crime-data | jq '.statistics | length'
# Expected: >50 (sufficient coverage of Cape Town areas)

# Check data freshness
curl http://localhost:3001/api/safety/crime-data | jq '.metadata.lastUpdated'
# Expected: Recent timestamp (within 24 hours for synthetic data)
```

### Safety Score Consistency
1. **Same location, same time**: Should return identical scores
2. **Different times**: Night scores should be lower than day scores
3. **Different areas**: High-crime areas should have lower scores
4. **Route segments**: Scores should vary along route based on local conditions

## Troubleshooting Common Issues

### Google API Issues
```bash
# Verify API key configuration
echo $GOOGLE_MAPS_API_KEY
echo $GOOGLE_AI_API_KEY

# Test API access
curl "https://maps.googleapis.com/maps/api/geocode/json?address=Cape+Town&key=$GOOGLE_MAPS_API_KEY"
```

### Database/Data Issues
```bash
# Regenerate synthetic crime data
npm run generate-crime-data

# Verify data integrity
npm run validate-data
```

### Frontend Issues
```bash
# Clear cache and reinstall
rm -rf node_modules package-lock.json
npm install

# Check for missing environment variables
npm run check-env
```

## Success Criteria Checklist

**Core Functionality**:
- [ ] Route calculation works for Cape Town locations
- [ ] Safety scores are calculated and displayed
- [ ] Multiple route alternatives shown
- [ ] Time-based safety variation works
- [ ] Mobile responsive interface functions

**Performance**:
- [ ] Route calculation <2 seconds
- [ ] Safety scoring <500ms
- [ ] Page load <3 seconds
- [ ] No memory leaks in 30-minute session

**User Experience**:
- [ ] Clear error messages for invalid inputs
- [ ] Intuitive route selection interface
- [ ] Helpful AI safety explanations
- [ ] Smooth mobile interactions

**Technical**:
- [ ] All API contracts return expected schemas
- [ ] Frontend builds without errors
- [ ] Backend passes all tests
- [ ] Documentation is complete and accurate

**AI Integration**:
- [ ] Gemini API provides contextual safety explanations
- [ ] Safety factors are meaningful and accurate
- [ ] Recommendations are actionable

---

**Quickstart Guide Version**: 1.0
**Last Updated**: September 24, 2025
**Estimated Completion Time**: 30 minutes
**Next Step**: Run `/tasks` command to generate implementation tasks