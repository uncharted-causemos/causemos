import { Datacube } from '@/types/Datacube';
import { computed, ref, Ref, watch } from 'vue';
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

  const currentOutputIndex = ref(0);
  watch(
    () => [
      metadata.value,
      datacubeCurrentOutputsMap.value
    ],
    () => {
      const datacubeKey = itemId.value;
      currentOutputIndex.value = datacubeCurrentOutputsMap.value[datacubeKey] ? datacubeCurrentOutputsMap.value[datacubeKey] : 0;
    },
    {
      immediate: true
    }
  );

  const activeFeature = ref('');
  watch(
    () => [
      metadata.value,
      currentOutputIndex.value
    ],
    () => {
      if (metadata.value === null) {
        activeFeature.value = '';
        return;
      }
      const feature = getSelectedOutput(metadata.value, currentOutputIndex.value).name;
      activeFeature.value = feature ?? metadata.value.default_feature;
    },
    {
      immediate: true
    }
  );

  return {
    activeFeature,
    currentOutputIndex
  };
}
