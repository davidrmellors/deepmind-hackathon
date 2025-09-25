// SafetyScore Calculation Algorithm Service
// Implements composite safety scoring with time-based factors
// Based on research.md algorithm: SafetyScore = (CrimeRiskScore * 0.4) + (TimeFactorScore * 0.3) + (PopulationDensityScore * 0.2) + (LightingScore * 0.1)

import {
  SafetyScore,
  SafetyFactor,
  Location,
  CrimeData,
  SafetyScoreRequest,
  SafetyScoreResponse,
  TimeContext,
  ScoringMetadata,
  SafetyRecommendation,
  Route,
  RouteSegment
} from '../types/index.js';

import { CrimeDataService } from './crimeDataService.js';

export class SafetyScoringService {
  private crimeDataService: CrimeDataService;

  constructor() {
    this.crimeDataService = new CrimeDataService();
  }

  /**
   * Calculate safety score for a single location
   * @param request Safety scoring request with location and context
   * @returns Complete safety score response with recommendations
   */
  public async calculateLocationSafety(request: SafetyScoreRequest): Promise<SafetyScoreResponse> {
    const startTime = Date.now();
    const { location, timeContext, userContext } = request;

    try {
      // Get crime data for location
      const crimeDataArray = await this.crimeDataService.getCrimeDataByLocation(location);
      const crimeData = crimeDataArray.length > 0 ? crimeDataArray[0] : null;

      // Calculate individual score components
      const crimeRiskScore = this.calculateCrimeRiskScore(crimeData, userContext?.travelMode);
      const timeFactorScore = this.calculateTimeFactorScore(timeContext, crimeData);
      const populationDensityScore = this.calculatePopulationDensityScore(crimeData);
      const lightingScore = this.calculateLightingScore(location, timeContext, crimeData);

      // Apply composite algorithm with weights from research.md
      const overall = Math.round(
        (crimeRiskScore * 0.4) +
        (timeFactorScore * 0.3) +
        (populationDensityScore * 0.2) +
        (lightingScore * 0.1)
      );

      // Generate safety factors for explanation
      const factors = this.generateSafetyFactors(crimeRiskScore, timeFactorScore, populationDensityScore, lightingScore, crimeData);

      // Calculate confidence based on data quality
      const confidenceLevel = this.calculateConfidenceLevel(crimeData, factors);

      // Generate AI explanation
      const explanation = this.generateSafetyExplanation(overall, factors, crimeData);

      const safetyScore: SafetyScore = {
        overall,
        crimeRisk: crimeRiskScore,
        timeFactor: timeFactorScore,
        populationDensity: populationDensityScore,
        lightingLevel: lightingScore,
        historicalIncidents: crimeData?.crimeStats.reduce((sum: number, stat: any) => sum + stat.incidentCount, 0) || 0,
        confidenceLevel,
        explanation,
        lastCalculated: new Date(),
        factors
      };

      // Generate recommendations based on score
      const recommendations = this.generateRecommendations(safetyScore, crimeData, timeContext);

      // Generate alerts if needed
      const alerts = this.generateSafetyAlerts(safetyScore, location, crimeData);

      const metadata: ScoringMetadata = {
        calculationTime: Date.now() - startTime,
        dataSourcesUsed: [crimeData?.dataSource || 'synthetic'],
        confidenceFactors: {
          crimeData: crimeData?.crimeStats[0]?.confidence || 85,
          timeAnalysis: timeContext ? 90 : 70,
          locationData: location.address ? 95 : 80
        }
      };

      return {
        safetyScore,
        recommendations,
        alerts,
        metadata
      };
    } catch (error: any) {
      console.error('Error calculating location safety:', error);
      throw new Error(`Safety calculation failed: ${error?.message || 'Unknown error'}`);
    }
  }

  /**
   * Calculate safety scores for an entire route
   * @param route Route with segments to analyze
   * @param timeContext Time context for the journey
   * @returns Route with updated safety scores
   */
  public async calculateRouteSafety(route: Route, timeContext?: TimeContext): Promise<Route> {
    const updatedSegments: RouteSegment[] = [];

    // Calculate safety for each route segment
    for (const segment of route.segments) {
      const midpoint = this.calculateMidpoint(segment.startLocation, segment.endLocation);
      const segmentSafety = await this.calculateLocationSafety({
        location: midpoint,
        timeContext,
        factors: { includeHistorical: true, includeCrimeData: true }
      });

      updatedSegments.push({
        ...segment,
        safetyScore: segmentSafety.safetyScore
      });
    }

    // Calculate overall route safety as weighted average by segment distance
    const totalDistance = updatedSegments.reduce((sum, seg) => sum + seg.distance, 0);
    const weightedSafetyScore = updatedSegments.reduce((sum, seg) => {
      const weight = seg.distance / totalDistance;
      return sum + (seg.safetyScore.overall * weight);
    }, 0);

    // Create composite route safety score
    const routeSafetyScore: SafetyScore = {
      overall: Math.round(weightedSafetyScore),
      crimeRisk: Math.round(updatedSegments.reduce((sum, seg) => sum + seg.safetyScore.crimeRisk, 0) / updatedSegments.length),
      timeFactor: Math.round(updatedSegments.reduce((sum, seg) => sum + seg.safetyScore.timeFactor, 0) / updatedSegments.length),
      populationDensity: Math.round(updatedSegments.reduce((sum, seg) => sum + seg.safetyScore.populationDensity, 0) / updatedSegments.length),
      lightingLevel: Math.round(updatedSegments.reduce((sum, seg) => sum + seg.safetyScore.lightingLevel, 0) / updatedSegments.length),
      historicalIncidents: updatedSegments.reduce((sum, seg) => sum + seg.safetyScore.historicalIncidents, 0),
      confidenceLevel: Math.round(updatedSegments.reduce((sum, seg) => sum + seg.safetyScore.confidenceLevel, 0) / updatedSegments.length),
      explanation: this.generateRouteSafetyExplanation(updatedSegments),
      lastCalculated: new Date(),
      factors: this.aggregateRouteFactors(updatedSegments)
    };

    return {
      ...route,
      safetyScore: routeSafetyScore,
      segments: updatedSegments,
      lastUpdated: new Date()
    };
  }

  /**
   * Calculate crime risk score (0-100, higher is safer)
   */
  private calculateCrimeRiskScore(crimeData: CrimeData | null, travelMode?: string): number {
    if (!crimeData) return 70; // Default moderate safety

    const totalIncidents = crimeData.crimeStats.reduce((sum, stat) => sum + stat.incidentCount, 0);
    const maxIncidentsForArea = 50; // Threshold for high-crime areas

    // Convert incident count to safety score (inverted scale)
    let baseScore = Math.max(0, 100 - (totalIncidents / maxIncidentsForArea) * 100);

    // Apply travel mode adjustments
    if (travelMode === 'walking' && crimeData.crimeStats.some(stat => stat.type === 'petty')) {
      baseScore -= 15; // Walking is more vulnerable to petty crime
    } else if (travelMode === 'driving' && crimeData.crimeStats.some(stat => stat.type === 'vehicular')) {
      baseScore -= 10; // Driving vulnerable to vehicle-related crime
    }

    // Apply risk level multiplier
    const riskMultipliers = { low: 1.0, medium: 0.8, high: 0.6, critical: 0.4 };
    baseScore *= riskMultipliers[crimeData.riskLevel];

    return Math.max(0, Math.min(100, Math.round(baseScore)));
  }

  /**
   * Calculate time-based safety factor (0-100, higher is safer)
   */
  private calculateTimeFactorScore(timeContext?: TimeContext, crimeData?: CrimeData | null): number {
    if (!timeContext?.currentTime) return 80; // Default daytime safety

    const currentHour = new Date(timeContext.currentTime).getHours();

    // Base time-of-day safety scores
    let timeScore: number;
    if (currentHour >= 6 && currentHour < 18) {
      timeScore = 90; // Daytime
    } else if (currentHour >= 18 && currentHour < 22) {
      timeScore = 75; // Early evening
    } else if (currentHour >= 22 || currentHour < 6) {
      timeScore = 50; // Night hours
    } else {
      timeScore = 60; // Late evening/early morning
    }

    // Adjust based on crime patterns if available
    if (crimeData) {
      const avgNightCrime = crimeData.crimeStats.reduce((sum, stat) => {
        const nightHours = Object.keys(stat.timePattern).filter(hour =>
          parseInt(hour) >= 22 || parseInt(hour) < 6
        );
        const nightIncidents = nightHours.reduce((nightSum, hour) =>
          nightSum + (stat.timePattern[hour] || 0), 0
        );
        return sum + nightIncidents;
      }, 0) / crimeData.crimeStats.length;

      if (avgNightCrime > 0.3 && (currentHour >= 22 || currentHour < 6)) {
        timeScore -= 20; // High night crime area
      }
    }

    // Weekend adjustments
    const dayOfWeek = new Date(timeContext.currentTime).getDay();
    if ((dayOfWeek === 5 || dayOfWeek === 6) && currentHour >= 20) {
      timeScore -= 5; // Weekend nights slightly riskier
    }

    return Math.max(0, Math.min(100, Math.round(timeScore)));
  }

  /**
   * Calculate population density safety score (0-100, higher is safer)
   */
  private calculatePopulationDensityScore(crimeData: CrimeData | null): number {
    if (!crimeData) return 70;

    const density = crimeData.populationDensity;
    const businessDensity = crimeData.economicIndicators.businessDensity;

    // Sweet spot for safety: moderate population with good business activity
    let densityScore: number;
    if (density < 1000) {
      densityScore = 60; // Too isolated
    } else if (density < 5000) {
      densityScore = 85; // Good residential density
    } else if (density < 15000) {
      densityScore = 90; // Optimal density
    } else {
      densityScore = 70; // Very high density can increase crime
    }

    // Business density adds safety through activity and surveillance
    const businessBonus = Math.min(20, businessDensity * 2);
    densityScore += businessBonus;

    return Math.max(0, Math.min(100, Math.round(densityScore)));
  }

  /**
   * Calculate lighting safety score (0-100, higher is safer)
   */
  private calculateLightingScore(location: Location, timeContext?: TimeContext, crimeData?: CrimeData | null): number {
    let baseScore = 80; // Default moderate lighting

    // Use location safety metrics if available
    if (location.safetyMetrics?.lightingQuality) {
      baseScore = location.safetyMetrics.lightingQuality;
    }

    // Use crime data lighting infrastructure
    if (crimeData?.economicIndicators.lightingInfrastructure) {
      baseScore = Math.max(baseScore, crimeData.economicIndicators.lightingInfrastructure);
    }

    // Time-based adjustments
    if (timeContext?.currentTime) {
      const currentHour = new Date(timeContext.currentTime).getHours();
      if (currentHour >= 19 || currentHour < 6) {
        // Nighttime - lighting becomes critical
        baseScore = Math.min(baseScore, 95); // Cap at 95 even with good lighting at night
      } else {
        // Daytime - lighting less critical
        baseScore = Math.max(baseScore, 85);
      }
    }

    return Math.max(0, Math.min(100, Math.round(baseScore)));
  }

  /**
   * Generate detailed safety factors for explanation
   */
  private generateSafetyFactors(crimeRisk: number, timeFactor: number, populationDensity: number, lighting: number, crimeData: CrimeData | null): SafetyFactor[] {
    const factors: SafetyFactor[] = [
      {
        type: 'crime',
        impact: crimeRisk >= 70 ? 'positive' : crimeRisk >= 40 ? 'neutral' : 'negative',
        weight: 0.4,
        description: `Crime risk level: ${crimeData?.riskLevel || 'moderate'}`,
        value: crimeRisk
      },
      {
        type: 'time',
        impact: timeFactor >= 70 ? 'positive' : timeFactor >= 40 ? 'neutral' : 'negative',
        weight: 0.3,
        description: `Time-based safety factor`,
        value: timeFactor
      },
      {
        type: 'population',
        impact: populationDensity >= 70 ? 'positive' : populationDensity >= 40 ? 'neutral' : 'negative',
        weight: 0.2,
        description: `Area activity and population density`,
        value: populationDensity
      },
      {
        type: 'lighting',
        impact: lighting >= 70 ? 'positive' : lighting >= 40 ? 'neutral' : 'negative',
        weight: 0.1,
        description: `Street lighting and visibility`,
        value: lighting
      }
    ];

    return factors;
  }

  /**
   * Calculate overall confidence in the safety score
   */
  private calculateConfidenceLevel(crimeData: CrimeData | null, factors: SafetyFactor[]): number {
    let confidence = 70; // Base confidence

    if (crimeData) {
      const avgCrimeConfidence = crimeData.crimeStats.reduce((sum, stat) => sum + stat.confidence, 0) / crimeData.crimeStats.length;
      confidence = Math.max(confidence, avgCrimeConfidence);

      // Data recency affects confidence
      const daysSinceUpdate = (Date.now() - new Date(crimeData.lastUpdated).getTime()) / (1000 * 60 * 60 * 24);
      if (daysSinceUpdate > 30) confidence -= 10;
      if (daysSinceUpdate > 90) confidence -= 20;
    }

    // Factor reliability affects confidence
    const factorReliability = factors.filter(f => f.value > 0).length / factors.length;
    confidence *= factorReliability;

    return Math.max(0, Math.min(100, Math.round(confidence)));
  }

  /**
   * Generate human-readable safety explanation
   */
  private generateSafetyExplanation(overall: number, factors: SafetyFactor[], crimeData: CrimeData | null): string {
    let explanation = '';

    if (overall >= 80) {
      explanation = 'This area shows good safety indicators';
    } else if (overall >= 60) {
      explanation = 'This area has moderate safety with some concerns';
    } else if (overall >= 40) {
      explanation = 'This area has notable safety risks that require attention';
    } else {
      explanation = 'This area has significant safety concerns';
    }

    const positiveFactors = factors.filter(f => f.impact === 'positive');
    const negativeFactors = factors.filter(f => f.impact === 'negative');

    if (positiveFactors.length > 0) {
      const topPositive = positiveFactors.reduce((max, f) => f.value > max.value ? f : max);
      explanation += `. Positive factors include ${topPositive.description.toLowerCase()}`;
    }

    if (negativeFactors.length > 0) {
      const topNegative = negativeFactors.reduce((min, f) => f.value < min.value ? f : min);
      explanation += `. Main concerns are ${topNegative.description.toLowerCase()}`;
    }

    if (crimeData && crimeData.riskLevel === 'high') {
      explanation += '. This area has elevated crime statistics';
    }

    return explanation + '.';
  }

  /**
   * Generate route-level safety explanation
   */
  private generateRouteSafetyExplanation(segments: RouteSegment[]): string {
    const avgSafety = segments.reduce((sum, seg) => sum + seg.safetyScore.overall, 0) / segments.length;
    const riskiestSegment = segments.reduce((min, seg) => seg.safetyScore.overall < min.safetyScore.overall ? seg : min);

    let explanation = `Route safety varies across ${segments.length} segments`;

    if (avgSafety >= 75) {
      explanation += ' with generally good safety levels';
    } else if (avgSafety >= 50) {
      explanation += ' with moderate safety levels';
    } else {
      explanation += ' with some safety concerns';
    }

    if (riskiestSegment.safetyScore.overall < 50) {
      explanation += `. Most cautious area is near ${riskiestSegment.endLocation.address || 'segment endpoint'}`;
    }

    return explanation + '.';
  }

  /**
   * Aggregate safety factors across route segments
   */
  private aggregateRouteFactors(segments: RouteSegment[]): SafetyFactor[] {
    const factorTypes = ['crime', 'time', 'population', 'lighting'] as const;

    return factorTypes.map(type => {
      const relevantFactors = segments.flatMap(seg =>
        seg.safetyScore.factors.filter(f => f.type === type)
      );

      const avgValue = relevantFactors.reduce((sum, f) => sum + f.value, 0) / relevantFactors.length;
      const avgWeight = relevantFactors.reduce((sum, f) => sum + f.weight, 0) / relevantFactors.length;

      return {
        type,
        impact: avgValue >= 70 ? 'positive' : avgValue >= 40 ? 'neutral' : 'negative',
        weight: avgWeight,
        description: `Route average ${type} factor`,
        value: Math.round(avgValue)
      };
    });
  }

  /**
   * Generate safety recommendations based on score
   */
  private generateRecommendations(safetyScore: SafetyScore, crimeData: CrimeData | null, timeContext?: TimeContext): SafetyRecommendation[] {
    const recommendations: SafetyRecommendation[] = [];

    if (safetyScore.overall < 40) {
      recommendations.push({
        type: 'route_change',
        priority: 'high',
        description: 'Consider an alternative route with better safety ratings',
        actionable: true,
        estimatedImprovement: 30
      });
    }

    if (safetyScore.timeFactor < 50 && timeContext) {
      recommendations.push({
        type: 'time_change',
        priority: 'medium',
        description: 'Travel during daylight hours for improved safety',
        actionable: true,
        estimatedImprovement: 25
      });
    }

    if (safetyScore.lightingLevel < 40) {
      recommendations.push({
        type: 'precaution',
        priority: 'medium',
        description: 'Use additional lighting (flashlight/phone) in poorly lit areas',
        actionable: true,
        estimatedImprovement: 15
      });
    }

    if (crimeData?.riskLevel === 'critical') {
      recommendations.push({
        type: 'alert_contact',
        priority: 'critical',
        description: 'Share location with trusted contacts and avoid travel alone',
        actionable: true,
        estimatedImprovement: 20
      });
    }

    return recommendations;
  }

  /**
   * Generate safety alerts if needed
   */
  private generateSafetyAlerts(safetyScore: SafetyScore, location: Location, crimeData: CrimeData | null): import('../types/index.js').SafetyAlert[] {
    const alerts: import('../types/index.js').SafetyAlert[] = [];

    if (safetyScore.overall < 30) {
      alerts.push({
        id: `alert-${Date.now()}-high-risk`,
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
        id: `alert-${Date.now()}-lighting`,
        type: 'poor_lighting',
        severity: 'warning',
        message: 'Poor lighting conditions - consider alternative timing or route',
        location,
        timestamp: new Date(),
        acknowledged: false
      });
    }

    return alerts;
  }

  /**
   * Helper method to calculate midpoint between two locations
   */
  private calculateMidpoint(start: Location, end: Location): Location {
    const midLat = (start.latitude + end.latitude) / 2;
    const midLng = (start.longitude + end.longitude) / 2;

    return {
      latitude: midLat,
      longitude: midLng,
      address: `Midpoint between ${start.address || 'start'} and ${end.address || 'end'}`
    };
  }
}

export default SafetyScoringService;