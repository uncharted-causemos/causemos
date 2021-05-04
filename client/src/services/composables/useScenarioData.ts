import API from '@/api/api';
import { Cube } from '@/types/Datacubes';
import { ref, Ref, watchEffect } from 'vue';

/**
 * Takes a model ID and a list of scenario IDs, then fetches and
 * returns the metadata for each scenario in one list.
 */
export default function useScenarioData(
  modelId: Ref<string>,
  modelRunIds: Ref<string[]>
) {
  const runData = ref<Cube[]>([]);

  watchEffect(onInvalidate => {
    runData.value = [];
    if (modelRunIds.value.length === 0) return;
    let isCancelled = false;
    async function fetchRunData() {
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
      runData.value = allMetadata;
    }
    onInvalidate(() => {
      isCancelled = true;
    });
    fetchRunData();
  });

  return runData;
}
