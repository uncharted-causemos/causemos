import { Ref } from '@vue/reactivity';
import { computed } from '@vue/runtime-core';
import { Indicator, Model } from '@/types/Datacube';
import { OutputSpecWithId } from '@/types/Runoutput';
import { TimeseriesPointSelection } from '@/types/Timeseries';
import useActiveDatacubeFeature from './useActiveDatacubeFeature';
import { ModelRun } from '@/types/ModelRun';
import { DataTransform } from '@/types/Enums';

export default function useOutputSpecs(
  selectedModelId: Ref<string | null>,
  selectedSpatialAggregation: Ref<string>,
  selectedTemporalAggregation: Ref<string>,
  selectedTemporalResolution: Ref<string>,
  selectedTransform: Ref<DataTransform>,
  metadata: Ref<Model | Indicator | null>,
  selectedTimeseriesPoints: Ref<TimeseriesPointSelection[]>,
  modelRunData?: Ref<ModelRun[]>
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
    const transform = selectedTransform.value !== DataTransform.None
      ? selectedTransform.value
      : undefined;
    return selectedTimeseriesPoints.value.map(({ timeseriesId, scenarioId, timestamp }) => {
      const outputSpec: OutputSpecWithId = {
        id: timeseriesId,
        modelId: activeModelId,
        runId: scenarioId,
        outputVariable: activeFeature.value,
        timestamp,
        transform,
        temporalResolution: selectedTemporalResolution.value,
        temporalAggregation: selectedTemporalAggregation.value,
        spatialAggregation: selectedSpatialAggregation.value,
        preGeneratedOutput: undefined,
        isDefaultRun: false
      };

      const runModelData = modelRunData?.value.find(run => run.id === scenarioId);
      const pregenDataForRun = runModelData?.pre_gen_output_paths;
      if (pregenDataForRun && pregenDataForRun.length > 0) {
        outputSpec.preGeneratedOutput = pregenDataForRun;
      }
      if (runModelData) {
        outputSpec.isDefaultRun = runModelData.is_default_run;
      }

      return outputSpec;
    }).filter(os => !isNaN(os.timestamp));
  });
  return { outputSpecs };
}
