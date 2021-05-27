import API from '@/api/api';
import { Model } from '@/types/Datacube';
import { Ref, ref, watchEffect } from 'vue';

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
      const response = await API.get(`maas/datacubes/${modelId.value}`, {
        params: {
        }
      });
      if (isCancelled) {
        // Dependencies have changed since the fetch started, so ignore the
        //  fetch results to avoid a race condition.
        return;
      }
      metadata.value = response.data;
    }
    onInvalidate(() => {
      isCancelled = true;
    });
    fetchMetadata();
  });

  return metadata;
}
