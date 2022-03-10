import { Indicator, Model } from '../../types/Datacube';
import { computed, ref, Ref } from 'vue';
import { ScenarioData } from '../../types/Common';
import { ModelRun } from '@/types/ModelRun';
import { AggregationOption, ModelRunStatus } from '@/types/Enums';
import { getAggregationKey, getOutputs } from '@/utils/datacube-util';
import useActiveDatacubeFeature from './useActiveDatacubeFeature';

/**
 * Takes a model ID and a list of scenario IDs, fetches
 * the data necessary to render the parallel coordinates chart, and
 * transforms it into several structures that the PC chart accepts.
 */
export default function useParallelCoordinatesData(
  metadata: Ref<Model | Indicator | null>,
  modelRunData: Ref<ModelRun[]>
) {
  const { currentOutputIndex } = useActiveDatacubeFeature(metadata, ref(undefined));

  const runParameterValues = computed(() => {
    if (modelRunData.value.length === 0 || metadata.value === null || currentOutputIndex.value === undefined) {
      return [];
    }
    const outputs = getOutputs(metadata.value);
    const outputParameterName = outputs[currentOutputIndex.value].name ?? 'Undefined output parameter';
    return modelRunData.value.map(modelRun => {
      const run_id = modelRun.id;
      const runStatus = modelRun.status;
      const created_at = modelRun.created_at;
      const is_default_run = modelRun.is_default_run ? 1 : 0;
      const run: ScenarioData = {
        created_at,
        is_default_run,
        run_id,
        status: runStatus ?? ModelRunStatus.Ready
      };
      if (run.status === ModelRunStatus.Ready) {
        // TODO: This needs to depend on the selected aggregation functions
        const aggKey = getAggregationKey(AggregationOption.Mean, AggregationOption.Mean);
        const outputValue = modelRun.output_agg_values.find(val => val.name === outputParameterName);
        if (outputValue && outputValue[aggKey]) {
          run[outputParameterName] = outputValue[aggKey];
        } else {
          console.warn('Missing output value for run: ' + run_id);
        }
      }
      modelRun.parameters.forEach(({ name, value }) => {
        run[name ?? 'undefined'] = value;
      });
      return run;
    });
  });

  return {
    runParameterValues
  };
}
