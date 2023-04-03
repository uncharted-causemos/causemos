import { AggregationOption, IndexNodeType, TemporalResolutionOption } from '@/types/Enums';
import { OutputIndex } from '@/types/Index';
import {
  convertTreeToGridCells,
  getGridColumnCount,
  getGridRowCount,
  offsetGridCells,
} from '@/utils/grid-cell-util';
import { createNewOutputIndex } from '@/utils/index-tree-util';
import { expect } from 'chai';

const newTestTree = (): OutputIndex => ({
  id: '6e4adcee-c3af-4696-b84c-ee1169adcd4c',
  type: IndexNodeType.OutputIndex,
  name: 'Overall Priority',
  inputs: [
    {
      id: '5ad78cb0-b923-48ef-9c1a-31219987ca16',
      type: IndexNodeType.Index,
      name: 'Highest risk of drought',
      weight: 20,
      isWeightUserSpecified: true,
      inputs: [
        {
          id: 'a547b59f-9287-4991-a817-08ba54a0353f',
          type: IndexNodeType.Placeholder,
          name: 'Greatest reliance on fragile crops',
        },
      ],
    },
    {
      id: '6db6284d-7879-4735-a460-5f2b273c0bf9',
      type: IndexNodeType.Index,
      name: 'Largest vulnerable population',
      weight: 60,
      isWeightUserSpecified: true,
      inputs: [
        {
          id: '16caf563-548f-4e11-a488-a900f0d01c3b',
          type: IndexNodeType.Dataset,
          name: 'Highest poverty index ranking',
          weight: 80,
          isWeightUserSpecified: true,
          datasetId: 'b935f602-30b2-48bc-bdc8-10351bbffa67',
          datasetName: 'Poverty indicator index',
          selectedTimestamp: 0,
          isInverted: false,
          source: 'UN',
          outputVariable: 'test',
          runId: 'indicators',
          temporalResolution: TemporalResolutionOption.Month,
          temporalAggregation: AggregationOption.Mean,
          spatialAggregation: AggregationOption.Mean,
        },
        {
          id: '2f624d92-efa0-431a-a3a1-5521871420ad',
          type: IndexNodeType.Index,
          name: 'Population Health',
          weight: 0,
          isWeightUserSpecified: true,
          inputs: [
            {
              id: 'd851ac5d-2de2-475d-8ef7-5bd46a1a9016',
              type: IndexNodeType.Dataset,
              name: 'Malnutrition',
              weight: 80,
              isWeightUserSpecified: true,
              datasetId: 'b935f602-30b2-48bc-bdc8-10351bbffa67',
              datasetName: 'Malnutrition rates dataset',
              selectedTimestamp: 0,
              isInverted: false,
              source: 'UN',
              outputVariable: 'test',
              runId: 'indicators',
              temporalResolution: TemporalResolutionOption.Month,
              temporalAggregation: AggregationOption.Mean,
              spatialAggregation: AggregationOption.Mean,
            },
            {
              id: 'ac56ea0f-3ca9-4aee-9c06-f98768b7bd2a',
              type: IndexNodeType.Dataset,
              name: 'Life expectancy by country',
              weight: 20,
              isWeightUserSpecified: true,
              datasetId: 'dd7f69937-060d-44e8-8a04-22070ce35b27',
              datasetName: 'Life expectancy by country',
              selectedTimestamp: 0,
              isInverted: false,
              source: 'UN',
              outputVariable: 'test',
              runId: 'indicators',
              temporalResolution: TemporalResolutionOption.Month,
              temporalAggregation: AggregationOption.Mean,
              spatialAggregation: AggregationOption.Mean,
            },
          ],
        },
      ],
    },
  ],
});

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
