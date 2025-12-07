import { extendTheme, type ThemeConfig } from '@chakra-ui/react';

// Theme configuration
const config: ThemeConfig = {
  initialColorMode: 'light',
  useSystemColorMode: false,
};

// Modern Academic Minimalism color palette - Clean, premium, university-like
const colors = {
  brand: {
    // Deep academic blue - Primary
    50: '#E8F4F8',
    100: '#C5E1ED',
    200: '#9ECCE1',
    300: '#76B6D5',
    400: '#5FA8D3', // Secondary soft blue accent
    500: '#1B4965', // Primary deep academic blue
    600: '#153A53',
    700: '#0F2C3A', // Neutral dark
    800: '#0A1E28',
    900: '#051016',
  },
  accent: {
    // Soft blue accent - Secondary
    50: '#E8F4FC',
    100: '#C5E6F8',
    200: '#9FD6F4',
    300: '#78C6F0',
    400: '#5FA8D3', // Secondary soft blue
    500: '#4A95C7',
    600: '#3D7AA3',
    700: '#305F7F',
    800: '#23445B',
    900: '#162937',
  },
  purple: {
    // Secondary accent for variety
    50: '#FAF5FF',
    100: '#E9D8FD',
    200: '#D6BCFA',
    300: '#B794F4',
    400: '#9F7AEA',
    500: '#805AD5',
    600: '#6B46C1',
    700: '#553C9A',
    800: '#44337A',
    900: '#322659',
  },
  orange: {
    // Warm accent for highlights
    50: '#FFFAF0',
    100: '#FEEBC8',
    200: '#FBD38D',
    300: '#F6AD55',
    400: '#ED8936',
    500: '#DD6B20',
    600: '#C05621',
    700: '#9C4221',
    800: '#7C2D12',
    900: '#651A0B',
  },
  success: {
    50: '#F0FFF4',
    100: '#C6F6D5',
    200: '#9AE6B4',
    300: '#68D391',
    400: '#48BB78',
    500: '#38A169',
    600: '#2F855A',
    700: '#276749',
    800: '#22543D',
    900: '#1C4532',
  },
  warning: {
    50: '#FFFBEB',
    100: '#FEF3C7',
    200: '#FDE68A',
    300: '#FCD34D',
    400: '#FBBF24',
    500: '#F59E0B',
    600: '#D97706',
    700: '#B45309',
    800: '#92400E',
    900: '#78350F',
  },
  error: {
    50: '#FEF2F2',
    100: '#FEE2E2',
    200: '#FECACA',
    300: '#FCA5A5',
    400: '#F87171',
    500: '#EF4444',
    600: '#DC2626',
    700: '#B91C1C',
    800: '#991B1B',
    900: '#7F1D1D',
  },
  gray: {
    50: '#F7F9FA', // Neutral light
    100: '#EDF2F7',
    200: '#E2E8F0',
    300: '#CBD5E0',
    400: '#A0AEC0',
    500: '#718096',
    600: '#4A5568',
    700: '#2D3748',
    800: '#1A202C',
    900: '#0F2C3A', // Neutral dark
  },
  highlight: {
    // Ultra-light blue for cards/background (#CAE9FF)
    50: '#CAE9FF',
    100: '#B8E0FF',
    200: '#A6D7FF',
    300: '#94CEFF',
    400: '#82C5FF',
    500: '#CAE9FF', // Main highlight color
  },
};

// Custom components styling
const components = {
  Button: {
    defaultProps: {
      colorScheme: 'brand',
    },
    variants: {
      solid: {
        borderRadius: 'lg',
        fontWeight: 'semibold',
        boxShadow: 'md',
        _hover: {
          transform: 'translateY(-2px)',
          boxShadow: 'lg',
        },
        transition: 'all 0.2s',
      },
      gradient: {
        bg: 'accent.400',
        color: 'white',
        borderRadius: 'lg',
        fontWeight: 'semibold',
        boxShadow: 'sm',
        _hover: {
          bg: 'accent.500',
          boxShadow: 'md',
        },
        transition: 'all 0.2s',
      },
    },
  },
  Card: {
    baseStyle: {
      container: {
        borderRadius: 'xl',
        boxShadow: 'lg',
        border: '1px solid',
        borderColor: 'gray.200',
        _hover: {
          boxShadow: 'xl',
          transform: 'translateY(-2px)',
        },
        transition: 'all 0.3s',
      },
    },
    variants: {
      elevated: {
        container: {
          boxShadow: 'xl',
          border: 'none',
        },
      },
      gradient: {
        container: {
          bg: 'highlight.50',
          borderColor: 'brand.200',
        },
      },
      academic: {
        container: {
          bg: 'highlight.50',
          border: '1px solid',
          borderColor: 'brand.200',
          boxShadow: 'md',
        },
      },
    },
  },
  Badge: {
    variants: {
      solid: {
        borderRadius: 'full',
        px: 3,
        py: 1,
        fontWeight: 'semibold',
      },
    },
  },
  Heading: {
    baseStyle: {
      fontWeight: 'bold',
      letterSpacing: '-0.02em',
    },
  },
};

// Custom styles
const styles = {
  global: {
    body: {
      bg: 'gray.50', // Neutral light background
      color: 'gray.700',
    },
  },
};

const theme = extendTheme({
  config,
  colors,
  components,
  styles,
});

export default theme;
