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
    if (clean.length >= 2) {
      const data = {
        order: parseInt(clean[0]),
        column: parseInt(clean[1]),
      };
      return data;
    }
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
      // user action on an outgoing cell
      if (current.classList.contains(EDGE_CLASS.OUTGOING)) {
        current.classList.add(isHighlightAction ? EDGE_CLASS.HIGHLIGHTED : EDGE_CLASS.SELECTED);
        selectedNodes.push(current);
        // iterate though all grid cells, find by grid position comparison those that need highlighting
        treeContainer.childNodes.forEach((node) => {
          const n = node as HTMLElement;
          const gridInfo = getGridLocation(n?.style?.gridArea);
          if (
            gridInfo &&
            gridInfo.column === parentGrid.column + 1 &&
            gridInfo.order >= parentGrid.order
          ) {
            node.childNodes.forEach((cellNode) => {
              const cn = cellNode as HTMLElement;
              if (cn.classList.contains(EDGE_CLASS.INCOMING)) {
                cn.classList.add(isHighlightAction ? EDGE_CLASS.HIGHLIGHTED : EDGE_CLASS.SELECTED);
                selectedNodes.push(cellNode);
              }
            });
          } else if (
            gridInfo &&
            gridInfo.column === parentGrid.column &&
            parentGrid.order >= gridInfo.order
          ) {
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
      // user action on an incoming cell
      if (current.classList.contains(EDGE_CLASS.INCOMING)) {
        current.classList.add(isHighlightAction ? EDGE_CLASS.HIGHLIGHTED : EDGE_CLASS.SELECTED);
        selectedNodes.push(current);
        treeContainer.childNodes.forEach((node) => {
          const n = node as HTMLElement;
          const gridInfo = getGridLocation(n?.style?.gridArea);
          if (
            gridInfo &&
            gridInfo.column === parentGrid.column - 1 &&
            parentGrid.order >= gridInfo.order
          ) {
            console.log(
              `INCOMING : gridInfo=${JSON.stringify(gridInfo)}, parentGrid=${JSON.stringify(
                gridInfo
              )}`
            );
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
  console.log(`Clearing ${selectedNodes.length} nodes.`);
  selectedNodes.forEach((e) => {
    e.classList.remove(EDGE_CLASS.HIGHLIGHTED, EDGE_CLASS.HIGHLIGHTED_X, EDGE_CLASS.HIGHLIGHTED_Y);
    if (!clearHighlightOnly) {
      e.classList.remove(EDGE_CLASS.SELECTED, EDGE_CLASS.SELECTED_X, EDGE_CLASS.SELECTED_Y);
    }
  });
};

// Highlight edges when input is clicked (overcome issues of above

/**
 * When an inbound edge is the source of an action, this function can find the outbound (edge to the trigger edge)
 * edges by grid location.  Return grid locations for cells with outputs that need to be highlighted/selected.
 *
 * @param location
 * @param data
 */
const findOutboundConnectedGridpoints = (location: any, data: any[]) => {
  const found: any = [];

  const n = data.find((d) => d.startRow === location.order && d.startColumn === location.column);
  if (n && n.node && n.node.inputs) {
    n.node.inputs.forEach((input: any) => {
      const foundItem = data.find((item) => item.node.id === input.id);
      if (foundItem) {
        found.push({
          id: foundItem.node.id,
          column: parseInt(foundItem.startColumn),
          order: parseInt(foundItem.startRow),
        });
      }
    });
  }
  return found;
};

const getIdByGridpoints = (location: any, data: any[]) => {
  let id = null;
  const n = data.find((d) => d.startRow === location.order && d.startColumn === location.column);
  if (n && n.node) {
    id = n.node.id;
  }
  return id;
};

/**
 * Edge Interaction code that uses the source data to identify structural connections between nodes.
 * Edges have two search structures and results.  This is an interaction on an input edge.
 *
 * Input edge highlight or selection will highlight all inbound paths.
 *
 * Return the selected DOM elements and the ID of the destination tree (to be set as selected).
 *
 * @param target Source element that triggers this action
 * @param data Source data for the tree
 * @param isHighlightAction Actions may be highlight or select
 */
export const edgeInteractionInput = (
  target: HTMLElement,
  data: any[],
  isHighlightAction = true
) => {
  const interactedNodes: HTMLElement[] = [];
  let interactedId = null;

  if (target.classList.contains(EDGE_CLASS.INCOMING)) {
    // ensure this is an incoming edge target
    const targetParent = target.parentElement;

    if (targetParent) {
      const treeContainer = targetParent.parentElement;
      const gridString = targetParent?.style?.gridArea;

      if (gridString && treeContainer) {
        const targetGrid = getGridLocation(gridString);
        if (targetGrid) {
          // const node = target.nextElementSibling;
          interactedId = getIdByGridpoints(targetGrid, data);
          const outEdges = findOutboundConnectedGridpoints(targetGrid, data);

          if (outEdges.length > 0) {
            // highlight and add the element that started this interaction
            target.classList.add(isHighlightAction ? EDGE_CLASS.HIGHLIGHTED : EDGE_CLASS.SELECTED);
            interactedNodes.push(target); // save the highlighted element reference (input edge)

            // highlight and add the elements that are connected to the target using grid position from data
            treeContainer.childNodes.forEach((node) => {
              const treeNodeEl = node as HTMLElement;
              const gridAreaString = treeNodeEl?.style?.gridArea;
              if (gridAreaString) {
                const gloc = getGridLocation(treeNodeEl.style.gridArea);
                if (gloc) {
                  // check if the treeNodeElement currently being inspected matches one of the desired grid references
                  if (
                    outEdges.findIndex(
                      (e: any) => e.order === gloc.order && e.column === gloc.column
                    ) > -1
                  ) {
                    treeNodeEl.childNodes.forEach((tne) => {
                      const anElement = tne as HTMLElement;
                      if (anElement.classList.contains(EDGE_CLASS.OUTGOING)) {
                        anElement.classList.add(
                          isHighlightAction ? EDGE_CLASS.HIGHLIGHTED : EDGE_CLASS.SELECTED
                        );
                        interactedNodes.push(anElement); // save the highlighted element reference (output edges)
                      }
                    });
                  }
                }
              }
            });
          }
        }
      }
    }
  }

  return {
    interactedId,
    interactedNodes,
  };
};
