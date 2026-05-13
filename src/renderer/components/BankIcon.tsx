import React from 'react';
import { Box } from '@mui/material';

interface BankIconProps {
  banco?: 'BB' | 'ITAU' | null;
  size?: number;
}

export default function BankIcon({ banco, size = 24 }: BankIconProps) {
  if (!banco) return null;

  const style = {
    width: size,
    height: size,
    display: 'inline-block',
  };

  if (banco === 'BB') {
    // Logo Banco do Brasil (amarelo e azul)
    return (
      <Box
        component="span"
        sx={{
          ...style,
          backgroundColor: '#FFF200',
          color: '#003D7A',
          borderRadius: '4px',
          display: 'inline-flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontWeight: 'bold',
          fontSize: size * 0.5,
          fontFamily: 'Arial, sans-serif',
        }}
      >
        BB
      </Box>
    );
  }

  if (banco === 'ITAU') {
    // Logo Itaú (laranja)
    return (
      <Box
        component="span"
        sx={{
          ...style,
          backgroundColor: '#EC7000',
          color: '#FFFFFF',
          borderRadius: '4px',
          display: 'inline-flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontWeight: 'bold',
          fontSize: size * 0.4,
          fontFamily: 'Arial, sans-serif',
        }}
      >
        itaú
      </Box>
    );
  }

  return null;
}
