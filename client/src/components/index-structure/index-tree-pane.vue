<template>
  <div class="index-tree-pane-container">
    <div class="flex h-100">
      <div class="node-col" v-for="(items, index) in nodeItemsByLevel" :key="index">
        <div
          class="node-box"
          v-for="(item, index) in items"
          :key="index"
          :style="{ height: item.width * NODE_HEIGHT + 'px' }"
        >
          <div class="in-line" :class="{ visible: item.style.inputLine }" />
          <IndexTreeNode class="node-item" v-if="item.data" :data="item.data" />
          <div
            class="out-line"
            :class="{ visible: item.style.outputLine, 'last-child': item.style.isLastChild }"
            :style="{ height: item.width * NODE_HEIGHT + 'px' }"
          />
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import IndexTreeNode from '@/components/index-structure/index-tree-node.vue';
import { IndexNodeType } from '@/types/Enums';
import { OutputIndex, IndexNode, Dataset } from '@/types/Index';
import { computed } from 'vue';

const NODE_HEIGHT = 100;

interface Props {
  indexTree: OutputIndex;
}
const props = defineProps<Props>();

// Util
const isDatasetNode = (indexNode: IndexNode): indexNode is Dataset => {
  return indexNode.type === IndexNodeType.Dataset;
};

// IndexNodeItem contains indexNode data along with metadata needed for rendering and layout
interface IndexTreeNodeItem {
  type: IndexNodeType | 'Dummy' | 'Placeholder';
  children: IndexTreeNodeItem[];
  data?: IndexNode;
  width: number; // tree (or subtree) width
  height: number; // tree(or subtree) height
  style: {
    inputLine: boolean;
    outputLine: boolean;
    isLastChild: boolean;
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
      inputLine: false,
      outputLine: false,
      isLastChild: false,
    },
  };
  if (!isDatasetNode(node) && node.inputs.length > 0) {
    item.children = node.inputs.map(toIndexNodeItemTree);
    item.height = Math.max(...item.children.map((c) => c.height)) + 1;
    item.width = item.children.reduce((prev, item) => prev + item.width, 0);
    // Add style properties to self and each child node
    item.style.inputLine = true;
    item.children.forEach((item) => (item.style.outputLine = true));
    item.children[item.children.length - 1].style.isLastChild = true;
  }
  return item;
};

// Recursively traverse the tree and attach a dummy node to leaf node if the leaf node is not at the bottom most level
// dummy node is used for spacing between nodes at the same level
// eg.
//              node
//     node     node       node
//  node    (dummy node)     node
const attachDummyNode = (node: IndexTreeNodeItem) => {
  const height = node.height; // tree height
  const level = 0; // current tree level
  const _attachDummyNode = (node: IndexTreeNodeItem, level: number) => {
    if (height === level) return;
    if (node.children.length === 0) {
      node.children.push({
        type: 'Dummy',
        children: [],
        height: 0,
        width: 1,
        style: { inputLine: false, outputLine: false, isLastChild: false },
      });
      node.height = height - level;
    }
    node.children.forEach((c) => _attachDummyNode(c, level + 1));
  };
  _attachDummyNode(node, level);
  return node;
};

const getIndexTreeNodeItemByLevel = (nodeItem: IndexTreeNodeItem) => {
  const levels: IndexTreeNodeItem[][] = [[nodeItem]];
  let nextLevel = 1;
  const parentItems = () => levels[nextLevel - 1] || [];
  while (parentItems().length > 0) {
    const items: IndexTreeNodeItem[] = [];
    for (const item of parentItems()) {
      items.push(...item.children);
    }
    if (items.length > 0) levels[nextLevel] = items;
    nextLevel++;
  }
  return levels;
};
// -------------------------------

const nodeItemsByLevel = computed(() => {
  const indexNodeItemTree = toIndexNodeItemTree(props.indexTree);
  attachDummyNode(indexNodeItemTree);
  const nodesByLevel = getIndexTreeNodeItemByLevel(indexNodeItemTree);
  return nodesByLevel.reverse();
});
</script>

<style scoped lang="scss">
.index-tree-pane-container {
  padding: 40px 30px;
  overflow: auto;
  .node-col {
    width: 340px;
  }
  .node-box {
    position: relative;
    display: flex;
  }
  .out-line,
  .in-line {
    position: relative;
    top: 12px;
    &.visible {
      border-top: 2px solid #cacbcc;
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
