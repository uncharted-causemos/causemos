import { Model, ModelParameter } from '../../types/Datacube';
import { computed, ref, Ref, watchEffect } from 'vue';
import { ScenarioData } from '../../types/Common';
import { ModelRun } from '@/types/ModelRun';
import { ModelRunStatus } from '@/types/Enums';

/**
 * Takes a model ID and a list of scenario IDs, fetches
 * the data necessary to render the parallel coordinates chart, and
 * transforms it into several structures that the PC chart accepts.
 */
export default function useParallelCoordinatesData(
  metadata: Ref<Model | null>,
  allModelRunData: Ref<ModelRun[]>
) {
  const runParameterValues = ref<ScenarioData[]>([]);

  watchEffect(onInvalidate => {
    runParameterValues.value = [];
    if (allModelRunData.value.length === 0 || metadata.value === null) {
      return [];
    }
    let isCancelled = false;

    const outputParameterName = metadata.value.outputs[0].name ?? 'Undefined output parameter';

    const processModelRunsToParallelCoordinatesData = async function() {
      if (isCancelled) {
        // Dependencies have changed since the fetch started, so ignore the
        //  fetch results to avoid a race condition.
        return;
      }
      runParameterValues.value = allModelRunData.value.map((modelRun, runIndex) => {
        const run_id = allModelRunData.value[runIndex].id;
        const runStatus = allModelRunData.value[runIndex].status;
        const run: ScenarioData = {
          run_id,
          status: runStatus ?? ModelRunStatus.Ready
        };
        if (run.status === ModelRunStatus.Ready) {
          // FIXME: assume the first feature is the primary one by default
          const output_agg_values = allModelRunData.value[runIndex].output_agg_values[0].value;
          run[outputParameterName] = output_agg_values;
        }
        modelRun.parameters.forEach(({ name, value }) => {
          run[name ?? 'undefined'] = value;
        });
        return run;
      });
    };
    onInvalidate(() => {
      isCancelled = true;
    });
    processModelRunsToParallelCoordinatesData();
  });

  const dimensions = computed(() => {
    if (metadata.value === null) {
      return [];
    }

    // Restructure the output parameter
    const outputDimension = metadata.value.outputs[0];
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
