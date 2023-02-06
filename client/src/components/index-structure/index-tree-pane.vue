<template>
  <div class="index-tree-pane-container">
    <div
      class="index-tree"
      :style="{
        'grid-template-columns': `repeat(${gridDimensions.numCols + WORKBENCH_LEFT_OFFSET}, auto)`,
        'grid-template-rows': `repeat(${gridDimensions.numRows}, auto)`,
      }"
      @click.self="emit('deselect-all')"
    >
      <div
        class="grid-cell"
        v-for="item in nodeItems"
        :key="item.data.id"
        :style="{
          ...item.style.grid,
        }"
      >
        <div
          class="edge incoming"
          :class="{
            visible: item.children.length > 0,
          }"
        ></div>
        <IndexTreeNode
          v-if="item.data"
          :node-data="item.data"
          :is-selected="item.data.id === props.selectedElementId"
          class="index-tree-node"
          @rename="renameNode"
          @delete="deleteNode"
          @duplicate="duplicateNode"
          @select="(id) => emit('select-element', id)"
          @create-child="createChild"
          @attach-dataset="attachDatasetToPlaceholder"
        />
        <div
          class="edge outgoing"
          :class="{
            visible: item.style.hasOutputLine,
            dashed: item.type === IndexNodeType.Placeholder,
            'last-child': item.style.isLastChild,
          }"
        >
          <div class="top" />
          <div class="side" />
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import _ from 'lodash';
import { computed } from 'vue';
import IndexTreeNode from '@/components/index-structure/index-tree-node.vue';
import { IndexNodeType } from '@/types/Enums';
import { DatasetSearchResult, IndexNode, SelectableIndexElementId } from '@/types/Index';
import useIndexWorkBench from '@/services/composables/useIndexWorkBench';
import useIndexTree from '@/services/composables/useIndexTree';
import { isParentNode } from '@/utils/indextree-util';

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
  data: IndexNode;
  /** width of the node represented by the total number of leaf nodes it has */
  width: number;
  /** number of edges on the longest path from the node to a leaf */
  height: number;
  style: {
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
      hasOutputLine: false,
      isLastChild: false,
    },
  };
  if (isParentNode(node) && node.inputs.length > 0) {
    item.children = node.inputs.map(toIndexNodeItemTree);
    item.height = Math.max(...item.children.map((c) => c.height)) + 1;
    item.width = item.children.reduce((prev, item) => prev + item.width, 0);
    // Add style properties to self and each child node
    item.children.forEach((item) => (item.style.hasOutputLine = true));
    item.children[item.children.length - 1].style.isLastChild = true;
  }
  return item;
};

const calculateLayout = (nodeItem: IndexTreeNodeItem, rowOffset = 0, colOffset = 0) => {
  const firstRow = 1 + rowOffset;
  const furthestRightColumn = nodeItem.height + 1 + colOffset;
  const _calculateLayout = (item: IndexTreeNodeItem, rowNumber: number, level = 0) => {
    // Start in row `rowNumber` and span `item.width` rows
    item.style.grid['grid-row'] = `${rowNumber} / span ${item.width}`;
    // Start in the column that is `level` columns to the left of `furthestRightColumn`.
    //  Spans one column.
    item.style.grid['grid-column'] = `${furthestRightColumn - level}`;
    if (item.children.length > 0) {
      // Calculate row # for each child.
      //  First child is placed in the same row as its parent.
      //  Each child after that is placed below its previous sibling
      // All children are one column to the left of their parent. (level + 1)
      let startingRow = rowNumber;
      item.children.forEach((child) => {
        _calculateLayout(child, startingRow, level + 1);
        startingRow += child.width;
      });
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
  let startingRowOfCurrentTree = 0;
  const trees = workBench.items.value.map((node) => {
    const tree = toIndexNodeItemTree(node);
    calculateLayout(tree, startingRowOfCurrentTree);
    // Start the next tree below this one by adding the number of leaf nodes in the current tree to
    //  the startingRowIndex
    startingRowOfCurrentTree += tree.width;
    return tree;
  });
  return trees;
});

const indexNodeItemTree = computed(() => {
  const workbenchDimensions = getGridDimensions(workBenchNodeItemTrees.value);
  const tree = toIndexNodeItemTree(indexTree.tree.value);
  const mainTreeNumCols = getGridDimensions([tree]).numCols;
  const maxNumCols = Math.max(workbenchDimensions.numCols + WORKBENCH_LEFT_OFFSET, mainTreeNumCols);
  calculateLayout(tree, workbenchDimensions.numRows, maxNumCols - mainTreeNumCols);
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

const renameNode = (nodeId: string, newName: string) => {
  workBench.findAndRenameNode(nodeId, newName);
  indexTree.findAndRenameNode(nodeId, newName);
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

const createChild = (
  parentNodeId: string,
  childType: IndexNodeType.Index | IndexNodeType.Dataset
) => {
  workBench.findAndAddChild(parentNodeId, childType);
  indexTree.findAndAddChild(parentNodeId, childType);
};

const attachDatasetToPlaceholder = (nodeId: string, dataset: DatasetSearchResult) => {
  workBench.attachDatasetToPlaceholder(nodeId, dataset);
  indexTree.attachDatasetToPlaceholder(nodeId, dataset);
};
</script>

<style scoped lang="scss">
@import '~styles/uncharted-design-tokens';

$space-between-columns: 40px;
$space-between-rows: 10px;

$incoming-edge-minimum-length: calc(#{$space-between-columns} / 2);
$outgoing-edge-length: calc($space-between-columns - $incoming-edge-minimum-length);
$edge-top-offset-from-node: 13px;
$edge-styles: 2px solid $un-color-black-20;

.index-tree-pane-container {
  // The farthest left column will never have incoming edges, so it will have an empty space of
  //  size `$incoming-edge-minimum-length` to the left of it. Remove that width from the padding.
  padding: 40px 30px 40px calc(30px - #{$incoming-edge-minimum-length});
  overflow: auto;
  .index-tree {
    display: grid;
    row-gap: $space-between-rows;
    // Grid template properties are set dynamically using the :style attribute depending on the
    //  size of the graph.

    // When the graph is too small to take up the full available screen width, don't expand columns
    //  to fill the empty space.
    justify-content: flex-start;
  }
  .grid-cell {
    position: relative;
    display: flex;
    pointer-events: none;
  }
  .index-tree-node {
    pointer-events: auto;
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
      &.visible {
        border-top: $edge-styles;
      }
    }

    &.outgoing {
      width: $outgoing-edge-length;
      &.visible {
        .top {
          width: 100%;
          border-top: $edge-styles;
        }
        .side {
          width: 100%;
          // Extend edge down to the sibling below this one
          height: calc(100% + #{$space-between-rows});
          border-right: $edge-styles;
        }

        &.dashed .top {
          border-top-style: dashed;
        }
      }
      &.last-child {
        .side {
          border: none;
        }
      }
    }
  }
}
</style>
