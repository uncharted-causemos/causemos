import { definePreset } from '@primevue/themes';
import Aura from '@primevue/themes/aura';

export default definePreset(Aura, {
  semantic: {
    primary: {
      50: '#FAF5FF',
      100: '#F3E8FE',
      200: '#E9D5FD',
      300: '#CDB4FB',
      400: '#BA97F7',
      500: '#8858E9',
      600: '#7740D6',
      700: '#5D3AAE',
      800: '#514398',
      900: '#3A306E',
      950: '#292556',
    },
    colorScheme: {
      light: {
        surface: {
          0: '#ffffff',
          50: '{gray.50}',
          100: '{gray.100}',
          200: '{gray.200}',
          300: '{gray.300}',
          400: '{gray.400}',
          500: '{gray.500}',
          600: '{gray.600}',
          700: '{gray.700}',
          800: '{gray.800}',
          900: '{gray.900}',
          950: '{gray.950}',
        },
      },
    },
  },
});
