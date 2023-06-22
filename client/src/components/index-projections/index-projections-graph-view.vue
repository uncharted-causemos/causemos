<template>
  <div class="index-projections-graph-view-container index-graph" @click.self="deselectEdge">
    <div
      v-for="cell in gridCells"
      :key="cell.node.id"
      :style="{
        'grid-row': `${cell.startRow} / span ${cell.rowCount}`,
        'grid-column': cell.startColumn,
      }"
      class="grid-cell"
    >
      <div class="edge incoming" :class="getIncomingEdgeClassObject(cell, null, null)" />
      <IndexProjectionsNode
        :node-data="cell.node"
        class="index-tree-node"
        :projection-start-timestamp="projectionStartTimestamp"
        :projection-end-timestamp="projectionEndTimestamp"
        :timeseries="getProjectionsForNode(projections, cell.node.id)"
        @select="(id) => emit('select-element', id)"
      />
      <div
        class="edge outgoing"
        :class="getOutgoingEdgeClassObject(cell, null, null, searchForNode)"
      />
    </div>
  </div>
</template>

<script setup lang="ts">
import _ from 'lodash';

import { GridCell, IndexProjection, SelectableIndexElementId } from '@/types/Index';
import { computed } from 'vue';
import useIndexWorkBench from '@/services/composables/useIndexWorkBench';
import useIndexTree from '@/services/composables/useIndexTree';
import {
  getGridCellsFromIndexTreeAndWorkbench,
  getIncomingEdgeClassObject,
  getOutgoingEdgeClassObject,
} from '@/utils/grid-cell-util';
import IndexProjectionsNode from './index-projections-node.vue';
import { getProjectionsForNode } from '@/utils/index-projection-util';

defineProps<{
  projectionStartTimestamp: number;
  projectionEndTimestamp: number;
  projections: IndexProjection[];
  showDataOutsideNorm: boolean;
}>();

const emit = defineEmits<{
  (e: 'select-element', selectedElement: SelectableIndexElementId): void;
  (e: 'deselect-edge'): void;
}>();

const deselectEdge = () => {
  emit('deselect-edge');
};

const indexTree = useIndexTree();
const workbench = useIndexWorkBench();

// A list of grid cells with enough information to render with CSS-grid.
//  Represents a combination of all workbench trees and the main index tree.
const gridCells = computed<GridCell[]>(() => {
  return getGridCellsFromIndexTreeAndWorkbench(indexTree.tree.value, workbench.items.value);
});

const searchForNode = (id: string) => {
  const foundInTree = indexTree.findNode(id);
  return foundInTree ?? workbench.findNode(id);
};
</script>

<style lang="scss" scoped>
@import '@/styles/variables';
@import '@/styles/uncharted-design-tokens';
@import '@/styles/index-graph';

.grid-cell {
  position: relative;
}

.edge {
  @include index-tree-edge();
}
</style>
