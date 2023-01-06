import dateFormatter from '@/formatters/date-formatter';
import { getTimestampMillis } from '@/utils/date-util';
import { TemporalAggregationLevel, TemporalResolutionOption } from '@/types/Enums';

export default function (
  timestamp: number,
  breakdownOption: string | null,
  temporalResolution: TemporalResolutionOption | null
) {
  if (breakdownOption === TemporalAggregationLevel.Year) {
    // We're only displaying the month, so the year doesn't matter
    return dateFormatter(getTimestampMillis(1970, timestamp), 'MMMM');
  }
  return dateFormatter(
    timestamp,
    temporalResolution === TemporalResolutionOption.Year ? 'YYYY' : 'MMMM YYYY'
  );
}
