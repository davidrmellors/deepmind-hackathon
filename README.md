# SafeRoute AI

**An AI-powered route safety advisor for Cape Town**

SafeRoute AI helps you navigate the Mother City safely by recommending the best routes between two locations. Whether you're walking through the Bo-Kaap, driving along the N1, or catching an Uber through the CBD, SafeRoute AI analyses crime data, lighting conditions, time of day, and population density to give you route options that prioritise both safety and efficiency.

## Features

- **Intelligent Route Scoring** - Multi-factor safety analysis considering crime statistics, time of day, population density, and street lighting
- **Multiple Route Alternatives** - Choose between the fastest, safest, or most balanced route for your journey
- **Real-Time Safety Updates** - Dynamic safety scores that adjust based on current conditions
- **AI-Powered Explanations** - Clear, understandable reasons for route recommendations
- **Cape Town Focused** - Built specifically for navigating the Cape Town metropolitan area

## Tech Stack

### Backend
- Node.js 18+ with TypeScript
- Express.js
- Google Maps Platform (Routes API)
- Google AI for explanations

### Frontend
- React 18 with TypeScript
- Material-UI
- @react-google-maps/api

## Getting Started

### Prerequisites

- Node.js 18 or higher
- npm or yarn
- Google Maps API key with Routes API enabled
- Google AI API key (optional, for AI explanations)

### Installation

1. Clone the repository:
```bash
git clone https://github.com/saferoute-ai/hackathon-test.git
cd hackathon-test
```

2. Install dependencies:
```bash
npm run install:all
```

3. Set up your environment variables by copying `.env.example` to `.env`:
```bash
cp .env.example .env
```

4. Add your API keys to the `.env` file:
```env
GOOGLE_MAPS_API_KEY=your_google_maps_api_key
GOOGLE_ROUTES_API_KEY=your_google_routes_api_key
GOOGLE_AI_API_KEY=your_google_ai_api_key
```

### Running the Application

**Development mode** (runs both backend and frontend):
```bash
npm run dev
```

The frontend will be available at `http://localhost:3000` and the backend API at `http://localhost:3001`.

**Run backend only:**
```bash
npm run dev:backend
```

**Run frontend only:**
```bash
npm run dev:frontend
```

### Building for Production

```bash
npm run build
npm run start
```

## Project Structure

```
saferoute-ai/
├── backend/
│   ├── src/
│   │   ├── api/              # API routes and endpoints
│   │   ├── services/         # Business logic and external integrations
│   │   ├── middleware/       # Express middleware
│   │   ├── types/            # TypeScript type definitions
│   │   └── data/             # Data generation utilities
│   └── tests/                # Backend tests
├── frontend/
│   ├── src/
│   │   ├── components/       # React components
│   │   ├── services/         # API client services
│   │   └── types/            # TypeScript type definitions
│   └── public/               # Static assets
└── specs/                    # Project specifications and documentation
```

## API Endpoints

### Routes
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/routes/calculate` | Calculate routes with safety scores |
| GET | `/api/routes/:routeId` | Get route details |
| GET | `/api/routes/:routeId/safety` | Get real-time safety assessment |

### Safety
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/safety/score` | Calculate safety score for a location |
| GET | `/api/safety/area/:gridId` | Get area safety data |
| GET | `/api/safety/alerts` | Get current safety alerts |
| GET | `/api/safety/crime-data` | Get Cape Town crime statistics |

## How Safety Scoring Works

SafeRoute AI uses a weighted scoring algorithm that considers multiple factors:

| Factor | Weight | Description |
|--------|--------|-------------|
| Crime Risk | 40% | Historical crime data for the area |
| Time of Day | 30% | Adjustments for day, evening, and night travel |
| Population Density | 20% | Areas with appropriate foot traffic score higher |
| Street Lighting | 10% | Well-lit routes are safer at night |

The final safety score is a value between 0 and 100, with higher scores indicating safer routes.

### Risk Levels
- **Low Risk (70-100)** - Generally safe, standard precautions advised
- **Medium Risk (40-69)** - Exercise caution, be aware of surroundings
- **High Risk (25-39)** - Consider alternative routes, especially at night
- **Critical Risk (0-24)** - Route not recommended, seek alternatives

## Testing

```bash
# Run all tests
npm test

# Backend tests only
npm run test:backend

# Frontend tests only
npm run test:frontend
```

## Linting

```bash
npm run lint
```

## Environment Variables

| Variable | Description | Required |
|----------|-------------|----------|
| `GOOGLE_MAPS_API_KEY` | Google Maps JavaScript API key | Yes |
| `GOOGLE_ROUTES_API_KEY` | Google Routes API key | Yes |
| `GOOGLE_AI_API_KEY` | Google AI API key for explanations | No |
| `PORT` | Backend server port (default: 3001) | No |
| `NODE_ENV` | Environment (development/production) | No |
| `CORS_ORIGIN` | Allowed CORS origin | No |

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

## Disclaimer

SafeRoute AI is designed to assist with route planning and provide general safety guidance. It should not be relied upon as the sole source of safety information. Crime data is based on historical statistics and may not reflect current conditions. Always use your own judgement and stay aware of your surroundings when travelling.

## Licence

This project is licensed under the ISC Licence.

---

Built with care for the people of Cape Town.
