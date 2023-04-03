<template>
  <DataExplorer
    :nav-back-label="navBackLabel"
    :complete-button-label="selectLabel"
    :enable-multiple-selection="false"
    @close="onClose"
    @complete="selectData"
  />
</template>
<script setup lang="ts">
import { ref, Ref, onMounted, computed } from 'vue';
import { useRoute } from 'vue-router';

import router from '@/router';

import DataExplorer from '@/components/data-explorer/data-explorer.vue';

import modelService from '@/services/model-service';

import { ProjectType } from '@/types/Enums';
import { CAGGraph } from '@/types/CAG';
import { Datacube } from '@/types/Datacube';

const selectLabel = 'Quantify Node';
const route = useRoute();
const modelComponents = ref(null) as Ref<CAGGraph | null>;

onMounted(async () => {
  modelComponents.value = await modelService.getComponents(route.params.currentCAG as string);
});

const navBackLabel = computed(() => {
  const selectedNode = modelComponents.value?.nodes.find((node) => node.id === route.params.nodeId);
  const nodeConceptName = selectedNode?.label;
  return `Back to ${nodeConceptName} Node`;
});

const onClose = async () => {
  router.push({
    name: 'nodeDrilldown',
    params: {
      currentCAG: route.params.currentCAG,
      nodeId: route.params.nodeId,
      project: route.params.project,
      projectType: ProjectType.Analysis,
    },
  });
};

const selectData = async (selectedDatacubes: Datacube[]) => {
  router.push({
    name: 'nodeDataDrilldown',
    params: {
      currentCAG: route.params.currentCAG,
      indicatorId: selectedDatacubes[0].id,
      nodeId: route.params.nodeId,
      project: route.params.project,
      projectType: ProjectType.Analysis,
    },
  });
};
</script>

<style lang="scss" scoped></style>
