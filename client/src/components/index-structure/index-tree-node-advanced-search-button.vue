<template>
  <div class="index-tree-node-advanced-search-button-container">
    <button class="btn btn-sm advanced-search" @click="openDataExplorer">
      Use advanced search
    </button>
  </div>
</template>

<script setup lang="ts">
import { useRoute } from 'vue-router';
import router from '@/router';
import filtersUtil from '@/utils/filters-util';
import { STATUS } from '@/utils/datacube-util';

interface Props {
  nodeId: string;
}
const props = defineProps<Props>();

const route = useRoute();
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
    query: { filters: filters } as any,
  });
};
</script>

<style lang="scss" scoped></style>
