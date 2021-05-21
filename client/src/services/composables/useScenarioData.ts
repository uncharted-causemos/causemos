import API from '@/api/api';
import { ModelRun } from '@/types/Datacubes';
import { ref, Ref, watchEffect } from 'vue';

/**
 * Takes a model ID and a list of scenario IDs, then fetches and
 * returns the metadata for each scenario in one list.
 */
export default function useScenarioData(
  modelId: Ref<string>,
  modelRunsFetchedAt: Ref<number>,
  modelRunIds?: Ref<string[]>
) {
  const runData = ref([]) as Ref<ModelRun[]>;

  if (modelId.value.includes('maxhop')) {
    watchEffect(onInvalidate => {
      console.log('refetching data at: ' + new Date(modelRunsFetchedAt.value).toTimeString());
      runData.value = [];
      let isCancelled = false;
      async function fetchRunData() {
        const allMetadata = await API.get('/maas/model-runs', {
          params: {
            modelId: modelId.value
          }
        });
        if (isCancelled) {
          // Dependencies have changed since the fetch started, so ignore the
          //  fetch results to avoid a race condition.
          return;
        }
        runData.value = allMetadata.data;
      }
      onInvalidate(() => {
        isCancelled = true;
      });
      fetchRunData();
    });
  } else {
    watchEffect(onInvalidate => {
      runData.value = [];
      if (!modelRunIds || modelRunIds.value.length === 0) return;
      let isCancelled = false;
      async function fetchRunData() {
        if (!modelRunIds) {
          return;
        }
        const promises = modelRunIds.value.map(runId =>
          API.get('fetch-demo-data', {
            params: {
              modelId: modelId.value,
              runId,
              type: 'metadata'
            }
          })
        );
        const allMetadata = (await Promise.all(promises)).map(metadata =>
          JSON.parse(metadata.data)
        );
        if (isCancelled) {
          // Dependencies have changed since the fetch started, so ignore the
          //  fetch results to avoid a race condition.
          return;
        }
        // FIXME: inject status field as ready for DSSAT runs
        allMetadata.forEach(r => {
          r.status = 'READY';
        });
        runData.value = allMetadata;
      }
      onInvalidate(() => {
        isCancelled = true;
      });
      fetchRunData();
    });
  }

  return runData;
}
