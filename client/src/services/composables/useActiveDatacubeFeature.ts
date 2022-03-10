import { Datacube } from '@/types/Datacube';
import { computed, ref, Ref, watch } from 'vue';
import { useStore } from 'vuex';
import { getSelectedOutput } from '@/utils/datacube-util';
import { useRoute } from 'vue-router';
import { getDatacubeKeyFromAnalysis } from '@/utils/analysis-util';

export default function useActiveDatacubeFeature(
  metadata: Ref<Datacube | null>
) {
  const store = useStore();
  const route = useRoute();
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
      const datacubeKey = getDatacubeKeyFromAnalysis(metadata.value as any, store, route);
      currentOutputIndex.value = datacubeCurrentOutputsMap.value[datacubeKey] ? datacubeCurrentOutputsMap.value[datacubeKey] : 0;
    },
    {
      immediate: true
    }
  );

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
