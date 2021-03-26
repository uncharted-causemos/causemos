import { expect } from 'chai';
import { expandExtentForDyseProjections } from '@/utils/projection-util';

describe('projection-util', () => {
  it('expandExtentForDyseProjections', () => {
    const LEVELS = 31;
    let range = null;

    range = expandExtentForDyseProjections([0, 10], LEVELS);
    expect(range).to.deep.equal([-10, 20]);

    range = expandExtentForDyseProjections([-1, 0], LEVELS);
    expect(range).to.deep.equal([-2, 1]);

    range = expandExtentForDyseProjections([-0.1, 0.1], LEVELS);
    expect(range).to.deep.equal([-0.3, 0.3]);

    range = expandExtentForDyseProjections([4.0, 4.2], LEVELS);
    expect(range[0]).to.be.approximately(3.8, 0.001);
    expect(range[1]).to.be.approximately(4.4, 0.001);
  });
});
