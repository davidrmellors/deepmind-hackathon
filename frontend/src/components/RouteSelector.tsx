import React from 'react';
import { Card, CardContent, CardActions, Button, Typography, Chip, Box, Grid, LinearProgress, Divider } from '@mui/material';
import { Route, SafetyScore } from '../types';
import SafetyIndicator from './SafetyIndicator';
import { SecurityOutlined, LightbulbOutlined, PeopleOutlined, AccessTimeOutlined } from '@mui/icons-material';

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
                  minHeight: isMobile ? '280px' : '320px'
                }}
                onClick={() => onRouteSelect(route.id)}
              >
                <CardContent sx={{ p: isMobile ? 2 : 3 }}>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
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
                    <Chip
                      label={safetyScore.overall >= 70 ? 'Safe' : safetyScore.overall >= 50 ? 'Moderate' : 'Caution'}
                      size="small"
                      color={safetyScore.overall >= 70 ? 'success' : safetyScore.overall >= 50 ? 'warning' : 'error'}
                      sx={{ ml: 1 }}
                    />
                  </Box>

                  {/* Basic Route Info */}
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 2 }}>
                    <Typography variant="body2" color="textSecondary">
                      {formatDistance(route.totalDistance)} • {formatDuration(route.estimatedDuration)}
                    </Typography>
                    <Typography variant="body2" color="textSecondary">
                      {route.segments.length} segments
                    </Typography>
                  </Box>

                  {/* Safety Factor Breakdown */}
                  <Box sx={{ mb: 2 }}>
                    <Typography variant="caption" color="textSecondary" sx={{ mb: 1, display: 'block' }}>
                      Safety Factors
                    </Typography>
                    <Grid container spacing={1}>
                      <Grid item xs={6}>
                        <Box sx={{ display: 'flex', alignItems: 'center', mb: 0.5 }}>
                          <SecurityOutlined sx={{ fontSize: 14, mr: 0.5, color: 'text.secondary' }} />
                          <Typography variant="caption" sx={{ flex: 1 }}>Crime Risk</Typography>
                          <Typography variant="caption" color={safetyScore.crimeRisk >= 70 ? 'success.main' : safetyScore.crimeRisk >= 50 ? 'warning.main' : 'error.main'}>
                            {safetyScore.crimeRisk}/100
                          </Typography>
                        </Box>
                        <LinearProgress
                          variant="determinate"
                          value={safetyScore.crimeRisk}
                          sx={{ height: 4, borderRadius: 2, mb: 1 }}
                          color={safetyScore.crimeRisk >= 70 ? 'success' : safetyScore.crimeRisk >= 50 ? 'warning' : 'error'}
                        />
                      </Grid>
                      <Grid item xs={6}>
                        <Box sx={{ display: 'flex', alignItems: 'center', mb: 0.5 }}>
                          <LightbulbOutlined sx={{ fontSize: 14, mr: 0.5, color: 'text.secondary' }} />
                          <Typography variant="caption" sx={{ flex: 1 }}>Lighting</Typography>
                          <Typography variant="caption" color={safetyScore.lightingLevel >= 70 ? 'success.main' : safetyScore.lightingLevel >= 50 ? 'warning.main' : 'error.main'}>
                            {safetyScore.lightingLevel}/100
                          </Typography>
                        </Box>
                        <LinearProgress
                          variant="determinate"
                          value={safetyScore.lightingLevel}
                          sx={{ height: 4, borderRadius: 2, mb: 1 }}
                          color={safetyScore.lightingLevel >= 70 ? 'success' : safetyScore.lightingLevel >= 50 ? 'warning' : 'error'}
                        />
                      </Grid>
                      <Grid item xs={6}>
                        <Box sx={{ display: 'flex', alignItems: 'center', mb: 0.5 }}>
                          <PeopleOutlined sx={{ fontSize: 14, mr: 0.5, color: 'text.secondary' }} />
                          <Typography variant="caption" sx={{ flex: 1 }}>Population</Typography>
                          <Typography variant="caption" color={safetyScore.populationDensity >= 70 ? 'success.main' : safetyScore.populationDensity >= 50 ? 'warning.main' : 'error.main'}>
                            {safetyScore.populationDensity}/100
                          </Typography>
                        </Box>
                        <LinearProgress
                          variant="determinate"
                          value={safetyScore.populationDensity}
                          sx={{ height: 4, borderRadius: 2, mb: 1 }}
                          color={safetyScore.populationDensity >= 70 ? 'success' : safetyScore.populationDensity >= 50 ? 'warning' : 'error'}
                        />
                      </Grid>
                      <Grid item xs={6}>
                        <Box sx={{ display: 'flex', alignItems: 'center', mb: 0.5 }}>
                          <AccessTimeOutlined sx={{ fontSize: 14, mr: 0.5, color: 'text.secondary' }} />
                          <Typography variant="caption" sx={{ flex: 1 }}>Time Factor</Typography>
                          <Typography variant="caption" color={safetyScore.timeFactor >= 70 ? 'success.main' : safetyScore.timeFactor >= 50 ? 'warning.main' : 'error.main'}>
                            {safetyScore.timeFactor}/100
                          </Typography>
                        </Box>
                        <LinearProgress
                          variant="determinate"
                          value={safetyScore.timeFactor}
                          sx={{ height: 4, borderRadius: 2, mb: 1 }}
                          color={safetyScore.timeFactor >= 70 ? 'success' : safetyScore.timeFactor >= 50 ? 'warning' : 'error'}
                        />
                      </Grid>
                    </Grid>
                  </Box>

                  <Divider sx={{ mb: 2 }} />

                  {/* Safety Explanation */}
                  {safetyScore.explanation && (
                    <Typography
                      variant="caption"
                      sx={{
                        color: 'text.primary',
                        lineHeight: 1.4,
                        display: 'block'
                      }}
                    >
                      {safetyScore.explanation}
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
