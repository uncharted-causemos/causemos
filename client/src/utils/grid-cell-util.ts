import { ConceptNode, GridCell, SelectableIndexElementId } from '@/types/Index';
import _ from 'lodash';
import {
  FindNodeResult,
  hasChildren,
  isConceptNodeWithoutDataset,
  isEdge,
  isEmptyNode,
} from './index-tree-util';

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
export const convertTreeToGridCells = (tree: ConceptNode): GridCell[] => {
  // The first row of a CSS grid can be accessed with `grid-row-start: 1`
  let currentRow = 1;
  const _convertTreeToGridCells = (
    currentNode: ConceptNode,
    depth: number,
    isRootNode: boolean,
    isLastChild: boolean,
    isFirstChild: boolean,
    isOppositePolarity: boolean
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
      isFirstChild,
      isOppositePolarity,
    };
    // If this is a leaf node:
    if (!isConceptNodeWithoutDataset(currentNode) || isEmptyNode(currentNode)) {
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
    const lastChildArrayPosition = currentNode.components.length - 1;
    currentNode.components.forEach((input, i) => {
      const isLastChild = i === lastChildArrayPosition;
      const isFirstChild = i === 0;
      // Call the helper function with the same depth for each child, one greater than the parent.
      const cells = _convertTreeToGridCells(
        input.componentNode,
        depth + 1,
        false,
        isLastChild,
        isFirstChild,
        input.isOppositePolarity
      );
      directChildCells.push(cells[0]);
      cells.forEach((cell) => {
        descendentCells.push(cell);
      });
    });
    // This parent node needs to span a number of rows equal to the sum of its children's row spans.
    currentCell.rowCount = _.sumBy(directChildCells, (child) => child.rowCount);
    return [currentCell, ...descendentCells];
  };
  return _convertTreeToGridCells(tree, 0, true, false, false, false);
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

// Calculate a list of grid cells with enough information to render with CSS-grid.
//  Represents a combination of all workbench trees and the main index tree.
export const getGridCellsFromIndexTreeAndWorkbench = (
  indexTree: ConceptNode,
  workbenchItems: ConceptNode[]
) => {
  // Convert each workbench tree to grid cells.
  const overlappingWorkbenchTreeCellLists = workbenchItems.map(convertTreeToGridCells);
  // Move each grid down so that they're not overlapping
  let currentRow = 0;
  const workbenchTreeCellLists: GridCell[][] = [];
  overlappingWorkbenchTreeCellLists.forEach((cellList) => {
    // Translate down by "currentRow"
    const translatedList = offsetGridCells(cellList, currentRow, 0);
    // Append to workbenchTreeCellLists
    workbenchTreeCellLists.push(translatedList);
    // Increase currentRow by the current tree's rowCount
    currentRow += getGridRowCount(translatedList);
  });
  // Convert main tree to grid cells.
  const overlappingMainTreeCellList = convertTreeToGridCells(indexTree);
  // Move main tree grid below the workbench tree grids.
  const mainTreeCellList = offsetGridCells(overlappingMainTreeCellList, currentRow, 0);
  // Extra requirement: Shift all workbench trees to the left of the main tree.
  const mainTreeColumnCount = getGridColumnCount(mainTreeCellList);
  const shiftedWorkbenchTreeCellLists = workbenchTreeCellLists.map((cellList) =>
    offsetGridCells(cellList, 0, -mainTreeColumnCount)
  );
  // Flatten list of grids into one list of grid cells.
  return _.flatten([...shiftedWorkbenchTreeCellLists, mainTreeCellList]);
};

export const getIncomingEdgeClassObject = (
  cell: GridCell,
  selectedElementId: SelectableIndexElementId | null,
  highlightedEdgeId: SelectableIndexElementId | null
) => ({
  visible: hasChildren(cell.node),
  'selected-edge':
    selectedElementId && isEdge(selectedElementId) && selectedElementId.targetId === cell.node.id,
  highlighted:
    highlightedEdgeId && isEdge(highlightedEdgeId) && highlightedEdgeId.targetId === cell.node.id,
  'polarity-negative': hasChildren(cell.node) && cell.node.components[0].isOppositePolarity,
});

const isHigherThanSibling = (
  nodeId: string,
  siblingEdgeId: SelectableIndexElementId,
  searchForNode: (nodeId: string) => FindNodeResult
) => {
  if (!isEdge(siblingEdgeId)) {
    return false;
  }
  const node = searchForNode(nodeId);
  if (node && node.parent) {
    const nodeIndex = node.parent.components.findIndex(
      ({ componentNode }) => componentNode.id === nodeId
    );
    const siblingNodeIndex = node.parent.components.findIndex(
      ({ componentNode }) => componentNode.id === siblingEdgeId.sourceId
    );
    return siblingNodeIndex > nodeIndex;
  }
};

const isNextSiblingPolarityNegative = (
  nodeId: string,
  searchForNode: (nodeId: string) => FindNodeResult
) => {
  const node = searchForNode(nodeId);
  if (node && node.parent) {
    const nodeIndex = node.parent.components.findIndex(
      ({ componentNode }) => componentNode.id === nodeId
    );
    return (
      nodeIndex < node.parent.components.length - 1 &&
      node.parent.components[nodeIndex + 1].isOppositePolarity
    );
  }
  return false;
};

export const getOutgoingEdgeClassObject = (
  cell: GridCell,
  selectedElementId: SelectableIndexElementId | null,
  highlightedEdgeId: SelectableIndexElementId | null,
  searchForNode: (nodeId: string) => FindNodeResult
) => ({
  visible: cell.hasOutputLine,
  'last-child': cell.isLastChild,
  'selected-edge':
    selectedElementId && isEdge(selectedElementId) && selectedElementId.sourceId === cell.node.id,
  'selected-y':
    selectedElementId && isHigherThanSibling(cell.node.id, selectedElementId, searchForNode),
  highlighted:
    highlightedEdgeId && isEdge(highlightedEdgeId) && highlightedEdgeId.sourceId === cell.node.id,
  'highlighted-y':
    highlightedEdgeId && isHigherThanSibling(cell.node.id, highlightedEdgeId, searchForNode),
  'polarity-negative': cell.isOppositePolarity,
  'next-sibling-polarity-negative': isNextSiblingPolarityNegative(cell.node.id, searchForNode),
});

/**
 * Generate a "hit-box" for mouse events over the connecting edges that better reflect the actual edge action space.
 * The box should be transparent, over the desired edge and intercept the mouse events required for highlighting and
 * selecting edges.
 *
 * @param cell
 * @param gridCellElements
 */
export const getHitBoxStyle = (cell: GridCell, gridCellElements: HTMLElement[]) => {
  const firstOffset = 15;
  const columnCells = gridCellElements.filter(
    (el) => parseInt(el.style.gridColumn.split('/')[0].trim()) === cell.startColumn
  );
  const matchIndex = columnCells.findIndex(
    (el) => parseInt(el.style.gridRow.split('/')[0].trim()) === cell.startRow
  );

  let height = firstOffset;
  if (matchIndex > 0) {
    height = columnCells[matchIndex].offsetTop - columnCells[matchIndex - 1].offsetTop;
  }

  return {
    position: 'absolute',
    top: cell.isFirstChild ? '0' : `-${height - firstOffset}px`,
    right: '-20px',
    width: '40px',
    height: `${height}px`,
  };
};
