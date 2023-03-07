import { GridCell, IndexNode } from '@/types/Index';
import _ from 'lodash';
import { isParentNode } from './index-tree-util';

/**
 * This file contains helper functions to support the GridCell data structure, which is used when
 * rendering index structure trees using CSS-grid.
 */

/**
 * Flattens an index structure tree for rendering with CSS-grid.
 * Note that the first cell in the resulting list represents the root node of `tree`.
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
  if (cells.length === 0) return 0;
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
 * Edge selection class information
 */
export const EDGE_CLASS = {
  SELECTED: 'selected-edge',
  SELECTED_X: 'selected-x',
  SELECTED_Y: 'selected-y',
  HIGHLIGHTED: 'highlighted',
  HIGHLIGHTED_X: 'highlighted-x',
  HIGHLIGHTED_Y: 'highlighted-y',
  OUTGOING: 'outgoing',
  INCOMING: 'incoming',
};

/**
 * Parse grid location information for ease of reference in edge selection/highlight.
 * @param gridArea String
 */
const getGridLocation = (gridArea: String) => {
  // parse: 2 / -2 / span 1 / auto
  //        row order / col (-1 furthest right, top) -2, -3, etc... moving to the left
  if (gridArea) {
    const clean = gridArea.replace(' ', '').trim().split('/');
    const data = {
      order: parseInt(clean[0]),
      column: parseInt(clean[1]),
    };
    return data;
  }
  return null;
};

/**
 * Colours an edge between grid cells.  May be a highlighting action or a selection action.
 *
 * @param evt MouseEvent
 */
export const edgeInteraction = (target: any, isHighlightAction = false) => {
  const selectedNodes = [];
  const current = target as HTMLElement;
  const parent = current?.parentElement;
  const treeContainer = parent?.parentElement;

  if (current && parent && treeContainer) {
    const parentGrid = getGridLocation(parent.style.gridArea);
    if (parentGrid) {
      if (current.classList.contains(EDGE_CLASS.OUTGOING)) {
        current.classList.add(isHighlightAction ? EDGE_CLASS.HIGHLIGHTED : EDGE_CLASS.SELECTED);
        selectedNodes.push(current);
        treeContainer.childNodes.forEach((node) => {
          const n = node as HTMLElement;
          const gridInfo = getGridLocation(n?.style?.gridArea);
          if (gridInfo && gridInfo.column === parentGrid.column + 1) {
            node.childNodes.forEach((cellNode) => {
              const cn = cellNode as HTMLElement;
              if (cn.classList.contains(EDGE_CLASS.INCOMING)) {
                cn.classList.add(isHighlightAction ? EDGE_CLASS.HIGHLIGHTED : EDGE_CLASS.SELECTED);
                selectedNodes.push(cellNode);
              }
            });
          } else if (gridInfo && gridInfo.column === parentGrid.column) {
            node.childNodes.forEach((cellNode) => {
              const cn = cellNode as HTMLElement;
              if (cn.classList.contains(EDGE_CLASS.OUTGOING)) {
                if (gridInfo.order < parentGrid.order) {
                  if (isHighlightAction) {
                    cn.classList.add(EDGE_CLASS.HIGHLIGHTED, EDGE_CLASS.HIGHLIGHTED_Y);
                  } else {
                    cn.classList.add(EDGE_CLASS.SELECTED, EDGE_CLASS.SELECTED_Y);
                  }
                  selectedNodes.push(cellNode);
                } else if (gridInfo.order === parentGrid.order) {
                  if (isHighlightAction) {
                    cn.classList.add(EDGE_CLASS.HIGHLIGHTED, EDGE_CLASS.HIGHLIGHTED_X);
                  } else {
                    cn.classList.add(EDGE_CLASS.SELECTED, EDGE_CLASS.SELECTED_X);
                  }
                  selectedNodes.push(cellNode);
                }
              }
            });
          }
        });
      }

      if (current.classList.contains(EDGE_CLASS.INCOMING)) {
        current.classList.add(isHighlightAction ? EDGE_CLASS.HIGHLIGHTED : EDGE_CLASS.SELECTED);
        selectedNodes.push(current);
        treeContainer.childNodes.forEach((node) => {
          const n = node as HTMLElement;
          const gridInfo = getGridLocation(n?.style?.gridArea);
          if (gridInfo && gridInfo.column === parentGrid.column - 1) {
            node.childNodes.forEach((cellNode) => {
              const cn = cellNode as HTMLElement;
              if (cn.classList.contains(EDGE_CLASS.OUTGOING)) {
                cn.classList.add(isHighlightAction ? EDGE_CLASS.HIGHLIGHTED : EDGE_CLASS.SELECTED);
                selectedNodes.push(cellNode);
              }
            });
          }
        });
      }
    }
  }

  return selectedNodes;
};

/**
 * Clear all possible edge selection class information
 * @param selectedNodes
 */
export const edgeInteractionClear = (selectedNodes: HTMLElement[], clearHighlightOnly = true) => {
  selectedNodes.forEach((e) => {
    e.classList.remove(EDGE_CLASS.HIGHLIGHTED, EDGE_CLASS.HIGHLIGHTED_X, EDGE_CLASS.HIGHLIGHTED_Y);
    if (!clearHighlightOnly) {
      e.classList.remove(EDGE_CLASS.SELECTED, EDGE_CLASS.SELECTED_X, EDGE_CLASS.SELECTED_Y);
    }
  });
};
