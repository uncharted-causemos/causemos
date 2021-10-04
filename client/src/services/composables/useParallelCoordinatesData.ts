import { Indicator, Model, ModelParameter } from '../../types/Datacube';
import { computed, ref, Ref } from 'vue';
import { ScenarioData } from '../../types/Common';
import { ModelRun } from '@/types/ModelRun';
import { ModelRunStatus } from '@/types/Enums';
import { useStore } from 'vuex';
import { isModel } from '@/utils/datacube-util';

/**
 * Takes a model ID and a list of scenario IDs, fetches
 * the data necessary to render the parallel coordinates chart, and
 * transforms it into several structures that the PC chart accepts.
 */
export default function useParallelCoordinatesData(
  metadata: Ref<Model | Indicator | null>,
  allModelRunData: Ref<ModelRun[]>
) {
  const store = useStore();
  const datacubeCurrentOutputsMap = computed(() => store.getters['app/datacubeCurrentOutputsMap']);
  const currentOutputIndex = computed(() => metadata.value?.id !== undefined ? datacubeCurrentOutputsMap.value[metadata.value?.id] : 0);

  const runParameterValues = computed(() => {
    if (allModelRunData.value.length === 0 || metadata.value === null || currentOutputIndex.value === undefined) {
      return [];
    }
    const outputs = metadata.value?.validatedOutputs ? metadata.value?.validatedOutputs : metadata.value?.outputs;
    const outputParameterName = outputs[currentOutputIndex.value].name ?? 'Undefined output parameter';
    return allModelRunData.value.filter(modelRun => modelRun.status !== ModelRunStatus.Deleted).map(modelRun => {
      const run_id = modelRun.id;
      const runStatus = modelRun.status;
      const created_at = modelRun.created_at;
      const run: ScenarioData = {
        created_at,
        run_id,
        status: runStatus ?? ModelRunStatus.Ready
      };
      if (run.status === ModelRunStatus.Ready) {
        const currRunData = modelRun;
        const outputValue = currRunData.output_agg_values.find(val => val.name === outputParameterName);
        if (outputValue) {
          run[outputParameterName] = outputValue.value;
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

  const dimensions = computed(() => {
    if (metadata.value === null || !isModel(metadata.value)) {
      return [];
    }
    const outputs = metadata.value?.validatedOutputs ? metadata.value?.validatedOutputs : metadata.value?.outputs;

    // Restructure the output parameter
    const outputDimension = outputs[currentOutputIndex.value];
    const inputDimensions = metadata.value.parameters;
    // Append the output parameter to the list of input parameters
    return [...inputDimensions, outputDimension] as ModelParameter[];
  });

  // The parallel coordinates component expects data as a collection of name/value pairs
  //  (see ScenarioData)
  //  e.g., [
  //    { dim1: value11, dim2: value12 },
  //    { dim1: value21, dim2: value22 }
  // ]

  // @HACK: this is not needed, but left in case quick testing of the ordinal capability is needed
  const ordinalDimensionNames = ref([]);

  const drilldownDimensions = computed(() =>
    dimensions.value.filter(p => p.is_drilldown)
  );

  return {
    dimensions,
    ordinalDimensionNames,
    drilldownDimensions,
    runParameterValues
  };
}
