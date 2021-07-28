import { Indicator, Model } from '@/types/Datacube';
import { Ref, ref, watchEffect } from 'vue';
import { getDatacubeById } from '@/services/new-datacube-service';
import { getValidatedOutputs } from '@/utils/datacube-util';

/**
 * Takes an id then fetches and returns the metadata associated
 * with that model/indicator.
 */
export default function useModelMetadata(id: Ref<string | null>): Ref<Model | Indicator | null> {
  const metadata = ref<Model | Indicator | null>(null);

  watchEffect(onInvalidate => {
    metadata.value = null;
    let isCancelled = false;
    async function fetchMetadata() {
      if (id.value === null) return;
      const rawMetadata = await getDatacubeById(id.value);
      if (isCancelled) {
        // Dependencies have changed since the fetch started, so ignore the
        //  fetch results to avoid a race condition.
        return;
      }
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
