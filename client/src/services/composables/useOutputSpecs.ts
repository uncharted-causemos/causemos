import { Ref } from '@vue/reactivity';
import { computed } from '@vue/runtime-core';
import { Indicator, Model } from '@/types/Datacube';
import { OutputSpecWithId } from '@/types/Runoutput';
import { TimeseriesPointSelection } from '@/types/Timeseries';
import useActiveDatacubeFeature from './useActiveDatacubeFeature';
import { ModelRun, PreGeneratedModelRunData } from '@/types/ModelRun';

export default function useOutputSpecs(
  selectedModelId: Ref<string>,
  selectedSpatialAggregation: Ref<string>,
  selectedTemporalAggregation: Ref<string>,
  selectedTemporalResolution: Ref<string>,
  metadata: Ref<Model | Indicator | null>,
  selectedTimeseriesPoints: Ref<TimeseriesPointSelection[]>,
  allModelRunData?: Ref<ModelRun[]>
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
    return selectedTimeseriesPoints.value.map(({ timeseriesId, scenarioId, timestamp }) => {
      const outputSpec: OutputSpecWithId = {
        id: timeseriesId,
        modelId: activeModelId,
        runId: scenarioId,
        outputVariable: activeFeature.value,
        timestamp,
        temporalResolution: selectedTemporalResolution.value,
        temporalAggregation: selectedTemporalAggregation.value,
        spatialAggregation: selectedSpatialAggregation.value,
        preGeneratedOutput: undefined
      };

      const pregenDataForRun = allModelRunData?.value.find(run => run.id === scenarioId)?.pre_gen_output_paths;
      if (pregenDataForRun && pregenDataForRun.length > 0) {
        // ensure that we have an array of objects each describe the pre-gen output
        // FIXME: remove this condition once the metadata schema is updated
        if (typeof pregenDataForRun[0] !== 'string') {
          outputSpec.preGeneratedOutput = pregenDataForRun as PreGeneratedModelRunData[];
        }
      }

      return outputSpec;
    });
  });
  return { outputSpecs };
}
