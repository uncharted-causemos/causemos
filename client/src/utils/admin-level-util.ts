export const ADMIN_LEVEL_TITLES = {
  country: 'Country',
  admin1: 'L1 admin region',
  admin2: 'L2 admin region',
  admin3: 'L3 admin region',
  admin4: 'L4 admin region',
  admin5: 'L5 admin region'
};

// Ordered list of the admin region levels
export const ADMIN_LEVEL_KEYS: (keyof typeof ADMIN_LEVEL_TITLES)[] = [
  'country',
  'admin1',
  'admin2',
  'admin3',
  'admin4',
  'admin5'
];
