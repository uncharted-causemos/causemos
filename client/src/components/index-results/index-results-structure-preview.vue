<template>
  <div class="index-results-structure-preview-container">
    <div
      v-for="cell of gridCells"
      :key="cell.node.id"
      :style="{
        'grid-row': `${cell.startRow} / span ${cell.rowCount}`,
        'grid-column': cell.startColumn,
      }"
      class="grid-cell"
    >
      <div class="edge incoming" :class="getIncomingEdgeClassObject(cell, selectedNodeId, null)" />
      <div class="node" :class="{ selected: cell.node.id === props.selectedNodeId }">
        <i
          v-if="isConceptNodeWithDatasetAttached(cell.node)"
          class="fa fa-fw"
          :class="DATASET_ICON"
          :style="{ color: DATASET_COLOR }"
        />
        <div v-else class="without-dataset" />
      </div>
      <div
        v-if="cell.hasOutputLine"
        class="edge outgoing"
        :class="getOutgoingEdgeClassObject(cell, selectedNodeId, null, findNode)"
      ></div>
    </div>
  </div>
</template>

<script setup lang="ts">
import _ from 'lodash';
import useIndexTree from '@/composables/useIndexTree';
import {
  DATASET_COLOR,
  DATASET_ICON,
  isConceptNodeWithDatasetAttached,
} from '@/utils/index-tree-util';
import { computed } from 'vue';
import {
  convertTreeToGridCells,
  getIncomingEdgeClassObject,
  getOutgoingEdgeClassObject,
} from '@/utils/grid-cell-util';

const { tree, findNode } = useIndexTree();
const props = defineProps<{ selectedNodeId: string | null }>();

const gridCells = computed(() => convertTreeToGridCells(tree.value));
</script>

<style lang="scss" scoped>
@import '@/styles/uncharted-design-tokens.scss';
@import '@/styles/variables.scss';
@import '@/styles/index-graph.scss';

$space-between-columns: 15px;
$space-between-rows: 5px;
$edge-top-offset-from-node: 11px;

.index-results-structure-preview-container {
  display: grid;
  background: var(--p-surface-100);
  row-gap: $space-between-rows;
  justify-content: center;
  overflow-x: auto;
  padding: 10px;
}

.grid-cell {
  position: relative;
  display: flex;
  pointer-events: none;
}

.node {
  pointer-events: auto;
  display: grid;
  place-items: center;
  height: 23px;
  width: 25px;
  border-radius: 2px;

  &.selected {
    background: white;
    border: 1px solid $accent-main;

    .without-dataset {
      background: $accent-main;
      border: 1px solid $accent-main;
    }
  }
  .without-dataset {
    width: 5px;
    height: 5px;
    border-radius: 5px;
    border: 1px solid $un-color-black-30;
    background: white;
  }
}

.edge {
  @include index-tree-edge(
    $edge-top-offset-from-node: $edge-top-offset-from-node,
    $space-between-columns: $space-between-columns
  );
}
</style>
