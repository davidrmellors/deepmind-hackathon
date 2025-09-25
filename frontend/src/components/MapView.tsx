import React, { useEffect, useRef } from 'react';
import { GoogleMap, LoadScript, Marker, DirectionsRenderer } from '@react-google-maps/api';
import { Location, Route, RouteSegment } from '../types';

const containerStyle = {
  width: '100%',
  height: '400px',
  minHeight: '300px' // Responsive minimum for mobile
};

const center = {
  lat: -33.9249,
  lng: 18.4241
};

const mapOptions = {
  zoom: 12,
  center: center,
  mapTypeId: 'roadmap',
  fullscreenControl: false,
  streetViewControl: false,
  mapTypeControl: false,
  zoomControl: true,
  styles: [
    {
      featureType: 'poi',
      elementType: 'labels',
      stylers: [{ visibility: 'off' }]
    }
  ]
};

interface MapViewProps {
  origin?: Location;
  destination?: Location;
  route?: Route;
  onMapLoad?: (map: google.maps.Map) => void;
  onMarkerClick?: (location: Location) => void;
}

const MapView: React.FC<MapViewProps> = ({ origin, destination, route, onMapLoad, onMarkerClick }) => {
  const mapRef = useRef<google.maps.Map | null>(null);
  const directionsServiceRef = useRef<google.maps.DirectionsService | null>(null);
  const directionsRendererRef = useRef<google.maps.DirectionsRenderer | null>(null);

  useEffect(() => {
    if (mapRef.current && !directionsServiceRef.current) {
      directionsServiceRef.current = new google.maps.DirectionsService();
      directionsRendererRef.current = new google.maps.DirectionsRenderer({
        suppressMarkers: true, // We'll add custom markers
        polylineOptions: { strokeColor: '#007bff' }
      });
      directionsRendererRef.current.setMap(mapRef.current);
    }
  }, []);

  useEffect(() => {
    if (route && directionsServiceRef.current && directionsRendererRef.current) {
      const request: google.maps.DirectionsRequest = {
        origin: { lat: route.origin.latitude, lng: route.origin.longitude },
        destination: { lat: route.destination.latitude, lng: route.destination.longitude },
        waypoints: route.waypoints?.map(wp => ({ location: { lat: wp.latitude, lng: wp.longitude }, stopover: true })),
        travelMode: google.maps.TravelMode.DRIVING,
        optimizeWaypoints: false
      };

      directionsServiceRef.current.route(request, (result, status) => {
        if (status === 'OK' && result) {
          directionsRendererRef.current?.setDirections(result);

          // Color-code segments based on safety
          route.segments.forEach((segment: RouteSegment) => {
            const color = this.getSafetyColor(segment.safetyScore.overall);
            // In production, draw custom polylines for segments with colors
            console.log(`Segment ${segment.id} safety color: ${color}`);
          });
        }
      });
    }
  }, [route]);

  const getSafetyColor = (score: number): string => {
    if (score >= 80) return '#28a745'; // Green
    if (score >= 60) return '#ffc107'; // Yellow
    if (score >= 40) return '#fd7e14'; // Orange
    return '#dc3545'; // Red
  };

  const handleMapLoad = (map: google.maps.Map) => {
    mapRef.current = map;
    if (onMapLoad) onMapLoad(map);
  };

  const handleMarkerClick = (location: Location) => {
    if (onMarkerClick) onMarkerClick(location);
  };

  const originPosition = origin ? { lat: origin.latitude, lng: origin.longitude } : null;
  const destinationPosition = destination ? { lat: destination.latitude, lng: destination.longitude } : null;

  return (
    <LoadScript googleMapsApiKey={process.env.REACT_APP_GOOGLE_MAPS_API_KEY || ''}>
      <GoogleMap
        mapContainerStyle={containerStyle}
        center={center}
        zoom={12}
        options={mapOptions}
        onLoad={handleMapLoad}
      >
        {originPosition && (
          <Marker
            position={originPosition}
            title="Origin"
            icon={{
              url: 'https://maps.google.com/mapfiles/ms/icons/green-dot.png',
              scaledSize: new google.maps.Size(32, 32)
            }}
            onClick={() => handleMarkerClick(origin)}
          />
        )}
        {destinationPosition && (
          <Marker
            position={destinationPosition}
            title="Destination"
            icon={{
              url: 'https://maps.google.com/mapfiles/ms/icons/red-dot.png',
              scaledSize: new google.maps.Size(32, 32)
            }}
            onClick={() => handleMarkerClick(destination)}
          />
        )}
        {route && directionsRendererRef.current && <DirectionsRenderer directions={null} />}
      </GoogleMap>
    </LoadScript>
  );
};

export default MapView;
