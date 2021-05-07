import useModelMetadata from './useModelMetadata';
import useScenarioData from './useScenarioData';
import { Model, ModelParameter } from '../../types/Model';
import { computed, ref, Ref } from 'vue';
import { ScenarioData } from '../../types/Common';
import { getRandomNumber } from '../../../tests/utils/random';

// FIXME: need an endpoint to fetch such aggregations for all scenarios
// FIXME
const OUTPUT_AGGREGATIONS: { [key: string]: number } = {
  '28ba629b-8e7c-4ff4-9485-7a7be3ed75ba': 0.1570271866,
  'e39a3296-5fa0-4f63-8b5e-81be2e182455': 0.0700502704,
  '8b886e51-38c9-46bf-95fa-8c41b6e85b57': 0.3211381196
};

/**
 * Takes a model ID and a list of scenario IDs, fetches
 * the data necessary to render the parallel coordinates chart, and
 * transforms it into several structures that the PC chart accepts.
 */
export default function useParallelCoordinatesData(
  modelId: Ref<string>
) {
  const allModelRunData = useScenarioData(modelId);
  const metadata = useModelMetadata(modelId) as Ref<Model | null>;

  const runParameterValues = computed(() => {
    if (allModelRunData.value.length === 0 || metadata.value === null) {
      return [];
    }
    const outputParameterName =
      metadata.value.outputs[0].name ?? 'Undefined output parameter';
    return allModelRunData.value.map((modelRun, runIndex) => {
      const run_id = allModelRunData.value[runIndex].id;
      const runStatus = allModelRunData.value[runIndex].status;
      const run: ScenarioData = {
        run_id,
        status: runStatus ?? 'READY'
      };
      if (runStatus === 'READY') {
        run[outputParameterName] = OUTPUT_AGGREGATIONS[run_id] ?? getRandomNumber(0, 1);
      }
      modelRun.parameters.forEach(({ name, value }) => {
        run[name ?? 'undefined'] = value;
      });
      return run;
    });
  });

  const dimensions = computed(() => {
    if (metadata.value === null) {
      return [];
    }
    // Restructure the output parameter
    const { name, display_name, description } = metadata.value.outputs[0];
    const baselineRunID = allModelRunData.value.find(run => run.is_default_run)
      ?.id;
    const defaultOutputValue = OUTPUT_AGGREGATIONS[baselineRunID ?? 0];
    const outputDimension = {
      name,
      display_name,
      description,
      is_output: true,
      type: '', // FIXME
      default: defaultOutputValue
    };
    const inputDimensions = metadata.value.parameters.filter(p => p.name !== 'country');
    // Append the output parameter to the list of input parameters
    return [...inputDimensions, outputDimension] as ModelParameter[];
  });

  // TODO: use each axis min/max based on the metadata

  // The parallel coordinates component expects data as a collection of name/value pairs
  //  (see ScenarioData)
  //  e.g., [
  //    { dim1: value11, dim2: value12 },
  //    { dim1: value21, dim2: value22 }
  // ]

  // HACK: force 'rainfall_multiplier' to be ordinal
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
