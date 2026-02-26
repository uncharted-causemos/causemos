import { computed, ref } from 'vue';
import { defineStore } from 'pinia';
import { useRoute } from 'vue-router';

type MsgCancel = {
  message: string;
  cancelFn: Function;
};

export const useAppStore = defineStore('app', () => {
  const route = useRoute();

  // Route-derived (no state needed)
  const projectType = computed(() => (route.params.projectType as string) || null);
  const project = computed(() => (route.params.project as string) || null);
  const currentView = computed(() => (route.name as string) || 'home');
  const currentCAG = computed(() => (route.params.currentCAG as string) || null);
  const datacubeId = computed(() => (route.params.datacubeId as string) || null);
  const indicatorId = computed(() => (route.params.indicatorId as string) || null);
  const nodeId = computed(() => (route.params.nodeId as string) || null);

  // State
  const overlayActivated = ref(false);
  const overlayMessage = ref('Loading...');
  const overlayMessageSecondary = ref('Loading...');
  const overlayCancelFn = ref<Function | null>(null);
  const updateToken = ref('');
  const projectMetadata = ref<any>({});
  const analysisName = ref('');
  const datacubeCurrentOutputsMap = ref<Record<string, number>>({});

  // Actions
  function enableOverlayWithCancel(payload: MsgCancel) {
    overlayMessage.value = payload.message;
    overlayActivated.value = true;
    if (payload.cancelFn) {
      overlayCancelFn.value = payload.cancelFn;
    }
  }

  function enableOverlay(message?: string) {
    if (message !== undefined) overlayMessage.value = message;
    overlayActivated.value = true;
  }

  function setOverlaySecondaryMessage(message: string) {
    overlayMessageSecondary.value = message;
  }

  function disableOverlay() {
    overlayActivated.value = false;
    overlayMessageSecondary.value = '';
    overlayCancelFn.value = null;
  }

  function setUpdateToken(token: string) {
    updateToken.value = token;
  }

  function setProjectMetadata(metadata: any) {
    projectMetadata.value = metadata;
  }

  function setAnalysisName(name: string) {
    analysisName.value = name;
  }

  function setDatacubeCurrentOutputsMap(value: Record<string, number>) {
    datacubeCurrentOutputsMap.value = value;
  }

  return {
    // Route-derived
    projectType,
    project,
    currentView,
    currentCAG,
    datacubeId,
    indicatorId,
    nodeId,
    // State
    overlayActivated,
    overlayMessage,
    overlayMessageSecondary,
    overlayCancelFn,
    updateToken,
    projectMetadata,
    analysisName,
    datacubeCurrentOutputsMap,
    // Actions
    enableOverlay,
    enableOverlayWithCancel,
    setOverlaySecondaryMessage,
    disableOverlay,
    setUpdateToken,
    setProjectMetadata,
    setAnalysisName,
    setDatacubeCurrentOutputsMap,
  };
});
