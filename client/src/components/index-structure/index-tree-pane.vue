<template>
  <div
    ref="tree-container"
    class="index-tree-pane-container index-graph"
    :class="{
      'connecting-nodes': isConnecting,
    }"
    @click.self="clearEdgeConnect"
  >
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
        @mouseenter="() => !isConnecting && handleHighlightEdge(cell.node)"
        @mouseleave="highlightClear"
        @click="() => !isConnecting && handleClickSelectEdge(cell.node)"
      ></div>
      <IndexTreeNode
        :node-data="cell.node"
        :is-selected="isSelected(cell.node.id)"
        :is-connecting="isConnecting"
        :is-descendent-of-connecting-node="isDescendentOfConnectingNode(cell.node.id)"
        class="index-tree-node"
        @rename="renameNode"
        @delete="deleteNode"
        @duplicate="duplicateNode"
        @select="(id) => emit('select-element', id)"
        @create-child="createChild"
        @attach-dataset="attachDatasetToNode"
        @create-edge="createEdge"
        @mouseenter="highlightClear"
      />
      <div
        v-if="!cell.node.isOutputNode && cell.hasOutputLine"
        class="edge outgoing"
        :class="{
          visible: cell.hasOutputLine,
          inactive: !cell.hasOutputLine,
          'last-child': cell.isLastChild,
          [EDGE_CLASS.SELECTED]: isOutgoingSelected(cell.node.id),
          [EDGE_CLASS.SELECTED_Y]: isOutgoingYSelected(cell.node.id),
          [EDGE_CLASS.HIGHLIGHTED]:
            isOutgoingHighlighted(cell.node.id) && !isOutgoingSelected(cell.node.id),
          [EDGE_CLASS.HIGHLIGHTED_Y]:
            isOutgoingYHighlighted(cell.node.id) && !isOutgoingYSelected(cell.node.id),
        }"
        @mouseenter="() => !isConnecting && handleMouseEnter(cell.node.id)"
        @mouseleave="highlightClear"
        @click="() => !isConnecting && handleMouseClick(cell.node.id)"
      />
      <div
        v-if="!cell.node.isOutputNode && !cell.hasOutputLine"
        class="connector"
        :class="{
          connecting: cell.node.id === connectingId,
        }"
      >
        <div class="edge outgoing visible last-child"></div>
        <button type="button" class="btn btn-sm" @click="() => handleConnect(cell.node.id)">
          Connect
        </button>
        <div class="edge outgoing visible last-child"></div>
        <div class="input-arrow"></div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import _ from 'lodash';
import { computed, ref } from 'vue';
import IndexTreeNode from '@/components/index-structure/index-tree-node.vue';
import {
  ConceptNode,
  DatasetSearchResult,
  GridCell,
  SelectableIndexElementId,
} from '@/types/Index';
import useIndexWorkBench from '@/services/composables/useIndexWorkBench';
import useIndexTree from '@/services/composables/useIndexTree';
import {
  hasChildren,
  isOutputIndexNode,
  isEdge,
  isConceptNodeWithoutDataset,
} from '@/utils/index-tree-util';
import { getGridCellsFromIndexTreeAndWorkbench } from '@/utils/grid-cell-util';

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

/**
 * Track the state of creating a new edge (connecting)
 * isConnecting is used to control logic and visual aspects
 * connectingId tracks the currently selected "first node" in the edge set.
 */
const isConnecting = ref<boolean>(false);
const connectingId = ref<string | null>(null);

const emit = defineEmits<{
  (e: 'select-element', selectedElement: SelectableIndexElementId): void;
  (e: 'highlight-edge', selectedElement: SelectableIndexElementId): void;
  (e: 'deselect-all'): void;
  (e: 'clear-highlight'): void;
}>();

const indexTree = useIndexTree();
const { findNode } = indexTree;
const workbench = useIndexWorkBench();

const isDescendentOfConnectingNode = (targetId: string) => {
  if (connectingId.value !== null) {
    return workbench.isDescendant(targetId, connectingId.value);
  }
  return false;
};
const isOutgoingHighlighted = (id: string) => {
  if (props.highlightEdgeId && isEdge(props.highlightEdgeId)) {
    return props.highlightEdgeId.sourceId === id;
  }
  return false;
};

const createEdge = (id: string) => {
  if (connectingId.value !== null) {
    const sourceNode = workbench.popItem(connectingId.value);

    if (sourceNode !== null) {
      workbench.findAndAddChild(id, sourceNode);
      indexTree.findAndAddChild(id, sourceNode);
    }
  }

  clearEdgeConnect();
};
const handleClickSelectEdge = (node: ConceptNode) => {
  if (isConceptNodeWithoutDataset(node) && node.components.length > 0) {
    emit('select-element', { sourceId: node.components[0].componentNode.id, targetId: node.id });
  }
};
const handleHighlightEdge = (node: ConceptNode) => {
  if (isConceptNodeWithoutDataset(node) && node.components.length > 0) {
    emit('highlight-edge', { sourceId: node.components[0].componentNode.id, targetId: node.id });
  }
};
const handleConnect = (id: string) => {
  if (isConnecting.value && id === connectingId.value) {
    clearEdgeConnect();
  } else if (isConnecting.value && id !== connectingId.value) {
    connectingId.value = id;
  } else {
    isConnecting.value = true;
    connectingId.value = id;
  }
  clearAll();
};

const handleMouseEnter = (sourceId: string) => {
  const targetId: string | null = parentId(sourceId);
  if (targetId !== null) {
    emit('highlight-edge', { sourceId, targetId });
  }
};

const handleMouseClick = (sourceId: string) => {
  const targetId = parentId(sourceId);
  if (targetId !== null) {
    emit('select-element', { sourceId, targetId });
  }
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
  return getGridCellsFromIndexTreeAndWorkbench(indexTree.tree.value, workbench.items.value);
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
  workbench.findAndAddNewChild(parentNodeId);
  indexTree.findAndAddNewChild(parentNodeId);
};

const attachDatasetToNode = (
  nodeId: string,
  dataset: DatasetSearchResult,
  nodeNameAfterAttachingDataset: string
) => {
  workbench.attachDatasetToNode(nodeId, dataset, nodeNameAfterAttachingDataset);
  indexTree.attachDatasetToNode(nodeId, dataset, nodeNameAfterAttachingDataset);
};

const clearEdgeConnect = () => {
  isConnecting.value = false;
  connectingId.value = null;
  clearAll();
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
@import '@/styles/index-graph';

.index-tree-pane-container {
  &.connecting-nodes {
    cursor: crosshair;
  }

  .connector {
    display: flex;
    flex-direction: row;
    pointer-events: auto;
    button {
      height: 2.2em;
      background-color: white;
    }
    &:hover {
      cursor: grabbing;
      button {
        border-color: $accent-light;
      }
      div.edge {
        border-color: $accent-light;
      }
      div.input-arrow {
        border-left: 5px solid $accent-light;
      }
    }
    &.connecting {
      cursor: grabbing;
      button {
        border-color: $accent-light;
      }
      div.edge {
        border-color: $accent-light;
      }
      div.input-arrow {
        border-left: 5px solid $accent-light;
      }
    }
  }

  .input-arrow {
    // position: absolute;
    margin-top: 9px;
    width: 0;
    height: 0;
    border-top: 5px solid transparent;
    border-bottom: 5px solid transparent;
    border-left: 5px solid #b3b4b5;
  }
}
</style>
