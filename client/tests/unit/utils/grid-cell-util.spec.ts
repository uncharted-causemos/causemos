import {
  convertTreeToGridCells,
  getGridColumnCount,
  getGridRowCount,
  offsetGridCells,
} from '@/utils/grid-cell-util';
import { createNewOutputIndex } from '@/utils/index-tree-util';
import { expect } from 'chai';
import { newTestTree } from './index-tree-util.spec';

describe('grid-cell-util', () => {
  describe('convertTreeToGridCells', () => {
    it('should return one cell for a new tree', () => {
      const tree = createNewOutputIndex();
      const cells = convertTreeToGridCells(tree);
      expect(cells.length).to.equal(1);
    });
    it("should create a list where the first cell represents the tree's root node", () => {
      const tree = newTestTree();
      const cells = convertTreeToGridCells(tree);
      const { node } = cells[0];
      expect(node).to.equal(tree);
    });
    it('should provide the right cell metadata for a new tree', () => {
      const tree = createNewOutputIndex();
      const cells = convertTreeToGridCells(tree);
      const { hasOutputLine, isLastChild, rowCount, startColumn, startRow } = cells[0];
      expect(hasOutputLine).to.equal(false);
      expect(isLastChild).to.equal(false);
      expect(rowCount).to.equal(1);
      expect(startColumn).to.equal(-1);
      expect(startRow).to.equal(1);
    });
  });
  describe('getGridRowCount', () => {
    it('should return 1 for a new tree', () => {
      const tree = createNewOutputIndex();
      const cells = convertTreeToGridCells(tree);
      const rowCount = getGridRowCount(cells);
      expect(rowCount).to.equal(1);
    });
    it('should correctly calculate the row count for a test tree', () => {
      const tree = newTestTree();
      const cells = convertTreeToGridCells(tree);
      const rowCount = getGridRowCount(cells);
      expect(rowCount).to.equal(4);
    });
  });
  describe('getGridColumnCount', () => {
    it('should return 1 for a new tree', () => {
      const tree = createNewOutputIndex();
      const cells = convertTreeToGridCells(tree);
      const columnCount = getGridColumnCount(cells);
      expect(columnCount).to.equal(1);
    });
    it('should correctly calculate the column count for a test tree', () => {
      const tree = newTestTree();
      const cells = convertTreeToGridCells(tree);
      const columnCount = getGridColumnCount(cells);
      expect(columnCount).to.equal(4);
    });
  });
  describe('offsetGridCells', () => {
    const tree = createNewOutputIndex();
    const cells = convertTreeToGridCells(tree);
    const { startRow, startColumn } = cells[0];
    it('should correctly translate a new tree up', () => {
      const shiftedCells = offsetGridCells(cells, -1, 0);
      expect(shiftedCells[0].startRow).to.equal(startRow - 1);
    });
    it('should correctly translate a new tree down', () => {
      const shiftedCells = offsetGridCells(cells, 1, 0);
      expect(shiftedCells[0].startRow).to.equal(startRow + 1);
    });
    it('should correctly translate a new tree left', () => {
      const shiftedCells = offsetGridCells(cells, 0, -1);
      expect(shiftedCells[0].startColumn).to.equal(startColumn - 1);
    });
    it('should correctly translate a new tree right', () => {
      const shiftedCells = offsetGridCells(cells, 0, 1);
      expect(shiftedCells[0].startColumn).to.equal(startColumn + 1);
    });
  });
});
