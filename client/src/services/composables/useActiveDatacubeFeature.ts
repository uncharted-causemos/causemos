import { Indicator, Model } from '@/types/Datacube';
import { computed, Ref } from 'vue';
import { useStore } from 'vuex';

export default function useActiveDatacubeFeature(
  metadata: Ref<Model | Indicator | null>
) {
  const store = useStore();
  const datacubeCurrentOutputsMap = computed(
    () => store.getters['app/datacubeCurrentOutputsMap']
  );

  const activeFeature = computed(() => {
    if (metadata.value === null) return '';
    const currentOutputEntry =
      datacubeCurrentOutputsMap.value[metadata.value.id];
    if (currentOutputEntry !== undefined) {
      const outputs = metadata.value.validatedOutputs ?? metadata.value.outputs;
      return outputs[currentOutputEntry].name;
    }
    return metadata.value.default_feature ?? '';
  });

  return {
    activeFeature
  };
}
