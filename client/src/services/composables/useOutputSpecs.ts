import { Ref } from '@vue/reactivity';
import { computed } from '@vue/runtime-core';
import { Indicator, Model } from '@/types/Datacube';
import { OutputSpecWithId, OutputVariableSpecs } from '@/types/Outputdata';
import { TimeseriesPointSelection } from '@/types/Timeseries';
import { ModelRun } from '@/types/ModelRun';
import { DataTransform, SPLIT_BY_VARIABLE } from '@/types/Enums';

export default function useOutputSpecs(
  selectedModelId: Ref<string | null>,
  metadata: Ref<Model | Indicator | null>,
  selectedTimeseriesPoints: Ref<TimeseriesPointSelection[]>,
  activeFeatures: Ref<OutputVariableSpecs[]>,
  modelRunData?: Ref<ModelRun[]>,
  breakdownOption?: Ref<string | null>
) {
  const outputSpecs = computed<OutputSpecWithId[]>(() => {
    const modelMetadata = metadata.value;
    if (
      selectedModelId.value === null ||
      modelMetadata === null
    ) {
      return [];
    }

    const activeModelId = modelMetadata.data_id ?? '';

    return selectedTimeseriesPoints.value.map((timeseriesInfo, indx) => {
      const { timeseriesId, scenarioId, timestamp } = timeseriesInfo;
      const transform = activeFeatures.value[indx].transform !== DataTransform.None
        ? activeFeatures.value[indx].transform
        : undefined;
      const outputSpec: OutputSpecWithId = {
        id: timeseriesId,
        modelId: activeModelId,
        runId: scenarioId,
        outputVariable: breakdownOption?.value !== SPLIT_BY_VARIABLE ? activeFeatures.value[indx].name : timeseriesId,
        timestamp,
        transform,
        temporalResolution: activeFeatures.value[indx].temporalResolution,
        temporalAggregation: activeFeatures.value[indx].temporalAggregation,
        spatialAggregation: activeFeatures.value[indx].spatialAggregation,
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
