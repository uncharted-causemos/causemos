import { ADMIN_LEVEL_KEYS } from '@/utils/admin-level-util';

export const QUALIFIERS_TO_EXCLUDE = [
  ...ADMIN_LEVEL_KEYS,
  'timestamp',
  'lat',
  'lng',
  'feature',
  'value'
];
