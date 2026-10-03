import { extendTheme } from '@chakra-ui/react';
import type { ThemeConfig } from '@chakra-ui/react';

const config: ThemeConfig = {
  initialColorMode: 'light',
  useSystemColorMode: false,
};

const theme = extendTheme({
  config,
  colors: {
    brand: {
      50: '#f5f0ff',
      100: '#e9dcff',
      200: '#d4bbff',
      300: '#b98cff',
      400: '#a05efb',
      500: '#8b3cf0',
      600: '#7229d1',
      700: '#5b21a6',
      800: '#431a78',
      900: '#2c114f',
    },
    accent: {
      50: '#fff0f7',
      100: '#ffd6ea',
      200: '#ffadd5',
      300: '#ff7ab8',
      400: '#f94c9b',
      500: '#ec2a82',
      600: '#c91d6a',
      700: '#a01553',
      800: '#780f3e',
      900: '#4f0a29',
    },
  },
  fonts: {
    heading: `'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif`,
    body: `'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif`,
  },
  styles: {
    global: {
      body: {
        bg: 'white',
        color: 'gray.800',
      },
    },
  },
  components: {
    Button: {
      defaultProps: { colorScheme: 'brand' },
    },
  },
});

export default theme;
