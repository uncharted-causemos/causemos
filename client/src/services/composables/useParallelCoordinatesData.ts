import { Model, ModelParameter } from '../../types/Datacube';
import { computed, ref, Ref, watchEffect } from 'vue';
import { ScenarioData } from '../../types/Common';
import API from '@/api/api';
import { ModelRun } from '@/types/ModelRun';

/**
 * Takes a model ID and a list of scenario IDs, fetches
 * the data necessary to render the parallel coordinates chart, and
 * transforms it into several structures that the PC chart accepts.
 */
export default function useParallelCoordinatesData(
  metadata: Ref<Model | null>,
  modelId: Ref<string>,
  allModelRunData: Ref<ModelRun[]>
) {
  const runParameterValues = ref<ScenarioData[]>([]);

  watchEffect(onInvalidate => {
    runParameterValues.value = [];
    if (allModelRunData.value.length === 0 || metadata.value === null) {
      return [];
    }

    const allRunIDs = allModelRunData.value.filter(r => r.status === 'READY').map(r => r.id);
    let isCancelled = false;

    const outputParameterName = metadata.value.outputs[0].name ?? 'Undefined output parameter';

    // fetch all time series data to find the aggregated value for the output variable for each run
    // NOTE: output variables use the following aggregation functions by default
    const fetchAllTimeSeriesData = async function() {
      const promises = allRunIDs.map(runId =>
        API.get('maas/output/timeseries', {
          params: {
            model_id: modelId.value,
            run_id: runId,
            feature: outputParameterName,
            resolution: 'month',
            temporal_agg: 'mean',
            spatial_agg: 'mean'
          }
        })
      );
      const timeseries = (await Promise.all(promises)).map(response =>
        Array.isArray(response.data) ? response.data : JSON.parse(response.data)
      );
      if (isCancelled) {
        // Dependencies have changed since the fetch started, so ignore the
        //  fetch results to avoid a race condition.
        return;
      }
      let timeSeriesArrCounter = 0;
      runParameterValues.value = allModelRunData.value.map((modelRun, runIndex) => {
        const run_id = allModelRunData.value[runIndex].id;
        const runStatus = allModelRunData.value[runIndex].status;
        const run: ScenarioData = {
          run_id,
          status: runStatus ?? 'READY'
        };
        if (run.status === 'READY') {
          // calculate the output value for this run by aggregating all timestamp values
          const allValuesPerRun: Array<number> = timeseries[timeSeriesArrCounter++].map((t: any) => t.value);
          const sum = allValuesPerRun.reduce((a, b) => a + b, 0);
          const avg = (sum / timeseries.length) || 0;
          const runOutputValue = avg;
          run[outputParameterName] = runOutputValue;
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
    fetchAllTimeSeriesData();
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
