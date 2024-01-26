import { Ref, ref, watchEffect } from 'vue';
import { getDatacubeNameById } from '@/services/datacube-service';
import _ from 'lodash';

/**
 * Takes an id then fetches and returns the name associated with that model or dataset.
 */
export default function useModelOrDatasetName(datacubeId: Ref<string | null>) {
  const modelOrDatasetName = ref<string | null>(null);
  watchEffect((onInvalidate) => {
    modelOrDatasetName.value = null;
    let isCancelled = false;
    async function fetchName() {
      if (datacubeId.value === null) return;
      const name = await getDatacubeNameById(datacubeId.value);
      if (isCancelled) {
        // Dependencies have changed since the fetch started, so ignore the
        //  fetch results to avoid a race condition.
        return;
      }
      if (name !== null) {
        modelOrDatasetName.value = name;
      }
    }
    onInvalidate(() => {
      isCancelled = true;
    });
    fetchName();
  });

  return modelOrDatasetName;
}
