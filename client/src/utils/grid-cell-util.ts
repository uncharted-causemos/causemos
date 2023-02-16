import { GridCell, IndexNode } from '@/types/Index';
import _ from 'lodash';
import { isParentNode } from './indextree-util';

/**
 * This file contains helper functions to support the GridCell data structure, which is used when
 * rendering index structure trees using CSS-grid.
 */

/**
 * Flattens an index structure tree for rendering with CSS-grid.
 * @param tree The root node of the tree.
 * @returns A list of cells with enough information to render directly with CSS-grid.
 */
export const convertTreeToGridCells = (tree: IndexNode): GridCell[] => {
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

/**
 * ASSUMES the first cell in the list represents the root node of the tree.
 * @param cells A list of cells representing an index tree
 */
export const getGridRowCount = (cells: GridCell[]) => {
  const root = cells[0];
  return root.rowCount;
};

/**
 * ASSUMES that all cells have a negative startColumn value.
 * @param cells A list of cells representing an index tree.
 * @returns a number (>= 0) representing the number of columns in the resulting grid.
 */
export const getGridColumnCount = (cells: GridCell[]) => {
  const farthestLeftCell = _.minBy(cells, (cell) => cell.startColumn);
  const farthestLeftColumn = farthestLeftCell?.startColumn ?? 0;
  // Flip the negative column position into a positive column count
  return farthestLeftColumn * -1;
};

/**
 * Translates an array of grid cells up or down and left or right.
 * Does not modify the original array or any of the cells in it.
 * @param cells an array of grid cells to translate.
 * @param verticalOffset the number of rows to translate the cells by. Positive numbers move the cells down.
 * @param horizontalOffset the number of columns to translate the cells by. Positive numbers move the cells right.
 * @returns a new array of new cells with modified `startRow` and ` properties.
 */
export const offsetGridCells = (
  cells: GridCell[],
  verticalOffset: number,
  horizontalOffset: number
): GridCell[] => {
  return cells.map((cell) => ({
    ...cell,
    startRow: cell.startRow + verticalOffset,
    startColumn: cell.startColumn + horizontalOffset,
  }));
};

/**
 * Aligns the left edges of multiple grids.
 * After alignment, the leftmost cells in each grid will all be in the same column.
 * Does not modify any of the original arrays or any of their cells.
 * @param grids An array of grid cell arrays.
 * @returns A new array of grids.
 */
export const leftAlignTreeGrids = (grids: GridCell[][]): GridCell[][] => {
  // Find the grid with the most columns
  let greatestColumnCount = 0;
  grids.forEach((grid) => {
    const columnCount = getGridColumnCount(grid);
    if (columnCount > greatestColumnCount) {
      greatestColumnCount = columnCount;
    }
  });
  // Move each grid left until it's aligned with the widest grid
  return grids.map((grid) => {
    const columnCount = getGridColumnCount(grid);
    const moveLeftBy = greatestColumnCount - columnCount;
    return offsetGridCells(grid, 0, -moveLeftBy);
  });
};
