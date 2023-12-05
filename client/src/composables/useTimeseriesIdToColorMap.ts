import { BreakdownState } from '@/types/Datacube';
import { colorFromIndex } from '@/utils/colors-util';
import {
  isBreakdownStateNone,
  isBreakdownStateOutputs,
  isBreakdownStateQualifiers,
  isBreakdownStateRegions,
  isBreakdownStateYears,
} from '@/utils/datacube-util';
import { Ref, computed } from 'vue';

export default function useTimeseriesIdToColorMap(breakdownState: Ref<BreakdownState | null>) {
  const timeseriesIdToColorMap = computed<Map<string, string>>(() => {
    const state = breakdownState.value;
    const result = new Map<string, string>();
    if (state === null) {
      return result;
    }
    if (isBreakdownStateNone(state)) {
      state.modelRunIds.forEach((runId, index) => result.set(runId, colorFromIndex(index)));
    } else if (isBreakdownStateOutputs(state)) {
      state.outputNames.forEach((outputName, index) =>
        result.set(outputName, colorFromIndex(index))
      );
    } else if (isBreakdownStateRegions(state)) {
      state.regionIds.forEach((regionId, index) => result.set(regionId, colorFromIndex(index)));
    } else if (isBreakdownStateYears(state)) {
      state.years.forEach((year, index) => result.set(year, colorFromIndex(index)));
    } else if (isBreakdownStateQualifiers(state)) {
      state.qualifierValues.forEach((qualifierValue, index) =>
        result.set(qualifierValue, colorFromIndex(index))
      );
    }
    return result;
  });

  const getColorFromTimeseriesId = (timeseriesId: string) =>
    timeseriesIdToColorMap.value.get(timeseriesId) ?? '#000';

  return { getColorFromTimeseriesId };
}
