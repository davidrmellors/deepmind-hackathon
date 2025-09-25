import React, { useState, useRef, useEffect } from 'react';
import { Box, TextField, InputAdornment } from '@mui/material';
import { LocationOn, Search } from '@mui/icons-material';
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
