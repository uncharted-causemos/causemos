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
      <div class="edge incoming" :class="{ visible: hasChildren(cell.node) }" />
      <div class="node" :class="{ selected: cell.node.id === props.selectedNodeId }">
        <i class="fa fa-fw fa-th" />
      </div>
      <div
        v-if="cell.hasOutputLine"
        class="edge outgoing"
        :class="{
          'last-child': cell.isLastChild,
        }"
      ></div>
    </div>
  </div>
</template>

<script setup lang="ts">
import _ from 'lodash';
import useIndexTree from '@/services/composables/useIndexTree';
import { hasChildren } from '@/utils/index-tree-util';
import { computed } from 'vue';
import { convertTreeToGridCells } from '@/utils/grid-cell-util';

const { tree } = useIndexTree();
const props = defineProps<{ selectedNodeId: string | null }>();

const gridCells = computed(() => convertTreeToGridCells(tree.value));
</script>

<style lang="scss" scoped>
@import '@/styles/uncharted-design-tokens.scss';
@import '@/styles/variables.scss';

$space-between-columns: 15px;
$space-between-rows: 5px;

$incoming-edge-minimum-length: calc(#{$space-between-columns} / 2);
$outgoing-edge-length: calc($space-between-columns - $incoming-edge-minimum-length);
$edge-top-offset-from-node: 11px;
$edge-styles: 2px solid $un-color-black-20;

.index-results-structure-preview-container {
  display: grid;
  background: $un-color-black-5;
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
  }
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
    // By default, flex items take up the full height of their containing node.
    // Because we offset edges downward, if this element were full height it would overflow below
    //  the cell. We set this incoming edge element's height to 0 to avoid that.
    height: 0;
    &.visible {
      border-top: $edge-styles;
    }
  }

  &.outgoing {
    width: $outgoing-edge-length;
    border-top: $edge-styles;
    // Extend edge down to the sibling below this one
    height: calc(100% + #{$space-between-rows});
    border-right: $edge-styles;

    &.last-child {
      border-right: none;
      // No need to extend below this cell since we're not drawing a right border.
      height: 0;
    }
  }
}
</style>
