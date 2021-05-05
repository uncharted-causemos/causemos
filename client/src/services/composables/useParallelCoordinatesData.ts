import useModelMetadata from './useModelMetadata';
import useScenarioData from './useScenarioData';
import { Model, ModelParameter } from '../../types/Model';
import { computed, ref, Ref } from 'vue';
import { ScenarioData } from '../../types/Common';

// FIXME: need an endpoint to fetch such aggregations for all scenarios
const OUTPUT_AGGREGATIONS: { [key: string]: number } = {
  '2d80c9f0-1e44-4a6c-91fe-2ebb26e39dea': 313639493,
  '2ff53645-d481-4ff7-a067-e13f392f30a4': 115408980,
  '25e0971b-c229-4c9a-a0f9-c121fce51309': 116547768,
  '057d28d5-a7ed-472b-ae37-ba16571944ea': 146281019,
  '967a0a69-552f-4861-ad7f-0c1bd8bab856': 204827768
};

/**
 * Takes a model ID and a list of scenario IDs, fetches
 * the data necessary to render the parallel coordinates chart, and
 * transforms it into several structures that the PC chart accepts.
 */
export default function useParallelCoordinatesData(
  modelId: Ref<string>,
  allScenarioIds: Ref<string[]>
) {
  const allModelRunData = useScenarioData(modelId, allScenarioIds);
  const metadata = useModelMetadata(modelId) as Ref<Model | null>;

  const runParameterValues = computed(() => {
    if (allModelRunData.value.length === 0 || metadata.value === null) {
      return [];
    }
    const outputParameterName =
      metadata.value.outputs[0].name ?? 'Undefined output parameter';
    const parameterMetadata = metadata.value.parameters;
    return allModelRunData.value.map((modelRun, runIndex) => {
      const run_id = allModelRunData.value[runIndex].id;
      const run: ScenarioData = {
        run_id,
        [outputParameterName]: OUTPUT_AGGREGATIONS[run_id]
      };
      modelRun.parameters.forEach(({ id, value }) => {
        const parameterName = parameterMetadata.find(
          parameter => parameter.id === id
        )?.name;
        run[parameterName ?? 'undefined'] = value;
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
    const baselineRunID = allModelRunData.value.find(run => run.default_run)
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
    // Append the output parameter to the list of input parameters
    return [...metadata.value.parameters, outputDimension] as ModelParameter[];
  });

  // TODO: use each axis min/max based on the metadata

  // The parallel coordinates component expects data as a collection of name/value pairs
  //  (see ScenarioData)
  //  e.g., [
  //    { dim1: value11, dim2: value12 },
  //    { dim1: value21, dim2: value22 }
  // ]

  // HACK: force 'rainfall_multiplier' to be ordinal
  const ordinalDimensionNames = ref(['rainfall_multiplier']);

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
