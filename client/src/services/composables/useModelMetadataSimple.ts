import { Indicator, Model } from '@/types/Datacube';
import { ref, Ref, watch } from 'vue';
import newDatacubeService from '../new-datacube-service';

/**
 * Fetches a Model or Indicator's metadata from ElasticSearch based on its data_id.
 * NOTE: As of March 2023,a composable called `useModelMetadata` exists that has two differences:
 * 1. It takes the elasticsearch document ID as a parameter, rather than `dataId` which is used by Jataware's systems
 * 2. It performs some convoluted validation and modification on the results.
 * We should investigate to see if we can simplify or merge useModelMetadata into this composable.
 */
export default function useModelMetadataSimple(
  dataId: Ref<string | null>
): Ref<Model | Indicator | null> {
  const metadata = ref<Indicator | Model | null>(null);
  watch(
    [dataId],
    async () => {
      if (dataId.value === null) {
        metadata.value = null;
        return;
      }
      // Save data ID before fetching in case it changes during the request.
      const savedDataId = dataId.value;
      const result = await newDatacubeService.getDatacubeByDataId(dataId.value);
      if (savedDataId !== dataId.value) {
        // Data ID changed during the request, so throw out results to avoid race conditions.
        return;
      }
      // FIXME: verify whether we should be using `Model | Indicator` or `Datacube` and be
      //  consistent throughout
      metadata.value = result as Model | Indicator | null;
    },
    { immediate: true }
  );
  return metadata;
}
