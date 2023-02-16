<template>
  <div class="index-tree-pane-container" @click.self="emit('deselect-all')">
    <div
      v-for="cell in gridCells"
      :key="cell.node.id"
      :style="{
        'grid-row': `${cell.startRow} / span ${cell.rowCount}`,
        'grid-column': cell.startColumn,
      }"
      class="grid-cell"
    >
      <div class="edge incoming" :class="{ visible: hasChildren(cell.node) }"></div>
      <IndexTreeNode
        :node-data="cell.node"
        :is-selected="cell.node.id === props.selectedElementId"
        class="index-tree-node"
        @rename="renameNode"
        @delete="deleteNode"
        @duplicate="duplicateNode"
        @select="(id) => emit('select-element', id)"
        @create-child="createChild"
        @attach-dataset="attachDatasetToPlaceholder"
      />
      <div
        class="edge outgoing"
        :class="{
          visible: cell.hasOutputLine,
          dashed: cell.node.type === IndexNodeType.Placeholder,
          'last-child': cell.isLastChild,
        }"
      />
    </div>
  </div>
</template>

<script setup lang="ts">
import _ from 'lodash';
import { computed } from 'vue';
import IndexTreeNode from '@/components/index-structure/index-tree-node.vue';
import { IndexNodeType } from '@/types/Enums';
import { DatasetSearchResult, GridCell, IndexNode, SelectableIndexElementId } from '@/types/Index';
import useIndexWorkBench from '@/services/composables/useIndexWorkBench';
import useIndexTree from '@/services/composables/useIndexTree';
import { hasChildren } from '@/utils/indextree-util';
import {
  leftAlignTreeGrids,
  offsetGridCells,
  getGridRowCount,
  convertTreeToGridCells,
} from '@/utils/grid-cell-util';

const props = defineProps<{
  selectedElementId: SelectableIndexElementId | null;
}>();

const emit = defineEmits<{
  (e: 'select-element', selectedElement: SelectableIndexElementId): void;
  (e: 'deselect-all'): void;
}>();

const workBench = useIndexWorkBench();
const indexTree = useIndexTree();

// A list of grid cells with enough information to render with CSS-grid.
//  Represents a combination of all workbench trees and the main index tree.
const gridCells = computed<GridCell[]>(() => {
  // Convert each workbench tree to grid cells.
  const overlappingWorkbenchTreeCellLists = workBench.items.value.map(convertTreeToGridCells);
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
  // Left align all grids.
  const leftAlignedGrids = leftAlignTreeGrids([...workbenchTreeCellLists, mainTreeCellList]);
  // Flatten list of grids into one list of grid cells.
  return _.flatten(leftAlignedGrids);
});

const renameNode = (nodeId: string, newName: string) => {
  workBench.findAndRenameNode(nodeId, newName);
  indexTree.findAndRenameNode(nodeId, newName);
};

const deleteNode = (deleteNode: IndexNode) => {
  // Find from both places and delete the node.
  workBench.findAndDeleteItem(deleteNode.id);
  indexTree.findAndDelete(deleteNode.id);
};

const duplicateNode = (duplicated: IndexNode) => {
  if (duplicated.type === IndexNodeType.OutputIndex) return;
  workBench.addItem(duplicated);
};

const createChild = (
  parentNodeId: string,
  childType: IndexNodeType.Index | IndexNodeType.Dataset
) => {
  workBench.findAndAddChild(parentNodeId, childType);
  indexTree.findAndAddChild(parentNodeId, childType);
};

const attachDatasetToPlaceholder = (nodeId: string, dataset: DatasetSearchResult) => {
  workBench.attachDatasetToPlaceholder(nodeId, dataset);
  indexTree.attachDatasetToPlaceholder(nodeId, dataset);
};
</script>

<style scoped lang="scss">
@import '~styles/uncharted-design-tokens';

$space-between-columns: 40px;
$space-between-rows: 10px;

$incoming-edge-minimum-length: calc(#{$space-between-columns} / 2);
$outgoing-edge-length: calc($space-between-columns - $incoming-edge-minimum-length);
$edge-top-offset-from-node: 13px;
$edge-styles: 2px solid $un-color-black-20;

.index-tree-pane-container {
  // The farthest left column will never have incoming edges, so it will have an empty space of
  //  size `$incoming-edge-minimum-length` to the left of it. Remove that width from the padding.
  padding: 40px 30px 40px calc(30px - #{$incoming-edge-minimum-length});
  overflow: auto;
  display: grid;
  row-gap: $space-between-rows;

  // When the graph is too small to take up the full available screen width, don't expand columns
  //  to fill the empty space.
  justify-content: flex-start;
  align-content: flex-start;
  .grid-cell {
    position: relative;
    display: flex;
    pointer-events: none;
  }
  .index-tree-node {
    pointer-events: auto;
  }
  .edge {
    position: relative;
    top: $edge-top-offset-from-node;
    pointer-events: auto;

    &.incoming {
      min-width: $incoming-edge-minimum-length;
      // If one node in the column is wider than this one (e.g. placeholder in search mode), expand
      //  the incoming edge to stay connected to children, and push the node to stay right-aligned.
      flex: 1;
      &.visible {
        border-top: $edge-styles;
      }
    }

    &.outgoing {
      width: $outgoing-edge-length;
      &.visible {
        border-top: $edge-styles;
        // Extend edge down to the sibling below this one
        height: calc(100% + #{$space-between-rows});
        border-right: $edge-styles;
      }
      &.dashed {
        border-top-style: dashed;
      }
      &.last-child {
        border-right: none;
      }
    }
  }
}
</style>
