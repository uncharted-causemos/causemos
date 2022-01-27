import { Datacube, DatacubeFeature } from '@/types/Datacube';
import { computed, Ref } from 'vue';
import { useStore } from 'vuex';
import { getSelectedOutput } from '@/utils/datacube-util';

export default function useActiveDatacubeFeature(
  metadata: Ref<Datacube | null>,
  selectedOutput?: Ref<DatacubeFeature | undefined>
) {
  const store = useStore();
  const datacubeCurrentOutputsMap = computed(
    () => store.getters['app/datacubeCurrentOutputsMap']
  );

  const activeFeature = computed(() => {
    if (metadata.value === null) return '';
    const currentOutputEntry =
      datacubeCurrentOutputsMap.value[metadata.value.id];
    if (selectedOutput && selectedOutput.value) {
      return selectedOutput.value.name;
    }
    return currentOutputEntry !== undefined
      ? getSelectedOutput(metadata.value, currentOutputEntry).name
      : metadata.value.default_feature;
  });

  return {
    activeFeature
  };
}
