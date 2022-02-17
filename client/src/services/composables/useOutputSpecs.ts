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
  activeFeature?: Ref<string>,
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
      const featureInfo = (breakdownOption?.value === SPLIT_BY_VARIABLE ? activeFeatures.value[indx] : activeFeatures.value.find(f => f.name === activeFeature?.value)) ?? activeFeatures.value[indx];
      const transform = featureInfo.transform !== DataTransform.None
        ? featureInfo.transform
        : undefined;
      const outputVariable = breakdownOption?.value === SPLIT_BY_VARIABLE ? timeseriesId : activeFeature?.value ?? activeFeatures.value[indx].name;

      // In split-by-variable the scenarioId is runId.concat(outputVariable)
      // Need to undo that so we can fetch data properly
      const runId = (breakdownOption?.value === SPLIT_BY_VARIABLE && scenarioId.endsWith(outputVariable))
        ? scenarioId.slice(0, -outputVariable.length)
        : scenarioId;
      const outputSpec: OutputSpecWithId = {
        id: timeseriesId,
        modelId: activeModelId,
        runId: runId,
        outputVariable,
        timestamp,
        transform,
        temporalResolution: featureInfo.temporalResolution,
        temporalAggregation: featureInfo.temporalAggregation,
        spatialAggregation: featureInfo.spatialAggregation,
        preGeneratedOutput: undefined,
        isDefaultRun: false
      };

      const runModelData = modelRunData?.value.find(run => run.id === runId);
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
