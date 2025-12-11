import { extendTheme, type ThemeConfig } from '@chakra-ui/react';

// Theme configuration
const config: ThemeConfig = {
  initialColorMode: 'light',
  useSystemColorMode: false,
};

// Nature-inspired green/olive color palette - Clean, organic, professional
const colors = {
  brand: {
    // Sage green - Primary
    50: '#F7FAF4',  // header bg
    100: '#F5F7F1', // page bg
    200: '#E6EDD9', // light pill / tab bg
    300: '#C9D9B5',
    400: '#A9C28F',
    500: '#8FAE75', // primary mid
    600: '#6B8F58',
    700: '#4B612C', // primary dark
    800: '#3F5424', // primary dark hover
    900: '#2A3818',
  },
  accent: {
    // Complementary olive accent
    50: '#F9FAF7',
    100: '#F0F3EB',
    200: '#E1E8D4',
    300: '#C8D6B3',
    400: '#A8BE8A',
    500: '#8FAE75',
    600: '#6B8F58',
    700: '#556F45',
    800: '#3F5234',
    900: '#2A3623',
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
    // Ultra-light green for cards/background
    50: '#F2F4EC', // section bg
    100: '#E8EDE0',
    200: '#DDE5D0',
    300: '#D1DDC0',
    400: '#C6D5B0',
    500: '#F2F4EC', // Main highlight color
  },
  text: {
    main: '#3D3D3D',
    muted: '#6B6B6B',
    inverse: '#FFFFFF',
  },
  border: {
    default: '#D8D8D8',
  },
  surfaces: {
    card: '#FFFFFF',
    section: '#F2F4EC',
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
  FormLabel: {
    baseStyle: {
      color: 'brand.700', // Dark green (#4B612C)
      fontWeight: 'semibold',
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
      bg: 'brand.100', // Neutral light background (#F5F7F1)
      color: 'text.main', // (#3D3D3D)
    },
  },
};

const theme = extendTheme({
  config,
  colors,
  components,
  styles,
  semanticTokens: {
    colors: {
      pageBg: 'brand.100',        // #F5F7F1
      headerBg: 'brand.50',        // #F7FAF4
      headerBorder: 'brand.700',   // #4B612C
      primary: 'brand.500',        // #8FAE75
      primaryDark: 'brand.700',    // #4B612C
      primaryLight: 'brand.200',   // #E6EDD9
      sectionBg: 'surfaces.section', // #F2F4EC
      cardBg: 'surfaces.card',     // #FFFFFF
      textMain: 'text.main',       // #3D3D3D
      textMuted: 'text.muted',     // #6B6B6B
      borderDefault: 'border.default', // #D8D8D8
    },
  },
});

export default theme;
