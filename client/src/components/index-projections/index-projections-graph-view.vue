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
      <div
        class="edge incoming"
        :class="{
          visible: hasChildren(cell.node),
          inactive: !hasChildren(cell.node),
        }"
      ></div>
      <IndexProjectionsNode
        :node-data="cell.node"
        class="index-tree-node"
        :projection-start-timestamp="projectionStartTimestamp"
        :projection-end-timestamp="projectionEndTimestamp"
        :timeseries="getProjectionsForNode(cell.node.id)"
        @select="(id) => emit('select-element', id)"
      />
      <div
        class="edge outgoing"
        :class="{
          visible: cell.hasOutputLine,
          inactive: !cell.hasOutputLine,
          'last-child': cell.isLastChild,
        }"
      />
    </div>
  </div>
</template>

<script setup lang="ts">
import _ from 'lodash';

import { hasChildren } from '@/utils/index-tree-util';
import { GridCell, SelectableIndexElementId } from '@/types/Index';
import { computed } from 'vue';
import useIndexWorkBench from '@/services/composables/useIndexWorkBench';
import useIndexTree from '@/services/composables/useIndexTree';
import { getGridCellsFromIndexTreeAndWorkbench } from '@/utils/grid-cell-util';
import IndexProjectionsNode from './index-projections-node.vue';
import { TimeseriesPointProjected } from '@/types/Timeseries';

const props = defineProps<{
  projectionStartTimestamp: number;
  projectionEndTimestamp: number;
  projections: Map<string, TimeseriesPointProjected[]>;
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

const getProjectionsForNode = (nodeId: string) => {
  return props.projections.get(nodeId) ?? [];
};
</script>

<style lang="scss" scoped>
@import '@/styles/variables';
@import '@/styles/uncharted-design-tokens';
@import '@/styles/index-graph';

.grid-cell {
  position: relative;
}
</style>
