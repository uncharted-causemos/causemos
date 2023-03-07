<template>
  <div class="index-results-component-list-container">
    <div
      v-for="item in componentListItems"
      :key="item.node.id"
      class="list-item"
      :class="{ selected: item.node.type === IndexNodeType.OutputIndex }"
      :style="{ 'padding-left': BASE_LEFT_PADDING + item.depth * INDENT_AMOUNT_PX + 'px' }"
    >
      <i
        class="fa fa-fw"
        :class="[getIndexNodeTypeIcon(item.node.type)]"
        :style="{ color: getIndexNodeTypeColor(item.node.type) }"
      />
      <span>{{ item.node.name }}</span>
    </div>
  </div>
</template>

<script setup lang="ts">
import useIndexTree from '@/services/composables/useIndexTree';
import { IndexNodeType } from '@/types/Enums';
import { IndexNode } from '@/types/Index';
import { getIndexNodeTypeColor, getIndexNodeTypeIcon, isParentNode } from '@/utils/index-tree-util';
import { computed } from 'vue';

const INDENT_AMOUNT_PX = 20;
const BASE_LEFT_PADDING = 5;

const { tree } = useIndexTree();

/**
 * Makes a list of nodes annotated with their depth in the tree.
 * Performs a depth-first search of the tree.
 */
const componentListItems = computed(() => {
  const result: { depth: number; node: IndexNode }[] = [];
  const _computeListItems = (node: IndexNode, depth: number) => {
    // Add current node to result list
    result.push({ depth, node });
    if (!isParentNode(node)) {
      return;
    }
    // Recurse through children
    node.inputs.forEach((input) => {
      _computeListItems(input, depth + 1);
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
