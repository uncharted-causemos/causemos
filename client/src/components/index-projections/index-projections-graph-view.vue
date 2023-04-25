<template>
  <div class="index-projections-graph-container index-graph" @click.self="deselectEdge">
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
      <!-- TODO: edge highlighting and selection -->
      <!-- <div
        class="edge incoming"
        :class="{
          visible: hasChildren(cell.node),
          inactive: !hasChildren(cell.node),
          [EDGE_CLASS.SELECTED]: isIncomingSelected(cell.node.id),
          [EDGE_CLASS.HIGHLIGHTED]:
            isIncomingHighlighted(cell.node.id) && !isIncomingSelected(cell.node.id),
        }"
        @mouseenter="
          emit('highlight-edge', { sourceId: cell.node.inputs[0].id, targetId: cell.node.id })
        "
        @mouseleave="highlightClear"
        @click="
          () => emit('select-element', { sourceId: cell.node.inputs[0].id, targetId: cell.node.id })
        "
      ></div> -->
      <!-- TODO: don't show hover menu in this view -->
      <IndexTreeNode
        :node-data="cell.node"
        :is-selected="false"
        :is-connecting="false"
        :is-descendent-of-connecting-node="false"
        class="index-tree-node"
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
      <!-- <div
        class="edge outgoing"
        :class="{
          visible: cell.hasOutputLine,
          inactive: !cell.hasOutputLine,
          dashed: cell.node.type === IndexNodeType.Placeholder,
          'last-child': cell.isLastChild,
          [EDGE_CLASS.SELECTED]: isOutgoingSelected(cell.node.id),
          [EDGE_CLASS.SELECTED_Y]: isOutgoingYSelected(cell.node.id),
          [EDGE_CLASS.HIGHLIGHTED]:
            isOutgoingHighlighted(cell.node.id) && !isOutgoingSelected(cell.node.id),
          [EDGE_CLASS.HIGHLIGHTED_Y]:
            isOutgoingYHighlighted(cell.node.id) && !isOutgoingYSelected(cell.node.id),
        }"
        @mouseenter="
          () => emit('highlight-edge', { sourceId: cell.node.id, targetId: parentId(cell.node.id) })
        "
        @mouseleave="highlightClear"
        @click="
          () => emit('select-element', { sourceId: cell.node.id, targetId: parentId(cell.node.id) })
        "
      /> -->
    </div>
  </div>
</template>

<script setup lang="ts">
import _ from 'lodash';

import { hasChildren } from '@/utils/index-tree-util';
import IndexTreeNode from '../index-structure/index-tree-node.vue';
import { GridCell, SelectableIndexElementId } from '@/types/Index';
import { computed } from 'vue';
import useIndexWorkBench from '@/services/composables/useIndexWorkBench';
import useIndexTree from '@/services/composables/useIndexTree';
import {
  convertTreeToGridCells,
  getGridColumnCount,
  getGridRowCount,
  offsetGridCells,
} from '@/utils/grid-cell-util';

const emit = defineEmits<{
  (e: 'select-element', selectedElement: SelectableIndexElementId): void;
  (e: 'deselect-edge'): void;
}>();

const deselectEdge = () => {
  emit('deselect-edge');
};

const indexTree = useIndexTree();
const workbench = useIndexWorkBench();

// TODO: duplicate of index-tree-pane. extract?
// A list of grid cells with enough information to render with CSS-grid.
//  Represents a combination of all workbench trees and the main index tree.
const gridCells = computed<GridCell[]>(() => {
  // Convert each workbench tree to grid cells.
  const overlappingWorkbenchTreeCellLists = workbench.items.value.map(convertTreeToGridCells);
  // Move each grid down so that they're not overlapping
  let currentRow = 0;
  const workbenchTreeCellLists: GridCell[][] = [];
  overlappingWorkbenchTreeCellLists.forEach((cellList) => {
    // Translate down by "currentRow"
    const translatedList = offsetGridCells(cellList, currentRow, 0);
    // Append to workbenchTreeCellLists
    workbenchTreeCellLists.push(translatedList);
    // Increase currentRow by the current tree's rowCount
    currentRow += getGridRowCount(translatedList);
  });
  // Convert main tree to grid cells.
  const overlappingMainTreeCellList = convertTreeToGridCells(indexTree.tree.value);
  // Move main tree grid below the workbench tree grids.
  const mainTreeCellList = offsetGridCells(overlappingMainTreeCellList, currentRow, 0);
  // Extra requirement: Shift all workbench trees to the left of the main tree.
  const mainTreeColumnCount = getGridColumnCount(mainTreeCellList);
  const shiftedWorkbenchTreeCellLists = workbenchTreeCellLists.map((cellList) =>
    offsetGridCells(cellList, 0, -mainTreeColumnCount)
  );
  // Flatten list of grids into one list of grid cells.
  return _.flatten([...shiftedWorkbenchTreeCellLists, mainTreeCellList]);
});
</script>

<style lang="scss" scoped>
@import '@/styles/variables';
@import '@/styles/uncharted-design-tokens';
@import '@/styles/index-graph';

$space-between-columns: 20px;
$space-between-rows: 20px;
.index-projections-graph-container {
}

.grid-cell {
  position: relative;
}
</style>
