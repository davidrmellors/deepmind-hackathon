import React, { useState, useCallback } from 'react';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import CssBaseline from '@mui/material/CssBaseline';
import { Container, Box, Button, Typography, AppBar, Toolbar, useMediaQuery } from '@mui/material';
import { LocationOn, Directions } from '@mui/icons-material';
import LocationInput from './components/LocationInput';
import MapView from './components/MapView';
import RouteSelector from './components/RouteSelector';
import { Location, Route, UserPreferences, RouteRequest } from './types';
import RoutingService from './services/routingService';
import SafetyService from './services/safetyService';

const theme = createTheme({
  palette: {
    primary: {
      main: '#1976d2',
    },
    secondary: {
      main: '#dc004e',
    },
  },
  typography: {
    fontFamily: 'Roboto, Arial, sans-serif',
  },
  components: {
    MuiCssBaseline: {
      styleOverrides: {
        body: {
          backgroundColor: '#f5f5f5',
        },
      },
    },
  },
  breakpoints: {
    values: {
      xs: 0,
      sm: 600,
      md: 900,
      lg: 1200,
      xl: 1536,
    },
  },
});

function App() {
  const [origin, setOrigin] = useState<Location | null>(null);
  const [destination, setDestination] = useState<Location | null>(null);
  const [routes, setRoutes] = useState<Route[]>([]);
  const [selectedRoute, setSelectedRoute] = useState<string | undefined>(undefined);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));

  const preferences: UserPreferences = {
    safetyPriority: 70,
    riskTolerance: 'medium',
    travelMode: 'driving',
    avoidAreas: [],
  };

  const calculateRoutes = useCallback(async () => {
    if (!origin || !destination) {
      setError('Please enter both origin and destination.');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const request: RouteRequest = {
        origin,
        destination,
        preferences,
        options: { maxRoutes: 3 },
      };

      const response = await RoutingService.calculateRoutes(request);
      setRoutes(response.routes);
      if (response.routes.length > 0) {
        setSelectedRoute(response.routes[1].id); // Default to safest (assuming rank 2 is safest)
      }
    } catch (err) {
      setError('Failed to calculate routes. Please try again.');
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [origin, destination, preferences]);

  const handleRouteSelect = useCallback((routeId: string) => {
    setSelectedRoute(routeId);
    // Optionally fetch updated safety or other details
  }, []);

  const selectedRouteData = routes.find(r => r.id === selectedRoute) || null;

  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <AppBar position="static" color="primary" sx={{ mb: 2 }}>
        <Toolbar>
          <LocationOn sx={{ mr: 1 }} />
          <Typography variant="h6" component="div" sx={{ flexGrow: 1 }}>
            SafeRoute AI - Cape Town
          </Typography>
          <Directions sx={{ mr: 1 }} />
          <Typography variant="body2">Safer routes for Cape Town</Typography>
        </Toolbar>
      </AppBar>

      <Container maxWidth="lg" sx={{ py: 2 }}>
        <Box sx={{ mb: 4 }}>
          <Typography variant="h4" gutterBottom align="center" sx={{ mb: 3 }}>
            Find Your Safest Route
          </Typography>
          
          <Box sx={{ display: 'flex', flexDirection: isMobile ? 'column' : 'row', gap: 2, mb: 3 }}>
            <LocationInput
              label="Origin"
              value={origin}
              onChange={setOrigin}
              type="origin"
              isMobile={isMobile}
            />
            <LocationInput
              label="Destination"
              value={destination}
              onChange={setDestination}
              type="destination"
              isMobile={isMobile}
            />
          </Box>

          <Box sx={{ textAlign: 'center', mb: 3 }}>
            <Button
              variant="contained"
              size={isMobile ? 'medium' : 'large'}
              onClick={calculateRoutes}
              disabled={loading || !origin || !destination}
              startIcon={<Directions />}
              sx={{ minHeight: isMobile ? '44px' : '48px', px: 4 }}
            >
              {loading ? 'Calculating...' : 'Find Safe Routes'}
            </Button>
          </Box>

          {error && (
            <Box sx={{ mb: 2, p: 2, bgcolor: 'error.light', color: 'error.contrastText', borderRadius: 1 }}>
              <Typography variant="body1">{error}</Typography>
            </Box>
          )}
        </Box>

        {routes.length > 0 && (
          <>
            <RouteSelector
              routes={routes}
              selectedRouteId={selectedRoute}
              onRouteSelect={handleRouteSelect}
              isMobile={isMobile}
            />

            {selectedRouteData && (
              <Box sx={{ mt: 4 }}>
                <Typography variant="h5" gutterBottom>
                  Selected Route Details
                </Typography>
                <MapView
                  origin={selectedRouteData.origin}
                  destination={selectedRouteData.destination}
                  route={selectedRouteData}
                />
              </Box>
            )}
          </>
        )}
      </Container>
    </ThemeProvider>
  );
}

export default App;
