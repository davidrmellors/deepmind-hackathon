import React from 'react';
import { CircularProgress, Box, Typography, Chip } from '@mui/material';
import { styled } from '@mui/material/styles';

interface SafetyIndicatorProps {
  score: number;
  size?: 'small' | 'medium' | 'large';
  showLabel?: boolean;
  isMobile?: boolean;
}

const getColor = (score: number): string => {
  if (score >= 80) return '#4caf50'; // Green
  if (score >= 60) return '#ff9800'; // Orange
  if (score >= 40) return '#f44336'; // Red
  return '#9e9e9e'; // Grey
};

const getSize = (size: 'small' | 'medium' | 'large', isMobile: boolean) => {
  if (isMobile) {
    switch (size) {
      case 'small': return 40;
      case 'medium': return 60;
      case 'large': return 80;
      default: return 60;
    }
  }
  switch (size) {
    case 'small': return 50;
    case 'medium': return 80;
    case 'large': return 120;
    default: return 80;
  }
};

const StyledCircularProgress = styled(CircularProgress)<{ safetyscore: number }>`
  color: ${({ safetyscore }) => getColor(safetyscore)};
`;

const SafetyIndicator: React.FC<SafetyIndicatorProps> = ({ 
  score, 
  size = 'medium', 
  showLabel = true, 
  isMobile = false 
}) => {
  const diameter = getSize(size, isMobile);
  const fontSize = isMobile ? '0.8rem' : '1rem';

  return (
    <Box sx={{ position: 'relative', display: 'inline-flex', alignItems: 'center' }}>
      <StyledCircularProgress 
        variant="determinate" 
        safetyscore={score}
        size={diameter}
        thickness={4}
        value={score}
        sx={{ 
          ...(isMobile && { transform: 'scale(0.9)' }),
          '& .MuiCircularProgress-circle': {
            strokeLinecap: 'round'
          }
        }}
      />
      <Box
        sx={{
          top: 0,
          left: 0,
          bottom: 0,
          right: 0,
          position: 'absolute',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize,
          fontWeight: 'bold'
        }}
      >
        <Typography variant="caption" component="div" color="text.primary">
          {Math.round(score)}
        </Typography>
      </Box>
      
      {showLabel && (
        <Box sx={{ ml: 2, minWidth: 35 }}>
          <Chip 
            label={`${score}/100`}
            size="small"
            color={score >= 70 ? 'success' : score >= 50 ? 'warning' : 'error'}
            variant="outlined"
            sx={{ 
              fontSize: isMobile ? '0.7rem' : '0.8rem',
              height: isMobile ? 24 : 28
            }}
          />
        </Box>
      )}
    </Box>
  );
};

export default SafetyIndicator;
