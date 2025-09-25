import React, { useState, useRef, useEffect } from 'react';
import { Box, TextField, InputAdornment, IconButton, Tooltip } from '@mui/material';
import { LocationOn, Search, MyLocation } from '@mui/icons-material';
import { Location } from '../types';
import RoutingService from '../services/routingService';

interface LocationInputProps {
  label: string;
  value: Location | null;
  onChange: (location: Location) => void;
  type: 'origin' | 'destination';
  isMobile?: boolean;
}

const LocationInput: React.FC<LocationInputProps> = ({ label, value, onChange, type, isMobile = false }) => {
  const [inputValue, setInputValue] = useState(value?.address || '');
  const [autocomplete, setAutocomplete] = useState<google.maps.places.Autocomplete | null>(null);
  const [gettingLocation, setGettingLocation] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (value) {
      setInputValue(value.address || '');
    }
  }, [value]);

  useEffect(() => {
    // Initialize classic Autocomplete with proper restrictions
    if (inputRef.current && !autocomplete) {
      const autocompleteService = new google.maps.places.Autocomplete(inputRef.current, {
        componentRestrictions: { country: 'za' },
        bounds: new google.maps.LatLngBounds(
          new google.maps.LatLng(-34.5, 18.0), // Southwest corner of Cape Town
          new google.maps.LatLng(-33.5, 19.0)  // Northeast corner of Cape Town
        ),
        strictBounds: true,
        types: ['establishment', 'geocode']
      });

      setAutocomplete(autocompleteService);

      // Listen for place selection
      autocompleteService.addListener('place_changed', () => {
        const place = autocompleteService.getPlace();
        console.log('Place selected:', place);
        onPlaceChanged(place);
      });
    }

    return () => {
      if (autocomplete) {
        google.maps.event.clearInstanceListeners(autocomplete);
      }
    };
  }, []);

  const handleInputChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    setInputValue(event.target.value);
  };

  const getCurrentLocation = () => {
    if (!navigator.geolocation) {
      alert('Geolocation is not supported by this browser.');
      return;
    }

    setGettingLocation(true);

    navigator.geolocation.getCurrentPosition(
      async (position) => {
        try {
          const { latitude, longitude } = position.coords;

          // Validate Cape Town bounds
          if (latitude < -34.5 || latitude > -33.5 || longitude < 18.0 || longitude > 19.0) {
            alert('Your current location is outside Cape Town metropolitan area.');
            setGettingLocation(false);
            return;
          }

          // Use Google Geocoding API to get address from coordinates
          const geocoder = new google.maps.Geocoder();
          geocoder.geocode(
            { location: { lat: latitude, lng: longitude } },
            (results, status) => {
              if (status === 'OK' && results && results[0]) {
                const result = results[0];
                const newLocation: Location = {
                  latitude,
                  longitude,
                  address: result.formatted_address,
                  neighborhood: result.address_components?.find(comp =>
                    comp.types.includes('sublocality')
                  )?.long_name || '',
                  googlePlaceId: result.place_id
                };

                setInputValue(newLocation.address || '');
                onChange(newLocation);
              } else {
                // Fallback if geocoding fails
                const newLocation: Location = {
                  latitude,
                  longitude,
                  address: `${latitude.toFixed(6)}, ${longitude.toFixed(6)}`,
                  neighborhood: '',
                  googlePlaceId: undefined
                };

                setInputValue(newLocation.address || '');
                onChange(newLocation);
              }
              setGettingLocation(false);
            }
          );
        } catch (error) {
          console.error('Error getting location:', error);
          alert('Failed to get current location. Please try again.');
          setGettingLocation(false);
        }
      },
      (error) => {
        console.error('Geolocation error:', error);
        let message = 'Failed to get current location. ';
        switch (error.code) {
          case error.PERMISSION_DENIED:
            message += 'Location access denied by user.';
            break;
          case error.POSITION_UNAVAILABLE:
            message += 'Location information is unavailable.';
            break;
          case error.TIMEOUT:
            message += 'Location request timed out.';
            break;
          default:
            message += 'An unknown error occurred.';
            break;
        }
        alert(message);
        setGettingLocation(false);
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 300000 // 5 minutes
      }
    );
  };


  const onPlaceChanged = (place: google.maps.places.PlaceResult) => {
    console.log('onPlaceChanged called with place:', place);

    if (!place.geometry || !place.geometry.location) {
      console.error('No geometry/location available for place:', place);
      return;
    }

    const lat = place.geometry.location.lat();
    const lng = place.geometry.location.lng();
    const address = place.formatted_address || place.name || '';

    console.log('Place details:', { lat, lng, address });

    // Validate Cape Town bounds
    if (lat < -34.5 || lat > -33.5 || lng < 18.0 || lng > 19.0) {
      alert('Location must be within Cape Town metropolitan area.');
      return;
    }

    const newLocation: Location = {
      latitude: lat,
      longitude: lng,
      address,
      neighborhood: place.address_components?.find(comp => comp.types.includes('sublocality'))?.long_name || '',
      googlePlaceId: place.place_id
    };

    console.log('New location object:', newLocation);

    // Update input value
    setInputValue(address);

    // Validate with service
    RoutingService.validateLocation(newLocation).then(isValid => {
      console.log('Location validation result:', isValid);
      if (isValid) {
        console.log('Calling onChange with location:', newLocation);
        onChange(newLocation);
      } else {
        alert('Invalid location. Please choose a location within Cape Town.');
      }
    }).catch(error => {
      console.error('Validation error:', error);
      // Still call onChange even if validation fails, as the error might be network-related
      onChange(newLocation);
    });
  };


  return (
    <Box sx={{ width: '100%' }}>
      <TextField
        fullWidth
        label={label}
        value={inputValue}
        onChange={handleInputChange}
        inputRef={inputRef}
        placeholder={`Enter ${type} location in Cape Town`}
        InputProps={{
          startAdornment: (
            <InputAdornment position="start">
              <LocationOn />
            </InputAdornment>
          ),
          endAdornment: (
            <InputAdornment position="end">
              {type === 'origin' && (
                <Tooltip title="Use current location">
                  <IconButton
                    onClick={getCurrentLocation}
                    disabled={gettingLocation}
                    size="small"
                    sx={{ mr: 1 }}
                  >
                    <MyLocation />
                  </IconButton>
                </Tooltip>
              )}
              <Search />
            </InputAdornment>
          )
        }}
        sx={{
          '& .MuiInputBase-root': {
            minHeight: isMobile ? '44px' : '40px'
          },
          marginBottom: 2,
          '& .MuiInputBase-input': {
            fontSize: isMobile ? '16px' : '14px' // Prevent zoom on iOS
          }
        }}
        variant="outlined"
      />
    </Box>
  );
};

export default LocationInput;
