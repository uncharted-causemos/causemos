import { Ref } from '@vue/reactivity';
import { computed } from '@vue/runtime-core';
import { BreakdownState, Indicator, Model } from '@/types/Datacube';
import { OutputSpecWithId } from '@/types/Outputdata';
import { AggregationOption, TemporalResolutionOption } from '@/types/Enums';
import {
  isBreakdownStateNone,
  isBreakdownStateOutputs,
  isBreakdownStateRegions,
  isBreakdownStateYears,
} from '@/utils/datacube-util';

export default function useOutputSpecsFromBreakdownState(
  breakdownState: Ref<BreakdownState | null>,
  metadata: Ref<Model | Indicator | null>,
  spatialAggregationMethod: Ref<AggregationOption>,
  temporalAggregationMethod: Ref<AggregationOption>,
  temporalResolution: Ref<TemporalResolutionOption>,
  selectedTimestamp: Ref<number | null>
) {
  const outputSpecs = computed<OutputSpecWithId[]>(() => {
    const _metadata = metadata.value;
    const _timestamp = selectedTimestamp.value;
    const _breakdownState = breakdownState.value;
    if (_metadata === null || _timestamp === null || _breakdownState === null) {
      return [];
    }

    const createOutputSpec = (outputSpecId: string, runId: string, outputVariable: string) => {
      const outputSpec: OutputSpecWithId = {
        id: outputSpecId,
        modelId: _metadata.data_id,
        runId,
        outputVariable,
        timestamp: _timestamp,
        transform: undefined,
        temporalResolution: temporalResolution.value,
        temporalAggregation: temporalAggregationMethod.value,
        spatialAggregation: spatialAggregationMethod.value,
        preGeneratedOutput: undefined,
        isDefaultRun: false,
      };
      return outputSpec;
    };

    if (isBreakdownStateOutputs(_breakdownState)) {
      return _breakdownState.outputNames.map((outputName) =>
        createOutputSpec(outputName, _breakdownState.modelRunId, outputName)
      );
    } else if (isBreakdownStateNone(_breakdownState)) {
      return _breakdownState.modelRunIds.map((modelRunId) =>
        createOutputSpec(modelRunId, modelRunId, _breakdownState.outputName)
      );
    } else if (isBreakdownStateYears(_breakdownState)) {
      return _breakdownState.years.map((year) =>
        createOutputSpec(year, _breakdownState.modelRunId, _breakdownState.outputName)
      );
    } else if (isBreakdownStateRegions(_breakdownState)) {
      return _breakdownState.regionIds.map((regionId) =>
        createOutputSpec(regionId, _breakdownState.modelRunId, _breakdownState.outputName)
      );
    } else {
      // isBreakdownStateQualifiers(_breakdownState)
      return _breakdownState.qualifierValues.map((qualifierValue) =>
        createOutputSpec(qualifierValue, _breakdownState.modelRunId, _breakdownState.outputName)
      );
    }
  });
  return { outputSpecs };
}
