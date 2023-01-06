/* eslint-disable no-unused-expressions */
import { expect } from 'chai';
import AggregationsUtil from '@/utils/aggregations-util';

describe('aggregation-util', () => {
  const DATA = [1, 2, 3, 4, 5, 6, 7, 8, 9];
  const BASIC_RESULT = [
    { key: 'odd', count: 5, dataArray: [1, 3, 5, 7, 9] },
    { key: 'even', count: 4, dataArray: [2, 4, 6, 8] },
  ];

  const NESTED_RESULT = [
    {
      key: 'odd',
      count: 5,
      dataArray: [],
      children: [
        { key: 'small', count: 3, dataArray: [1, 3, 5] },
        { key: 'large', count: 2, dataArray: [7, 9] },
      ],
    },
    {
      key: 'even',
      count: 4,
      dataArray: [],
      children: [
        { key: 'small', count: 2, dataArray: [2, 4] },
        { key: 'large', count: 2, dataArray: [6, 8] },
      ],
    },
  ];

  const OBJECT_DATA = [
    { value: 1, oddOrEven: 'odd', size: 'small' },
    { value: 2, oddOrEven: 'even', size: 'small' },
    { value: 3, oddOrEven: 'odd', size: 'small' },
    { value: 4, oddOrEven: 'even', size: 'small' },
    { value: 5, oddOrEven: 'odd', size: 'small' },
    { value: 6, oddOrEven: 'even', size: 'large' },
    { value: 7, oddOrEven: 'odd', size: 'large' },
    { value: 8, oddOrEven: 'even', size: 'large' },
    { value: 9, oddOrEven: 'odd', size: 'large' },
  ];
  const LEAN_NESTED_RESULT = {
    odd: {
      small: [
        { value: 1, oddOrEven: 'odd', size: 'small' },
        { value: 3, oddOrEven: 'odd', size: 'small' },
        { value: 5, oddOrEven: 'odd', size: 'small' },
      ],
      large: [
        { value: 7, oddOrEven: 'odd', size: 'large' },
        { value: 9, oddOrEven: 'odd', size: 'large' },
      ],
    },
    even: {
      small: [
        { value: 2, oddOrEven: 'even', size: 'small' },
        { value: 4, oddOrEven: 'even', size: 'small' },
      ],
      large: [
        { value: 6, oddOrEven: 'even', size: 'large' },
        { value: 8, oddOrEven: 'even', size: 'large' },
      ],
    },
  };

  it('basic aggregation', () => {
    const result = AggregationsUtil.groupDataArray(DATA, [
      {
        keyFn: (d) => (d % 2 === 0 ? 'even' : 'odd'),
      },
    ]);
    expect(result).to.deep.equal(BASIC_RESULT);
  });

  it('correctly groups a flat array of objects repeatedly', () => {
    const result = AggregationsUtil.groupRepeatedly(OBJECT_DATA, [
      (dataPoint: any) => dataPoint.oddOrEven,
      (dataPoint: any) => dataPoint.size,
    ]);
    expect(result).to.deep.equal(LEAN_NESTED_RESULT);
  });

  it('nested aggregation', () => {
    const result = AggregationsUtil.groupDataArray(DATA, [
      {
        keyFn: (d) => (d % 2 === 0 ? 'even' : 'odd'),
      },
      {
        keyFn: (d) => (d > 5 ? 'large' : 'small'),
      },
    ]);
    expect(result).to.deep.equal(NESTED_RESULT);
  });
});
