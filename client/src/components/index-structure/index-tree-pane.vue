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
      ref="gridCellElements"
      :key="cell.node.id"
      :style="{
        'grid-row': `${cell.startRow} / span ${cell.rowCount}`,
        'grid-column': cell.startColumn,
      }"
      class="grid-cell"
    >
      <div
        class="edge incoming"
        :class="getIncomingEdgeClassObject(cell, selectedElementId, highlightEdgeId)"
        @mouseenter="() => !isConnecting && handleHighlightEdge(cell.node)"
        @mouseleave="highlightClear"
        @click="() => !isConnecting && handleClickSelectEdge(cell.node)"
      ></div>
      <IndexTreeNode
        :node-data="cell.node"
        :is-selected="isSelected(cell.node.id)"
        :is-connecting="isConnecting"
        :is-descendent-of-connecting-node="isDescendentOfConnectingNode(cell.node.id)"
        :countryFilters="countryFilters"
        class="index-tree-node"
        @rename="renameNode"
        @delete="deleteNode"
        @duplicate="duplicateNode"
        @detachDataset="detachDataset"
        @switchDataset="switchDataset"
        @select="(id) => emit('select-element', id)"
        @create-child="createChild"
        @attach-dataset="attachDatasetToNode"
        @create-edge="createEdge"
        @mouseenter="highlightClear"
        @add-country-filter="(countryFilter: CountryFilter) => emit('add-country-filter', countryFilter)"
        @update-country-filter="(countryFilter: CountryFilter) => emit('update-country-filter', countryFilter)"
        @delete-country-filter="(countryFilter: CountryFilter) => emit('delete-country-filter', countryFilter)"
      />
      <div
        v-if="!cell.node.isOutputNode && cell.hasOutputLine"
        class="edge outgoing"
        :class="getOutgoingEdgeClassObject(cell, selectedElementId, highlightEdgeId, searchForNode)"
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
      <div
        v-if="!cell.node.isOutputNode && cell.hasOutputLine"
        class="hit-box"
        :style="getHitBoxStyle(cell, gridCellElementsAsHTML)"
        @mouseenter="() => !isConnecting && handleMouseEnter(cell.node.id)"
        @mouseleave="highlightClear"
        @click="() => !isConnecting && handleMouseClick(cell.node.id)"
      ></div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from 'vue';
import { getAnalysisState } from '@/services/analysis-service';
import IndexTreeNode from '@/components/index-structure/index-tree-node.vue';
import {
  ConceptNode,
  DatasetSearchResult,
  GridCell,
  SelectableIndexElementId,
} from '@/types/Index';
import useIndexWorkBench from '@/services/composables/useIndexWorkBench';
import useIndexTree from '@/services/composables/useIndexTree';
import { isOutputIndexNode, isEdge, isConceptNodeWithoutDataset } from '@/utils/index-tree-util';
import {
  getGridCellsFromIndexTreeAndWorkbench,
  getHitBoxStyle,
  getIncomingEdgeClassObject,
  getOutgoingEdgeClassObject,
} from '@/utils/grid-cell-util';
import { useRoute } from 'vue-router';
import { CountryFilter } from '@/types/Analysis';

const route = useRoute();
const analysisId = computed(() => route.params.analysisId as string);

const props = defineProps<{
  selectedElementId: SelectableIndexElementId | null;
  highlightEdgeId: SelectableIndexElementId | null;
  countryFilters: CountryFilter[];
}>();

/**
 * Track the state of creating a new edge (connecting)
 * isConnecting is used to control logic and visual aspects
 * connectingId tracks the currently selected "first node" in the edge set.
 */
const isConnecting = ref<boolean>(false);
const connectingId = ref<string | null>(null);
const gridCellElements = ref([]);
const analysisState = ref();

const emit = defineEmits<{
  (e: 'select-element', selectedElement: SelectableIndexElementId): void;
  (e: 'highlight-edge', selectedElement: SelectableIndexElementId): void;
  (e: 'deselect-all'): void;
  (e: 'clear-highlight'): void;
  (e: 'add-country-filter', selectedCountry: CountryFilter): void;
  (e: 'update-country-filter', updatedFilter: CountryFilter): void;
  (e: 'delete-country-filter', filterToDelete: CountryFilter): void;
}>();

const indexTree = useIndexTree();
const { findNode } = indexTree;
const workbench = useIndexWorkBench();

onMounted(async () => {
  analysisState.value = await getAnalysisState(analysisId.value);
});

const isDescendentOfConnectingNode = (targetId: string) => {
  if (connectingId.value !== null) {
    return workbench.isDescendant(targetId, connectingId.value);
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

const gridCellElementsAsHTML = computed<HTMLElement[]>(
  () => gridCellElements.value as HTMLElement[]
);

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

const detachDataset = (nodeId: string) => {
  workbench.revertNode(nodeId);
  indexTree.revertNode(nodeId);
};

const switchDataset = (nodeId: string) => {
  workbench.detachDatasetFromNode(nodeId);
  indexTree.detachDatasetFromNode(nodeId);
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
        border-left-color: $accent-light;
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
        border-left-color: $accent-light;
      }
    }
  }
}

.input-arrow {
  @include arrow-head();
  margin-top: 9px;
  border-left-color: $positive;
}

.edge {
  @include index-tree-edge();
}

.hit-box {
  position: absolute;
  pointer-events: auto;
}
</style>
