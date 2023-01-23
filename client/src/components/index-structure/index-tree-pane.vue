<template>
  <div class="index-tree-pane-container">
    <div
      class="index-tree"
      :style="{
        'grid-template-columns': `repeat(${indexNodeItemTree.height + 1}, 340px)`,
        'grid-template-rows': `repeat(${indexNodeItemTree.width}, auto)`,
      }"
    >
      <div
        class="node-box"
        v-for="item in nodeItems"
        :key="item.data.id"
        :style="{
          ...item.style.grid,
        }"
      >
        <div class="in-line" :class="{ visible: item.style.hasInputLine }" />
        <IndexTreeNode class="node-item" v-if="item.data" :data="item.data" />
        <div
          class="out-line"
          :class="{
            visible: item.style.hasOutputLine,
            dashed: item.type === IndexNodeType.Placeholder,
            'last-child': item.style.isLastChild,
          }"
        />
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import _ from 'lodash';
import { computed } from 'vue';
import IndexTreeNode from '@/components/index-structure/index-tree-node.vue';
import { IndexNodeType } from '@/types/Enums';
import { OutputIndex, IndexNode } from '@/types/Index';
import { isParentNode } from '@/utils/indextree-util';

interface Props {
  indexTree: OutputIndex;
}
const props = defineProps<Props>();

// IndexNodeItem contains indexNode data along with metadata needed for rendering and layout of the tree
interface IndexTreeNodeItem {
  type: IndexNodeType;
  children: IndexTreeNodeItem[];
  data: IndexNode;
  /** width of the node represented by the total number of leaf nodes it has */
  width: number;
  /** number of edges on the longest path from the node to a leaf */
  height: number;
  style: {
    hasInputLine: boolean;
    hasOutputLine: boolean;
    isLastChild: boolean;
    grid: {
      /** grid-row css property */
      'grid-row'?: string;
      /** grid-column css property */
      'grid-column'?: string;
    };
  };
}

// Convert given index node tree to index node item tree
const toIndexNodeItemTree = (node: IndexNode): IndexTreeNodeItem => {
  const item: IndexTreeNodeItem = {
    type: node.type,
    data: node,
    children: [] as IndexTreeNodeItem[],
    height: 0,
    width: 1,
    style: {
      grid: {},
      hasInputLine: false,
      hasOutputLine: false,
      isLastChild: false,
    },
  };
  if (isParentNode(node) && node.inputs.length > 0) {
    item.children = node.inputs.map(toIndexNodeItemTree);
    item.height = Math.max(...item.children.map((c) => c.height)) + 1;
    item.width = item.children.reduce((prev, item) => prev + item.width, 0);
    // Add style properties to self and each child node
    item.style.hasInputLine = true;
    item.children.forEach((item) => (item.style.hasOutputLine = true));
    item.children[item.children.length - 1].style.isLastChild = true;
  }
  return item;
};

const calculateLayout = (nodeItem: IndexTreeNodeItem) => {
  const FIRST_ROW = 1;
  const maxCol = nodeItem.height + 1;
  const _calculateLayout = (item: IndexTreeNodeItem, rowNumber: number, level = 0) => {
    item.style.grid['grid-row'] = `${rowNumber} / span ${item.width}`;
    item.style.grid['grid-column'] = `${maxCol - level}`;
    if (item.children.length > 0) {
      // Calculate row # for each child. First child is placed in the same row as its parent
      const startRows = [rowNumber];
      for (let i = 1; i < item.children.length; i++) {
        startRows.push(startRows[i - 1] + item.children[i - 1].width);
      }
      item.children.forEach((child, i) => _calculateLayout(child, startRows[i], level + 1));
    }
  };
  _calculateLayout(nodeItem, FIRST_ROW);
};

const getAllNodeItems = (nodeItem: IndexTreeNodeItem): IndexTreeNodeItem[] =>
  nodeItem.children.reduce((prev, child) => [...prev, ...getAllNodeItems(child)], [nodeItem]);

const indexNodeItemTree = computed(() => {
  const tree = toIndexNodeItemTree(props.indexTree);
  calculateLayout(tree);
  return tree;
});
const nodeItems = computed(() => getAllNodeItems(indexNodeItemTree.value));
</script>

<style scoped lang="scss">
.index-tree-pane-container {
  $node-margin: 6px;
  padding: 40px 30px;
  overflow: auto;
  .index-tree {
    display: grid;
    grid-template-columns: repeat(4, 340px);
    grid-template-rows: repeat(8, auto);
  }
  .node-box {
    position: relative;
    display: flex;
  }
  .node-item {
    margin: $node-margin 0;
  }
  .out-line,
  .in-line {
    position: relative;
    top: $node-margin + 13px;
    &.visible {
      border-top: 2px solid #cacbcc;
    }
    &.visible.dashed {
      border-top: 2px dashed #cacbcc;
    }
  }
  .in-line {
    width: 20px;
  }
  .out-line {
    width: 80px;
    &.visible {
      border-right: 2px solid #cacbcc;
    }
    &.last-child {
      border-right: none;
    }
  }
}
</style>