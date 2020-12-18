import { expect } from 'chai';
import { createModelFunction } from '@/utils/bu-models/model-functions';

const data = [{ a: 1, b: 2 }, { a: 2, b: 3 }, { a: 3, b: 5 }, { a: 0, b: 0 }];

describe('model-functions', () => {
  it('apply aggregation', () => {
    const fn = createModelFunction('mean');
    const result = fn(data, d => d.a);
    expect(result).to.equal(1.5);
  });

  it('apply function - max', () => {
    const fn = createModelFunction('max');
    const result1 = fn(data, d => d.a);
    expect(result1).to.equal(3);

    const result2 = fn(data, d => d.b);
    expect(result2).to.equal(5);
  });
});
