import React, { useEffect, useRef, useState } from 'react';
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
  const originMarkerRef = useRef<google.maps.Marker | null>(null);
  const destinationMarkerRef = useRef<google.maps.Marker | null>(null);
  const [directions, setDirections] = useState<google.maps.DirectionsResult | null>(null);

  const getSafetyColor = (score: number): string => {
    if (score >= 80) return '#28a745'; // Green
    if (score >= 60) return '#ffc107'; // Yellow
    if (score >= 40) return '#fd7e14'; // Orange
    return '#dc3545'; // Red
  };

  const createMarker = (position: google.maps.LatLngLiteral, title: string, color: string, location: Location) => {
    if (!mapRef.current) return null;

    const marker = new google.maps.Marker({
      position: position,
      map: mapRef.current,
      title: title,
      icon: {
        path: google.maps.SymbolPath.CIRCLE,
        scale: 12,
        fillColor: color,
        fillOpacity: 1,
        strokeColor: 'white',
        strokeWeight: 3,
      }
    });

    marker.addListener('click', () => {
      if (onMarkerClick) onMarkerClick(location);
    });

    return marker;
  };

  useEffect(() => {
    if (route && window.google) {
      const directionsService = new google.maps.DirectionsService();

      const request: google.maps.DirectionsRequest = {
        origin: { lat: route.origin.latitude, lng: route.origin.longitude },
        destination: { lat: route.destination.latitude, lng: route.destination.longitude },
        waypoints: route.waypoints?.map(wp => ({ location: { lat: wp.latitude, lng: wp.longitude }, stopover: true })),
        travelMode: google.maps.TravelMode.DRIVING,
        optimizeWaypoints: false
      };

      directionsService.route(request, (result, status) => {
        if (status === 'OK' && result) {
          setDirections(result);

          // Update map bounds to fit the route
          if (mapRef.current && result.routes[0]) {
            const bounds = new google.maps.LatLngBounds();
            result.routes[0].legs.forEach(leg => {
              leg.steps.forEach(step => {
                bounds.extend(step.start_location);
                bounds.extend(step.end_location);
              });
            });
            mapRef.current.fitBounds(bounds);

            // Add padding by setting zoom level slightly lower after bounds are set
            setTimeout(() => {
              const currentZoom = mapRef.current?.getZoom();
              if (currentZoom && currentZoom > 10) {
                mapRef.current?.setZoom(currentZoom - 1);
              }
            }, 100);
          }
        } else {
          console.error('Directions request failed due to ' + status);
          setDirections(null);
        }
      });
    } else {
      setDirections(null);
    }
  }, [route]);

  useEffect(() => {
    if (originMarkerRef.current) {
      originMarkerRef.current.setMap(null);
      originMarkerRef.current = null;
    }

    if (origin && mapRef.current) {
      const position = { lat: origin.latitude, lng: origin.longitude };
      originMarkerRef.current = createMarker(position, 'Origin', '#28a745', origin);
    }
  }, [origin, onMarkerClick]);

  useEffect(() => {
    if (destinationMarkerRef.current) {
      destinationMarkerRef.current.setMap(null);
      destinationMarkerRef.current = null;
    }

    if (destination && mapRef.current) {
      const position = { lat: destination.latitude, lng: destination.longitude };
      destinationMarkerRef.current = createMarker(position, 'Destination', '#dc3545', destination);
    }
  }, [destination, onMarkerClick]);

  useEffect(() => {
    return () => {
      if (originMarkerRef.current) {
        originMarkerRef.current.setMap(null);
      }
      if (destinationMarkerRef.current) {
        destinationMarkerRef.current.setMap(null);
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
        {directions && (
          <DirectionsRenderer
            directions={directions}
            options={{
              suppressMarkers: true,
              polylineOptions: {
                strokeColor: '#1976d2',
                strokeWeight: 6,
                strokeOpacity: 0.8
              }
            }}
          />
        )}
      </GoogleMap>
  );
};

export default MapView;
