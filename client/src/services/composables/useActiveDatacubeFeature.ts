import { Datacube } from '@/types/Datacube';
import { computed, Ref } from 'vue';
import { useStore } from 'vuex';
import { getSelectedOutput } from '@/utils/datacube-util';

export default function useActiveDatacubeFeature(
  metadata: Ref<Datacube | null>,
  itemId: Ref<string>
) {
  const store = useStore();
  const datacubeCurrentOutputsMap = computed(
    () => store.getters['app/datacubeCurrentOutputsMap']
  );

  const currentOutputIndex = computed(() => {
    if (metadata.value === null) return 0;
    const datacubeKey = itemId.value;
    return datacubeCurrentOutputsMap.value[datacubeKey] ? datacubeCurrentOutputsMap.value[datacubeKey] : 0;
  });

  const activeFeature = computed(() => {
    if (metadata.value === null) return '';
    const feature = getSelectedOutput(metadata.value, currentOutputIndex.value).name;
    return feature ?? metadata.value.default_feature;
  });

  return {
    activeFeature,
    currentOutputIndex
  };
}
