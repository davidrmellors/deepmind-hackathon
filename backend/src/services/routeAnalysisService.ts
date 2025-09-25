// Route Segment Safety Analysis Service
// Provides detailed analysis of route segments with granular safety scoring
// Based on data-model.md route segment analysis requirements

import {
  Route,
  RouteSegment,
  Location,
  SafetyScore,
  SafetyFactor,
  CrimeData,
  TimeContext,
  SafetyAlert,
  SafetyRecommendation
} from '../types/index.js';

import { SafetyScoringService } from './safetyScoringService.js';
import { CrimeDataService } from './crimeDataService.js';
import { AIExplanationService } from './aiExplanationService.js';

interface SegmentAnalysisResult {
  segment: RouteSegment;
  detailedAnalysis: {
    riskFactors: RiskFactor[];
    safetyRecommendations: SafetyRecommendation[];
    alternativeSegments?: RouteSegment[];
    confidenceLevel: number;
  };
  alerts: SafetyAlert[];
}

interface RiskFactor {
  type: 'crime_hotspot' | 'poor_visibility' | 'isolated_area' | 'high_traffic' | 'construction' | 'weather_impact';
  severity: 'low' | 'medium' | 'high' | 'critical';
  location: Location;
  description: string;
  mitigationSuggestions: string[];
  timeRelevant: boolean; // Whether this factor varies by time of day
}

interface RouteAnalysisOptions {
  includeAlternatives?: boolean;
  detailLevel: 'basic' | 'detailed' | 'comprehensive';
  realTimeFactors?: boolean;
  aiEnhanced?: boolean;
}

export class RouteAnalysisService {
  private safetyScoringService: SafetyScoringService;
  private crimeDataService: CrimeDataService;
  private aiExplanationService: AIExplanationService;

  // Segment analysis parameters
  private readonly SEGMENT_BUFFER_RADIUS = 200; // meters
  private readonly MIN_SEGMENT_LENGTH = 100; // meters
  private readonly RISK_THRESHOLD_HIGH = 40; // Safety score below this is high risk
  private readonly RISK_THRESHOLD_CRITICAL = 25; // Safety score below this is critical

  constructor() {
    this.safetyScoringService = new SafetyScoringService();
    this.crimeDataService = new CrimeDataService();
    this.aiExplanationService = new AIExplanationService();
  }

  /**
   * Analyze all segments of a route for safety concerns
   * @param route Route to analyze
   * @param timeContext Time context for analysis
   * @param options Analysis configuration options
   * @returns Detailed analysis of each route segment
   */
  public async analyzeRouteSegments(
    route: Route,
    timeContext?: TimeContext,
    options: RouteAnalysisOptions = { detailLevel: 'detailed' }
  ): Promise<SegmentAnalysisResult[]> {
    const results: SegmentAnalysisResult[] = [];

    // Ensure segments exist and are properly formed
    const validatedSegments = await this.validateAndOptimizeSegments(route.segments);

    for (const segment of validatedSegments) {
      const analysisResult = await this.analyzeSegment(segment, timeContext, options);
      results.push(analysisResult);
    }

    // Post-process for route-level insights
    const enhancedResults = await this.addRouteLevelInsights(results, route, timeContext);

    return enhancedResults;
  }

  /**
   * Identify the most concerning segments in a route
   * @param route Route to analyze
   * @param maxSegments Maximum number of segments to return
   * @returns Array of most concerning segments with detailed analysis
   */
  public async identifyHighRiskSegments(
    route: Route,
    maxSegments: number = 3,
    timeContext?: TimeContext
  ): Promise<SegmentAnalysisResult[]> {
    const allResults = await this.analyzeRouteSegments(route, timeContext, { detailLevel: 'comprehensive' });

    // Sort by risk level (lowest safety score first)
    const sortedResults = allResults.sort((a, b) =>
      a.segment.safetyScore.overall - b.segment.safetyScore.overall
    );

    // Filter for segments that meet risk thresholds
    const highRiskSegments = sortedResults.filter(result =>
      result.segment.safetyScore.overall < this.RISK_THRESHOLD_HIGH
    );

    return highRiskSegments.slice(0, maxSegments);
  }

  /**
   * Generate route-level safety recommendations based on segment analysis
   * @param route Route to analyze
   * @param timeContext Time context
   * @returns Array of actionable recommendations
   */
  public async generateRouteRecommendations(
    route: Route,
    timeContext?: TimeContext
  ): Promise<SafetyRecommendation[]> {
    const segmentResults = await this.analyzeRouteSegments(route, timeContext);
    const recommendations: SafetyRecommendation[] = [];

    // Analyze patterns across segments
    const criticalSegments = segmentResults.filter(r =>
      r.segment.safetyScore.overall < this.RISK_THRESHOLD_CRITICAL
    );

    const highRiskSegments = segmentResults.filter(r =>
      r.segment.safetyScore.overall < this.RISK_THRESHOLD_HIGH
    );

    // Critical route recommendations
    if (criticalSegments.length > 0) {
      recommendations.push({
        type: 'route_change',
        priority: 'critical',
        description: `Route contains ${criticalSegments.length} segment(s) with critical safety concerns`,
        actionable: true,
        estimatedImprovement: 40
      });
    }

    // Time-based recommendations
    const timeBasedRisks = segmentResults.filter(r =>
      r.detailedAnalysis.riskFactors.some(factor => factor.timeRelevant)
    );

    if (timeBasedRisks.length > 2 && timeContext) {
      const currentHour = new Date(timeContext.currentTime || new Date()).getHours();
      if (currentHour >= 19 || currentHour <= 6) {
        recommendations.push({
          type: 'time_change',
          priority: 'medium',
          description: 'Consider travelling during daylight hours for improved safety',
          actionable: true,
          estimatedImprovement: 20
        });
      }
    }

    // Lighting-based recommendations
    const poorLightingSegments = segmentResults.filter(r =>
      r.segment.safetyScore.lightingLevel < 40
    );

    if (poorLightingSegments.length > route.segments.length * 0.3) {
      recommendations.push({
        type: 'precaution',
        priority: 'medium',
        description: 'Route includes areas with poor lighting - carry additional lighting',
        actionable: true,
        estimatedImprovement: 15
      });
    }

    // Area-specific recommendations
    const isolatedSegments = segmentResults.filter(r =>
      r.detailedAnalysis.riskFactors.some(factor => factor.type === 'isolated_area')
    );

    if (isolatedSegments.length > 0) {
      recommendations.push({
        type: 'alert_contact',
        priority: 'high',
        description: 'Share location with trusted contacts when travelling through isolated areas',
        actionable: true,
        estimatedImprovement: 25
      });
    }

    return recommendations;
  }

  /**
   * Analyze a single route segment in detail
   */
  private async analyzeSegment(
    segment: RouteSegment,
    timeContext?: TimeContext,
    options: RouteAnalysisOptions = { detailLevel: 'detailed' }
  ): Promise<SegmentAnalysisResult> {
    // Calculate midpoint for segment analysis
    const midpoint = this.calculateSegmentMidpoint(segment);

    // Get updated safety score with real-time factors if requested
    let segmentSafetyScore = segment.safetyScore;
    if (options.realTimeFactors) {
      segmentSafetyScore = await this.safetyScoringService.getRealTimeSafetyScore(
        midpoint,
        timeContext
      );
    }

    // Get crime data for the segment area
    const nearbycrimeData = await this.crimeDataService.getCrimeDataByLocation(midpoint);

    // Identify risk factors
    const riskFactors = await this.identifySegmentRiskFactors(
      segment,
      segmentSafetyScore,
      nearbycrimeData,
      timeContext
    );

    // Generate segment-specific recommendations
    const segmentRecommendations = this.generateSegmentRecommendations(
      segment,
      riskFactors,
      segmentSafetyScore
    );

    // Generate alerts for immediate concerns
    const alerts = this.generateSegmentAlerts(segment, riskFactors, segmentSafetyScore);

    // Calculate confidence level based on available data
    const confidenceLevel = this.calculateSegmentConfidence(
      segmentSafetyScore,
      nearbycrimeData,
      riskFactors
    );

    // AI-enhanced analysis if requested
    if (options.aiEnhanced) {
      const aiInsights = await this.getAIEnhancedSegmentInsights(
        segment,
        riskFactors,
        timeContext
      );
      segmentRecommendations.push(...aiInsights);
    }

    const updatedSegment: RouteSegment = {
      ...segment,
      safetyScore: segmentSafetyScore
    };

    return {
      segment: updatedSegment,
      detailedAnalysis: {
        riskFactors,
        safetyRecommendations: segmentRecommendations,
        confidenceLevel
      },
      alerts
    };
  }

  /**
   * Identify specific risk factors for a segment
   */
  private async identifySegmentRiskFactors(
    segment: RouteSegment,
    safetyScore: SafetyScore,
    crimeData: CrimeData[],
    timeContext?: TimeContext
  ): Promise<RiskFactor[]> {
    const riskFactors: RiskFactor[] = [];

    // Crime hotspot analysis
    if (crimeData.length > 0) {
      const highCrimeAreas = crimeData.filter(data => data.riskLevel === 'high' || data.riskLevel === 'critical');

      for (const crimeArea of highCrimeAreas) {
        riskFactors.push({
          type: 'crime_hotspot',
          severity: crimeArea.riskLevel === 'critical' ? 'critical' : 'high',
          location: crimeArea.location,
          description: `High crime area: ${crimeArea.crimeStats.map(stat => stat.type).join(', ')}`,
          mitigationSuggestions: [
            'Stay alert and avoid walking alone',
            'Keep valuables secure and out of sight',
            'Use well-lit and populated routes when possible'
          ],
          timeRelevant: true
        });
      }
    }

    // Poor visibility analysis
    if (safetyScore.lightingLevel < 40) {
      riskFactors.push({
        type: 'poor_visibility',
        severity: safetyScore.lightingLevel < 20 ? 'high' : 'medium',
        location: this.calculateSegmentMidpoint(segment),
        description: `Poor lighting conditions (${safetyScore.lightingLevel}/100)`,
        mitigationSuggestions: [
          'Carry flashlight or use phone light',
          'Travel during daylight hours if possible',
          'Wear reflective or bright colored clothing'
        ],
        timeRelevant: true
      });
    }

    // Isolation analysis
    if (safetyScore.populationDensity < 30) {
      riskFactors.push({
        type: 'isolated_area',
        severity: safetyScore.populationDensity < 15 ? 'high' : 'medium',
        location: this.calculateSegmentMidpoint(segment),
        description: 'Low population density area with limited foot traffic',
        mitigationSuggestions: [
          'Share location with trusted contacts',
          'Consider traveling with others',
          'Have emergency contacts readily available'
        ],
        timeRelevant: false
      });
    }

    // Road type specific risks
    if (segment.roadType === 'highway' && safetyScore.overall < 60) {
      riskFactors.push({
        type: 'high_traffic',
        severity: 'medium',
        location: segment.startLocation,
        description: 'High-speed traffic area with safety concerns',
        mitigationSuggestions: [
          'Stay aware of traffic conditions',
          'Use designated crossings only',
          'Keep away from road edge when possible'
        ],
        timeRelevant: true
      });
    }

    // Time-based risk analysis
    if (timeContext?.currentTime) {
      const hour = new Date(timeContext.currentTime).getHours();
      if ((hour >= 22 || hour <= 5) && safetyScore.timeFactor < 50) {
        riskFactors.push({
          type: 'poor_visibility',
          severity: safetyScore.timeFactor < 30 ? 'high' : 'medium',
          location: this.calculateSegmentMidpoint(segment),
          description: 'Late night/early morning travel with reduced safety',
          mitigationSuggestions: [
            'Consider postponing travel to daylight hours',
            'Travel in groups when possible',
            'Stay in well-lit, populated areas'
          ],
          timeRelevant: true
        });
      }
    }

    return riskFactors;
  }

  /**
   * Generate segment-specific safety recommendations
   */
  private generateSegmentRecommendations(
    segment: RouteSegment,
    riskFactors: RiskFactor[],
    safetyScore: SafetyScore
  ): SafetyRecommendation[] {
    const recommendations: SafetyRecommendation[] = [];

    // High-priority recommendations based on risk factors
    const criticalRisks = riskFactors.filter(r => r.severity === 'critical');
    const highRisks = riskFactors.filter(r => r.severity === 'high');

    if (criticalRisks.length > 0) {
      recommendations.push({
        type: 'route_change',
        priority: 'critical',
        description: `Avoid this segment: ${criticalRisks[0].description}`,
        actionable: true,
        estimatedImprovement: 50
      });
    }

    if (highRisks.length > 0 && safetyScore.overall < 40) {
      recommendations.push({
        type: 'precaution',
        priority: 'high',
        description: `Exercise extreme caution: ${highRisks[0].description}`,
        actionable: true,
        estimatedImprovement: 20
      });
    }

    // Specific mitigation recommendations
    const uniqueSuggestions = new Set<string>();
    riskFactors.forEach(factor => {
      factor.mitigationSuggestions.forEach(suggestion => uniqueSuggestions.add(suggestion));
    });

    Array.from(uniqueSuggestions).slice(0, 2).forEach(suggestion => {
      recommendations.push({
        type: 'precaution',
        priority: 'medium',
        description: suggestion,
        actionable: true,
        estimatedImprovement: 10
      });
    });

    return recommendations;
  }

  /**
   * Generate alerts for immediate safety concerns
   */
  private generateSegmentAlerts(
    segment: RouteSegment,
    riskFactors: RiskFactor[],
    safetyScore: SafetyScore
  ): SafetyAlert[] {
    const alerts: SafetyAlert[] = [];

    // Critical risk alerts
    const criticalRisks = riskFactors.filter(r => r.severity === 'critical');
    criticalRisks.forEach(risk => {
      alerts.push({
        id: `segment-alert-${segment.id}-${Date.now()}`,
        type: 'high_crime_area',
        severity: 'critical',
        message: `CRITICAL: ${risk.description}`,
        location: risk.location,
        timestamp: new Date(),
        acknowledged: false
      });
    });

    // High risk alerts
    if (safetyScore.overall < this.RISK_THRESHOLD_CRITICAL) {
      alerts.push({
        id: `segment-alert-${segment.id}-safety-${Date.now()}`,
        type: 'high_crime_area',
        severity: 'critical',
        message: `Segment has very low safety score (${safetyScore.overall}/100)`,
        location: this.calculateSegmentMidpoint(segment),
        timestamp: new Date(),
        acknowledged: false
      });
    }

    // Poor lighting alerts
    if (safetyScore.lightingLevel < 25) {
      alerts.push({
        id: `segment-alert-${segment.id}-lighting-${Date.now()}`,
        type: 'poor_lighting',
        severity: 'warning',
        message: 'Very poor lighting conditions in this segment',
        location: this.calculateSegmentMidpoint(segment),
        timestamp: new Date(),
        acknowledged: false
      });
    }

    return alerts;
  }

  /**
   * Calculate confidence level for segment analysis
   */
  private calculateSegmentConfidence(
    safetyScore: SafetyScore,
    crimeData: CrimeData[],
    riskFactors: RiskFactor[]
  ): number {
    let confidence = 70; // Base confidence

    // More crime data increases confidence
    confidence += Math.min(20, crimeData.length * 5);

    // Safety score confidence affects segment confidence
    confidence = Math.min(confidence, safetyScore.confidenceLevel + 10);

    // More risk factors identified = better analysis
    confidence += Math.min(10, riskFactors.length * 2);

    return Math.max(0, Math.min(100, confidence));
  }

  /**
   * Get AI-enhanced insights for segment analysis
   */
  private async getAIEnhancedSegmentInsights(
    segment: RouteSegment,
    riskFactors: RiskFactor[],
    timeContext?: TimeContext
  ): Promise<SafetyRecommendation[]> {
    try {
      const segmentMidpoint = this.calculateSegmentMidpoint(segment);
      const tips = await this.aiExplanationService.generateContextualSafetyTips(
        segmentMidpoint,
        timeContext,
        { preferredTravelMode: 'walking' } // Default for segment analysis
      );

      return tips.slice(0, 2); // Limit to top 2 AI suggestions
    } catch (error) {
      console.error('AI enhancement failed for segment:', error);
      return [];
    }
  }

  /**
   * Validate and optimize route segments for analysis
   */
  private async validateAndOptimizeSegments(segments: RouteSegment[]): Promise<RouteSegment[]> {
    const validatedSegments: RouteSegment[] = [];

    for (const segment of segments) {
      // Skip very short segments that don't provide meaningful analysis
      if (segment.distance < this.MIN_SEGMENT_LENGTH) {
        continue;
      }

      // Ensure segment has proper safety score
      if (!segment.safetyScore || segment.safetyScore.overall === 0) {
        const midpoint = this.calculateSegmentMidpoint(segment);
        const updatedSafetyScore = await this.safetyScoringService.getRealTimeSafetyScore(midpoint);

        validatedSegments.push({
          ...segment,
          safetyScore: updatedSafetyScore
        });
      } else {
        validatedSegments.push(segment);
      }
    }

    return validatedSegments;
  }

  /**
   * Add route-level insights based on segment analysis
   */
  private async addRouteLevelInsights(
    segmentResults: SegmentAnalysisResult[],
    route: Route,
    timeContext?: TimeContext
  ): Promise<SegmentAnalysisResult[]> {
    // Identify patterns across segments
    const totalSegments = segmentResults.length;
    const highRiskCount = segmentResults.filter(r => r.segment.safetyScore.overall < this.RISK_THRESHOLD_HIGH).length;
    const criticalRiskCount = segmentResults.filter(r => r.segment.safetyScore.overall < this.RISK_THRESHOLD_CRITICAL).length;

    // Add route context to the most concerning segment
    if (criticalRiskCount > 0 || highRiskCount > totalSegments * 0.3) {
      const worstSegment = segmentResults.reduce((worst, current) =>
        current.segment.safetyScore.overall < worst.segment.safetyScore.overall ? current : worst
      );

      // Add route-level context to worst segment's recommendations
      worstSegment.detailedAnalysis.safetyRecommendations.unshift({
        type: 'route_change',
        priority: 'high',
        description: `This route has ${criticalRiskCount} critical and ${highRiskCount} high-risk segments out of ${totalSegments} total`,
        actionable: true,
        estimatedImprovement: 30
      });
    }

    return segmentResults;
  }

  /**
   * Calculate midpoint of a route segment
   */
  private calculateSegmentMidpoint(segment: RouteSegment): Location {
    const midLat = (segment.startLocation.latitude + segment.endLocation.latitude) / 2;
    const midLng = (segment.startLocation.longitude + segment.endLocation.longitude) / 2;

    return {
      latitude: midLat,
      longitude: midLng,
      address: `Midpoint of ${segment.id}`,
      neighborhood: segment.startLocation.neighborhood
    };
  }
}

export default RouteAnalysisService;