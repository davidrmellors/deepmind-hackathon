/**
 * Synthetic Cape Town Crime Data Generator
 * Provides deterministic, yet realistic, crime statistics derived from SAPS trends.
 */
import {
  CrimeData,
  CrimeStatistic,
  EconomicData,
  HourlyPattern,
  DateRange,
  LocationType
} from '../types';

export type CrimeRiskLevel = 'low' | 'medium' | 'high' | 'critical';
export type CrimeType = CrimeStatistic['type'];
export type CrimeTimeframe = '1month' | '3months' | '6months' | '1year';

interface CrimeAreaConfig {
  name: string;
  latitude: number;
  longitude: number;
  landUse: LocationType;
  riskLevel: CrimeRiskLevel;
  populationDensity: number;
  baseIncidentRates: Record<CrimeType, number>; // totals per six-month timeframe
  economic: EconomicData;
}

interface CrimeTypePattern {
  subtypes: string[];
  severityRange: [number, number];
  hourlyProfile: number[];
}

export interface CrimeDatasetMetadata {
  lastUpdated: string;
  dataQuality: number;
  source: string;
  dataVersion: string;
  timeframe?: CrimeTimeframe;
}

export interface CrimeDataTrend {
  overall: 'improving' | 'stable' | 'worsening';
  changePercent: number;
}

export const SUPPORTED_CRIME_TIMEFRAMES: readonly CrimeTimeframe[] = [
  '1month',
  '3months',
  '6months',
  '1year'
] as const;

const DEFAULT_TIMEFRAME: CrimeTimeframe = '6months';
export const DEFAULT_CRIME_TIMEFRAME = DEFAULT_TIMEFRAME;

const DEFAULT_METADATA_SOURCE = 'SafeRoute AI synthetic dataset (hackathon)';

const TIMEFRAME_MULTIPLIERS: Record<CrimeTimeframe, number> = {
  '1month': 1 / 6,
  '3months': 0.5,
  '6months': 1,
  '1year': 2
};

const TIMEFRAME_DAYS: Record<CrimeTimeframe, number> = {
  '1month': 30,
  '3months': 90,
  '6months': 180,
  '1year': 365
};

const RISK_CONFIDENCE_BASE: Record<CrimeRiskLevel, number> = {
  low: 94,
  medium: 88,
  high: 82,
  critical: 78
};

const CRIME_TYPE_PATTERNS: Record<CrimeType, CrimeTypePattern> = {
  violent: {
    subtypes: ['assault', 'robbery', 'hijacking', 'murder', 'sexual_offense'],
    severityRange: [6, 10],
    hourlyProfile: [8, 6, 5, 4, 3, 3, 4, 5, 6, 5, 4, 4, 5, 5, 6, 7, 8, 9, 10, 12, 11, 10, 9, 8]
  },
  property: {
    subtypes: ['burglary', 'theft', 'shoplifting', 'vandalism', 'fraud'],
    severityRange: [3, 7],
    hourlyProfile: [2, 1, 1, 1, 2, 3, 5, 8, 10, 12, 11, 9, 8, 7, 8, 9, 8, 6, 5, 4, 3, 3, 2, 2]
  },
  petty: {
    subtypes: ['pickpocketing', 'bag_snatching', 'bicycle_theft', 'mobile_theft', 'begging'],
    severityRange: [1, 4],
    hourlyProfile: [1, 1, 1, 2, 3, 5, 8, 12, 11, 9, 7, 6, 8, 7, 6, 7, 9, 11, 10, 8, 5, 3, 2, 1]
  },
  vehicular: {
    subtypes: ['car_theft', 'car_breaking', 'hijacking', 'smash_grab', 'traffic_crime'],
    severityRange: [4, 8],
    hourlyProfile: [2, 1, 1, 2, 3, 5, 9, 13, 12, 8, 6, 5, 6, 5, 6, 8, 10, 12, 11, 9, 6, 4, 3, 2]
  }
};

const CAPE_TOWN_AREA_CONFIG: CrimeAreaConfig[] = [
  {
    name: 'V&A Waterfront',
    latitude: -33.9249,
    longitude: 18.4241,
    landUse: 'commercial',
    riskLevel: 'low',
    populationDensity: 2800,
    baseIncidentRates: { violent: 26, property: 210, petty: 170, vehicular: 52 },
    economic: { averageIncome: 580000, unemploymentRate: 6, businessDensity: 118, lightingInfrastructure: 94 }
  },
  {
    name: 'Camps Bay',
    latitude: -33.9588,
    longitude: 18.4718,
    landUse: 'residential',
    riskLevel: 'low',
    populationDensity: 2400,
    baseIncidentRates: { violent: 24, property: 185, petty: 150, vehicular: 48 },
    economic: { averageIncome: 540000, unemploymentRate: 7, businessDensity: 88, lightingInfrastructure: 92 }
  },
  {
    name: 'Sea Point',
    latitude: -33.9248,
    longitude: 18.3917,
    landUse: 'residential',
    riskLevel: 'low',
    populationDensity: 3300,
    baseIncidentRates: { violent: 34, property: 260, petty: 210, vehicular: 70 },
    economic: { averageIncome: 420000, unemploymentRate: 9, businessDensity: 96, lightingInfrastructure: 90 }
  },
  {
    name: 'City Bowl',
    latitude: -33.9258,
    longitude: 18.4232,
    landUse: 'commercial',
    riskLevel: 'medium',
    populationDensity: 5200,
    baseIncidentRates: { violent: 88, property: 520, petty: 410, vehicular: 138 },
    economic: { averageIncome: 310000, unemploymentRate: 12, businessDensity: 134, lightingInfrastructure: 88 }
  },
  {
    name: 'Woodstock',
    latitude: -33.9333,
    longitude: 18.4500,
    landUse: 'industrial',
    riskLevel: 'medium',
    populationDensity: 6100,
    baseIncidentRates: { violent: 92, property: 550, petty: 430, vehicular: 142 },
    economic: { averageIncome: 210000, unemploymentRate: 16, businessDensity: 84, lightingInfrastructure: 74 }
  },
  {
    name: 'Observatory',
    latitude: -33.9333,
    longitude: 18.4833,
    landUse: 'residential',
    riskLevel: 'medium',
    populationDensity: 4700,
    baseIncidentRates: { violent: 70, property: 480, petty: 340, vehicular: 110 },
    economic: { averageIncome: 260000, unemploymentRate: 14, businessDensity: 76, lightingInfrastructure: 78 }
  },
  {
    name: "Mitchell's Plain",
    latitude: -34.0500,
    longitude: 18.6000,
    landUse: 'residential',
    riskLevel: 'high',
    populationDensity: 11200,
    baseIncidentRates: { violent: 260, property: 640, petty: 540, vehicular: 210 },
    economic: { averageIncome: 110000, unemploymentRate: 28, businessDensity: 38, lightingInfrastructure: 56 }
  },
  {
    name: 'Khayelitsha',
    latitude: -34.0333,
    longitude: 18.6833,
    landUse: 'residential',
    riskLevel: 'high',
    populationDensity: 13400,
    baseIncidentRates: { violent: 280, property: 680, petty: 560, vehicular: 230 },
    economic: { averageIncome: 95000, unemploymentRate: 32, businessDensity: 32, lightingInfrastructure: 48 }
  },
  {
    name: 'Gugulethu',
    latitude: -33.9833,
    longitude: 18.5833,
    landUse: 'residential',
    riskLevel: 'high',
    populationDensity: 10800,
    baseIncidentRates: { violent: 240, property: 620, petty: 520, vehicular: 205 },
    economic: { averageIncome: 102000, unemploymentRate: 30, businessDensity: 36, lightingInfrastructure: 52 }
  },
  {
    name: 'Nyanga',
    latitude: -34.0000,
    longitude: 18.5670,
    landUse: 'residential',
    riskLevel: 'critical',
    populationDensity: 14200,
    baseIncidentRates: { violent: 320, property: 720, petty: 600, vehicular: 240 },
    economic: { averageIncome: 90000, unemploymentRate: 35, businessDensity: 30, lightingInfrastructure: 44 }
  },
  {
    name: 'Philippi',
    latitude: -34.0000,
    longitude: 18.5333,
    landUse: 'industrial',
    riskLevel: 'high',
    populationDensity: 9800,
    baseIncidentRates: { violent: 210, property: 560, petty: 470, vehicular: 190 },
    economic: { averageIncome: 125000, unemploymentRate: 26, businessDensity: 42, lightingInfrastructure: 58 }
  },
  {
    name: 'Claremont',
    latitude: -33.9839,
    longitude: 18.4655,
    landUse: 'commercial',
    riskLevel: 'medium',
    populationDensity: 6200,
    baseIncidentRates: { violent: 68, property: 460, petty: 320, vehicular: 118 },
    economic: { averageIncome: 280000, unemploymentRate: 11, businessDensity: 102, lightingInfrastructure: 86 }
  }
];

const RISK_TREND_BASELINE: Record<CrimeRiskLevel, number> = (() => {
  const accumulator: Record<CrimeRiskLevel, { total: number; count: number }> = {
    low: { total: 0, count: 0 },
    medium: { total: 0, count: 0 },
    high: { total: 0, count: 0 },
    critical: { total: 0, count: 0 }
  };

  CAPE_TOWN_AREA_CONFIG.forEach(area => {
    const areaTotal = Object.values(area.baseIncidentRates).reduce((sum, value) => sum + value, 0);
    accumulator[area.riskLevel].total += areaTotal;
    accumulator[area.riskLevel].count += 1;
  });

  return {
    low: Math.round(accumulator.low.total / Math.max(1, accumulator.low.count)),
    medium: Math.round(accumulator.medium.total / Math.max(1, accumulator.medium.count)),
    high: Math.round(accumulator.high.total / Math.max(1, accumulator.high.count)),
    critical: Math.round(accumulator.critical.total / Math.max(1, accumulator.critical.count))
  };
})();

export class CrimeDataGenerator {
  public generateCrimeData(
    referenceDate: Date = new Date(),
    timeframe: CrimeTimeframe = DEFAULT_TIMEFRAME
  ): CrimeData[] {
    const baseline = this.buildDataset(referenceDate);
    if (timeframe === DEFAULT_TIMEFRAME) {
      return baseline;
    }
    return this.applyTimeframe(baseline, timeframe, referenceDate);
  }

  public getCrimeDataByArea(
    area: string,
    referenceDate: Date = new Date(),
    timeframe: CrimeTimeframe = DEFAULT_TIMEFRAME
  ): CrimeData | null {
    const target = this.normalizeArea(area);
    const dataset = this.generateCrimeData(referenceDate, timeframe);
    const match = dataset.find(data => {
      const neighborhood = data.location.neighborhood?.toLowerCase() || '';
      const address = data.location.address?.toLowerCase() || '';
      return neighborhood.includes(target) || address.includes(target);
    });

    return match ? this.cloneCrimeData(match) : null;
  }

  public getCrimeDataByGridId(
    gridId: string,
    referenceDate: Date = new Date(),
    timeframe: CrimeTimeframe = DEFAULT_TIMEFRAME
  ): CrimeData | null {
    const dataset = this.generateCrimeData(referenceDate, timeframe);
    const match = dataset.find(data => data.gridCell === gridId);
    return match ? this.cloneCrimeData(match) : null;
  }

  public getCrimeDataByCoordinates(
    latitude: number,
    longitude: number,
    radiusKm = 1,
    referenceDate: Date = new Date(),
    timeframe: CrimeTimeframe = DEFAULT_TIMEFRAME
  ): CrimeData[] {
    const dataset = this.generateCrimeData(referenceDate, timeframe);
    return dataset
      .filter(data => {
        const distance = this.calculateDistance(
          latitude,
          longitude,
          data.location.latitude,
          data.location.longitude
        );
        return distance <= radiusKm * 1000;
      })
      .map(data => this.cloneCrimeData(data));
  }

  public validateCapeTownLocation(lat: number, lng: number): boolean {
    return lat >= -34.5 && lat <= -33.5 && lng >= 18.0 && lng <= 19.0;
  }

  public getAreaRiskLevel(
    lat: number,
    lng: number,
    referenceDate: Date = new Date()
  ): CrimeRiskLevel {
    const dataset = this.generateCrimeData(referenceDate);
    let closest: CrimeRiskLevel = 'medium';
    let shortestDistance = Number.POSITIVE_INFINITY;

    dataset.forEach(data => {
      const distance = this.calculateDistance(lat, lng, data.location.latitude, data.location.longitude);
      if (distance < shortestDistance) {
        shortestDistance = distance;
        closest = data.riskLevel;
      }
    });

    return closest;
  }

  public applyTimeframe(
    dataset: CrimeData[],
    timeframe: CrimeTimeframe,
    referenceDate: Date = new Date()
  ): CrimeData[] {
    const multiplier = TIMEFRAME_MULTIPLIERS[timeframe] ?? 1;
    const range = this.createTimeframeRange(timeframe, referenceDate);

    return dataset.map(data => {
      const clone = this.cloneCrimeData(data);
      clone.timeframe = range;
      clone.lastUpdated = referenceDate;
      clone.crimeStats = clone.crimeStats.map(stat => ({
        ...stat,
        incidentCount: Math.max(0, Math.round(stat.incidentCount * multiplier))
      }));
      return clone;
    });
  }

  public calculateTrend(
    crimeAreaData: CrimeData,
    timeframe: CrimeTimeframe = DEFAULT_TIMEFRAME
  ): CrimeDataTrend {
    const totalIncidents = crimeAreaData.crimeStats.reduce(
      (sum, stat) => sum + stat.incidentCount,
      0
    );

    const baseline = (RISK_TREND_BASELINE[crimeAreaData.riskLevel] || totalIncidents) *
      (TIMEFRAME_MULTIPLIERS[timeframe] ?? 1);

    if (baseline <= 0) {
      return { overall: 'stable', changePercent: 0 };
    }

    const changePercent = ((totalIncidents - baseline) / baseline) * 100;
    const overall: CrimeDataTrend['overall'] = changePercent <= -7
      ? 'improving'
      : changePercent >= 10
        ? 'worsening'
        : 'stable';

    return {
      overall,
      changePercent: parseFloat(changePercent.toFixed(1))
    };
  }

  public buildMetadata(
    dataset: CrimeData[],
    timeframe: CrimeTimeframe = DEFAULT_TIMEFRAME,
    referenceDate: Date = new Date()
  ): CrimeDatasetMetadata {
    if (!dataset.length) {
      return {
        lastUpdated: referenceDate.toISOString(),
        dataQuality: 0,
        source: DEFAULT_METADATA_SOURCE,
        dataVersion: '2025.09.25',
        timeframe
      };
    }

    const averageConfidence = dataset.reduce((sum, data) => {
      const confidenceForArea = data.crimeStats.reduce(
        (statSum, stat) => statSum + stat.confidence,
        0
      ) / Math.max(1, data.crimeStats.length);
      return sum + confidenceForArea;
    }, 0) / dataset.length;

    const dataQuality = Math.min(100, Math.max(0, Math.round(averageConfidence)));

    return {
      lastUpdated: referenceDate.toISOString(),
      dataQuality,
      source: DEFAULT_METADATA_SOURCE,
      dataVersion: '2025.09.25',
      timeframe
    };
  }

  public filterStatisticsByCrimeType(
    data: CrimeData,
    crimeType?: CrimeType
  ): CrimeStatistic[] {
    const stats = crimeType
      ? data.crimeStats.filter(stat => stat.type === crimeType)
      : data.crimeStats;

    return stats.map(stat => ({
      ...stat,
      timePattern: { ...stat.timePattern }
    }));
  }

  private buildDataset(referenceDate: Date): CrimeData[] {
    const timeframe = this.createTimeframeRange(DEFAULT_TIMEFRAME, referenceDate);
    return CAPE_TOWN_AREA_CONFIG.map((area, index) => {
      const seed = this.computeAreaSeed(area.name);
      const gridCell = this.createGridId(area.latitude, area.longitude, index);

      return {
        id: `crime_${gridCell}`,
        location: {
          latitude: area.latitude,
          longitude: area.longitude,
          address: `${area.name}, Cape Town`,
          neighborhood: area.name,
          type: area.landUse,
          validatedAt: referenceDate
        },
        gridCell,
        timeframe,
        crimeStats: this.generateCrimeStatistics(area, seed),
        riskLevel: area.riskLevel,
        populationDensity: area.populationDensity,
        economicIndicators: area.economic,
        lastUpdated: referenceDate,
        dataSource: 'synthetic'
      };
    });
  }

  private generateCrimeStatistics(area: CrimeAreaConfig, areaSeed: number): CrimeStatistic[] {
    const statistics: CrimeStatistic[] = [];
    const crimeTypes = Object.keys(CRIME_TYPE_PATTERNS) as CrimeType[];

    crimeTypes.forEach((crimeType, typeIndex) => {
      const pattern = CRIME_TYPE_PATTERNS[crimeType];
      const totalForType = area.baseIncidentRates[crimeType];
      const basePerSubtype = totalForType / pattern.subtypes.length;

      pattern.subtypes.forEach((subtype, subtypeIndex) => {
        const seed = areaSeed + (typeIndex + 1) * 37 + (subtypeIndex + 1) * 17;
        const variation = 0.85 + this.seededRandom(seed) * 0.4;
        const incidentCount = Math.max(0, Math.round(basePerSubtype * variation));
        const severityRange = pattern.severityRange;
        const severity = Math.round(
          severityRange[0] + (severityRange[1] - severityRange[0]) * this.seededRandom(seed + 11)
        );
        const timePattern = this.generateHourlyPattern(pattern.hourlyProfile, seed);
        const confidence = this.deriveConfidence(area.riskLevel, seed + 23);

        statistics.push({
          type: crimeType,
          subtype,
          incidentCount,
          severity: Math.max(severityRange[0], Math.min(severityRange[1], severity)),
          timePattern,
          confidence
        });
      });
    });

    return statistics;
  }

  private generateHourlyPattern(profile: number[], seed: number): HourlyPattern {
    const adjusted = profile.map((value, hour) => {
      const variation = 0.9 + this.seededRandom(seed + hour) * 0.2;
      return value * variation;
    });

    const total = adjusted.reduce((sum, value) => sum + value, 0);
    const pattern: HourlyPattern = {};

    adjusted.forEach((value, hour) => {
      const normalized = value / total;
      pattern[hour.toString()] = parseFloat(normalized.toFixed(4));
    });

    return pattern;
  }

  private deriveConfidence(riskLevel: CrimeRiskLevel, seed: number): number {
    const base = RISK_CONFIDENCE_BASE[riskLevel];
    const variation = this.seededRandom(seed);
    const adjusted = base - variation * 5;
    return Math.max(60, Math.min(98, Math.round(adjusted)));
  }

  private createTimeframeRange(timeframe: CrimeTimeframe, referenceDate: Date): DateRange {
    const days = TIMEFRAME_DAYS[timeframe] ?? TIMEFRAME_DAYS[DEFAULT_TIMEFRAME];
    const end = new Date(referenceDate);
    const start = new Date(referenceDate);
    start.setDate(start.getDate() - days);
    return { start, end };
  }

  private createGridId(lat: number, lng: number, index: number): string {
    const latPart = Math.floor(Math.abs(lat));
    const lngPart = Math.floor(Math.abs(lng));
    const suffix = String(index + 1).padStart(3, '0');
    return `CT_${latPart}_${lngPart}_${suffix}`;
  }

  private computeAreaSeed(areaName: string): number {
    return Array.from(areaName).reduce((acc, char, idx) => acc + char.charCodeAt(0) * (idx + 1), 0);
  }

  private normalizeArea(area: string): string {
    return decodeURIComponent(area).replace(/\+/g, ' ').trim().toLowerCase();
  }

  private calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
    const R = 6371000; // meters
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
      Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  }

  private cloneCrimeData(data: CrimeData): CrimeData {
    return {
      ...data,
      location: { ...data.location },
      timeframe: {
        start: new Date(data.timeframe.start),
        end: new Date(data.timeframe.end)
      },
      lastUpdated: new Date(data.lastUpdated),
      crimeStats: data.crimeStats.map(stat => ({
        ...stat,
        timePattern: { ...stat.timePattern }
      }))
    };
  }

  private seededRandom(seed: number): number {
    const x = Math.sin(seed * 12989 + 78233) * 43758.5453;
    return x - Math.floor(x);
  }
}

export const crimeDataGenerator = new CrimeDataGenerator();