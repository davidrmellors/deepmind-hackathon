import React, { useState, useRef, useEffect } from 'react';
import { TextField, Button, Box, InputAdornment } from '@mui/material';
import { LocationOn, Search } from '@mui/icons-material';
import { LoadScript, Autocomplete } from '@react-google-maps/api';
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
    if (autocomplete && value) {
      // Update input when value changes externally
      setInputValue(value.address || '');
    }
  }, [value, autocomplete]);

  const onPlaceChanged = () => {
    if (autocomplete !== null) {
      const place = autocomplete.getPlace();
      if (!place.geometry || !place.geometry.location) {
        console.log('No details available for input: ' + place.name);
        return;
      }

      const lat = place.geometry.location.lat();
      const lng = place.geometry.location.lng();
      const address = place.formatted_address || place.name || '';

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

      // Validate with service
      RoutingService.validateLocation(newLocation).then(isValid => {
        if (isValid) {
          onChange(newLocation);
        } else {
          alert('Invalid location. Please choose a location within Cape Town.');
        }
      });
    } else {
      console.log('Autocomplete is not loaded yet!');
    }
  };

  const handleInputChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    setInputValue(event.target.value);
  };

  const handleKeyPress = (event: React.KeyboardEvent) => {
    if (event.key === 'Enter') {
      if (autocomplete) {
        autocomplete.set('place', inputValue);
        onPlaceChanged();
      }
    }
  };

  const inputStyle = isMobile 
    ? { minHeight: '44px', fontSize: '16px' } // Mobile touch-friendly
    : { minHeight: '40px' };

  return (
    <LoadScript googleMapsApiKey={process.env.REACT_APP_GOOGLE_MAPS_API_KEY || ''} libraries={["places"]}>
      <Autocomplete
        onLoad={setAutocomplete}
        onPlaceChanged={onPlaceChanged}
        options={{
          componentRestrictions: { country: 'za' }, // Restrict to South Africa
          types: ['establishment', 'geocode']
        }}
      >
        <TextField
          fullWidth
          label={label}
          value={inputValue}
          onChange={handleInputChange}
          onKeyPress={handleKeyPress}
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
            '& .MuiInputBase-root': inputStyle,
            marginBottom: 2,
            input: { fontSize: isMobile ? '16px' : '14px' } // Prevent zoom on iOS
          }}
          variant="outlined"
        />
      </Autocomplete>
    </LoadScript>
  );
};

export default LocationInput;
