import { TemporalAggregationLevel } from '@/types/Enums';
import {
  Timeseries,
  TimeseriesPoint,
  TimeseriesPointSelection
} from '@/types/Timeseries';
import { getTimestamp } from '@/utils/date-util';
import { computed, Ref } from 'vue';

const isTimestampInPoints = (timestamp: number, points: TimeseriesPoint[]) => {
  return points.find(point => point.timestamp === timestamp) !== undefined;
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
    return timeseriesData.value.map(timeseries => {
      const { id, name, color, points } = timeseries;
      let scenarioId, timestamp;
      if (breakdownOption.value === TemporalAggregationLevel.Year) {
        // If split by year is active, each timeseries' ID is the year it represents
        const year = parseInt(id);
        const month = _selectedTimestamp;
        timestamp = getTimestamp(year, month);
        // Each timeseries represents a year of the same scenario
        // ASSUMPTION: breakdown by year can only be active when exactly 1 scenario
        //  is selected.
        scenarioId = selectedScenarioIds.value[0];
      } else {
        // Split by year is not active
        // Each timeseries' ID is the scenario it represents
        scenarioId = id;
        // Each timeseries uses the same timestamp
        timestamp = _selectedTimestamp;
      }
      const isTimestampInTimeseries = isTimestampInPoints(
        _selectedTimestamp,
        points
      );
      return {
        scenarioId,
        timestamp,
        isTimestampInTimeseries,
        timeseriesName: name,
        color
      };
    });
  });

  return {
    selectedTimeseriesPoints
  };
}
