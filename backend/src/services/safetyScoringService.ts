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

import { CrimeDataService } from './crimeDataService';

// Real-time scoring cache interface
interface SafetyScoreCache {
  [locationKey: string]: {
    score: SafetyScore;
    timestamp: number;
    expiresAt: number;
  };
}

// Environmental factors for real-time scoring
interface EnvironmentalFactors {
  weather?: {
    condition: 'clear' | 'cloudy' | 'rainy' | 'foggy';
    visibility: number; // 0-100
    temperature: number;
  };
  events?: {
    nearbyEvents: string[];
    crowdDensity: 'low' | 'medium' | 'high';
    emergencyServices: boolean;
  };
  traffic?: {
    congestionLevel: number; // 0-100
    avgSpeed: number; // km/h
    incidents: number;
  };
}

export class SafetyScoringService {
  private crimeDataService: CrimeDataService;
  private scoreCache: SafetyScoreCache = {};
  private readonly CACHE_DURATION_MS = 5 * 60 * 1000; // 5 minutes
  private readonly REAL_TIME_UPDATE_INTERVAL = 30 * 1000; // 30 seconds
  private updateTimer?: NodeJS.Timeout;

  constructor() {
    this.crimeDataService = new CrimeDataService();
    this.startRealTimeUpdates();
  }

  /**
   * Start real-time safety score updates
   */
  private startRealTimeUpdates(): void {
    this.updateTimer = setInterval(() => {
      this.updateCachedScores();
    }, this.REAL_TIME_UPDATE_INTERVAL);
  }

  /**
   * Stop real-time updates (cleanup)
   */
  public stopRealTimeUpdates(): void {
    if (this.updateTimer) {
      clearInterval(this.updateTimer);
      this.updateTimer = undefined;
    }
  }

  /**
   * Get cached safety score or calculate new one with real-time factors
   * @param location Location to score
   * @param timeContext Current time context
   * @param forceRefresh Skip cache and recalculate
   * @returns Safety score with real-time updates
   */
  public async getRealTimeSafetyScore(
    location: Location,
    timeContext?: TimeContext,
    forceRefresh: boolean = false
  ): Promise<SafetyScore> {
    const locationKey = this.generateLocationKey(location);
    const now = Date.now();

    // Check cache first (unless force refresh)
    if (!forceRefresh && this.scoreCache[locationKey] && this.scoreCache[locationKey].expiresAt > now) {
      const cached = this.scoreCache[locationKey];

      // Apply real-time time factor updates to cached score
      const updatedScore = await this.applyRealTimeFactors(cached.score, location, timeContext);
      return updatedScore;
    }

    // Calculate new score with real-time factors
    const request: SafetyScoreRequest = {
      location,
      timeContext,
      factors: {
        includeCrimeData: true,
        includeEnvironmental: true,
        includeRealTime: true,
        includeHistorical: true
      }
    };

    const response = await this.calculateLocationSafety(request);
    const enhancedScore = await this.applyRealTimeFactors(response.safetyScore, location, timeContext);

    // Cache the enhanced score
    this.scoreCache[locationKey] = {
      score: enhancedScore,
      timestamp: now,
      expiresAt: now + this.CACHE_DURATION_MS
    };

    return enhancedScore;
  }

  /**
   * Update cached scores with current environmental factors
   */
  private async updateCachedScores(): Promise<void> {
    const now = Date.now();
    const currentTime = new Date().toISOString();

    for (const [locationKey, cached] of Object.entries(this.scoreCache)) {
      // Remove expired entries
      if (cached.expiresAt <= now) {
        delete this.scoreCache[locationKey];
        continue;
      }

      // Update time factors for active scores
      const location = this.parseLocationKey(locationKey);
      if (location) {
        const timeContext: TimeContext = { currentTime };
        const updatedScore = await this.applyRealTimeFactors(cached.score, location, timeContext);

        // Update cache with new time-sensitive factors
        this.scoreCache[locationKey] = {
          ...cached,
          score: updatedScore
        };
      }
    }
  }

  /**
   * Apply real-time environmental and time factors to safety score
   */
  private async applyRealTimeFactors(
    baseScore: SafetyScore,
    location: Location,
    timeContext?: TimeContext
  ): Promise<SafetyScore> {
    // Get current environmental factors
    const envFactors = await this.getCurrentEnvironmentalFactors(location);

    // Recalculate time factor with current time
    let updatedTimeFactor = baseScore.timeFactor;
    if (timeContext?.currentTime) {
      updatedTimeFactor = this.calculateTimeFactorScore(timeContext);
    }

    // Apply environmental adjustments
    let envAdjustment = 0;

    if (envFactors.weather) {
      envAdjustment += this.calculateWeatherAdjustment(envFactors.weather);
    }

    if (envFactors.traffic) {
      envAdjustment += this.calculateTrafficAdjustment(envFactors.traffic);
    }

    if (envFactors.events) {
      envAdjustment += this.calculateEventsAdjustment(envFactors.events);
    }

    // Recalculate overall score with real-time factors
    const realTimeOverall = Math.round(
      (baseScore.crimeRisk * 0.4) +
      (updatedTimeFactor * 0.3) +
      (baseScore.populationDensity * 0.2) +
      (baseScore.lightingLevel * 0.1) +
      envAdjustment
    );

    // Update factors array
    const updatedFactors = [...baseScore.factors];

    // Update or add time factor
    const timeFactorIndex = updatedFactors.findIndex(f => f.type === 'time');
    if (timeFactorIndex >= 0) {
      updatedFactors[timeFactorIndex] = {
        ...updatedFactors[timeFactorIndex],
        value: updatedTimeFactor,
        description: `Current time safety factor (${new Date().toLocaleTimeString('en-ZA')})`
      };
    }

    // Add environmental factors if significant
    if (Math.abs(envAdjustment) > 2) {
      updatedFactors.push({
        type: 'weather',
        impact: envAdjustment > 0 ? 'positive' : 'negative',
        weight: 0.05,
        description: 'Current environmental conditions',
        value: Math.round(50 + envAdjustment * 10)
      });
    }

    return {
      ...baseScore,
      overall: Math.max(0, Math.min(100, realTimeOverall)),
      timeFactor: updatedTimeFactor,
      explanation: this.generateRealTimeExplanation(baseScore, envFactors, updatedTimeFactor),
      lastCalculated: new Date(),
      factors: updatedFactors
    };
  }

  /**
   * Get current environmental factors for a location
   */
  private async getCurrentEnvironmentalFactors(location: Location): Promise<EnvironmentalFactors> {
    // In a real implementation, this would fetch from weather APIs, traffic APIs, events APIs
    // For hackathon, we'll simulate some realistic factors

    const currentHour = new Date().getHours();
    const factors: EnvironmentalFactors = {
      weather: {
        condition: this.simulateWeatherCondition(),
        visibility: this.simulateVisibility(),
        temperature: this.simulateTemperature()
      },
      traffic: {
        congestionLevel: this.simulateTrafficLevel(currentHour),
        avgSpeed: this.simulateAverageSpeed(currentHour),
        incidents: Math.random() > 0.95 ? 1 : 0 // 5% chance of traffic incident
      },
      events: {
        nearbyEvents: this.simulateNearbyEvents(location, currentHour),
        crowdDensity: this.simulateCrowdDensity(currentHour),
        emergencyServices: Math.random() > 0.98 // 2% chance of emergency activity
      }
    };

    return factors;
  }

  /**
   * Generate location cache key
   */
  private generateLocationKey(location: Location): string {
    return `${location.latitude.toFixed(4)},${location.longitude.toFixed(4)}`;
  }

  /**
   * Parse location from cache key
   */
  private parseLocationKey(locationKey: string): Location | null {
    const [lat, lng] = locationKey.split(',');
    if (lat && lng) {
      return {
        latitude: parseFloat(lat),
        longitude: parseFloat(lng)
      };
    }
    return null;
  }

  /**
   * Calculate weather impact on safety
   */
  private calculateWeatherAdjustment(weather: EnvironmentalFactors['weather']): number {
    if (!weather) return 0;

    let adjustment = 0;

    // Visibility impact
    if (weather.visibility < 50) {
      adjustment -= 5; // Poor visibility reduces safety
    } else if (weather.visibility > 80) {
      adjustment += 2; // Good visibility improves safety
    }

    // Weather condition impact
    switch (weather.condition) {
      case 'clear':
        adjustment += 1;
        break;
      case 'rainy':
        adjustment -= 3; // Rain reduces visibility and increases risk
        break;
      case 'foggy':
        adjustment -= 4; // Fog significantly impacts visibility
        break;
      case 'cloudy':
        break; // Neutral
    }

    // Temperature extremes
    if (weather.temperature < 5 || weather.temperature > 35) {
      adjustment -= 1; // Extreme temperatures may affect alertness
    }

    return adjustment;
  }

  /**
   * Calculate traffic impact on safety
   */
  private calculateTrafficAdjustment(traffic: EnvironmentalFactors['traffic']): number {
    if (!traffic) return 0;

    let adjustment = 0;

    // High congestion can provide safety through visibility but also stress
    if (traffic.congestionLevel > 70) {
      adjustment += 1; // More people around, but also stress
    } else if (traffic.congestionLevel < 20) {
      adjustment -= 1; // Too quiet might be concerning
    }

    // Active incidents reduce safety
    adjustment -= traffic.incidents * 2;

    return adjustment;
  }

  /**
   * Calculate events impact on safety
   */
  private calculateEventsAdjustment(events: EnvironmentalFactors['events']): number {
    if (!events) return 0;

    let adjustment = 0;

    // Emergency services nearby can be good or bad
    if (events.emergencyServices) {
      adjustment -= 3; // Indicates active incident, reduce safety
    }

    // Crowd density impact
    switch (events.crowdDensity) {
      case 'high':
        adjustment += 2; // More people generally safer
        break;
      case 'low':
        adjustment -= 1; // Too quiet can be concerning
        break;
      case 'medium':
        adjustment += 1; // Optimal crowd level
        break;
    }

    // Nearby events can improve safety through activity
    adjustment += Math.min(2, events.nearbyEvents.length);

    return adjustment;
  }

  /**
   * Generate real-time explanation
   */
  private generateRealTimeExplanation(
    baseScore: SafetyScore,
    envFactors: EnvironmentalFactors,
    currentTimeFactor: number
  ): string {
    let explanation = baseScore.explanation;

    // Add real-time context
    const timeChange = currentTimeFactor - baseScore.timeFactor;
    if (Math.abs(timeChange) > 5) {
      if (timeChange > 0) {
        explanation += ' Current time conditions have improved safety.';
      } else {
        explanation += ' Current time conditions have reduced safety.';
      }
    }

    // Add weather context
    if (envFactors.weather?.condition === 'rainy' || envFactors.weather?.visibility! < 50) {
      explanation += ' Current weather conditions may impact visibility.';
    }

    // Add traffic context
    if (envFactors.traffic?.incidents! > 0) {
      explanation += ' Traffic incidents nearby may affect navigation.';
    }

    return explanation;
  }

  // Simulation methods for hackathon demo
  private simulateWeatherCondition(): 'clear' | 'cloudy' | 'rainy' | 'foggy' {
    const rand = Math.random();
    if (rand < 0.6) return 'clear';
    if (rand < 0.8) return 'cloudy';
    if (rand < 0.95) return 'rainy';
    return 'foggy';
  }

  private simulateVisibility(): number {
    return Math.round(Math.random() * 40 + 60); // 60-100
  }

  private simulateTemperature(): number {
    return Math.round(Math.random() * 20 + 10); // 10-30°C (Cape Town range)
  }

  private simulateTrafficLevel(hour: number): number {
    // Rush hour simulation
    if ((hour >= 7 && hour <= 9) || (hour >= 17 && hour <= 19)) {
      return Math.round(Math.random() * 40 + 60); // 60-100
    }
    return Math.round(Math.random() * 60); // 0-60
  }

  private simulateAverageSpeed(hour: number): number {
    const baseSpeed = 40; // 40 km/h base
    if ((hour >= 7 && hour <= 9) || (hour >= 17 && hour <= 19)) {
      return baseSpeed - Math.round(Math.random() * 20); // Slower in rush hour
    }
    return baseSpeed + Math.round(Math.random() * 20);
  }

  private simulateNearbyEvents(location: Location, hour: number): string[] {
    const events: string[] = [];

    // Evening entertainment
    if (hour >= 18 && hour <= 23) {
      if (Math.random() > 0.7) events.push('Restaurant/bar activity');
      if (Math.random() > 0.9) events.push('Live music venue');
    }

    // Business hours
    if (hour >= 9 && hour <= 17) {
      if (Math.random() > 0.6) events.push('Business district activity');
    }

    // Weekend events (simplified simulation)
    if (new Date().getDay() === 6 || new Date().getDay() === 0) {
      if (Math.random() > 0.8) events.push('Weekend market/event');
    }

    return events;
  }

  private simulateCrowdDensity(hour: number): 'low' | 'medium' | 'high' {
    if (hour >= 2 && hour <= 6) return 'low';
    if ((hour >= 7 && hour <= 9) || (hour >= 17 && hour <= 20)) return 'high';
    return 'medium';
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
   * @param routeCharacteristics Route-specific characteristics that affect safety
   * @returns Route with updated safety scores
   */
  public async calculateRouteSafety(route: Route, timeContext?: TimeContext, routeCharacteristics?: any): Promise<Route> {
    const updatedSegments: RouteSegment[] = [];

    // Calculate safety for each route segment
    for (const segment of route.segments) {
      const midpoint = this.calculateMidpoint(segment.startLocation, segment.endLocation);
      const segmentSafety = await this.calculateLocationSafety({
        location: midpoint,
        timeContext,
        factors: { includeHistorical: true, includeCrimeData: true }
      });

      // Apply route characteristics to segment safety score
      let adjustedSafetyScore = { ...segmentSafety.safetyScore };
      if (routeCharacteristics) {
        adjustedSafetyScore = this.applyRouteCharacteristics(adjustedSafetyScore, routeCharacteristics, segment);
      }

      updatedSegments.push({
        ...segment,
        safetyScore: adjustedSafetyScore
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
    const safestSegment = segments.reduce((max, seg) => seg.safetyScore.overall > max.safetyScore.overall ? seg : max);

    // Analyze segment distribution
    const highRiskSegments = segments.filter(seg => seg.safetyScore.overall < 40).length;
    const moderateRiskSegments = segments.filter(seg => seg.safetyScore.overall >= 40 && seg.safetyScore.overall < 70).length;
    const safeSegments = segments.filter(seg => seg.safetyScore.overall >= 70).length;

    // Analyze specific risk factors
    const avgCrimeRisk = segments.reduce((sum, seg) => sum + seg.safetyScore.crimeRisk, 0) / segments.length;
    const avgLighting = segments.reduce((sum, seg) => sum + seg.safetyScore.lightingLevel, 0) / segments.length;
    const avgPopulation = segments.reduce((sum, seg) => sum + seg.safetyScore.populationDensity, 0) / segments.length;

    let explanation = `This route spans ${segments.length} segments with an average safety score of ${Math.round(avgSafety)}/100. `;

    // Overall safety assessment
    if (avgSafety >= 75) {
      explanation += 'Generally considered a safe route';
    } else if (avgSafety >= 60) {
      explanation += 'Moderate safety levels with some areas requiring attention';
    } else if (avgSafety >= 40) {
      explanation += 'Mixed safety conditions - exercise caution';
    } else {
      explanation += 'Multiple safety concerns identified - consider alternative routes';
    }

    // Segment breakdown
    if (highRiskSegments > 0) {
      explanation += `. ${highRiskSegments} segment${highRiskSegments > 1 ? 's' : ''} identified as high-risk`;
    }
    if (safeSegments > 0) {
      explanation += `. ${safeSegments} segment${safeSegments > 1 ? 's are' : ' is'} well-lit and populated`;
    }

    // Specific risk factors
    const riskFactors = [];
    if (avgCrimeRisk < 50) {
      riskFactors.push('elevated crime risk');
    }
    if (avgLighting < 50) {
      riskFactors.push('poor lighting conditions');
    }
    if (avgPopulation < 40) {
      riskFactors.push('isolated areas with low foot traffic');
    }

    if (riskFactors.length > 0) {
      explanation += `. Main concerns: ${riskFactors.join(', ')}`;
    }

    // Specific location warnings
    if (riskiestSegment.safetyScore.overall < 50) {
      explanation += `. Most cautious area: ${this.getSegmentDescription(riskiestSegment)} (safety score: ${riskiestSegment.safetyScore.overall}/100)`;
    }

    // Time-based recommendations
    const currentHour = new Date().getHours();
    if (avgLighting < 60 && (currentHour >= 19 || currentHour <= 6)) {
      explanation += '. Recommend daytime travel due to lighting concerns';
    }

    // Road type insights
    const roadTypes = segments.map(seg => seg.roadType);
    const hasHighways = roadTypes.includes('highway');
    const hasResidential = roadTypes.includes('residential');

    if (hasHighways && hasResidential) {
      explanation += '. Route includes both highway and residential sections';
    } else if (hasHighways) {
      explanation += '. Primarily highway route with good visibility';
    } else if (hasResidential) {
      explanation += '. Route through residential areas with variable lighting';
    }

    return explanation + '.';
  }

  private getSegmentDescription(segment: RouteSegment): string {
    const location = segment.endLocation.address || segment.startLocation.address;
    if (location) {
      return location;
    }

    const neighborhood = segment.endLocation.neighborhood || segment.startLocation.neighborhood;
    if (neighborhood) {
      return `${neighborhood} area`;
    }

    return `${segment.roadType} section`;
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
   * Apply route characteristics to adjust safety scores
   */
  private applyRouteCharacteristics(safetyScore: SafetyScore, characteristics: any, segment: RouteSegment): SafetyScore {
    const adjustedScore = { ...safetyScore };

    // Apply safety bias based on route type
    const safetyAdjustment = characteristics.safetyBias || 0;
    const lightingAdjustment = characteristics.lightingBias || 0;
    const populationAdjustment = characteristics.populationBias || 0;

    // Adjust individual scores with bounds checking
    adjustedScore.crimeRisk = Math.max(0, Math.min(100, adjustedScore.crimeRisk + safetyAdjustment));
    adjustedScore.lightingLevel = Math.max(0, Math.min(100, adjustedScore.lightingLevel + lightingAdjustment));
    adjustedScore.populationDensity = Math.max(0, Math.min(100, adjustedScore.populationDensity + populationAdjustment));

    // Apply road type specific adjustments
    if (segment.roadType === 'highway') {
      adjustedScore.populationDensity = Math.max(0, adjustedScore.populationDensity - 5); // Highways less populated
    } else if (segment.roadType === 'local') {
      adjustedScore.populationDensity = Math.min(100, adjustedScore.populationDensity + 8); // Local roads more populated
      adjustedScore.lightingLevel = Math.min(100, adjustedScore.lightingLevel + 5); // Better lighting
    }

    // Apply lighting level specific adjustments
    if (segment.lightingLevel === 'high') {
      adjustedScore.lightingLevel = Math.min(100, adjustedScore.lightingLevel + 10);
    } else if (segment.lightingLevel === 'low') {
      adjustedScore.lightingLevel = Math.max(0, adjustedScore.lightingLevel - 10);
    }

    // Recalculate overall score with weighted formula
    adjustedScore.overall = Math.round(
      (adjustedScore.crimeRisk * 0.4) +
      (adjustedScore.timeFactor * 0.3) +
      (adjustedScore.populationDensity * 0.2) +
      (adjustedScore.lightingLevel * 0.1)
    );

    // Update explanation to include route-specific information
    const routeType = characteristics.routeType || 'standard';
    adjustedScore.explanation = `${routeType.charAt(0).toUpperCase() + routeType.slice(1)} route characteristics applied. ${adjustedScore.explanation}`;

    return adjustedScore;
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