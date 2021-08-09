import { Ref, ref } from '@vue/reactivity';
import { computed, watchEffect } from '@vue/runtime-core';
import { Indicator, Model } from '@/types/Datacube';
import { OutputSpecWithId, RegionalAggregations } from '@/types/Runoutput';
import { getRegionAggregations } from '../runoutput-service';
import { TimeseriesPointSelection } from '@/types/Timeseries';
import { SpatialAggregationLevel } from '@/types/Enums';
import { useStore } from 'vuex';
import { DatacubeGeography } from '@/types/Common';

export default function useRegionalData(
  selectedModelId: Ref<string>,
  selectedSpatialAggregation: Ref<string>,
  selectedTemporalAggregation: Ref<string>,
  selectedTemporalResolution: Ref<string>,
  metadata: Ref<Model | Indicator | null>,
  selectedTimeseriesPoints: Ref<TimeseriesPointSelection[]>,
  breakdownOption: Ref<string | null>,
  datacubeHierarchy: Ref<DatacubeGeography | null>
) {
  const store = useStore();
  const datacubeCurrentOutputsMap = computed(() => store.getters['app/datacubeCurrentOutputsMap']);

  // Fetch regional data for selected model and scenarios
  const regionalData = ref<RegionalAggregations | null>(null);
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
  watchEffect(async onInvalidate => {
    regionalData.value = null;
    // FIXME: OPTIMIZATION: if we're careful, we can rearrange things so that the
    //  getRegionAggregations call doesn't have to wait until the datacubeHierarchy is ready
    if (outputSpecs.value.length === 0 || datacubeHierarchy.value === null) return;
    let isCancelled = false;
    onInvalidate(() => {
      isCancelled = true;
    });
    const result = await getRegionAggregations(
      outputSpecs.value,
      datacubeHierarchy.value
    );
    if (isCancelled) return;
    regionalData.value = result;
  });

  return {
    outputSpecs,
    regionalData
  };
}
