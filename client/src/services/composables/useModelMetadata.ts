import API from '@/api/api';
import { Indicator, Model } from '@/types/Datacube';
import { Ref, ref, watchEffect } from 'vue';
import { getValidatedOutputs } from '@/utils/datacube-util';

/**
 * Takes a modelId then fetches and returns the metadata associated
 * with that model.
 */
export default function useModelMetadata(
  modelId: Ref<string>
): Ref<Model | Indicator | null> {
  const metadata = ref<Model | Indicator | null>(null);

  watchEffect(onInvalidate => {
    metadata.value = null;
    let isCancelled = false;
    async function fetchMetadata() {
      const response = await API.get(`maas/new-datacubes/${modelId.value}`, {
        params: {}
      });
      if (isCancelled) {
        // Dependencies have changed since the fetch started, so ignore the
        //  fetch results to avoid a race condition.
        return;
      }
      const rawMetadata = response.data;
      // filter outputs and remove invalid/unsupported ones
      //  For now, saved the validated output in a new attribute.
      // @Review: Later, we could just replace the 'outputs' attribute with the validated list
      rawMetadata.validatedOutputs = getValidatedOutputs(rawMetadata.outputs);
      metadata.value = rawMetadata;
    }
    onInvalidate(() => {
      isCancelled = true;
    });
    fetchMetadata();
  });

  return metadata;
}
