import { Ref } from '@vue/reactivity';
import { computed } from '@vue/runtime-core';
import { Indicator, Model } from '@/types/Datacube';
import { OutputSpecWithId, FeatureConfig } from '@/types/Outputdata';
import { TimeseriesPointSelection } from '@/types/Timeseries';
import { ModelRun } from '@/types/ModelRun';
import { DataTransform, SPLIT_BY_VARIABLE } from '@/types/Enums';

export default function useOutputSpecs(
  selectedModelId: Ref<string | null>,
  metadata: Ref<Model | Indicator | null>,
  selectedTimeseriesPoints: Ref<TimeseriesPointSelection[]>,
  activeFeatures: Ref<FeatureConfig[]>,
  activeFeature?: Ref<string>,
  modelRunData?: Ref<ModelRun[]>,
  breakdownOption?: Ref<string | null>
) {
  const outputSpecs = computed<OutputSpecWithId[]>(() => {
    const modelMetadata = metadata.value;
    if (
      selectedModelId.value === null ||
      modelMetadata === null ||
      activeFeatures.value.length === 0
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
      const featureName = breakdownOption?.value === SPLIT_BY_VARIABLE ? timeseriesId : activeFeature?.value ?? activeFeatures.value[indx].name;

      // ensure we have proper aggregations and resolutions when in split by variable
      let temporalResolution = featureInfo.temporalResolution;
      let temporalAggregation = featureInfo.temporalAggregation;
      let spatialAggregation = featureInfo.spatialAggregation;
      if (breakdownOption?.value === SPLIT_BY_VARIABLE) {
        if (!temporalResolution || !temporalAggregation || !spatialAggregation) {
          // a few fallback cases:
          // - try the feature that matches the activeFeature.name (default behaviour when not in split-by-variable)
          // - get the first feature that has aggregation and feature values
          let feature = activeFeatures.value.find(f => f.name === activeFeature?.value);
          if (!feature || !feature.temporalResolution || !feature.temporalAggregation || !feature.spatialAggregation) {
            feature = activeFeatures.value.find(f => f.temporalResolution && f.temporalAggregation && f.spatialAggregation);
          }

          temporalResolution = feature?.temporalResolution ?? temporalResolution;
          temporalAggregation = feature?.temporalAggregation ?? temporalAggregation;
          spatialAggregation = feature?.spatialAggregation ?? spatialAggregation;
        }
      }

      // In split-by-variable the scenarioId is runId.concat(featureName)
      // Need to undo that so we can fetch data properly
      const runId = (breakdownOption?.value === SPLIT_BY_VARIABLE && scenarioId.endsWith(featureName))
        ? scenarioId.slice(0, -featureName.length)
        : scenarioId;
      const outputSpec: OutputSpecWithId = {
        id: timeseriesId,
        modelId: activeModelId,
        runId: runId,
        outputVariable: featureName,
        timestamp,
        transform,
        temporalResolution,
        temporalAggregation,
        spatialAggregation,
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
    }).filter(os => os.timestamp !== undefined && !isNaN(os.timestamp));
  });
  return { outputSpecs };
}
