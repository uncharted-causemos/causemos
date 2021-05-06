import API from '@/api/api';
import { ModelRun } from '@/types/Datacubes';
import { ref, Ref, watchEffect } from 'vue';

/**
 * Takes a model ID and a list of scenario IDs, then fetches and
 * returns the metadata for each scenario in one list.
 */
export default function useScenarioData(
  modelId: Ref<string>
) {
  const runData = ref<ModelRun[]>([]);

  watchEffect(onInvalidate => {
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

  return runData;
}
