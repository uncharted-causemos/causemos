import { ModelRun } from '@/types/ModelRun';
import { ref, Ref, watchEffect } from 'vue';
import { getModelRunMetadata } from '@/services/new-datacube-service';

/**
 * Takes a model ID and a list of scenario IDs, then fetches and
 * returns the metadata for each scenario in one list.
 */
export default function useScenarioData(
  modelId: Ref<string>,
  modelRunsFetchedAt: Ref<number>
) {
  const runData = ref([]) as Ref<ModelRun[]>;

  watchEffect(onInvalidate => {
    console.log('refetching data at: ' + new Date(modelRunsFetchedAt.value).toTimeString());
    let isCancelled = false;
    async function fetchRunData() {
      const newMetadata = await getModelRunMetadata(modelId.value);
      if (isCancelled) {
        // Dependencies have changed since the fetch started, so ignore the
        //  fetch results to avoid a race condition.
        return;
      }
      //
      // only reset if new data is different from existing data
      //
      const existingData = runData.value;
      let newDataIsDifferent = false;
      if (existingData.length !== newMetadata.length) {
        newDataIsDifferent = true;
      } else {
        // we need to compare run status
        const runStatusMap: {[key: string]: string} = {};
        existingData.forEach(r => {
          runStatusMap[r.id] = r.status;
        });
        newMetadata.forEach(r => {
          // if this is a new run, or if the exists but its status has changed, then we have new data
          if (!runStatusMap[r.id] || runStatusMap[r.id] !== r.status) {
            newDataIsDifferent = true;
          }
        });
      }
      if (newDataIsDifferent) {
        runData.value = newMetadata;
      }
    }
    onInvalidate(() => {
      isCancelled = true;
    });
    fetchRunData();
  });

  return runData;
}
