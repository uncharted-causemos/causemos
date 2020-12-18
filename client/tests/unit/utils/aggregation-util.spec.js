/* eslint-disable no-unused-expressions */
import { expect } from 'chai';
import AggregationsUtil from '@/utils/aggregations-util';

describe('aggregation-util', () => {
  const DATA = [1, 2, 3, 4, 5, 6, 7, 8, 9];
  const BASIC_RESULT = [
    { key: 'odd', count: 5, dataArray: [1, 3, 5, 7, 9] },
    { key: 'even', count: 4, dataArray: [2, 4, 6, 8] }
  ];

  const NESTED_RESULT = [
    {
      key: 'odd',
      count: 5,
      children: [
        { key: 'small', count: 3, dataArray: [1, 3, 5] },
        { key: 'large', count: 2, dataArray: [7, 9] }]
    },
    {
      key: 'even',
      count: 4,
      children: [
        { key: 'small', count: 2, dataArray: [2, 4] },
        { key: 'large', count: 2, dataArray: [6, 8] }
      ]
    }
  ];

  it('basic aggregation', () => {
    const result = AggregationsUtil.groupDataArray(DATA, [
      {
        keyFn: (d) => d % 2 === 0 ? 'even' : 'odd'
      }
    ]);
    expect(result).to.deep.equal(BASIC_RESULT);
  });


  it('nested aggregation', () => {
    const result = AggregationsUtil.groupDataArray(DATA, [
      {
        keyFn: (d) => d % 2 === 0 ? 'even' : 'odd'
      },
      {
        keyFn: (d) => d > 5 ? 'large' : 'small'
      }
    ]);
    expect(result).to.deep.equal(NESTED_RESULT);
  });
});
