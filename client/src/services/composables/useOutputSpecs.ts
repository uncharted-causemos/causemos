import { Ref } from '@vue/reactivity';
import { computed } from '@vue/runtime-core';
import { Indicator, Model } from '@/types/Datacube';
import { OutputSpecWithId } from '@/types/Runoutput';
import { TimeseriesPointSelection } from '@/types/Timeseries';
import useActiveDatacubeFeature from './useActiveDatacubeFeature';

export default function useOutputSpecs(
  selectedModelId: Ref<string>,
  selectedSpatialAggregation: Ref<string>,
  selectedTemporalAggregation: Ref<string>,
  selectedTemporalResolution: Ref<string>,
  metadata: Ref<Model | Indicator | null>,
  selectedTimeseriesPoints: Ref<TimeseriesPointSelection[]>
) {
  const { activeFeature } = useActiveDatacubeFeature(metadata);
  const outputSpecs = computed<OutputSpecWithId[]>(() => {
    const modelMetadata = metadata.value;
    if (
      selectedModelId.value === null ||
      modelMetadata === null
    ) {
      return [];
    }

    const activeModelId = modelMetadata.data_id ?? '';
    return selectedTimeseriesPoints.value.map(({ timeseriesId, scenarioId, timestamp }) => ({
      id: timeseriesId,
      modelId: activeModelId,
      runId: scenarioId,
      outputVariable: activeFeature.value,
      timestamp,
      temporalResolution: selectedTemporalResolution.value,
      temporalAggregation: selectedTemporalAggregation.value,
      spatialAggregation: selectedSpatialAggregation.value
    }));
  });
  return { outputSpecs };
}
