<template>
  <div class="index-projections-pane-container">
    <div class="child-nodes-column"></div>
    <div class="selected-node"></div>
    <div class="parent-nodes-column"></div>
  </div>
</template>

<script setup lang="ts">
// import useIndexTree from '@/services/composables/useIndexTree';
// import { SelectableIndexElementId } from '@/types/Index';
// import { computed } from 'vue';

// const props = defineProps<{
//   selectedNodeId: string | null;
// }>();

// const emit = defineEmits<{
//   (e: 'select-element', selectedElement: SelectableIndexElementId): void;
// }>();

// const indexTree = useIndexTree();

// TODO: determine the segment of the graph we're interested in showing:
// - selected node
// - 1 parent if it exists
// - any direct children
// TODO: feed that into code to generate the grid cells
// TODO: OR generate grid cells for full graph and then throw out unrelated ones
// TODO: make selected node extra large and render differently
</script>

<style lang="scss" scoped>
$space-between-columns: 20px;
$space-between-rows: 20px;
.index-projections-pane-container {
  padding: 20px;
  overflow: auto;
  display: grid;
  row-gap: $space-between-rows;

  // When the graph is too small to take up the full available screen width, don't expand columns
  //  to fill the empty space.
  justify-content: flex-start;
  align-content: flex-start;
}
</style>
