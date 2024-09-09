<template>
  <div class="index-action-bar-container">
    <Button
      icon="fa fa-plus"
      label="Add concept"
      severity="secondary"
      @click="addConcept"
      style="width: 240px"
    />
    <div class="group">
      <Button label="View projections" severity="secondary" @click="viewProjections" />
      <Button
        label="View region ranking results"
        @click="viewIndexResults"
        :disabled="!canViewResults"
      />
    </div>
  </div>
</template>

<script setup lang="ts">
import useIndexTree from '@/composables/useIndexTree';
import { ProjectType } from '@/types/Enums';
import { indexNodeTreeContainsDataset } from '@/utils/index-tree-util';
import Button from 'primevue/button';
import { computed } from 'vue';
import { useRoute, useRouter } from 'vue-router';

const emit = defineEmits<{
  (e: 'add-concept'): void;
}>();

const addConcept = () => {
  emit('add-concept');
};

const route = useRoute();
const analysisId = computed(() => route.params.analysisId as string);
const project = computed(() => route.params.project as string);
const router = useRouter();
const viewProjections = () => {
  router.push({
    name: 'indexProjections',
    params: {
      project: project.value,
      analysisId: analysisId.value,
      projectType: ProjectType.Analysis,
    },
  });
};
const viewIndexResults = () => {
  router.push({
    name: 'indexResults',
    params: {
      project: project.value,
      analysisId: analysisId.value,
      projectType: ProjectType.Analysis,
    },
  });
};

const indexTree = useIndexTree();
const canViewResults = computed(() => indexNodeTreeContainsDataset(indexTree.tree.value));
</script>

<style scoped lang="scss">
@import '@/styles/uncharted-design-tokens';
@import '@/styles/index-graph';

.index-action-bar-container {
  display: flex;
  flex-direction: row;
  justify-content: space-between;
  padding: 1rem;
  padding-left: 30px;
  background: var(--p-surface-0);
  border-bottom: 1px solid var(--p-content-border-color);
}

.group {
  display: flex;
  flex-direction: row;
  gap: 1rem;
}
</style>
