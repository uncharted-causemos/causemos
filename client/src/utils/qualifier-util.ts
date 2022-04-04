import {
  SpatialAggregationLevel,
  TemporalAggregationLevel,
  SPLIT_BY_VARIABLE,
  FeatureQualifierRoles
} from '@/types/Enums';
import { ADMIN_LEVEL_KEYS } from '@/utils/admin-level-util';
import { FeatureQualifier } from '@/types/Datacube';

export const QUALIFIERS_TO_EXCLUDE = [
  ...ADMIN_LEVEL_KEYS,
  'timestamp',
  'lat',
  'lng',
  'feature',
  'value'
];

export function isBreakdownQualifier(qualifier: FeatureQualifier) {
  const notInExcludeList = !QUALIFIERS_TO_EXCLUDE.includes(qualifier.name);
  return notInExcludeList && (
    !qualifier.qualifier_role || // most qualifiers will have this field missing
    qualifier.qualifier_role === FeatureQualifierRoles.Breakdown);
}

export function isSplitByQualifierActive(breakdownOption: string | null) {
  if (
    breakdownOption === null ||
    breakdownOption === SpatialAggregationLevel.Region ||
    breakdownOption === TemporalAggregationLevel.Year ||
    breakdownOption === SPLIT_BY_VARIABLE
  ) return false;
  return true;
}
