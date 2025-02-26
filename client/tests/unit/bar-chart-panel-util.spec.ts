import { RootStatefulDataNode } from '@/types/BarChartPanel';
import { SortableTableHeaderState } from '@/types/Enums';
import { ADMIN_LEVEL_KEYS } from '@/utils/admin-level-util';
import {
  SortOption,
  extractPossibleRows,
  findMaxVisibleBarValue,
  findMinVisibleBarValue,
  sortHierarchy,
  toggleIsStatefulDataNodeExpanded,
} from '@/utils/bar-chart-panel-util';
import _ from 'lodash';

describe('bar-chart-panel-util', () => {
  const positiveValuesExample: RootStatefulDataNode = {
    children: [
      {
        name: 'a',
        children: [],
        bars: [
          { name: 'Bar 1', color: '', value: 25 },
          { name: 'Bar 2', color: '', value: 27 },
        ],
        isExpanded: true,
        path: ['a'],
      },
      {
        name: 'b',
        children: [],
        bars: [
          { name: 'Bar 1', color: '', value: 15 },
          { name: 'Bar 2', color: '', value: 77 },
        ],
        isExpanded: true,
        path: ['b'],
      },
    ],
  };
  const negativeValuesExample: RootStatefulDataNode = {
    children: [
      {
        name: 'a',
        children: [],
        bars: [
          { name: 'Bar 1', color: '', value: -25 },
          { name: 'Bar 2', color: '', value: -27 },
        ],
        isExpanded: true,
        path: ['a'],
      },
      {
        name: 'b',
        children: [],
        bars: [
          { name: 'Bar 1', color: '', value: -15 },
          { name: 'Bar 2', color: '', value: -77 },
        ],
        isExpanded: true,
        path: ['b'],
      },
    ],
  };
  const nestedPositiveExample: RootStatefulDataNode = {
    children: [
      {
        name: 'a',
        children: [
          {
            name: 'aa',
            children: [],
            bars: [
              { name: 'Bar 1', color: '', value: 25 },
              { name: 'Bar 2', color: '', value: 27 },
            ],
            isExpanded: true,
            path: ['a', 'aa'],
          },
          {
            name: 'ab',
            children: [],
            bars: [
              { name: 'Bar 1', color: '', value: 15 },
              { name: 'Bar 2', color: '', value: 77 },
            ],
            isExpanded: true,
            path: ['a', 'ab'],
          },
        ],
        bars: [
          { name: 'Bar 1', color: '', value: 88 },
          { name: 'Bar 2', color: '', value: 99 },
        ],
        isExpanded: true,
        path: ['a'],
      },
    ],
  };
  const nestedNegativeExample: RootStatefulDataNode = {
    children: [
      {
        name: 'a',
        children: [
          {
            name: 'aa',
            children: [],
            bars: [
              { name: 'Bar 1', color: '', value: -25 },
              { name: 'Bar 2', color: '', value: -27 },
            ],
            isExpanded: true,
            path: ['a', 'aa'],
          },
          {
            name: 'ab',
            children: [],
            bars: [
              { name: 'Bar 1', color: '', value: -15 },
              { name: 'Bar 2', color: '', value: -77 },
            ],
            isExpanded: true,
            path: ['a', 'ab'],
          },
        ],
        bars: [
          { name: 'Bar 1', color: '', value: -88 },
          { name: 'Bar 2', color: '', value: -99 },
        ],
        isExpanded: true,
        path: ['a'],
      },
    ],
  };
  describe('extractPossibleRows', () => {
    const collapsedNodeExample: RootStatefulDataNode = {
      children: [
        {
          name: 'a',
          children: [
            {
              name: 'aa',
              children: [],
              bars: [{ name: 'Bar 1', color: '', value: 25 }],
              isExpanded: true,
              path: ['a', 'aa'],
            },
            {
              name: 'ab',
              children: [],
              bars: [{ name: 'Bar 1', color: '', value: 15 }],
              isExpanded: true,
              path: ['a', 'ab'],
            },
          ],
          bars: [{ name: 'Bar 1', color: '', value: 25 }],
          isExpanded: true,
          path: ['a'],
        },
        {
          name: 'b',
          children: [
            {
              name: 'ba',
              children: [],
              bars: [{ name: 'Bar 1', color: '', value: 25 }],
              isExpanded: true,
              path: ['b', 'ba'],
            },
            {
              name: 'bb',
              children: [],
              bars: [{ name: 'Bar 1', color: '', value: 15 }],
              isExpanded: true,
              path: ['b', 'bb'],
            },
          ],
          bars: [{ name: 'Bar 1', color: '', value: 15 }],
          isExpanded: false,
          path: ['b'],
        },
      ],
    };
    const result = extractPossibleRows(collapsedNodeExample, [], 1, ADMIN_LEVEL_KEYS);
    it("doesn't show children of collapsed nodes", () => {
      expect(result.filter((row) => row.name === 'ba' || row.name === 'bb').length).to.equal(0);
    });
    it('shows nodes at the selected level', () => {
      expect(result.filter((row) => row.name === 'aa' || row.name === 'ab').length).to.equal(2);
    });
    it('shows the parents of nodes at the selected level', () => {
      expect(result.filter((row) => row.name === 'a' || row.name === 'b').length).to.equal(2);
    });
  });
  describe('sortHierarchy', () => {
    const sortExample: RootStatefulDataNode = {
      children: [
        {
          name: 'b',
          children: [
            {
              name: 'ba',
              children: [],
              bars: [{ name: 'Bar 1', color: '', value: 35 }],
              isExpanded: true,
              path: ['b', 'ba'],
            },
            {
              name: 'bb',
              children: [],
              bars: [{ name: 'Bar 1', color: '', value: 45 }],
              isExpanded: true,
              path: ['b', 'bb'],
            },
          ],
          bars: [{ name: 'Bar 1', color: '', value: 15 }],
          isExpanded: false,
          path: ['b'],
        },
        {
          name: 'a',
          children: [
            {
              name: 'ab',
              children: [],
              bars: [{ name: 'Bar 1', color: '', value: 15 }],
              isExpanded: true,
              path: ['a', 'ab'],
            },
            {
              name: 'aa',
              children: [],
              bars: [{ name: 'Bar 1', color: '', value: 25 }],
              isExpanded: true,
              path: ['a', 'aa'],
            },
          ],
          bars: [{ name: 'Bar 1', color: '', value: 25 }],
          isExpanded: true,
          path: ['a'],
        },
      ],
    };
    it('correctly sorts by name', () => {
      const sorted = sortHierarchy(
        _.cloneDeep(sortExample),
        SortOption.Name,
        SortableTableHeaderState.Up
      );
      expect(sorted.children.findIndex((node) => node.name === 'a')).to.be.lessThan(
        sorted.children.findIndex((node) => node.name === 'b')
      );
      const a = sorted.children.find((node) => node.name === 'a');
      expect(a).toBeDefined();
      if (a === undefined) return;
      expect(a.children.findIndex((node) => node.name === 'aa')).to.be.lessThan(
        a.children.findIndex((node) => node.name === 'ab')
      );
      const b = sorted.children.find((node) => node.name === 'b');
      expect(b).toBeDefined();
      if (b === undefined) return;
      expect(b.children.findIndex((node) => node.name === 'ba')).to.be.lessThan(
        b.children.findIndex((node) => node.name === 'bb')
      );
    });
    it('correctly sorts by name in reverse alphabetical order', () => {
      const sorted = sortHierarchy(
        _.cloneDeep(sortExample),
        SortOption.Name,
        SortableTableHeaderState.Down
      );
      expect(sorted.children.findIndex((node) => node.name === 'a')).to.be.greaterThan(
        sorted.children.findIndex((node) => node.name === 'b')
      );
      const a = sorted.children.find((node) => node.name === 'a');
      expect(a).toBeDefined();
      if (a === undefined) return;
      expect(a.children.findIndex((node) => node.name === 'aa')).to.be.greaterThan(
        a.children.findIndex((node) => node.name === 'ab')
      );
      const b = sorted.children.find((node) => node.name === 'b');
      expect(b).toBeDefined();
      if (b === undefined) return;
      expect(b.children.findIndex((node) => node.name === 'ba')).to.be.greaterThan(
        b.children.findIndex((node) => node.name === 'bb')
      );
    });
    it('correctly sorts by value from high to low', () => {
      const sorted = sortHierarchy(
        _.cloneDeep(sortExample),
        SortOption.Value,
        SortableTableHeaderState.Up
      );
      expect(sorted.children.findIndex((node) => node.name === 'a')).to.be.lessThan(
        sorted.children.findIndex((node) => node.name === 'b')
      );
      const a = sorted.children.find((node) => node.name === 'a');
      expect(a).toBeDefined();
      if (a === undefined) return;
      expect(a.children.findIndex((node) => node.name === 'aa')).to.be.lessThan(
        a.children.findIndex((node) => node.name === 'ab')
      );
      const b = sorted.children.find((node) => node.name === 'b');
      expect(b).toBeDefined();
      if (b === undefined) return;
      expect(b.children.findIndex((node) => node.name === 'bb')).to.be.lessThan(
        b.children.findIndex((node) => node.name === 'ba')
      );
    });
    it('correctly sorts by value from low to high', () => {
      const sorted = sortHierarchy(
        _.cloneDeep(sortExample),
        SortOption.Value,
        SortableTableHeaderState.Down
      );
      expect(sorted.children.findIndex((node) => node.name === 'a')).to.be.greaterThan(
        sorted.children.findIndex((node) => node.name === 'b')
      );
      const a = sorted.children.find((node) => node.name === 'a');
      expect(a).toBeDefined();
      if (a === undefined) return;
      expect(a.children.findIndex((node) => node.name === 'aa')).to.be.greaterThan(
        a.children.findIndex((node) => node.name === 'ab')
      );
      const b = sorted.children.find((node) => node.name === 'b');
      expect(b).toBeDefined();
      if (b === undefined) return;
      expect(b.children.findIndex((node) => node.name === 'bb')).to.be.greaterThan(
        b.children.findIndex((node) => node.name === 'ba')
      );
    });
  });
  describe('findMaxVisibleBarValue', () => {
    it('correctly finds the maximum value', () => {
      const result = findMaxVisibleBarValue(positiveValuesExample, 1);
      expect(result).to.equal(77);
    });
    it('returns zero when all values are negative', () => {
      const result = findMaxVisibleBarValue(negativeValuesExample, 1);
      expect(result).to.equal(0);
    });
    it('ignores values at levels other than the selected value', () => {
      const result = findMaxVisibleBarValue(nestedPositiveExample, 2);
      expect(result).to.equal(77);
    });
  });
  describe('findMinVisibleBarValue', () => {
    it('correctly finds the minimum value', () => {
      const result = findMinVisibleBarValue(negativeValuesExample, 1);
      expect(result).to.equal(-77);
    });
    it('returns zero when all values are > 0', () => {
      const result = findMinVisibleBarValue(positiveValuesExample, 1);
      expect(result).to.equal(0);
    });
    it('ignores values at levels other than the selected value', () => {
      const result = findMinVisibleBarValue(nestedNegativeExample, 2);
      expect(result).to.equal(-77);
    });
  });
  describe('toggleIsStatefulDataNodeExpanded', () => {
    const example: RootStatefulDataNode = {
      children: [
        {
          name: 'a',
          children: [{ name: 'aa', children: [], bars: [], isExpanded: true, path: ['a', 'aa'] }],
          bars: [],
          isExpanded: true,
          path: ['a'],
        },
      ],
    };
    it('correctly toggles the state of the specified node', () => {
      const clone = _.cloneDeep(example);
      const expectedResult = _.cloneDeep(example);
      expectedResult.children[0].children[0].isExpanded = false;
      toggleIsStatefulDataNodeExpanded(['a', 'aa'], clone);
      expect(clone).to.deep.equal(expectedResult);
    });
    it('changes nothing if the specified node is not found', () => {
      const clone = _.cloneDeep(example);
      toggleIsStatefulDataNodeExpanded(['a', 'ab'], clone);
      expect(clone).to.deep.equal(example);
    });
  });
});
