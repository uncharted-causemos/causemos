<template>
  <div class="index-tree-pane-container" @click="emit('deselect-all')">
    <div
      class="index-tree"
      :style="{
        'grid-template-columns': `repeat(${gridDimensions.numCols + WORKBENCH_LEFT_OFFSET}, 340px)`,
        'grid-template-rows': `repeat(${gridDimensions.numRows}, auto)`,
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
        <IndexTreeNode
          class="node-item"
          v-if="item.data"
          :data="item.data"
          :is-selected="item.data.id === props.selectedElementId"
          @update="updateNode"
          @delete="deleteNode"
          @duplicate="duplicateNode"
          @select="(id) => emit('select-element', id)"
          @click.stop=""
        />
        <div
          class="edge"
          :class="{
            visible: item.style.hasOutputLine,
            dashed: item.type === IndexNodeType.Placeholder,
            'last-child': item.style.isLastChild,
            'first-child': item.style.isFirstChild,
          }"
        >
          <div class="top"><div></div></div>
          <div class="side" />
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import _ from 'lodash';
import { computed, DeepReadonly } from 'vue';
import IndexTreeNode from '@/components/index-structure/index-tree-node.vue';
import { IndexNodeType } from '@/types/Enums';
import { IndexNode, SelectableIndexElementId } from '@/types/Index';
import { isDeepReadOnlyParentNode } from '@/utils/indextree-util';
import useIndexWorkBench from '@/services/composables/useIndexWorkBench';
import useIndexTree from '@/services/composables/useIndexTree';

const props = defineProps<{
  selectedElementId: SelectableIndexElementId | null;
}>();

const emit = defineEmits<{
  (e: 'select-element', selectedElement: SelectableIndexElementId): void;
  (e: 'deselect-all'): void;
}>();

/**
 *  work bench items are positioned at least {WORKBENCH_LEFT_OFFSET} column(s) left to the main output index node
 */
const WORKBENCH_LEFT_OFFSET = 1;

const workBench = useIndexWorkBench();
const indexTree = useIndexTree();

// IndexNodeItem contains indexNode data along with metadata needed for rendering and layout of the tree
interface IndexTreeNodeItem {
  type: IndexNodeType;
  children: IndexTreeNodeItem[];
  data: DeepReadonly<IndexNode>;
  /** width of the node represented by the total number of leaf nodes it has */
  width: number;
  /** number of edges on the longest path from the node to a leaf */
  height: number;
  style: {
    hasOutputLine: boolean;
    isLastChild: boolean;
    isFirstChild: boolean;
    grid: {
      /** grid-row css property */
      'grid-row'?: string;
      /** grid-column css property */
      'grid-column'?: string;
    };
  };
}

// Convert given index node tree to index node item tree
const toIndexNodeItemTree = (node: DeepReadonly<IndexNode>): IndexTreeNodeItem => {
  const item: IndexTreeNodeItem = {
    type: node.type,
    data: node,
    children: [] as IndexTreeNodeItem[],
    height: 0,
    width: 1,
    style: {
      grid: {},
      hasOutputLine: false,
      isFirstChild: false,
      isLastChild: false,
    },
  };
  if (isDeepReadOnlyParentNode(node) && node.inputs.length > 0) {
    item.children = node.inputs.map(toIndexNodeItemTree);
    item.height = Math.max(...item.children.map((c) => c.height)) + 1;
    item.width = item.children.reduce((prev, item) => prev + item.width, 0);
    // Add style properties to self and each child node
    item.children.forEach((item) => (item.style.hasOutputLine = true));
    item.children[item.children.length - 1].style.isLastChild = true;
    item.children[0].style.isFirstChild = true;
  }
  return item;
};

const calculateLayout = (nodeItem: IndexTreeNodeItem, rowOffset = 0, colOffset = 0) => {
  const firstRow = 1 + rowOffset;
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
  _calculateLayout(nodeItem, firstRow);
};

const getAllNodeItems = (nodeItem: IndexTreeNodeItem): IndexTreeNodeItem[] =>
  nodeItem.children.reduce((prev, child) => [...prev, ...getAllNodeItems(child)], [nodeItem]);

/**
 * Calculate the dimension of the grid in terms of number of grid columns and grid rows to place the provided trees
 * @param trees Root index node items
 */
const getGridDimensions = (trees: IndexTreeNodeItem[]) => {
  // height of the rendered grid is driven by the node width since the tree is lying side way
  const sumWidth = trees.reduce((prev, cur) => prev + cur.width, 0);
  const maxHeight = trees.reduce((prev, cur) => Math.max(prev, cur.height), 0);
  return {
    numCols: maxHeight + 1,
    numRows: sumWidth,
  };
};

// Temporary nodes/sub-trees that are being created and detached from the main tree
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
  const workbenchDimension = getGridDimensions(workBenchNodeItemTrees.value);
  const tree = toIndexNodeItemTree(indexTree.tree.value);
  const mainTreeNumCols = getGridDimensions([tree]).numCols;
  const maxNumCols = Math.max(workbenchDimension.numCols + WORKBENCH_LEFT_OFFSET, mainTreeNumCols);
  calculateLayout(tree, workbenchDimension.numRows, maxNumCols - mainTreeNumCols);
  return tree;
});

const gridDimensions = computed(() =>
  getGridDimensions([indexNodeItemTree.value, ...workBenchNodeItemTrees.value])
);

const workBenchNodeItems = computed(() =>
  _.flatten(workBenchNodeItemTrees.value.map(getAllNodeItems))
);
const mainTreeNodeItems = computed(() => getAllNodeItems(indexNodeItemTree.value));
const nodeItems = computed(() => {
  return [...workBenchNodeItems.value, ...mainTreeNodeItems.value];
});

const updateNode = (updated: IndexNode) => {
  if (updated.type !== IndexNodeType.OutputIndex) workBench.findAndUpdateItem(updated);
  indexTree.findAndUpdate(updated);
};

const deleteNode = (deleteNode: IndexNode) => {
  // Find from both places and delete the node.
  workBench.findAndDeleteItem(deleteNode.id);
  indexTree.findAndDelete(deleteNode.id);
};

const duplicateNode = (duplicated: IndexNode) => {
  if (duplicated.type === IndexNodeType.OutputIndex) return;
  workBench.addItem(duplicated);
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
  .edge {
    position: relative;
    top: $node-margin + 13px;
    width: 100px;
    &.visible {
      .top {
        width: 80%;
        border-top: 2px solid #cacbcc;
      }
      .side {
        width: 80%;
        height: 100%;
        border-right: 2px solid #cacbcc;
      }
    }
    &.first-child {
      .top {
        width: 100%;
        div {
          position: absolute;
          top: 0px;
          border-top: 2px solid #cacbcc;
          right: 0px;
          width: 20%;
        }
      }
    }
    &.last-child {
      .side {
        border: none;
      }
    }
    &.visible.dashed {
      .top {
        border-top: 2px dashed #cacbcc;
      }
    }
  }
}
</style>
