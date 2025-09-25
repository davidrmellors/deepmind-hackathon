import React from 'react';
import { Card, CardContent, CardActions, Button, Typography, Chip, Box, Grid } from '@mui/material';
import { Route, SafetyScore } from '../types';
import SafetyIndicator from './SafetyIndicator';

interface RouteSelectorProps {
  routes: Route[];
  selectedRouteId?: string;
  onRouteSelect: (routeId: string) => void;
  isMobile?: boolean;
}

const RouteSelector: React.FC<RouteSelectorProps> = ({ routes, selectedRouteId, onRouteSelect, isMobile = false }) => {
  if (routes.length === 0) {
    return (
      <Box sx={{ textAlign: 'center', p: 3 }}>
        <Typography variant="h6">No routes available</Typography>
        <Typography variant="body2" color="textSecondary">
          Please enter origin and destination to calculate routes.
        </Typography>
      </Box>
    );
  }

  const getRouteLabel = (rank: number): string => {
    switch (rank) {
      case 1: return 'Fastest';
      case 2: return 'Safest';
      case 3: return 'Balanced';
      default: return `Option ${rank}`;
    }
  };

  const formatDuration = (seconds: number): string => {
    const minutes = Math.round(seconds / 60);
    return `${minutes} min`;
  };

  const formatDistance = (meters: number): string => {
    const km = (meters / 1000).toFixed(1);
    return `${km} km`;
  };

  return (
    <Box sx={{ p: isMobile ? 1 : 2 }}>
      <Typography variant="h6" gutterBottom sx={{ mb: 2 }}>
        Route Options
      </Typography>
      <Grid container spacing={isMobile ? 1 : 2}>
        {routes.map((route: Route) => {
          const isSelected = selectedRouteId === route.id;
          const label = getRouteLabel(route.alternativeRank);
          const safetyScore = route.safetyScore;

          return (
            <Grid item xs={12} sm={12} md={4} key={route.id}>
              <Card 
                elevation={isSelected ? 8 : 2}
                sx={{ 
                  cursor: 'pointer',
                  transition: 'all 0.3s ease',
                  '&:hover': { transform: 'translateY(-4px)', boxShadow: 6 },
                  minHeight: isMobile ? '120px' : '150px'
                }}
                onClick={() => onRouteSelect(route.id)}
              >
                <CardContent sx={{ p: isMobile ? 2 : 3 }}>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
                    <Typography variant="h6" color="primary">
                      {label}
                    </Typography>
                    {isSelected && (
                      <Chip label="Selected" color="primary" size="small" />
                    )}
                  </Box>
                  
                  <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                    <SafetyIndicator score={safetyScore.overall} size="small" />
                    <Typography variant="body1" sx={{ ml: 1, fontWeight: 'bold' }}>
                      {safetyScore.overall}/100
                    </Typography>
                  </Box>

                  <Typography variant="body2" color="textSecondary" gutterBottom>
                    Distance: {formatDistance(route.totalDistance)}
                  </Typography>
                  <Typography variant="body2" color="textSecondary">
                    Duration: {formatDuration(route.estimatedDuration)}
                  </Typography>

                  {safetyScore.explanation && (
                    <Typography variant="caption" sx={{ mt: 1, display: 'block', color: 'text.primary' }}>
                      {safetyScore.explanation.substring(0, 100)}...
                    </Typography>
                  )}
                </CardContent>

                <CardActions sx={{ p: 2, pt: 0 }}>
                  <Button 
                    size="small" 
                    variant={isSelected ? 'contained' : 'outlined'}
                    fullWidth
                    onClick={() => onRouteSelect(route.id)}
                  >
                    {isSelected ? 'Route Selected' : 'Select Route'}
                  </Button>
                </CardActions>
              </Card>
            </Grid>
          );
        })}
      </Grid>
    </Box>
  );
};

export default RouteSelector;
