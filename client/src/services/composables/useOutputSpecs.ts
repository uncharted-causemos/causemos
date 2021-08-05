import { Ref } from '@vue/reactivity';
import { computed } from '@vue/runtime-core';
import { Indicator, Model } from '@/types/Datacube';
import { OutputSpecWithId } from '@/types/Runoutput';
import { TimeseriesPointSelection } from '@/types/Timeseries';
import { AggregationOption, TemporalResolutionOption } from '@/types/Enums';
import { useStore } from 'vuex';

export default function useOutputSpecs(
  selectedModelId: Ref<string>,
  selectedSpatialAggregation: Ref<string>,
  selectedTemporalAggregation: Ref<string>,
  selectedTemporalResolution: Ref<string>,
  metadata: Ref<Model | Indicator | null>,
  selectedTimeseriesPoints: Ref<TimeseriesPointSelection[]>
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

    return selectedTimeseriesPoints.value.map(({ timeseriesId, scenarioId, timestamp }) => ({
      id: timeseriesId,
      modelId: activeModelId,
      runId: scenarioId,
      outputVariable: activeFeature,
      timestamp,
      temporalResolution: selectedTemporalResolution.value || TemporalResolutionOption.Month,
      temporalAggregation: selectedTemporalAggregation.value || AggregationOption.Mean,
      spatialAggregation: selectedSpatialAggregation.value || AggregationOption.Mean
    }));
  });
  return { outputSpecs };
}
