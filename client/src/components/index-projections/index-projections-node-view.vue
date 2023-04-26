<template>
  <div class="index-projections-pane-container">
    <div class="node-column child-column">
      <div v-for="(childNode, i) of childNodes" :key="childNode.id" class="node-and-edge-container">
        <IndexProjectionsNode
          :node-data="childNode"
          @select="emit('select-element', childNode.id)"
        />
        <div class="edge outgoing visible" :class="{ 'last-child': i === childNodes.length - 1 }" />
      </div>
    </div>
    <div class="node-and-edge-container">
      <div class="edge incoming" :class="{ visible: childNodes.length > 0 }" />
      <div class="selected-node">
        <p>{{ selectedNode?.found.name ?? 'none' }}</p>
        <span v-if="selectedNode?.found.name.length === 0" class="subdued">(Missing name)</span>
        <p class="subdued un-font-small">{{ 'Weighted sum of 2 components.' }}</p>
      </div>
      <div class="edge outgoing last-child" :class="{ visible: parentNode !== null }" />
    </div>
    <div class="node-column">
      <div v-if="parentNode !== null" class="node-and-edge-container">
        <div class="edge incoming visible" />
        <IndexProjectionsNode
          :node-data="parentNode"
          @select="emit('select-element', parentNode.id)"
        />
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import useIndexTree from '@/services/composables/useIndexTree';
import useIndexWorkBench from '@/services/composables/useIndexWorkBench';
import { computed } from 'vue';
import { isConceptNodeWithoutDataset } from '@/utils/index-tree-util';
import { SelectableIndexElementId } from '@/types/Index';
import IndexProjectionsNode from './index-projections-node.vue';

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
@import '@/styles/index-graph';
.index-projections-pane-container {
  padding: $index-graph-padding-vertical $index-graph-padding-horizontal;
  overflow: auto;
  display: flex;
  // When the graph is too small to take up the full available screen width, don't expand columns
  //  to fill the empty space.
  justify-content: flex-start;
}

.selected-node {
  @include index-tree-node;
  padding: 10px 20px;
  gap: 10px;
  width: 500px;
}

.node-column {
  // Make sure columns take the width of a node even if the column is empty.
  width: calc($index-tree-node-width + $incoming-edge-minimum-length);
}

.child-column {
  display: flex;
  flex-direction: column;
  gap: $space-between-rows;
}

.node-and-edge-container {
  position: relative;
  display: flex;
}

.edge.incoming {
  flex: 0;
}
</style>
