import { getModelRunMetadata } from '@/services/datacube-service';
import { BreakdownState, Indicator, Model } from '@/types/Datacube';
import { getRegionIdDisplayName } from '@/utils/admin-level-util';
import {
  getOutput,
  isBreakdownStateNone,
  isBreakdownStateOutputs,
  isBreakdownStateRegions,
  isBreakdownStateYears,
} from '@/utils/datacube-util';
import { Ref, ref, watch } from 'vue';

const NAME_NOT_FOUND_INDICATOR = '--';

export default function useOutputSpecDisplayNames(
  breakdownState: Ref<BreakdownState | null>,
  metadata: Ref<Model | Indicator | null>
) {
  const displayNames = ref<{ [outputSpecId: string]: string }>({});
  watch(
    [breakdownState, metadata],
    async () => {
      const state = breakdownState.value;
      const _metadata = metadata.value;
      if (state === null || _metadata === null) return '';
      const result: { [outputSpecId: string]: string } = {};
      if (isBreakdownStateNone(state)) {
        const modelRuns = await getModelRunMetadata(_metadata.data_id);
        state.modelRunIds.forEach((modelRunId) => {
          result[modelRunId] =
            modelRuns.find((run) => run.id === modelRunId)?.name ?? NAME_NOT_FOUND_INDICATOR;
        });
      } else if (isBreakdownStateOutputs(state)) {
        state.outputNames.forEach((outputName) => {
          result[outputName] =
            getOutput(_metadata, outputName)?.display_name ?? NAME_NOT_FOUND_INDICATOR;
        });
      } else if (isBreakdownStateRegions(state)) {
        state.regionIds.forEach((regionId) => {
          result[regionId] = getRegionIdDisplayName(regionId);
        });
      } else if (isBreakdownStateYears(state)) {
        state.years.forEach((year) => {
          result[year] = year;
        });
      } else {
        state.qualifierValues.forEach((qualifierValue) => {
          result[qualifierValue] = qualifierValue;
        });
      }
      displayNames.value = result;
    },
    { immediate: true }
  );

  const getOutputSpecName = (outputSpecId: string) =>
    displayNames.value[outputSpecId] ?? NAME_NOT_FOUND_INDICATOR;

  return { getOutputSpecName };
}
