<template>
  <div ref="tree-container" class="index-tree-pane-container" @click.self="clearAll">
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
          [EDGE_CLASS.SELECTED]: isIncomingSelected(cell.node.id),
          [EDGE_CLASS.HIGHLIGHTED]:
            isIncomingHighlighted(cell.node.id) && !isIncomingSelected(cell.node.id),
        }"
        @mouseenter="
          emit('highlight-edge', {
            sourceId: cell.node.components[0].componentNode.id,
            targetId: cell.node.id,
          })
        "
        @mouseleave="highlightClear"
        @click="
          () =>
            emit('select-element', {
              sourceId: cell.node.components[0].componentNode.id,
              targetId: cell.node.id,
            })
        "
      ></div>
      <IndexTreeNode
        :node-data="cell.node"
        :is-selected="isSelected(cell.node.id)"
        class="index-tree-node"
        @rename="renameNode"
        @delete="deleteNode"
        @duplicate="duplicateNode"
        @select="(id) => emit('select-element', id)"
        @create-child="createChild"
        @attach-dataset="attachDatasetToNode"
        @mouseenter="highlightClear"
      />
      <div
        class="edge outgoing"
        :class="{
          visible: cell.hasOutputLine,
          inactive: !cell.hasOutputLine,
          dashed: isEmptyNode(cell.node),
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
      />
    </div>
  </div>
</template>

<script setup lang="ts">
import _ from 'lodash';
import { computed } from 'vue';
import IndexTreeNode from '@/components/index-structure/index-tree-node.vue';
import {
  ConceptNode,
  DatasetSearchResult,
  GridCell,
  SelectableIndexElementId,
} from '@/types/Index';
import useIndexWorkBench from '@/services/composables/useIndexWorkBench';
import useIndexTree from '@/services/composables/useIndexTree';
import { hasChildren, isEmptyNode, isOutputIndexNode, isEdge } from '@/utils/index-tree-util';
import {
  offsetGridCells,
  getGridRowCount,
  getGridColumnCount,
  convertTreeToGridCells,
} from '@/utils/grid-cell-util';

const EDGE_CLASS = {
  SELECTED: 'selected-edge',
  SELECTED_Y: 'selected-y',
  HIGHLIGHTED: 'highlighted',
  HIGHLIGHTED_Y: 'highlighted-y',
  OUTGOING: 'outgoing',
  INCOMING: 'incoming',
};

const props = defineProps<{
  selectedElementId: SelectableIndexElementId | null;
  highlightEdgeId: SelectableIndexElementId | null;
}>();

const emit = defineEmits<{
  (e: 'select-element', selectedElement: SelectableIndexElementId): void;
  (e: 'highlight-edge', selectedElement: SelectableIndexElementId): void;
  (e: 'deselect-all'): void;
  (e: 'clear-highlight'): void;
}>();

const indexTree = useIndexTree();
const { findNode } = indexTree;
const workbench = useIndexWorkBench();

const isOutgoingHighlighted = (id: string) => {
  if (props.highlightEdgeId && isEdge(props.highlightEdgeId)) {
    return props.highlightEdgeId.sourceId === id;
  }
  return false;
};

const isHigherThanSibling = (id: string, edgeId: SelectableIndexElementId) => {
  if (isEdge(edgeId)) {
    const sourceId = edgeId.sourceId;
    if (sourceId === id) {
      return false;
    }
    const targetNode = searchForNode(edgeId.sourceId);

    if (targetNode && targetNode.parent) {
      const allInputs = targetNode.parent.components;
      const idIndex = allInputs.findIndex((item) => item.componentNode.id === sourceId);
      const selection = allInputs.slice(0, idIndex).map((item) => item.componentNode.id);

      return selection.includes(id);
    }
  }
  return false;
};
const isOutgoingYHighlighted = (id: string) => {
  if (props.highlightEdgeId) {
    return isHigherThanSibling(id, props.highlightEdgeId);
  }
  return false;
};
const isOutgoingSelected = (id: string) => {
  if (props.selectedElementId && isEdge(props.selectedElementId)) {
    return props.selectedElementId.sourceId === id;
  }
  return false;
};
const isOutgoingYSelected = (id: string) => {
  if (props.selectedElementId) {
    return isHigherThanSibling(id, props.selectedElementId);
  }
  return false;
};
const isIncomingHighlighted = (id: string) => {
  if (props.highlightEdgeId && isEdge(props.highlightEdgeId)) {
    return props.highlightEdgeId.targetId === id;
  }
  return false;
};
const isIncomingSelected = (id: string) => {
  if (props.selectedElementId && isEdge(props.selectedElementId)) {
    return props.selectedElementId.targetId === id;
  }
  return false;
};
const isSelected = (id: string) => {
  if (props.selectedElementId === id) {
    return true;
  } else if (props.selectedElementId && isEdge(props.selectedElementId)) {
    if (props.selectedElementId.sourceId === id || props.selectedElementId.targetId === id) {
      return true;
    }
  }
  return false;
};
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

const renameNode = (nodeId: string, newName: string) => {
  workbench.findAndRenameNode(nodeId, newName);
  indexTree.findAndRenameNode(nodeId, newName);
};

const deleteNode = (deleteNode: ConceptNode) => {
  // Find from both places and delete the node.
  workbench.findAndDeleteItem(deleteNode.id);
  indexTree.findAndDelete(deleteNode.id);
};

const duplicateNode = (duplicated: ConceptNode) => {
  if (isOutputIndexNode(duplicated)) return;
  workbench.addItem(duplicated);
};

const createChild = (parentNodeId: string) => {
  workbench.findAndAddChild(parentNodeId);
  indexTree.findAndAddChild(parentNodeId);
};

const attachDatasetToNode = (nodeId: string, dataset: DatasetSearchResult) => {
  workbench.attachDatasetToNode(nodeId, dataset);
  indexTree.attachDatasetToNode(nodeId, dataset);
};

const clearAll = () => {
  emit('deselect-all');
};

const highlightClear = () => {
  emit('clear-highlight');
};

const parentId = (id: string): string | null => {
  const found = searchForNode(id);
  if (found && found.parent) {
    return found.parent.id;
  }
  return null;
};

const searchForNode = (id: string) => {
  const foundInTree = findNode(id);
  return foundInTree ?? workbench.findNode(id);
};
</script>

<style scoped lang="scss">
@import '@/styles/uncharted-design-tokens';
@import '@/styles/variables';

$space-between-columns: 40px;
$space-between-rows: 10px;

$incoming-edge-minimum-length: calc(#{$space-between-columns} / 2);
$outgoing-edge-length: calc($space-between-columns - $incoming-edge-minimum-length);
$edge-top-offset-from-node: 13px;
$edge-styles: 2px solid $un-color-black-20;
$edge-selected: $accent-main;

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
      max-height: 5px;
      min-width: $incoming-edge-minimum-length;
      // If one node in the column is wider than this one (e.g. placeholder in search mode), expand
      //  the incoming edge to stay connected to children, and push the node to stay right-aligned.
      flex: 1;
      &.visible {
        border-top: $edge-styles;
        &.highlighted {
          border-color: $accent-light;
        }
        &.selected-edge {
          border-color: $edge-selected;
        }
      }
      &.inactive {
        pointer-events: none;
      }
    }

    &.outgoing {
      width: $outgoing-edge-length;
      &.visible {
        border-top: $edge-styles;
        // Extend edge down to the sibling below this one
        height: calc(100% + #{$space-between-rows});
        border-right: $edge-styles;
        &.highlighted {
          border-top-color: $accent-light;
        }
        &.highlighted-y {
          border-right-color: $accent-light;
        }
        &.selected-edge {
          border-top-color: $edge-selected;
        }
        &.selected-y {
          border-right-color: $edge-selected;
        }
      }
      &.inactive {
        pointer-events: none;
      }
      &.dashed {
        border-top-style: dashed;
        &.highlighted {
          border-top-color: $accent-light;
        }
        &.highlighted-y {
          border-right-color: $accent-light;
        }
        &.selected-edge {
          border-top-color: $edge-selected;
        }
        &.selected-y {
          border-right-color: $edge-selected;
        }
      }
      &.last-child {
        border-right: none;
      }
    }
  }
}
</style>
