import _ from 'lodash';
import { BreakdownData } from '@/types/Datacubes';
import { Ref, ref } from '@vue/reactivity';
import { watchEffect } from '@vue/runtime-core';
import API from '@/api/api';
import { Model } from '@/types/Datacube';

export default function useRegionalData(
  selectedModelId: Ref<string>,
  selectedScenarioIds: Ref<string[]>,
  selectedTimestamp: Ref<number | null>,
  selectedSpatialAggregation: Ref<string>,
  selectedTemporalAggregation: Ref<string>,
  selectedTemporalResolution: Ref<string>,
  metadata: Ref<Model | null>
) {
  // Fetch regional-data for selected model and scenarios
  // FIXME: this code contains a race condition if the selected model or
  //  scenario IDs were to change quickly and the promise sets completed
  //  out of order.
  const regionalData = ref<BreakdownData[]>([]);
  watchEffect(async () => {
    regionalData.value = [];
    const modelMetadata = metadata.value;
    if (
      selectedModelId.value === null ||
      selectedScenarioIds.value.length === 0 ||
      selectedTimestamp.value === null ||
      modelMetadata === null
    ) {
      return;
    }
    const spatialAggregation =
      selectedSpatialAggregation.value === ''
        ? 'mean'
        : selectedSpatialAggregation.value;
    const promises = selectedScenarioIds.value.map(scenarioId =>
      API.get('/maas/output/regional-data', {
        params: {
          model_id: selectedModelId.value,
          run_id: scenarioId,
          feature: modelMetadata.outputs[0].name,
          resolution: selectedTemporalResolution.value,
          temporal_agg: selectedTemporalAggregation.value,
          spatial_agg: spatialAggregation,
          timestamp: selectedTimestamp.value
        }
      })
    );
    const allRegionalData = (await Promise.all(promises)).map(response => {
      const data = response.data;
      return _.isEmpty(data) ? {} : data;
    });
    if (_.some(allRegionalData, response => _.isEmpty(response))) {
      return;
    }
    regionalData.value = allRegionalData;
  });
  return regionalData;
}
