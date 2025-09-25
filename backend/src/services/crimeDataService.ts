import { CrimeData, CrimeStatistic, Location, HourlyPattern, EconomicData } from '../types';
import { crimeDataGenerator } from '../data/crime-generator';

export class CrimeDataService {
  private crimeDataCache: Map<string, CrimeData> = new Map();
  private gridDataCache: Map<string, CrimeData[]> = new Map();
  private initialized: boolean = false;

  constructor() {
    this.initializeData();
  }

  /**
   * Initialize crime data cache with synthetic Cape Town data
   */
  private async initializeData(): Promise<void> {
    if (this.initialized) return;

    try {
      // Generate synthetic crime data for Cape Town
      const crimeDataSet = crimeDataGenerator.generateCrimeData();

      // Cache by ID and grid cell
      for (const crimeData of crimeDataSet) {
        this.crimeDataCache.set(crimeData.id, crimeData);

        // Group by grid cell for spatial queries
        if (!this.gridDataCache.has(crimeData.gridCell)) {
          this.gridDataCache.set(crimeData.gridCell, []);
        }
        this.gridDataCache.get(crimeData.gridCell)!.push(crimeData);
      }

      this.initialized = true;
      console.log(`CrimeDataService initialized with ${crimeDataSet.length} crime data entries`);
    } catch (error) {
      console.error('Failed to initialize crime data:', error);
      throw new Error('Crime data initialization failed');
    }
  }

  /**
   * Get crime data by ID
   */
  public async getCrimeDataById(id: string): Promise<CrimeData | null> {
    await this.initializeData();
    return this.crimeDataCache.get(id) || null;
  }

  /**
   * Get crime data for a specific location
   */
  public async getCrimeDataByLocation(location: Location): Promise<CrimeData[]> {
    await this.initializeData();

    const gridCell = this.getGridCellId(location.latitude, location.longitude);
    return this.gridDataCache.get(gridCell) || [];
  }

  /**
   * Get crime data for a specific grid cell
   */
  public async getCrimeDataByGridCell(gridId: string): Promise<CrimeData[]> {
    await this.initializeData();
    return this.gridDataCache.get(gridId) || [];
  }

  /**
   * Get crime statistics filtered by area and type
   */
  public async getCrimeStatistics(
    area?: string,
    crimeType?: 'violent' | 'property' | 'petty' | 'vehicular',
    timeframe?: '1month' | '3months' | '6months' | '1year'
  ): Promise<CrimeStatistic[]> {
    await this.initializeData();

    let allCrimeData: CrimeData[] = [];

    if (area) {
      // Filter by area/neighborhood
      allCrimeData = Array.from(this.crimeDataCache.values()).filter(data =>
        data.location.neighborhood?.toLowerCase().includes(area.toLowerCase()) ||
        data.location.address?.toLowerCase().includes(area.toLowerCase())
      );
    } else {
      allCrimeData = Array.from(this.crimeDataCache.values());
    }

    // Apply timeframe filter
    if (timeframe) {
      const cutoffDate = this.getTimeframeCutoff(timeframe);
      allCrimeData = allCrimeData.filter(data =>
        data.timeframe.start >= cutoffDate
      );
    }

    // Extract and filter crime statistics
    const crimeStats: CrimeStatistic[] = [];
    for (const data of allCrimeData) {
      let stats = data.crimeStats;
      if (crimeType) {
        stats = stats.filter(stat => stat.type === crimeType);
      }
      crimeStats.push(...stats);
    }

    return crimeStats;
  }

  /**
   * Calculate risk level for a specific location
   */
  public async calculateRiskLevel(location: Location): Promise<'low' | 'medium' | 'high' | 'critical'> {
    const crimeData = await this.getCrimeDataByLocation(location);

    if (crimeData.length === 0) {
      return 'low'; // Default to low risk if no data available
    }

    // Calculate weighted risk score based on incident counts and severity
    let totalRiskScore = 0;
    let totalWeight = 0;

    for (const data of crimeData) {
      for (const stat of data.crimeStats) {
        const weight = this.getCrimeTypeWeight(stat.type);
        totalRiskScore += stat.incidentCount * stat.severity * weight;
        totalWeight += weight;
      }
    }

    if (totalWeight === 0) return 'low';

    const averageRiskScore = totalRiskScore / totalWeight;

    // Convert numeric score to risk level
    if (averageRiskScore >= 80) return 'critical';
    if (averageRiskScore >= 60) return 'high';
    if (averageRiskScore >= 30) return 'medium';
    return 'low';
  }

  /**
   * Get crime pattern for specific location and time
   */
  public async getCrimePatternByTime(location: Location, hour: number): Promise<number> {
    const crimeData = await this.getCrimeDataByLocation(location);

    if (crimeData.length === 0) return 0;

    // Calculate average crime probability for the given hour
    let totalProbability = 0;
    let count = 0;

    for (const data of crimeData) {
      for (const stat of data.crimeStats) {
        const hourKey = hour.toString();
        if (stat.timePattern[hourKey] !== undefined) {
          totalProbability += stat.timePattern[hourKey];
          count++;
        }
      }
    }

    return count > 0 ? totalProbability / count : 0;
  }

  /**
   * Get all areas with their risk levels
   */
  public async getAllAreasWithRiskLevels(): Promise<Array<{ area: string; riskLevel: string; incidentCount: number }>> {
    await this.initializeData();

    const areaRisks: Array<{ area: string; riskLevel: string; incidentCount: number }> = [];
    const processedAreas = new Set<string>();

    for (const crimeData of this.crimeDataCache.values()) {
      const area = crimeData.location.neighborhood || crimeData.location.address || 'Unknown';

      if (processedAreas.has(area)) continue;
      processedAreas.add(area);

      const totalIncidents = crimeData.crimeStats.reduce((sum, stat) => sum + stat.incidentCount, 0);

      areaRisks.push({
        area,
        riskLevel: crimeData.riskLevel,
        incidentCount: totalIncidents
      });
    }

    return areaRisks.sort((a, b) => b.incidentCount - a.incidentCount);
  }

  /**
   * Get nearby high-risk areas for alerts
   */
  public async getNearbyRiskyAreas(location: Location, radiusKm: number = 2): Promise<CrimeData[]> {
    await this.initializeData();

    const riskyAreas: CrimeData[] = [];

    for (const crimeData of this.crimeDataCache.values()) {
      if (crimeData.riskLevel === 'high' || crimeData.riskLevel === 'critical') {
        const distance = this.calculateDistance(
          location.latitude,
          location.longitude,
          crimeData.location.latitude,
          crimeData.location.longitude
        );

        if (distance <= radiusKm) {
          riskyAreas.push(crimeData);
        }
      }
    }

    return riskyAreas;
  }

  /**
   * Generate a grid cell ID for a given location
   */
  private getGridCellId(latitude: number, longitude: number): string {
    // Create 1km x 1km grid cells
    const latGrid = Math.floor((latitude + 34.5) * 100); // Normalize for Cape Town
    const lngGrid = Math.floor((longitude - 18.0) * 100);
    return `CT_${latGrid}_${lngGrid}`;
  }

  /**
   * Get weight for different crime types (for risk calculation)
   */
  private getCrimeTypeWeight(crimeType: string): number {
    const weights = {
      violent: 1.0,     // Highest weight
      vehicular: 0.8,   // High weight
      property: 0.6,    // Medium weight
      petty: 0.4        // Lower weight
    };
    return weights[crimeType as keyof typeof weights] || 0.5;
  }

  /**
   * Calculate cutoff date for timeframe filtering
   */
  private getTimeframeCutoff(timeframe: string): Date {
    const now = new Date();
    const cutoff = new Date(now);

    switch (timeframe) {
      case '1month':
        cutoff.setMonth(now.getMonth() - 1);
        break;
      case '3months':
        cutoff.setMonth(now.getMonth() - 3);
        break;
      case '6months':
        cutoff.setMonth(now.getMonth() - 6);
        break;
      case '1year':
        cutoff.setFullYear(now.getFullYear() - 1);
        break;
      default:
        cutoff.setMonth(now.getMonth() - 6); // Default to 6 months
    }

    return cutoff;
  }

  /**
   * Calculate distance between two points in kilometers
   */
  private calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
    const R = 6371; // Earth's radius in kilometers
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a =
      Math.sin(dLat/2) * Math.sin(dLat/2) +
      Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
      Math.sin(dLon/2) * Math.sin(dLon/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    return R * c;
  }
}

// Export singleton instance
export const crimeDataService = new CrimeDataService();