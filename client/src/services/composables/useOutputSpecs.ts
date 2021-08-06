import { Ref } from '@vue/reactivity';
import { computed } from '@vue/runtime-core';
import { Indicator, Model } from '@/types/Datacube';
import { OutputSpecWithId } from '@/types/Runoutput';
import { TimeseriesPointSelection } from '@/types/Timeseries';
import { SpatialAggregationLevel } from '@/types/Enums';
import { useStore } from 'vuex';

export default function useOutputSpecs(
  selectedModelId: Ref<string>,
  selectedSpatialAggregation: Ref<string>,
  selectedTemporalAggregation: Ref<string>,
  selectedTemporalResolution: Ref<string>,
  metadata: Ref<Model | Indicator | null>,
  selectedTimeseriesPoints: Ref<TimeseriesPointSelection[]>,
  breakdownOption: Ref<string | null>
) {
  const store = useStore();
  const datacubeCurrentOutputsMap = computed(() => store.getters['app/datacubeCurrentOutputsMap']);

  const outputSpecs = computed<OutputSpecWithId[]>(() => {
    const modelMetadata = metadata.value;
    if (
      selectedModelId.value === null ||
      modelMetadata === null
    ) {
      return [];
    }

    let activeFeature = '';
    const currentOutputEntry = datacubeCurrentOutputsMap.value[modelMetadata.id];
    if (currentOutputEntry !== undefined) {
      const outputs = modelMetadata.validatedOutputs ? modelMetadata.validatedOutputs : modelMetadata.outputs;
      activeFeature = outputs[currentOutputEntry].name;
    } else {
      activeFeature = modelMetadata.default_feature ?? '';
    }

    const activeModelId = modelMetadata.data_id ?? '';

    // It doesn't make sense to do a separate fetch and display a separate map
    //  for each region when "split by region" is active.
    //  Just return a single outputSpec for all of them.
    const pointsToConvertToOutputSpecs =
      breakdownOption.value === SpatialAggregationLevel.Region &&
      selectedTimeseriesPoints.value.length > 0
        ? [selectedTimeseriesPoints.value[0]]
        : selectedTimeseriesPoints.value;

    return pointsToConvertToOutputSpecs.map(({ timeseriesId, scenarioId, timestamp }) => ({
      id: timeseriesId,
      modelId: activeModelId,
      runId: scenarioId,
      outputVariable: activeFeature,
      timestamp,
      temporalResolution: selectedTemporalResolution.value,
      temporalAggregation: selectedTemporalAggregation.value,
      spatialAggregation: selectedSpatialAggregation.value
    }));
  });
  return { outputSpecs };
}
