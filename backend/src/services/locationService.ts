// Location Validation Service for Cape Town Metropolitan Area
// Validates coordinates, addresses, and provides location enrichment
// Based on data-model.md bounds: lat (-34.5, -33.5), lng (18.0, 19.0)

import {
  Location,
  LocationType,
  LocationSafetyMetrics,
  Amenity,
  Address,
  Coordinates
} from '../types/index.js';

// Cape Town Metropolitan Area Bounds
export const CAPE_TOWN_BOUNDS = {
  north: -33.5,  // Northern boundary
  south: -34.5,  // Southern boundary
  west: 18.0,    // Western boundary
  east: 19.0     // Eastern boundary
};

// Well-known Cape Town neighborhoods with their approximate centers
export const CAPE_TOWN_NEIGHBORHOODS = {
  'City Bowl': { lat: -33.9249, lng: 18.4241, type: 'commercial' as LocationType },
  'Sea Point': { lat: -33.9207, lng: 18.3889, type: 'residential' as LocationType },
  'Green Point': { lat: -33.9074, lng: 18.4080, type: 'residential' as LocationType },
  'Camps Bay': { lat: -33.9508, lng: 18.3773, type: 'recreational' as LocationType },
  'Clifton': { lat: -33.9363, lng: 18.3715, type: 'residential' as LocationType },
  'Waterfront': { lat: -33.9020, lng: 18.4181, type: 'commercial' as LocationType },
  'Observatory': { lat: -33.9330, lng: 18.4731, type: 'residential' as LocationType },
  'Woodstock': { lat: -33.9245, lng: 18.4565, type: 'industrial' as LocationType },
  'Salt River': { lat: -33.9343, lng: 18.4694, type: 'industrial' as LocationType },
  'Rondebosch': { lat: -33.9667, lng: 18.4833, type: 'residential' as LocationType },
  'Claremont': { lat: -33.9830, lng: 18.4647, type: 'commercial' as LocationType },
  'Newlands': { lat: -33.9716, lng: 18.4851, type: 'residential' as LocationType },
  'Constantia': { lat: -34.0336, lng: 18.4219, type: 'residential' as LocationType },
  'Hout Bay': { lat: -34.0486, lng: 18.3503, type: 'recreational' as LocationType },
  'Muizenberg': { lat: -34.1031, lng: 18.4668, type: 'recreational' as LocationType },
  'Kalk Bay': { lat: -34.1284, lng: 18.4470, type: 'recreational' as LocationType },
  'Fish Hoek': { lat: -34.1365, lng: 18.4329, type: 'residential' as LocationType },
  'Simon\'s Town': { lat: -34.1927, lng: 18.4298, type: 'transport_hub' as LocationType },
  'Bellville': { lat: -33.8963, lng: 18.6292, type: 'commercial' as LocationType },
  'Parow': { lat: -33.8907, lng: 18.5894, type: 'residential' as LocationType },
  'Goodwood': { lat: -33.8837, lng: 18.5505, type: 'residential' as LocationType },
  'Elsies River': { lat: -33.8434, lng: 18.5358, type: 'residential' as LocationType },
  'Kuils River': { lat: -33.9667, lng: 18.6833, type: 'residential' as LocationType },
  'Mitchells Plain': { lat: -34.0367, lng: 18.6217, type: 'residential' as LocationType },
  'Khayelitsha': { lat: -34.0529, lng: 18.6919, type: 'residential' as LocationType },
  'Gugulethu': { lat: -33.9806, lng: 18.5844, type: 'residential' as LocationType },
  'Langa': { lat: -33.9408, lng: 18.5115, type: 'residential' as LocationType },
  'Athlone': { lat: -33.9667, lng: 18.5167, type: 'residential' as LocationType },
  'Manenberg': { lat: -33.9667, lng: 18.5500, type: 'residential' as LocationType },
  'Retreat': { lat: -34.0567, lng: 18.4854, type: 'residential' as LocationType },
  'Steenberg': { lat: -34.0708, lng: 18.4708, type: 'residential' as LocationType }
};

// Major landmarks and transport hubs
export const CAPE_TOWN_LANDMARKS = {
  'Table Mountain': { lat: -33.9628, lng: 18.4098, type: 'landmark' as LocationType },
  'Cape Point': { lat: -34.3569, lng: 18.4965, type: 'landmark' as LocationType },
  'Robben Island': { lat: -33.8067, lng: 18.3669, type: 'landmark' as LocationType },
  'V&A Waterfront': { lat: -33.9030, lng: 18.4197, type: 'commercial' as LocationType },
  'Cape Town Stadium': { lat: -33.9056, lng: 18.4106, type: 'landmark' as LocationType },
  'Cape Town International Airport': { lat: -33.9717, lng: 18.6021, type: 'transport_hub' as LocationType },
  'Cape Town Railway Station': { lat: -33.9175, lng: 18.4285, type: 'transport_hub' as LocationType },
  'Golden Acre': { lat: -33.9197, lng: 18.4219, type: 'transport_hub' as LocationType },
  'University of Cape Town': { lat: -33.9577, lng: 18.4609, type: 'landmark' as LocationType },
  'Kirstenbosch': { lat: -33.9883, lng: 18.4319, type: 'recreational' as LocationType }
};

export interface LocationValidationResult {
  isValid: boolean;
  withinBounds: boolean;
  neighborhood?: string;
  errors?: string[];
  suggestions?: string[];
  enrichedLocation?: Location;
}

export interface AddressValidationResult {
  isValid: boolean;
  standardizedAddress?: Address;
  confidence: number;
  errors?: string[];
}

export class LocationService {
  /**
   * Validate if coordinates are within Cape Town metropolitan bounds
   * @param latitude Latitude coordinate
   * @param longitude Longitude coordinate
   * @returns Validation result with bounds checking
   */
  public validateCoordinates(latitude: number, longitude: number): LocationValidationResult {
    const errors: string[] = [];
    const suggestions: string[] = [];

    // Basic coordinate validation
    if (typeof latitude !== 'number' || typeof longitude !== 'number') {
      errors.push('Coordinates must be valid numbers');
      return { isValid: false, withinBounds: false, errors };
    }

    if (isNaN(latitude) || isNaN(longitude)) {
      errors.push('Coordinates cannot be NaN values');
      return { isValid: false, withinBounds: false, errors };
    }

    if (latitude < -90 || latitude > 90) {
      errors.push('Latitude must be between -90 and 90 degrees');
      return { isValid: false, withinBounds: false, errors };
    }

    if (longitude < -180 || longitude > 180) {
      errors.push('Longitude must be between -180 and 180 degrees');
      return { isValid: false, withinBounds: false, errors };
    }

    // Cape Town bounds validation
    const withinBounds = this.isWithinCapeTownBounds(latitude, longitude);

    if (!withinBounds) {
      errors.push('Location is outside Cape Town metropolitan area');

      // Provide helpful suggestions for out-of-bounds coordinates
      if (latitude < CAPE_TOWN_BOUNDS.south) {
        suggestions.push('Location is south of Cape Town. Consider False Bay area.');
      } else if (latitude > CAPE_TOWN_BOUNDS.north) {
        suggestions.push('Location is north of Cape Town. Consider Bellville or surrounding areas.');
      }

      if (longitude < CAPE_TOWN_BOUNDS.west) {
        suggestions.push('Location is west of Cape Town. Consider Sea Point or Atlantic coast.');
      } else if (longitude > CAPE_TOWN_BOUNDS.east) {
        suggestions.push('Location is east of Cape Town. Consider Stellenbosch direction.');
      }

      return {
        isValid: false,
        withinBounds: false,
        errors,
        suggestions
      };
    }

    // Find nearest neighborhood
    const neighborhood = this.findNearestNeighborhood(latitude, longitude);

    return {
      isValid: true,
      withinBounds: true,
      neighborhood,
      enrichedLocation: this.enrichLocation({ latitude, longitude })
    };
  }

  /**
   * Validate and enrich a complete location object
   * @param location Location to validate
   * @returns Validation result with enriched location data
   */
  public validateLocation(location: Partial<Location>): LocationValidationResult {
    const errors: string[] = [];

    if (!location.latitude || !location.longitude) {
      errors.push('Location must include latitude and longitude coordinates');
      return { isValid: false, withinBounds: false, errors };
    }

    // Validate coordinates first
    const coordValidation = this.validateCoordinates(location.latitude, location.longitude);
    if (!coordValidation.isValid) {
      return coordValidation;
    }

    // Enrich location with additional data
    const enrichedLocation = this.enrichLocation(location);

    return {
      isValid: true,
      withinBounds: true,
      neighborhood: coordValidation.neighborhood,
      enrichedLocation
    };
  }

  /**
   * Validate Cape Town address format
   * @param address Address to validate
   * @returns Address validation result
   */
  public validateAddress(address: string | Address): AddressValidationResult {
    const errors: string[] = [];

    if (typeof address === 'string') {
      if (address.trim().length < 5) {
        errors.push('Address too short to be valid');
        return { isValid: false, confidence: 0, errors };
      }

      // Check if address likely contains Cape Town references
      const capeTownKeywords = ['cape town', 'kaapstad', 'western cape', 'wes-kaap'];
      const addressLower = address.toLowerCase();
      const hasCapeTownRef = capeTownKeywords.some(keyword => addressLower.includes(keyword));

      const confidence = hasCapeTownRef ? 80 : 40;

      // Parse string address into components
      const standardizedAddress = this.parseStringAddress(address);

      return {
        isValid: true,
        standardizedAddress,
        confidence
      };
    } else {
      // Validate Address object
      if (!address.city) {
        errors.push('Address must include city');
      }

      if (!address.province) {
        errors.push('Address must include province');
      }

      // Check if it's a Cape Town address
      const isCapeOrSA = address.city?.toLowerCase().includes('cape town') ||
                        address.province?.toLowerCase().includes('western cape') ||
                        address.country?.toLowerCase().includes('south africa');

      if (!isCapeOrSA) {
        errors.push('Address does not appear to be in Cape Town, South Africa');
        return { isValid: false, confidence: 20, errors };
      }

      return {
        isValid: errors.length === 0,
        standardizedAddress: address,
        confidence: errors.length === 0 ? 90 : 60,
        errors: errors.length > 0 ? errors : undefined
      };
    }
  }

  /**
   * Find the nearest neighborhood to given coordinates
   * @param latitude Location latitude
   * @param longitude Location longitude
   * @returns Nearest neighborhood name or undefined
   */
  public findNearestNeighborhood(latitude: number, longitude: number): string | undefined {
    let nearestNeighborhood: string | undefined;
    let minDistance = Infinity;

    // Check neighborhoods first
    Object.entries(CAPE_TOWN_NEIGHBORHOODS).forEach(([name, coords]) => {
      const distance = this.calculateDistance(latitude, longitude, coords.lat, coords.lng);
      if (distance < minDistance) {
        minDistance = distance;
        nearestNeighborhood = name;
      }
    });

    // If too far from neighborhoods, check landmarks
    if (minDistance > 5) { // More than 5km from nearest neighborhood
      Object.entries(CAPE_TOWN_LANDMARKS).forEach(([name, coords]) => {
        const distance = this.calculateDistance(latitude, longitude, coords.lat, coords.lng);
        if (distance < minDistance) {
          minDistance = distance;
          nearestNeighborhood = `Near ${name}`;
        }
      });
    }

    return minDistance < 15 ? nearestNeighborhood : undefined; // Within 15km
  }

  /**
   * Get location type based on neighborhood
   * @param neighborhood Neighborhood name
   * @returns Location type
   */
  public getLocationTypeForNeighborhood(neighborhood: string): LocationType {
    // Clean neighborhood name (remove "Near " prefix)
    const cleanName = neighborhood.replace(/^Near /, '');

    const neighborhoodData = CAPE_TOWN_NEIGHBORHOODS[cleanName as keyof typeof CAPE_TOWN_NEIGHBORHOODS] || CAPE_TOWN_LANDMARKS[cleanName as keyof typeof CAPE_TOWN_LANDMARKS];
    return neighborhoodData?.type || 'residential';
  }

  /**
   * Enrich location with additional metadata
   * @param location Basic location data
   * @returns Enriched location object
   */
  public enrichLocation(location: Partial<Location>): Location {
    const neighborhood = this.findNearestNeighborhood(location.latitude!, location.longitude!);
    const locationType = neighborhood ? this.getLocationTypeForNeighborhood(neighborhood) : 'residential';

    // Generate basic safety metrics based on neighborhood type and location
    const safetyMetrics = this.generateBasicSafetyMetrics(location.latitude!, location.longitude!, locationType);

    // Generate basic amenities based on location type
    const amenities = this.generateBasicAmenities(locationType);

    return {
      id: location.id || this.generateLocationId(location.latitude!, location.longitude!),
      latitude: location.latitude!,
      longitude: location.longitude!,
      address: location.address || this.generateBasicAddress(location.latitude!, location.longitude!, neighborhood),
      neighborhood,
      type: locationType,
      safetyMetrics,
      amenities,
      validatedAt: new Date()
    };
  }

  /**
   * Check if coordinates are within Cape Town bounds
   * @param latitude Location latitude
   * @param longitude Location longitude
   * @returns True if within bounds
   */
  public isWithinCapeTownBounds(latitude: number, longitude: number): boolean {
    return latitude >= CAPE_TOWN_BOUNDS.south &&
           latitude <= CAPE_TOWN_BOUNDS.north &&
           longitude >= CAPE_TOWN_BOUNDS.west &&
           longitude <= CAPE_TOWN_BOUNDS.east;
  }

  /**
   * Calculate distance between two coordinates using Haversine formula
   * @param lat1 First point latitude
   * @param lng1 First point longitude
   * @param lat2 Second point latitude
   * @param lng2 Second point longitude
   * @returns Distance in kilometers
   */
  private calculateDistance(lat1: number, lng1: number, lat2: number, lng2: number): number {
    const R = 6371; // Earth's radius in kilometers
    const dLat = this.degToRad(lat2 - lat1);
    const dLng = this.degToRad(lng2 - lng1);

    const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
              Math.cos(this.degToRad(lat1)) * Math.cos(this.degToRad(lat2)) *
              Math.sin(dLng / 2) * Math.sin(dLng / 2);

    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  }

  /**
   * Convert degrees to radians
   * @param deg Degrees
   * @returns Radians
   */
  private degToRad(deg: number): number {
    return deg * (Math.PI / 180);
  }

  /**
   * Parse string address into Address components
   * @param address Address string
   * @returns Parsed Address object
   */
  private parseStringAddress(address: string): Address {
    // Basic parsing - in production, would use proper address parsing service
    const parts = address.split(',').map(part => part.trim());

    return {
      street: parts[0] || '',
      suburb: parts[1] || '',
      city: parts.find(part => part.toLowerCase().includes('cape town')) || 'Cape Town',
      province: 'Western Cape',
      postalCode: parts.find(part => /^\d{4}$/.test(part)) || '',
      country: 'South Africa'
    };
  }

  /**
   * Generate basic address string for coordinates
   * @param latitude Location latitude
   * @param longitude Location longitude
   * @param neighborhood Neighborhood name if known
   * @returns Basic address string
   */
  private generateBasicAddress(latitude: number, longitude: number, neighborhood?: string): string {
    if (neighborhood) {
      return `${neighborhood}, Cape Town, Western Cape, South Africa`;
    }
    return `${latitude.toFixed(4)}, ${longitude.toFixed(4)}, Cape Town, Western Cape, South Africa`;
  }

  /**
   * Generate location ID from coordinates
   * @param latitude Location latitude
   * @param longitude Location longitude
   * @returns Location ID string
   */
  private generateLocationId(latitude: number, longitude: number): string {
    const latStr = latitude.toFixed(6).replace('.', '').replace('-', 'S');
    const lngStr = longitude.toFixed(6).replace('.', '').replace('-', 'W');
    return `loc_${latStr}_${lngStr}`;
  }

  /**
   * Generate basic safety metrics for location
   * @param latitude Location latitude
   * @param longitude Location longitude
   * @param locationType Type of location
   * @returns Basic safety metrics
   */
  private generateBasicSafetyMetrics(latitude: number, longitude: number, locationType: LocationType): LocationSafetyMetrics {
    // Generate basic metrics based on location type and position
    // In production, would use real data sources

    const baseMetrics = {
      residential: { risk: 75, lighting: 80, traffic: 60, emergency: 3000 },
      commercial: { risk: 85, lighting: 90, traffic: 90, emergency: 1500 },
      industrial: { risk: 60, lighting: 70, traffic: 40, emergency: 4000 },
      recreational: { risk: 80, lighting: 75, traffic: 85, emergency: 2000 },
      transport_hub: { risk: 70, lighting: 95, traffic: 95, emergency: 500 },
      landmark: { risk: 85, lighting: 85, traffic: 80, emergency: 1000 }
    };

    const metrics = baseMetrics[locationType];

    // Adjust based on proximity to city center (V&A Waterfront as reference)
    const cityCenter = { lat: -33.9030, lng: 18.4197 };
    const distanceFromCenter = this.calculateDistance(latitude, longitude, cityCenter.lat, cityCenter.lng);

    // Closer to city center generally means better emergency services but potentially higher risk
    const centerAdjustment = Math.max(0, 1 - (distanceFromCenter / 20)); // Up to 20km adjustment

    return {
      currentRiskLevel: Math.max(0, Math.min(100, metrics.risk + (centerAdjustment * 10))),
      historicalIncidents: Math.floor(Math.random() * 20), // Placeholder - would use real data
      lightingQuality: Math.max(0, Math.min(100, metrics.lighting + (centerAdjustment * 5))),
      footTraffic: Math.max(0, Math.min(100, metrics.traffic + (centerAdjustment * 15))),
      emergencyServiceDistance: Math.max(500, metrics.emergency - (centerAdjustment * 1000)),
      cctvCoverage: locationType === 'commercial' || locationType === 'transport_hub'
    };
  }

  /**
   * Generate basic amenities based on location type
   * @param locationType Type of location
   * @returns Array of basic amenities
   */
  private generateBasicAmenities(locationType: LocationType): Amenity[] {
    const amenityMaps = {
      residential: [
        { type: 'parking' as const, description: 'Street parking available', available: true },
        { type: 'lighting' as const, description: 'Street lighting', available: true }
      ],
      commercial: [
        { type: 'parking' as const, description: 'Public parking available', available: true },
        { type: 'lighting' as const, description: 'Good street lighting', available: true },
        { type: 'security' as const, description: 'Security presence', available: true }
      ],
      industrial: [
        { type: 'parking' as const, description: 'Industrial parking', available: true },
        { type: 'lighting' as const, description: 'Basic lighting', available: true }
      ],
      recreational: [
        { type: 'parking' as const, description: 'Visitor parking', available: true },
        { type: 'lighting' as const, description: 'Park lighting', available: true },
        { type: 'emergency' as const, description: 'Emergency services access', available: true }
      ],
      transport_hub: [
        { type: 'parking' as const, description: 'Transport parking', available: true },
        { type: 'lighting' as const, description: 'Excellent lighting', available: true },
        { type: 'security' as const, description: '24/7 security', available: true },
        { type: 'emergency' as const, description: 'Emergency services', available: true },
        { type: 'transport' as const, description: 'Public transport access', available: true }
      ],
      landmark: [
        { type: 'parking' as const, description: 'Tourist parking', available: true },
        { type: 'lighting' as const, description: 'Good lighting', available: true },
        { type: 'emergency' as const, description: 'Emergency access', available: true }
      ]
    };

    return amenityMaps[locationType] || amenityMaps.residential;
  }

  /**
   * Get all known neighborhoods
   * @returns Array of neighborhood names
   */
  public getKnownNeighborhoods(): string[] {
    return Object.keys(CAPE_TOWN_NEIGHBORHOODS);
  }

  /**
   * Get all known landmarks
   * @returns Array of landmark names
   */
  public getKnownLandmarks(): string[] {
    return Object.keys(CAPE_TOWN_LANDMARKS);
  }

  /**
   * Get location data for a known neighborhood or landmark
   * @param name Neighborhood or landmark name
   * @returns Location data if found
   */
  public getLocationByName(name: string): Location | undefined {
    const neighborhoodData = CAPE_TOWN_NEIGHBORHOODS[name as keyof typeof CAPE_TOWN_NEIGHBORHOODS];
    const landmarkData = CAPE_TOWN_LANDMARKS[name as keyof typeof CAPE_TOWN_LANDMARKS];

    const data = neighborhoodData || landmarkData;
    if (!data) return undefined;

    return this.enrichLocation({
      latitude: data.lat,
      longitude: data.lng,
      address: `${name}, Cape Town, Western Cape, South Africa`,
      neighborhood: neighborhoodData ? name : undefined,
      type: data.type
    });
  }

  /**
   * Search for locations by partial name match
   * @param query Search query
   * @returns Array of matching locations
   */
  public searchLocationsByName(query: string): Location[] {
    const queryLower = query.toLowerCase();
    const matches: Location[] = [];

    // Search neighborhoods
    Object.keys(CAPE_TOWN_NEIGHBORHOODS).forEach(name => {
      if (name.toLowerCase().includes(queryLower)) {
        const location = this.getLocationByName(name);
        if (location) matches.push(location);
      }
    });

    // Search landmarks
    Object.keys(CAPE_TOWN_LANDMARKS).forEach(name => {
      if (name.toLowerCase().includes(queryLower)) {
        const location = this.getLocationByName(name);
        if (location) matches.push(location);
      }
    });

    return matches;
  }
}

export default LocationService;