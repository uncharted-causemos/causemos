<template>
  <div class="index-results-component-list-container">
    <div
      v-for="item in componentListItems"
      :key="item.node.id"
      class="list-item"
      :class="{ selected: item.node.isOutputNode }"
      :style="{ 'padding-left': BASE_LEFT_PADDING_PX + item.depth * INDENT_AMOUNT_PX + 'px' }"
    >
      <span>{{ item.node.name }}</span>
    </div>
  </div>
</template>

<script setup lang="ts">
import useIndexTree from '@/services/composables/useIndexTree';
import { ConceptNode } from '@/types/Index';
import { isConceptNodeWithoutDataset } from '@/utils/index-tree-util';
import { computed } from 'vue';

const INDENT_AMOUNT_PX = 20;
const BASE_LEFT_PADDING_PX = 5;

const { tree } = useIndexTree();

/**
 * Makes a list of nodes annotated with their depth in the tree.
 * Performs a depth-first search of the tree.
 */
const componentListItems = computed(() => {
  const result: { depth: number; node: ConceptNode }[] = [];
  const _computeListItems = (node: ConceptNode, depth: number) => {
    // Add current node to result list
    result.push({ depth, node });
    if (!isConceptNodeWithoutDataset(node)) {
      return;
    }
    // Recurse through children
    node.components.forEach((input) => {
      _computeListItems(input.componentNode, depth + 1);
    });
  };
  _computeListItems(tree.value, 0);
  return result;
});
</script>

<style lang="scss" scoped>
@import '~styles/variables';
@import '~styles/uncharted-design-tokens';

.list-item {
  border: 2px solid transparent;
  padding: 3px 5px;
  border-radius: 2px;
  display: flex;
  gap: 5px;
  align-items: center;
  span {
    flex: 1;
    min-width: 0;
    overflow-x: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  &.selected {
    border-color: $accent-main;
  }
}
</style>
