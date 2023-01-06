import {
  SpatialAggregationLevel,
  TemporalAggregationLevel,
  SPLIT_BY_VARIABLE,
} from '@/types/Enums';
import { Timeseries, TimeseriesPoint, TimeseriesPointSelection } from '@/types/Timeseries';
import { getTimestampMillis } from '@/utils/date-util';
import { isSplitByQualifierActive } from '@/utils/qualifier-util';
import { computed, Ref } from 'vue';

const isTimestampInPoints = (timestamp: number, points: TimeseriesPoint[]) => {
  return points.find((point) => point.timestamp === timestamp) !== undefined;
};

export default function useSelectedTimeseriesPoints(
  breakdownOption: Ref<string | null>,
  timeseriesData: Ref<Timeseries[]>,
  selectedTimestamp: Ref<number | null>,
  selectedScenarioIds: Ref<string[]>
) {
  const selectedTimeseriesPoints = computed<TimeseriesPointSelection[]>(() => {
    if (
      selectedTimestamp.value === null ||
      timeseriesData.value.length === 0 ||
      selectedScenarioIds.value.length === 0
    ) {
      return [];
    }
    const _selectedTimestamp = selectedTimestamp.value;
    return timeseriesData.value.map((timeseries) => {
      const { id, name, color, points } = timeseries;
      let scenarioId, timestamp;
      if (breakdownOption.value === TemporalAggregationLevel.Year) {
        // If split by year is active, each timeseries' ID is the year it represents
        const year = parseInt(id);
        const month = _selectedTimestamp;
        timestamp = getTimestampMillis(year, month);
        // Each timeseries represents a year of the same scenario
        // ASSUMPTION: breakdown by year can only be active when exactly 1 scenario
        //  is selected.
        scenarioId = selectedScenarioIds.value[0];
      } else if (breakdownOption.value === SpatialAggregationLevel.Region) {
        // If split by region is active, each timeseries' ID is the region it represents
        // Each timeseries represents a region from the same scenario
        // ASSUMPTION: breakdown by region can only be active when exactly 1 scenario
        //  is selected.
        scenarioId = selectedScenarioIds.value[0];
        // Each timeseries uses the same timestamp
        timestamp = _selectedTimestamp;
      } else if (isSplitByQualifierActive(breakdownOption.value)) {
        // If split by qualifer is active, each timeseries ID is the qualifier it
        // represents. Each timeseries represents a qualifier from the same scenario
        // ASSUMPTION: breakdown by qualifier can only be active when exactly 1 scenario
        // is selected.
        scenarioId = selectedScenarioIds.value[0];
        // Each timeseries uses the same timestamp
        timestamp = _selectedTimestamp;
      } else {
        // Split by year, region nor qualifier are active
        // Each timeseries' ID is the scenario it represents
        scenarioId = id;
        // Each timeseries uses the same timestamp
        timestamp = _selectedTimestamp;
      }
      const isTimestampInTimeseries = isTimestampInPoints(_selectedTimestamp, points);
      return {
        timeseriesId: breakdownOption.value === SPLIT_BY_VARIABLE ? name : id,
        scenarioId,
        timestamp,
        isTimestampInTimeseries,
        timeseriesName: name,
        color,
      };
    });
  });

  return {
    selectedTimeseriesPoints,
  };
}
