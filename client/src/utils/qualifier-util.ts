import { SpatialAggregationLevel, TemporalAggregationLevel } from '@/types/Enums';
import { ADMIN_LEVEL_KEYS } from '@/utils/admin-level-util';

export const QUALIFIERS_TO_EXCLUDE = [
  ...ADMIN_LEVEL_KEYS,
  'timestamp',
  'lat',
  'lng',
  'feature',
  'value'
];


export default function isQualifierActive(breakdownOption: string | null) {
  if (
    breakdownOption === null ||
    breakdownOption === SpatialAggregationLevel.Region ||
    breakdownOption === TemporalAggregationLevel.Year
  ) return false;
  return true;
}
