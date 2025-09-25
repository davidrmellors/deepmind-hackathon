import React, { useEffect, useRef } from 'react';
import { GoogleMap, DirectionsRenderer } from '@react-google-maps/api';
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
  const originMarkerRef = useRef<google.maps.marker.AdvancedMarkerElement | null>(null);
  const destinationMarkerRef = useRef<google.maps.marker.AdvancedMarkerElement | null>(null);

  const getSafetyColor = (score: number): string => {
    if (score >= 80) return '#28a745'; // Green
    if (score >= 60) return '#ffc107'; // Yellow
    if (score >= 40) return '#fd7e14'; // Orange
    return '#dc3545'; // Red
  };

  const createAdvancedMarker = (position: google.maps.LatLngLiteral, title: string, color: string, location: Location) => {
    if (!mapRef.current) return null;

    const markerElement = document.createElement('div');
    markerElement.style.width = '32px';
    markerElement.style.height = '32px';
    markerElement.style.borderRadius = '50%';
    markerElement.style.backgroundColor = color;
    markerElement.style.border = '3px solid white';
    markerElement.style.boxShadow = '0 2px 8px rgba(0,0,0,0.3)';
    markerElement.style.cursor = 'pointer';
    markerElement.title = title;

    const marker = new google.maps.marker.AdvancedMarkerElement({
      map: mapRef.current,
      position: position,
      content: markerElement,
      title: title
    });

    marker.addListener('click', () => {
      if (onMarkerClick) onMarkerClick(location);
    });

    return marker;
  };

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
            const color = getSafetyColor(segment.safetyScore.overall);
            // In production, draw custom polylines for segments with colors
            console.log(`Segment ${segment.id} safety color: ${color}`);
          });
        }
      });
    }
  }, [route, getSafetyColor]);

  useEffect(() => {
    if (originMarkerRef.current) {
      originMarkerRef.current.map = null;
      originMarkerRef.current = null;
    }

    if (origin && mapRef.current) {
      const position = { lat: origin.latitude, lng: origin.longitude };
      originMarkerRef.current = createAdvancedMarker(position, 'Origin', '#28a745', origin);
    }
  }, [origin, onMarkerClick]);

  useEffect(() => {
    if (destinationMarkerRef.current) {
      destinationMarkerRef.current.map = null;
      destinationMarkerRef.current = null;
    }

    if (destination && mapRef.current) {
      const position = { lat: destination.latitude, lng: destination.longitude };
      destinationMarkerRef.current = createAdvancedMarker(position, 'Destination', '#dc3545', destination);
    }
  }, [destination, onMarkerClick]);

  useEffect(() => {
    return () => {
      if (originMarkerRef.current) {
        originMarkerRef.current.map = null;
      }
      if (destinationMarkerRef.current) {
        destinationMarkerRef.current.map = null;
      }
    };
  }, []);

  const handleMapLoad = (map: google.maps.Map) => {
    mapRef.current = map;
    if (onMapLoad) onMapLoad(map);
  };

  return (
    <GoogleMap
        mapContainerStyle={containerStyle}
        center={center}
        zoom={12}
        options={mapOptions}
        onLoad={handleMapLoad}
      >
      </GoogleMap>
  );
};

export default MapView;
