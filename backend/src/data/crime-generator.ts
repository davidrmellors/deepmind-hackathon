// Synthetic Cape Town Crime Data Generator
// Generates realistic crime statistics based on SAPS patterns

import { CrimeData, CrimeStatistic, EconomicData, HourlyPattern } from '../types';

// Cape Town suburbs with different risk profiles
const capeTimeSuburbs = {
  // Low risk areas
  low: [
    { name: 'Camps Bay', lat: -33.9588, lng: 18.4718, population: 4200 },
    { name: 'Clifton', lat: -33.9394, lng: 18.3761, population: 1800 },
    { name: 'Sea Point', lat: -33.9248, lng: 18.3917, population: 12500 },
    { name: 'Green Point', lat: -33.9108, lng: 18.4058, population: 4300 },
    { name: 'V&A Waterfront', lat: -33.9249, lng: 18.4241, population: 2000 }
  ],
  // Medium risk areas
  medium: [
    { name: 'City Bowl', lat: -33.9258, lng: 18.4232, population: 18000 },
    { name: 'Woodstock', lat: -33.9333, lng: 18.4500, population: 15200 },
    { name: 'Observatory', lat: -33.9333, lng: 18.4833, population: 12800 },
    { name: 'Salt River', lat: -33.9347, lng: 18.4653, population: 11500 },
    { name: 'Mowbray', lat: -33.9500, lng: 18.4667, population: 9600 }
  ],
  // High risk areas
  high: [
    { name: 'Khayelitsha', lat: -34.0333, lng: 18.6833, population: 391749 },
    { name: 'Gugulethu', lat: -33.9833, lng: 18.5833, population: 98468 },
    { name: 'Langa', lat: -33.9500, lng: 18.5500, population: 52401 },
    { name: 'Mitchell\'s Plain', lat: -34.0500, lng: 18.6000, population: 310485 },
    { name: 'Philippi', lat: -34.0000, lng: 18.5333, population: 191749 }
  ]
};

// Crime type patterns based on SAPS data
const crimePatterns = {
  violent: {
    subtypes: ['assault', 'robbery', 'hijacking', 'murder', 'sexual_offense'],
    severityRange: [6, 10],
    timePattern: {
      // Higher violence rates during evening/night
      0: 0.08, 1: 0.06, 2: 0.05, 3: 0.04, 4: 0.03, 5: 0.03,
      6: 0.04, 7: 0.05, 8: 0.06, 9: 0.05, 10: 0.04, 11: 0.04,
      12: 0.05, 13: 0.05, 14: 0.06, 15: 0.07, 16: 0.08, 17: 0.09,
      18: 0.10, 19: 0.12, 20: 0.11, 21: 0.10, 22: 0.09, 23: 0.08
    }
  },
  property: {
    subtypes: ['burglary', 'theft', 'shoplifting', 'vandalism', 'fraud'],
    severityRange: [3, 7],
    timePattern: {
      // Higher during day when people are away
      0: 0.02, 1: 0.01, 2: 0.01, 3: 0.01, 4: 0.02, 5: 0.03,
      6: 0.05, 7: 0.08, 8: 0.10, 9: 0.12, 10: 0.11, 11: 0.09,
      12: 0.08, 13: 0.07, 14: 0.08, 15: 0.09, 16: 0.08, 17: 0.06,
      18: 0.05, 19: 0.04, 20: 0.03, 21: 0.03, 22: 0.02, 23: 0.02
    }
  },
  petty: {
    subtypes: ['pickpocketing', 'bag_snatching', 'bicycle_theft', 'mobile_theft', 'begging'],
    severityRange: [1, 4],
    timePattern: {
      // Higher during commuter hours
      0: 0.01, 1: 0.01, 2: 0.01, 3: 0.02, 4: 0.03, 5: 0.05,
      6: 0.08, 7: 0.12, 8: 0.11, 9: 0.09, 10: 0.07, 11: 0.06,
      12: 0.08, 13: 0.07, 14: 0.06, 15: 0.07, 16: 0.09, 17: 0.11,
      18: 0.10, 19: 0.08, 20: 0.05, 21: 0.03, 22: 0.02, 23: 0.01
    }
  },
  vehicular: {
    subtypes: ['car_theft', 'car_breaking', 'hijacking', 'smash_grab', 'traffic_crime'],
    severityRange: [4, 8],
    timePattern: {
      // Higher during peak traffic hours
      0: 0.02, 1: 0.01, 2: 0.01, 3: 0.02, 4: 0.03, 5: 0.05,
      6: 0.09, 7: 0.13, 8: 0.12, 9: 0.08, 10: 0.06, 11: 0.05,
      12: 0.06, 13: 0.05, 14: 0.06, 15: 0.08, 16: 0.10, 17: 0.12,
      18: 0.11, 19: 0.09, 20: 0.06, 21: 0.04, 22: 0.03, 23: 0.02
    }
  }
};

export class CrimeDataGenerator {
  private generateGridId(lat: number, lng: number): string {
    const latGrid = Math.floor(Math.abs(lat) * 10);
    const lngGrid = Math.floor(lng * 10);
    return `CT_${latGrid}_${lngGrid}_${String(Math.random()).substr(2, 3)}`;
  }

  private generateCrimeStatistics(riskLevel: 'low' | 'medium' | 'high', population: number): CrimeStatistic[] {
    const statistics: CrimeStatistic[] = [];
    const riskMultipliers = { low: 0.3, medium: 1.0, high: 2.5 };
    const multiplier = riskMultipliers[riskLevel];

    Object.entries(crimePatterns).forEach(([crimeType, pattern]) => {
      pattern.subtypes.forEach(subtype => {
        // Base incident count scaled by population and risk
        const baseIncidents = Math.floor(
          (population / 10000) * multiplier * (Math.random() * 50 + 10)
        );

        const severity = Math.floor(
          Math.random() * (pattern.severityRange[1] - pattern.severityRange[0] + 1) +
          pattern.severityRange[0]
        );

        // Add some randomness to time patterns while maintaining general shape
        const timePattern: HourlyPattern = {};
        Object.entries(pattern.timePattern).forEach(([hour, probability]) => {
          const variation = 0.8 + Math.random() * 0.4; // ±20% variation
          timePattern[hour] = Math.max(0.01, probability * variation);
        });

        // Normalize to ensure sum equals 1
        const sum = Object.values(timePattern).reduce((a, b) => a + b, 0);
        Object.keys(timePattern).forEach(hour => {
          timePattern[hour] = timePattern[hour] / sum;
        });

        statistics.push({
          type: crimeType as 'violent' | 'property' | 'petty' | 'vehicular',
          subtype,
          incidentCount: baseIncidents,
          severity,
          timePattern,
          confidence: 75 + Math.random() * 20 // 75-95% confidence for synthetic data
        });
      });
    });

    return statistics;
  }

  private generateEconomicData(riskLevel: 'low' | 'medium' | 'high'): EconomicData {
    const economicProfiles = {
      low: {
        averageIncome: 450000 + Math.random() * 200000, // R450k-650k
        unemploymentRate: 5 + Math.random() * 10,        // 5-15%
        businessDensity: 80 + Math.random() * 40,        // 80-120 per km²
        lightingInfrastructure: 80 + Math.random() * 20  // 80-100%
      },
      medium: {
        averageIncome: 250000 + Math.random() * 150000,  // R250k-400k
        unemploymentRate: 15 + Math.random() * 15,       // 15-30%
        businessDensity: 40 + Math.random() * 30,        // 40-70 per km²
        lightingInfrastructure: 60 + Math.random() * 25  // 60-85%
      },
      high: {
        averageIncome: 50000 + Math.random() * 100000,   // R50k-150k
        unemploymentRate: 30 + Math.random() * 25,       // 30-55%
        businessDensity: 10 + Math.random() * 20,        // 10-30 per km²
        lightingInfrastructure: 30 + Math.random() * 30  // 30-60%
      }
    };

    return economicProfiles[riskLevel];
  }

  public generateCrimeData(): CrimeData[] {
    const crimeData: CrimeData[] = [];
    const now = new Date();
    const sixMonthsAgo = new Date(now.getTime() - (6 * 30 * 24 * 60 * 60 * 1000));

    // Generate data for all risk areas
    Object.entries(capeTimeSuburbs).forEach(([riskLevel, suburbs]) => {
      suburbs.forEach(suburb => {
        const gridCell = this.generateGridId(suburb.lat, suburb.lng);
        const crimeStats = this.generateCrimeStatistics(
          riskLevel as 'low' | 'medium' | 'high',
          suburb.population
        );
        const economicData = this.generateEconomicData(riskLevel as 'low' | 'medium' | 'high');

        crimeData.push({
          id: `crime_${gridCell}`,
          location: {
            latitude: suburb.lat,
            longitude: suburb.lng,
            address: `${suburb.name}, Cape Town`,
            neighborhood: suburb.name,
            type: 'residential'
          },
          gridCell,
          timeframe: {
            start: sixMonthsAgo,
            end: now
          },
          crimeStats,
          riskLevel: riskLevel as 'low' | 'medium' | 'high',
          populationDensity: suburb.population,
          economicIndicators: economicData,
          lastUpdated: now,
          dataSource: 'synthetic'
        });
      });
    });

    return crimeData;
  }

  public getCrimeDataByArea(area: string): CrimeData | null {
    const allData = this.generateCrimeData();
    return allData.find(data =>
      data.location.neighborhood?.toLowerCase().includes(area.toLowerCase()) ||
      data.location.address?.toLowerCase().includes(area.toLowerCase())
    ) || null;
  }

  public getCrimeDataByGridId(gridId: string): CrimeData | null {
    const allData = this.generateCrimeData();
    return allData.find(data => data.gridCell === gridId) || null;
  }

  public getCrimeDataByCoordinates(lat: number, lng: number, radiusKm: number = 1): CrimeData[] {
    const allData = this.generateCrimeData();
    return allData.filter(data => {
      const distance = this.calculateDistance(
        lat, lng,
        data.location.latitude, data.location.longitude
      );
      return distance <= radiusKm * 1000; // Convert km to meters
    });
  }

  private calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
    const R = 6371000; // Earth's radius in meters
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
      Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  }

  public validateCapeTimeLocation(lat: number, lng: number): boolean {
    return lat >= -34.5 && lat <= -33.5 && lng >= 18.0 && lng <= 19.0;
  }

  public getAreaRiskLevel(lat: number, lng: number): 'low' | 'medium' | 'high' {
    // Find closest suburb and return its risk level
    let closestDistance = Infinity;
    let closestRisk: 'low' | 'medium' | 'high' = 'medium';

    Object.entries(capeTimeSuburbs).forEach(([riskLevel, suburbs]) => {
      suburbs.forEach(suburb => {
        const distance = this.calculateDistance(lat, lng, suburb.lat, suburb.lng);
        if (distance < closestDistance) {
          closestDistance = distance;
          closestRisk = riskLevel as 'low' | 'medium' | 'high';
        }
      });
    });

    return closestRisk;
  }
}

// Export singleton instance
export const crimeDataGenerator = new CrimeDataGenerator();