import { Datacube, DatacubeFeature } from '@/types/Datacube';
import { computed, Ref } from 'vue';
import { useAppStore } from '@/stores/app-store';
import { getSelectedOutput } from '@/utils/datacube-util';
import _ from 'lodash';

export default function useActiveDatacubeFeature(
  metadata: Ref<Datacube | null>,
  itemId: Ref<string>
) {
  const appStore = useAppStore();
  const datacubeCurrentOutputsMap = computed(() => appStore.datacubeCurrentOutputsMap);

  const currentOutputIndex = computed(() => {
    if (metadata.value === null) return 0;
    const datacubeKey = itemId.value;
    return datacubeCurrentOutputsMap.value[datacubeKey]
      ? datacubeCurrentOutputsMap.value[datacubeKey]
      : 0;
  });

  const activeFeature = computed<DatacubeFeature | null>(() => {
    return metadata.value && currentOutputIndex.value >= 0
      ? getSelectedOutput(metadata.value, currentOutputIndex.value)
      : null;
  });

  return {
    activeFeature,
    activeFeatureName: computed(() => activeFeature.value?.name ?? ''),
    currentOutputIndex,
  };
}
