import { Router, Request, Response } from 'express';
import {
  SafetyScoreRequest,
  SafetyScoreResponse,
  SafetyScore,
  SafetyAlert,
  CrimeData,
  Location,
  ErrorResponse,
  ScoringMetadata
} from '../types';
import { SafetyScoringService } from '../services/safetyScoringService';
import { CrimeDataService } from '../services/crimeDataService';
import { LocationService } from '../services/locationService';
import { v4 as uuidv4 } from 'uuid';

const router = Router();

const safetyScoringService = new SafetyScoringService();
const crimeDataService = new CrimeDataService();
const locationService = new LocationService();

/**
 * POST /api/safety/score
 * Calculate safety score for location or route
 */
router.post('/score', async (req: Request, res: Response) => {
  try {
    const startTime = Date.now();
    const scoreRequest: SafetyScoreRequest = req.body;

    // Validate request
    if (!scoreRequest.location) {
      const error: ErrorResponse = {
        error: 'MISSING_REQUIRED_FIELDS',
        message: 'Location is required for safety scoring',
        timestamp: new Date(),
        requestId: req.headers['x-request-id'] as string || uuidv4()
      };
      return res.status(400).json(error);
    }

    // Validate Cape Town bounds
    if (!locationService.isWithinCapeTownBounds(scoreRequest.location.latitude, scoreRequest.location.longitude)) {
      const error: ErrorResponse = {
        error: 'INVALID_LOCATION',
        message: 'Location is outside Cape Town metropolitan area',
        details: { bounds: 'Cape Town: lat(-34.5, -33.5), lng(18.0, 19.0)' },
        timestamp: new Date(),
        requestId: req.headers['x-request-id'] as string || uuidv4()
      };
      return res.status(400).json(error);
    }

    // Calculate safety score
    const timeContext = scoreRequest.timeContext?.currentTime ?
      new Date(scoreRequest.timeContext.currentTime) : new Date();

    const response = await safetyScoringService.calculateLocationSafety(scoreRequest);

    // Generate recommendations based on safety score
    const recommendations = generateSafetyRecommendations(response.safetyScore);

    // Generate alerts if necessary
    const alerts = generateSafetyAlerts(response.safetyScore, scoreRequest.location);

    const processingTime = Date.now() - startTime;

    const metadata: ScoringMetadata = {
      calculationTime: processingTime,
      dataSourcesUsed: ['synthetic_crime_data', 'time_patterns', 'location_analysis'],
      aiModelVersion: '1.0.0',
      confidenceFactors: {
        crimeData: response.safetyScore.confidenceLevel,
        timeContext: scoreRequest.timeContext ? 95 : 80,
        locationAccuracy: 90
      }
    };

    const finalResponse: SafetyScoreResponse = {
      safetyScore: response.safetyScore,
      recommendations,
      alerts,
      metadata
    };

    res.status(200).json(finalResponse);

  } catch (error) {
    console.error('Safety scoring error:', error);
    const errorResponse: ErrorResponse = {
      error: 'SCORING_FAILED',
      message: 'Failed to calculate safety score',
      details: { error: error instanceof Error ? error.message : 'Unknown error' },
      timestamp: new Date(),
      requestId: req.headers['x-request-id'] as string || uuidv4()
    };
    res.status(500).json(errorResponse);
  }
});

/**
 * GET /api/safety/area/:gridId
 * Get safety data for grid area
 */
router.get('/area/:gridId', async (req: Request, res: Response) => {
  try {
    const { gridId } = req.params;
    const timeRange = req.query.timeRange as string || '24h';

    // Validate grid ID format (CT_lat_lng_cell)
    const gridIdPattern = /^CT_\d+_\d+_\d+$/;
    if (!gridIdPattern.test(gridId)) {
      const error: ErrorResponse = {
        error: 'INVALID_GRID_ID',
        message: 'Grid ID must follow format: CT_lat_lng_cell (e.g., CT_33_18_001)',
        timestamp: new Date(),
        requestId: req.headers['x-request-id'] as string || uuidv4()
      };
      return res.status(400).json(error);
    }

    // Get crime data for the grid cell
    const crimeDataArray = await crimeDataService.getCrimeDataByGridCell(gridId);
    if (!crimeDataArray || crimeDataArray.length === 0) {
      const error: ErrorResponse = {
        error: 'GRID_NOT_FOUND',
        message: `No data available for grid cell ${gridId}`,
        timestamp: new Date(),
        requestId: req.headers['x-request-id'] as string || uuidv4()
      };
      return res.status(404).json(error);
    }

    // Use the first crime data entry for the grid cell
    const crimeData = crimeDataArray[0];

    // Calculate current safety metrics for the area
    const centerLocation: Location = {
      latitude: crimeData.location.latitude,
      longitude: crimeData.location.longitude,
      address: crimeData.location.address
    };

    const safetyResponse = await safetyScoringService.calculateLocationSafety({ location: centerLocation });
    const safetyScore = safetyResponse.safetyScore;

    const areaSafetyData = {
      gridId,
      location: crimeData.location,
      timeRange,
      safetyScore,
      crimeStatistics: crimeData.crimeStats,
      riskLevel: crimeData.riskLevel,
      populationDensity: crimeData.populationDensity,
      economicIndicators: crimeData.economicIndicators,
      trends: analyzeTrends(crimeData, timeRange),
      lastUpdated: crimeData.lastUpdated,
      dataConfidence: safetyScore.confidenceLevel
    };

    res.status(200).json(areaSafetyData);

  } catch (error) {
    console.error('Area safety data error:', error);
    const errorResponse: ErrorResponse = {
      error: 'AREA_DATA_FAILED',
      message: 'Failed to retrieve area safety data',
      details: { error: error instanceof Error ? error.message : 'Unknown error' },
      timestamp: new Date(),
      requestId: req.headers['x-request-id'] as string || uuidv4()
    };
    res.status(500).json(errorResponse);
  }
});

/**
 * GET /api/safety/alerts
 * Get current safety alerts for Cape Town
 */
router.get('/alerts', async (req: Request, res: Response) => {
  try {
    const location = req.query.location as string;
    const radius = parseInt(req.query.radius as string) || 5000; // Default 5km radius
    const severity = req.query.severity as string;

    let alerts: SafetyAlert[] = [];

    // Generate sample alerts based on current conditions
    if (location) {
      const [lat, lng] = location.split(',').map(Number);
      if (isNaN(lat) || isNaN(lng)) {
        const error: ErrorResponse = {
          error: 'INVALID_LOCATION_FORMAT',
          message: 'Location must be in format: latitude,longitude',
          timestamp: new Date(),
          requestId: req.headers['x-request-id'] as string || uuidv4()
        };
        return res.status(400).json(error);
      }

      // Validate Cape Town bounds
      const queryLocation: Location = { latitude: lat, longitude: lng };
      if (!locationService.isWithinCapeTownBounds(queryLocation.latitude, queryLocation.longitude)) {
        const error: ErrorResponse = {
          error: 'INVALID_LOCATION',
          message: 'Location is outside Cape Town metropolitan area',
          timestamp: new Date(),
          requestId: req.headers['x-request-id'] as string || uuidv4()
        };
        return res.status(400).json(error);
      }

      alerts = await generateLocationBasedAlerts(queryLocation, radius);
    } else {
      alerts = await generateCityWideAlerts();
    }

    // Filter by severity if specified
    if (severity && ['info', 'warning', 'critical'].includes(severity)) {
      alerts = alerts.filter(alert => alert.severity === severity);
    }

    const response = {
      alerts,
      metadata: {
        generatedAt: new Date(),
        location: location ? { latitude: parseFloat(location.split(',')[0]), longitude: parseFloat(location.split(',')[1]) } : null,
        radius: location ? radius : null,
        count: alerts.length,
        lastUpdated: new Date()
      }
    };

    res.status(200).json(response);

  } catch (error) {
    console.error('Safety alerts error:', error);
    const errorResponse: ErrorResponse = {
      error: 'ALERTS_FAILED',
      message: 'Failed to retrieve safety alerts',
      details: { error: error instanceof Error ? error.message : 'Unknown error' },
      timestamp: new Date(),
      requestId: req.headers['x-request-id'] as string || uuidv4()
    };
    res.status(500).json(errorResponse);
  }
});

/**
 * GET /api/safety/crime-data
 * Get Cape Town crime statistics
 */
router.get('/crime-data', async (req: Request, res: Response) => {
  try {
    const area = req.query.area as string;
    const timeframe = req.query.timeframe as string || '30d';
    const includeStats = req.query.includeStats !== 'false';

    let crimeData: CrimeData[] = [];

    if (area) {
      // Get crime data for specific area by searching grid cells
      // For now, we'll get all areas and filter - this should be improved
      const allAreas = await crimeDataService.getAllAreasWithRiskLevels();
      const matchingArea = allAreas.find(a => a.area.toLowerCase().includes(area.toLowerCase()));
      if (matchingArea) {
        // This is a simplified approach - in production, we'd need better area-to-grid mapping
        crimeData = [];
      }
    } else {
      // Get all Cape Town crime data - for now returning empty array
      // This endpoint should be refactored to use a proper aggregation approach
      crimeData = [];
    }

    // Process and aggregate statistics if requested
    const response = {
      crimeData: includeStats ? crimeData : crimeData.map(data => ({
        id: data.id,
        location: data.location,
        gridCell: data.gridCell,
        riskLevel: data.riskLevel,
        lastUpdated: data.lastUpdated
      })),
      summary: {
        totalAreas: crimeData.length,
        riskDistribution: calculateRiskDistribution(crimeData),
        mostRecentUpdate: crimeData.reduce((latest, data) =>
          data.lastUpdated > latest ? data.lastUpdated : latest, new Date(0)
        ),
        dataSource: 'synthetic',
        coverageArea: 'Cape Town Metropolitan Area'
      },
      metadata: {
        generatedAt: new Date(),
        timeframe,
        includeStatistics: includeStats,
        apiVersion: '1.0.0'
      }
    };

    res.status(200).json(response);

  } catch (error) {
    console.error('Crime data error:', error);
    const errorResponse: ErrorResponse = {
      error: 'CRIME_DATA_FAILED',
      message: 'Failed to retrieve crime data',
      details: { error: error instanceof Error ? error.message : 'Unknown error' },
      timestamp: new Date(),
      requestId: req.headers['x-request-id'] as string || uuidv4()
    };
    res.status(500).json(errorResponse);
  }
});

// Helper functions

function generateSafetyRecommendations(safetyScore: SafetyScore) {
  const recommendations = [];

  if (safetyScore.overall < 50) {
    recommendations.push({
      type: 'route_change' as const,
      priority: 'high' as const,
      description: 'Consider alternative route - current path has elevated safety risks',
      actionable: true,
      estimatedImprovement: 25
    });
  }

  if (safetyScore.timeFactor < 60) {
    recommendations.push({
      type: 'time_change' as const,
      priority: 'medium' as const,
      description: 'Travel during daylight hours for improved safety',
      actionable: true,
      estimatedImprovement: 15
    });
  }

  if (safetyScore.lightingLevel < 40) {
    recommendations.push({
      type: 'precaution' as const,
      priority: 'medium' as const,
      description: 'Area has limited lighting - carry flashlight or use well-lit paths',
      actionable: true,
      estimatedImprovement: 10
    });
  }

  return recommendations;
}

function generateSafetyAlerts(safetyScore: SafetyScore, location: Location): SafetyAlert[] {
  const alerts: SafetyAlert[] = [];

  if (safetyScore.overall < 30) {
    alerts.push({
      id: uuidv4(),
      type: 'high_crime_area',
      severity: 'critical',
      message: 'High crime area detected - exercise extreme caution',
      location,
      timestamp: new Date(),
      acknowledged: false
    });
  }

  if (safetyScore.lightingLevel < 30) {
    alerts.push({
      id: uuidv4(),
      type: 'poor_lighting',
      severity: 'warning',
      message: 'Poor lighting conditions in this area',
      location,
      timestamp: new Date(),
      acknowledged: false
    });
  }

  return alerts;
}

async function generateLocationBasedAlerts(location: Location, radius: number): Promise<SafetyAlert[]> {
  const alerts: SafetyAlert[] = [];
  const currentHour = new Date().getHours();

  // Generate contextual alerts based on time and location
  if (currentHour >= 20 || currentHour <= 6) {
    alerts.push({
      id: uuidv4(),
      type: 'poor_lighting',
      severity: 'warning',
      message: 'Reduced visibility during nighttime hours - stay in well-lit areas',
      location,
      timestamp: new Date(),
      acknowledged: false
    });
  }

  // Get area crime data and generate alerts using CrimeDataService
  const nearbyRiskyAreas = await crimeDataService.getNearbyRiskyAreas(location, radius);
  for (const crimeData of nearbyRiskyAreas.slice(0, 3)) { // Limit to first 3 nearby areas
    if (crimeData.riskLevel === 'high') {
      alerts.push({
        id: uuidv4(),
        type: 'high_crime_area',
        severity: 'warning',
        message: `Elevated crime activity reported in ${crimeData.location.neighborhood || 'nearby area'}`,
        location: crimeData.location,
        timestamp: new Date(),
        acknowledged: false
      });
    }
  }

  return alerts;
}

async function generateCityWideAlerts(): Promise<SafetyAlert[]> {
  const alerts: SafetyAlert[] = [];
  const currentHour = new Date().getHours();

  // General city-wide alerts
  if (currentHour >= 22 || currentHour <= 5) {
    alerts.push({
      id: uuidv4(),
      type: 'poor_lighting',
      severity: 'info',
      message: 'Late night hours - exercise additional caution when traveling',
      location: { latitude: -33.9249, longitude: 18.4241, address: 'Cape Town City Center' },
      timestamp: new Date(),
      acknowledged: false
    });
  }

  return alerts;
}

function analyzeTrends(crimeData: CrimeData, timeRange: string) {
  // Simple trend analysis based on crime statistics
  const totalIncidents = crimeData.crimeStats.reduce((sum, stat) => sum + stat.incidentCount, 0);

  return {
    trend: totalIncidents > 20 ? 'increasing' : totalIncidents > 10 ? 'stable' : 'decreasing',
    riskChange: totalIncidents > 20 ? '+15%' : totalIncidents > 10 ? '0%' : '-10%',
    timeframe: timeRange,
    mostCommonCrime: crimeData.crimeStats.reduce((max, stat) =>
      stat.incidentCount > max.incidentCount ? stat : max, crimeData.crimeStats[0]
    )?.type || 'unknown'
  };
}

function calculateRiskDistribution(crimeData: CrimeData[]) {
  const distribution = { low: 0, medium: 0, high: 0, critical: 0 };

  crimeData.forEach(data => {
    distribution[data.riskLevel]++;
  });

  const total = crimeData.length;
  return {
    low: `${Math.round(distribution.low / total * 100)}%`,
    medium: `${Math.round(distribution.medium / total * 100)}%`,
    high: `${Math.round(distribution.high / total * 100)}%`,
    critical: `${Math.round(distribution.critical / total * 100)}%`
  };
}

export default router;