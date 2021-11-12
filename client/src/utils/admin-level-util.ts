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

export const REGION_ID_DELIMETER = '__'; // Used to construct full GADM path as the shape file vector source for map rendering
export const REGION_ID_DISPLAY_DELIMETER = ', '; // Used for nicer display of GADM name/path in the UI
