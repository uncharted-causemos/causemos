<template>
  <div class="index-projections-pane-container">
    <div class="child-nodes-column">
      <IndexTreeNode
        v-for="childNode of childNodes"
        :key="childNode.id"
        :is-connecting="false"
        :is-descendent-of-connecting-node="false"
        :is-selected="false"
        :node-data="childNode"
        @select="emit('select-element', childNode.id)"
      />
    </div>
    <div class="selected-node">
      <p>{{ selectedNode?.found.name ?? 'none' }}</p>
      <p class="subdued un-font-small">{{ 'Weighted sum of 2 components.' }}</p>
    </div>
    <div class="parent-node-column">
      <IndexTreeNode
        v-if="parentNode !== null"
        :is-connecting="false"
        :is-descendent-of-connecting-node="false"
        :is-selected="false"
        :node-data="parentNode"
        @select="emit('select-element', parentNode.id)"
      />
    </div>
  </div>
</template>

<script setup lang="ts">
import useIndexTree from '@/services/composables/useIndexTree';
import useIndexWorkBench from '@/services/composables/useIndexWorkBench';
import { computed } from 'vue';
import IndexTreeNode from '../index-structure/index-tree-node.vue';
import { isConceptNodeWithoutDataset } from '@/utils/index-tree-util';
import { SelectableIndexElementId } from '@/types/Index';

const props = defineProps<{
  selectedNodeId: string | null;
}>();

const emit = defineEmits<{
  (e: 'select-element', selectedElement: SelectableIndexElementId): void;
}>();

const { findNode } = useIndexTree();
const workbench = useIndexWorkBench();

const searchForNode = (id: string) => {
  const foundInTree = findNode(id);
  return foundInTree ?? workbench.findNode(id);
};
const selectedNode = computed(() => {
  if (props.selectedNodeId === null) {
    return null;
  }
  return searchForNode(props.selectedNodeId) ?? null;
});
const childNodes = computed(() => {
  if (!selectedNode.value || !isConceptNodeWithoutDataset(selectedNode.value.found)) {
    return [];
  }
  return selectedNode.value.found.components.map(
    (weightedComponent) => weightedComponent.componentNode
  );
});
const parentNode = computed(() => {
  return selectedNode.value?.parent ?? null;
});
</script>

<style lang="scss" scoped>
@import '@/styles/uncharted-design-tokens';
$space-between-columns: 20px;
$space-between-rows: 20px;
.index-projections-pane-container {
  padding: 20px;
  overflow: auto;
  display: flex;
  gap: 40px;
  // When the graph is too small to take up the full available screen width, don't expand columns
  //  to fill the empty space.
  justify-content: flex-start;
  align-content: flex-start;
}

.selected-node {
  background: white;
  border: 1px solid $un-color-black-30;
  padding: 10px 20px;
  display: flex;
  flex-direction: column;
  gap: 10px;
  border-radius: 3px;
  width: 500px;
}

.subdued {
  color: $un-color-black-40;
}
</style>
