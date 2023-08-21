import { FIFOCache } from '@/utils/fifo-cache';

describe('fifo-cache', () => {
  it('no retain policy', () => {
    const cache = new FIFOCache<number>(100);

    for (let i = 0; i < 200; i++) {
      cache.set(i + '', i);
    }
    expect(cache.size()).to.equal(100);
    expect(cache.get('2')).to.equal(undefined);
    expect(cache.get('138')).to.equal(138);
  });

  it('retation 0.8', () => {
    const cache = new FIFOCache<number>(100, 0.8);

    for (let i = 0; i < 102; i++) {
      cache.set(i + '', i);
    }
    expect(cache.size()).to.equal(81);
    expect(cache.get('2')).to.equal(undefined);
    expect(cache.get('101')).to.equal(101);
  });
});
