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
      <div
        class="node"
        :class="{ selected: cell.node.type === IndexNodeType.OutputIndex }"
        :style="{ color: getIndexNodeTypeColor(cell.node.type) }"
      >
        <i class="fa fa-fw" :class="[getIndexNodeTypeIcon(cell.node.type)]" />
      </div>
      <div
        v-if="cell.hasOutputLine"
        class="edge outgoing"
        :class="{
          dashed: cell.node.type === IndexNodeType.Placeholder,
          'last-child': cell.isLastChild,
        }"
      ></div>
    </div>
  </div>
</template>

<script setup lang="ts">
import _ from 'lodash';
import useIndexTree from '@/services/composables/useIndexTree';
import { IndexNode, OutputIndex, GridCell } from '@/types/Index';
import { isParentNode, getIndexNodeTypeColor, getIndexNodeTypeIcon } from '@/utils/indextree-util';
import { computed } from 'vue';
import { IndexNodeType } from '@/types/Enums';

const { tree } = useIndexTree();

const hasChildren = (node: IndexNode) => {
  return isParentNode(node) && node.inputs.length > 0;
};

const convertTreeToGridCells = (tree: OutputIndex): GridCell[] => {
  // The first row of a CSS grid can be accessed with `grid-row-start: 1`
  let currentRow = 1;
  const _convertTreeToGridCells = (
    currentNode: IndexNode,
    depth: number,
    isRootNode: boolean,
    isLastChild: boolean
  ) => {
    const currentCell: GridCell = {
      node: currentNode,
      // The last column in a CSS grid can be accessed with `grid-column: -1`
      startColumn: -depth - 1,
      startRow: currentRow,
      // Assume this node and its descendents take up one row. Increase this later as we go through
      //  any children this node has
      rowCount: 1,
      hasOutputLine: !isRootNode,
      isLastChild,
    };
    // If this is a leaf node:
    if (!isParentNode(currentNode) || currentNode.inputs.length === 0) {
      // The only time we start a new row is when we reach a leaf node.
      currentRow++;
      // There are no children to traverse, so we return.
      return [currentCell];
    }
    // This is a parent node so we recursively build a list of cells including this one and all of
    //  its descendents.
    const descendentCells: GridCell[] = [];
    const directChildCells: GridCell[] = [];
    // We need to label the last child for when we render the edges between nodes.
    const lastChildArrayPosition = currentNode.inputs.length - 1;
    currentNode.inputs.forEach((input, i) => {
      const isLastChild = i === lastChildArrayPosition;
      // Call the helper function with the same depth for each child, one greater than the parent.
      const cells = _convertTreeToGridCells(input, depth + 1, false, isLastChild);
      directChildCells.push(cells[0]);
      cells.forEach((cell) => {
        descendentCells.push(cell);
      });
    });
    // This parent node needs to span a number of rows equal to the sum of its children's row spans.
    currentCell.rowCount = _.sumBy(directChildCells, (child) => child.rowCount);
    return [currentCell, ...descendentCells];
  };
  return _convertTreeToGridCells(tree, 0, true, false);
};
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

    &.dashed {
      border-top-style: dashed;
    }
    &.last-child {
      border-right: none;
      // No need to extend below this cell since we're not drawing a right border.
      height: 0;
    }
  }
}
</style>
