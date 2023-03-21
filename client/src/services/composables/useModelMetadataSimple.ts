import { Indicator, Model } from '@/types/Datacube';
import { ref, Ref, watch } from 'vue';
import newDatacubeService from '../new-datacube-service';

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
      metadata.value = result;
    },
    { immediate: true }
  );
  return metadata;
}
