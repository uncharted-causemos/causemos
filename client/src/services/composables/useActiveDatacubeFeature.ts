import { Datacube } from '@/types/Datacube';
import { computed, Ref } from 'vue';
import { useStore } from 'vuex';

export default function useActiveDatacubeFeature(
  metadata: Ref<Datacube | null>
) {
  const store = useStore();
  const datacubeCurrentOutputsMap = computed(
    () => store.getters['app/datacubeCurrentOutputsMap']
  );

  const activeFeature = computed(() => {
    let feature = '';
    if (metadata.value === null) return feature;
    const currentOutputEntry =
      datacubeCurrentOutputsMap.value[metadata.value.id];
    if (currentOutputEntry !== undefined && currentOutputEntry >= 0) {
      const outputs = metadata.value.validatedOutputs ?? metadata.value.outputs;
      feature = outputs[currentOutputEntry].name;
    } else {
      feature = metadata.value.default_feature ?? '';
    }
    return feature;
  });

  return {
    activeFeature
  };
}
