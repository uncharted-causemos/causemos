import { Ref, ref } from '@vue/reactivity';
import { computed, watchEffect } from '@vue/runtime-core';
import { Model } from '@/types/Datacube';
import { OutputSpecWithId, RegionalAggregations } from '@/types/Runoutput';
import { getRegionAggregations } from '../runoutput-service';

export default function useRegionalData(
  selectedModelId: Ref<string>,
  selectedScenarioIds: Ref<string[]>,
  selectedTimestamp: Ref<number | null>,
  selectedSpatialAggregation: Ref<string>,
  selectedTemporalAggregation: Ref<string>,
  selectedTemporalResolution: Ref<string>,
  metadata: Ref<Model | null>
) {
  // Fetch regional data for selected model and scenarios
  const regionalData = ref<RegionalAggregations | null>(null);
  const outputSpecs = computed<OutputSpecWithId[]>(() => {
    const modelMetadata = metadata.value;
    const timestamp = selectedTimestamp.value;
    if (
      selectedModelId.value === null ||
      selectedScenarioIds.value.length === 0 ||
      timestamp === null ||
      modelMetadata === null
    ) {
      return [];
    }
    return selectedScenarioIds.value.map(selectedScenarioId => ({
      id: selectedScenarioId,
      modelId: selectedModelId.value,
      runId: selectedScenarioId,
      outputVariable: modelMetadata.outputs[0].name || '',
      timestamp,
      temporalResolution: selectedTemporalResolution.value || 'month',
      temporalAggregation: selectedTemporalAggregation.value || 'mean',
      spatialAggregation: selectedSpatialAggregation.value || 'mean'
    }));
  });
  watchEffect(async onInvalidate => {
    regionalData.value = null;
    if (outputSpecs.value.length === 0) return;
    let isCancelled = false;
    onInvalidate(() => { isCancelled = true; });
    const result = await getRegionAggregations(outputSpecs.value);
    if (isCancelled) return;
    regionalData.value = result;
  });
  return {
    outputSpecs,
    regionalData
  };
}
