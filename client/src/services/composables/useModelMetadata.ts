import { Model } from '@/types/Datacube';
import { Ref, ref, watchEffect } from 'vue';
import { getDatacubeById } from '@/services/new-datacube-service';

/**
 * Takes a modelId then fetches and returns the metadata associated
 * with that model.
 */
export default function useModelMetadata(
  modelId: Ref<string>
) {
  const metadata = ref<Model | null>(null);

  watchEffect(onInvalidate => {
    metadata.value = null;
    let isCancelled = false;
    async function fetchMetadata() {
      const response = await getDatacubeById(modelId.value);
      if (isCancelled) {
        // Dependencies have changed since the fetch started, so ignore the
        //  fetch results to avoid a race condition.
        return;
      }
      metadata.value = response;
    }
    onInvalidate(() => {
      isCancelled = true;
    });
    fetchMetadata();
  });

  return metadata;
}
