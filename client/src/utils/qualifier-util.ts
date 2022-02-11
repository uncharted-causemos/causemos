import { SpatialAggregationLevel, TemporalAggregationLevel, SPLIT_BY_VARIABLE } from '@/types/Enums';
import { ADMIN_LEVEL_KEYS } from '@/utils/admin-level-util';

export const QUALIFIERS_TO_EXCLUDE = [
  ...ADMIN_LEVEL_KEYS,
  'timestamp',
  'lat',
  'lng',
  'feature',
  'value'
];

export function isSplitByQualifierActive(breakdownOption: string | null) {
  if (
    breakdownOption === null ||
    breakdownOption === SpatialAggregationLevel.Region ||
    breakdownOption === TemporalAggregationLevel.Year ||
    breakdownOption === SPLIT_BY_VARIABLE
  ) return false;
  return true;
}

export default isSplitByQualifierActive;
