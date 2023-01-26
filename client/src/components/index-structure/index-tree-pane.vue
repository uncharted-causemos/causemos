<template>
  <div class="index-tree-pane-container">
    <div
      class="index-tree"
      :style="{
        'grid-template-columns': `repeat(${gridDimension.numCols + WORKBENCH_LEFT_OFFSET}, 340px)`,
        'grid-template-rows': `repeat(${gridDimension.numRows}, auto)`,
      }"
    >
      <div
        class="node-box"
        v-for="(item, index) in nodeItems"
        :key="item.data.id"
        :style="{
          ...item.style.grid,
        }"
      >
        <div class="in-line" :class="{ visible: item.style.hasInputLine }" />
        <IndexTreeNode
          class="node-item"
          v-if="item.data"
          :data="item.data"
          :show-index-add-button="!isMainTreeNodeItem(index)"
          @update="handleUpdateNode"
          @delete="handleDeleteNode"
          @duplicate="handleDuplicateNode"
        />
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
import useIndexWorkBench from '@/services/composables/useIndexWorkBench';

/**
 *  work bench items are positioned at least {WORKBENCH_LEFT_OFFSET} column(s) left to the main output index node
 */
const WORKBENCH_LEFT_OFFSET = 1;

interface Props {
  indexAnalysisId: string;
  indexTree: OutputIndex;
}
const props = defineProps<Props>();

const workBench = useIndexWorkBench();

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

const calculateLayout = (nodeItem: IndexTreeNodeItem, rowOffset = 0, colOffset = 0) => {
  const FIRST_ROW = 1 + rowOffset;
  const maxCol = nodeItem.height + 1 + colOffset;
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

/**
 * Calculate the dimension of the grid in terms of number of grid columns and grid rows to place the provided trees
 * @param trees Root index node items
 */
const getGridDimension = (trees: IndexTreeNodeItem[]) => {
  // height of the rendered grid is driven by the node width since the tree is lying side way
  const sumWidth = trees.reduce((prev, cur) => prev + cur.width, 0);
  const maxHeight = trees.reduce((prev, cur) => Math.max(prev, cur.height), 0);
  return {
    numCols: maxHeight + 1,
    numRows: sumWidth,
  };
};

// Temporary nodes/sub-tree that are being created and detached from the main tree
const workBenchNodeItemTrees = computed(() => {
  let rowOffset = 0;
  const trees = workBench.items.value.map((node) => {
    const tree = toIndexNodeItemTree(node);
    calculateLayout(tree, rowOffset);
    rowOffset += tree.width;
    return tree;
  });
  return trees;
});

const indexNodeItemTree = computed(() => {
  const workbenchDimension = getGridDimension(workBenchNodeItemTrees.value);
  const tree = toIndexNodeItemTree(props.indexTree);
  const mainTreeNumCols = getGridDimension([tree]).numCols;
  const maxNumCols = Math.max(workbenchDimension.numCols + WORKBENCH_LEFT_OFFSET, mainTreeNumCols);
  calculateLayout(tree, workbenchDimension.numRows, maxNumCols - mainTreeNumCols);
  return tree;
});

const gridDimension = computed(() =>
  getGridDimension([indexNodeItemTree.value, ...workBenchNodeItemTrees.value])
);

const workBenchNodeItems = computed(() =>
  _.flatten(workBenchNodeItemTrees.value.map(getAllNodeItems))
);
const mainTreeNodeItems = computed(() => getAllNodeItems(indexNodeItemTree.value));
const nodeItems = computed(() => {
  return [...workBenchNodeItems.value, ...mainTreeNodeItems.value];
});

const isMainTreeNodeItem = (nodeItemIndex: number) => {
  const mainTreeNodeItemStartIndex = workBenchNodeItems.value.length;
  return nodeItemIndex >= mainTreeNodeItemStartIndex;
};

const handleUpdateNode = (updated: IndexNode) => {
  if (updated.type !== IndexNodeType.OutputIndex) workBench.findAndUpdateItem(updated);
  // TODO: handle updated node from upstream index tree
};
const handleDeleteNode = (deleteNode: IndexNode) => {
  workBench.findAndDeleteItem(deleteNode.id);
  // TODO: handle delete node from upstream index tree
};
const handleDuplicateNode = (duplicated: IndexNode) => {
  if (duplicated.type !== IndexNodeType.OutputIndex) workBench.addItem(duplicated);
};
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
