<template>
  <div class="index-tree-node-advanced-search-button-container">
    <Button label="Use advanced search" severity="secondary" @click="openDataExplorer" />
  </div>
</template>

<script setup lang="ts">
import { useRoute, useRouter } from 'vue-router';
import filtersUtil from '@/utils/filters-util';
import { STATUS } from '@/utils/datacube-util';
import Button from 'primevue/button';

interface Props {
  nodeId: string;
}
const props = defineProps<Props>();

const route = useRoute();
const router = useRouter();
const openDataExplorer = () => {
  const filters = filtersUtil.newFilters();
  filtersUtil.setClause(filters, STATUS, ['READY'], 'or', false);
  router.push({
    name: 'indexNodeDataExplorer',
    params: {
      projectType: route.params.projectType,
      project: route.params.project,
      analysisId: route.params.analysisId,
      nodeId: props.nodeId,
    },
    query: { filters } as any,
  });
};
</script>

<style lang="scss" scoped></style>
