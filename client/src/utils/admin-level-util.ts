import { AdminLevel } from '@/types/Enums';

export const ADMIN_LEVEL_TITLES: { [key in AdminLevel]: string } = {
  country: 'Country',
  admin1: 'L1 admin region',
  admin2: 'L2 admin region',
  admin3: 'L3 admin region',
  admin4: 'L4 admin region',
  admin5: 'L5 admin region'
};

// Ordered list of the admin region levels
export const ADMIN_LEVEL_KEYS = Object.values(AdminLevel);
