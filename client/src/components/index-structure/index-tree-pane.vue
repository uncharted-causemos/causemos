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
          [EDGE_CLASS.SELECTED]: isIncomingSelected(cell.node.id),
          [EDGE_CLASS.HIGHLIGHTED]:
            isIncomingHighlighted(cell.node.id) && !isIncomingSelected(cell.node.id),
        }"
        @mouseenter="(evt) => highlight(evt, cell.node.id)"
        @mouseleave="highlightClear"
        @click="(evt) => selectEdge(evt, cell.node.id)"
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
        @attach-dataset="attachDatasetToPlaceholder"
        @mouseenter="highlightClear"
        @click="edgeSelectionClear"
      />
      <div
        class="edge outgoing"
        :class="{
          visible: cell.hasOutputLine,
          dashed: cell.node.type === IndexNodeType.Placeholder,
          'last-child': cell.isLastChild,
          [EDGE_CLASS.SELECTED]: isOutgoingSelected(cell.node.id),
          [EDGE_CLASS.SELECTED_Y]: isOutgoingYSelected(cell.node.id),
          [EDGE_CLASS.HIGHLIGHTED]:
            isOutgoingHighlighted(cell.node.id) && !isOutgoingSelected(cell.node.id),
          [EDGE_CLASS.HIGHLIGHTED_Y]:
            isOutgoingYHighlighted(cell.node.id) && !isOutgoingYSelected(cell.node.id),
        }"
        @mouseenter="(evt) => highlight(evt, cell.node.id)"
        @mouseleave="highlightClear"
        @click="(evt) => selectEdge(evt, cell.node.id)"
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
import { hasChildren } from '@/utils/index-tree-util';
import {
  offsetGridCells,
  getGridRowCount,
  getGridColumnCount,
  convertTreeToGridCells,
  EDGE_CLASS,
} from '@/utils/grid-cell-util';

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
  if (props.highlightEdgeId && typeof props.highlightEdgeId === 'object') {
    return props.highlightEdgeId.sourceId === id;
  }
  return false;
};

const isYRequired = (id: string, isHighlight: boolean) => {
  let edgeId = null;
  if (isHighlight) {
    edgeId = props.highlightEdgeId;
  } else {
    edgeId = props.selectedElementId;
  }

  if (edgeId && typeof edgeId === 'object') {
    const sourceId = edgeId.sourceId;
    if (sourceId === id) {
      return false;
    }
    const targetNode = searchForNode(edgeId.sourceId);

    if (
      targetNode &&
      targetNode.parent &&
      (targetNode.parent.type === 'Index' || targetNode.parent.type === 'OutputIndex')
    ) {
      const allInputs = targetNode.parent.inputs;
      const idIndex = allInputs.findIndex((item) => item.id === sourceId);
      const selection = allInputs.slice(0, idIndex).map((item) => item.id);

      const returnValue = selection.includes(id);
      return returnValue;
    }
  }
  return false;
};
const isOutgoingYHighlighted = (id: string) => {
  return isYRequired(id, true);
};
const isOutgoingSelected = (id: string) => {
  if (props.selectedElementId && typeof props.selectedElementId === 'object') {
    return props.selectedElementId.sourceId === id;
  }
  return false;
};
const isOutgoingYSelected = (id: string) => {
  return isYRequired(id, false);
};
const isIncomingHighlighted = (id: string) => {
  if (props.highlightEdgeId && typeof props.highlightEdgeId === 'object') {
    return props.highlightEdgeId.targetId === id;
  }
  return false;
};
const isIncomingSelected = (id: string) => {
  if (props.selectedElementId && typeof props.selectedElementId === 'object') {
    return props.selectedElementId.targetId === id;
  }
  return false;
};
const isSelected = (id: string) => {
  if (typeof id === 'string' && props.selectedElementId === id) {
    return true;
  } else if (props.selectedElementId && typeof props.selectedElementId === 'object') {
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

const deleteNode = (deleteNode: IndexNode) => {
  // Find from both places and delete the node.
  workbench.findAndDeleteItem(deleteNode.id);
  indexTree.findAndDelete(deleteNode.id);
};

const duplicateNode = (duplicated: IndexNode) => {
  if (duplicated.type === IndexNodeType.OutputIndex) return;
  workbench.addItem(duplicated);
};

const createChild = (
  parentNodeId: string,
  childType: IndexNodeType.Index | IndexNodeType.Dataset
) => {
  workbench.findAndAddChild(parentNodeId, childType);
  indexTree.findAndAddChild(parentNodeId, childType);
};

const attachDatasetToPlaceholder = (nodeId: string, dataset: DatasetSearchResult) => {
  workbench.attachDatasetToPlaceholder(nodeId, dataset);
  indexTree.attachDatasetToPlaceholder(nodeId, dataset);
};

const clearAll = () => {
  emit('deselect-all');
};

const highlight = (evt: MouseEvent, nodeId: string) => {
  interactEdge(evt, nodeId, true);
};

const highlightClear = () => {
  emit('clear-highlight');
};

const edgeSelectionClear = () => {
  clearAll();
};

const searchForNode = (id: string) => {
  const foundInTree = findNode(id);
  return foundInTree ?? workbench.findNode(id);
};

const interactEdge = (evt: MouseEvent, nodeId: string, isHighlight = false) => {
  highlightClear();
  const targetElement = evt.target as HTMLElement;
  if (targetElement) {
    const foundNode = searchForNode(nodeId);
    if (foundNode) {
      const isIncoming = targetElement.classList.contains(EDGE_CLASS.INCOMING);
      const isOutgoing = targetElement.classList.contains(EDGE_CLASS.OUTGOING);

      if (
        isIncoming &&
        (foundNode.found.type === 'Index' || foundNode.found.type === 'OutputIndex')
      ) {
        if (foundNode.found.inputs.length > 0) {
          if (isHighlight) {
            emit('highlight-edge', {
              sourceId: foundNode.found.inputs[0].id,
              targetId: foundNode.found.id,
            });
          } else {
            emit('select-element', {
              sourceId: foundNode.found.inputs[0].id,
              targetId: foundNode.found.id,
            });
          }
        } else {
          if (!isHighlight) {
            emit('select-element', foundNode.found.id);
          }
        }
      } else if (isIncoming && !isHighlight) {
        emit('select-element', foundNode.found.id);
      } else if (isOutgoing) {
        if (foundNode.parent) {
          if (isHighlight) {
            emit('highlight-edge', { sourceId: foundNode.found.id, targetId: foundNode.parent.id });
          } else {
            emit('select-element', { sourceId: foundNode.found.id, targetId: foundNode.parent.id });
          }
        } else {
          if (!isHighlight) {
            emit('select-element', foundNode.found.id);
          }
        }
      }
    }
  }
};
const selectEdge = (evt: MouseEvent, nodeId: string) => {
  interactEdge(evt, nodeId, false);
};
</script>

<style scoped lang="scss">
@import '~styles/uncharted-design-tokens';
@import '~styles/variables';

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
