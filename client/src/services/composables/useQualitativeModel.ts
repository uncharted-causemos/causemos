import { CAGGraph, CAGModelSummary } from '@/types/CAG';
import { computed, ref, watchEffect } from 'vue';
import { useStore } from 'vuex';
import modelService from '../model-service';

export default function useQualitativeModel() {
  const modelSummary = ref<CAGModelSummary | null>(null);
  const modelComponents = ref<CAGGraph | null>(null);
  const store = useStore();
  const currentCAG = computed(() => store.getters['app/currentCAG']);
  // Any change to refreshToken will trigger a new round of fetches
  const refreshToken = ref(0);
  const refreshModelData = () => {
    refreshToken.value = Date.now();
  };

  watchEffect((onInvalidate) => {
    // Fetch model summary and components
    // We need to access refreshToken's value so that the effect is rerun when it changes
    //  So perform some check that will always evaluate to false
    if (currentCAG.value === null || refreshToken.value < 0) return;
    let isCancelled = false;
    onInvalidate(() => {
      isCancelled = true;
    });

    modelService.getSummary(currentCAG.value).then((_modelSummary) => {
      if (isCancelled) return;
      modelSummary.value = _modelSummary;
    });
    modelService.getComponents(currentCAG.value).then((_modelComponents) => {
      if (isCancelled) return;
      modelComponents.value = _modelComponents;
    });
  });

  return {
    currentCAG,
    modelSummary,
    modelComponents,
    refreshModelData,
  };
}
