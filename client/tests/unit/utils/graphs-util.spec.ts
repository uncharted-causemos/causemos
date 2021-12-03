import { expect } from 'chai';
import { hasBackingEvidence, findCycles } from '@/utils/graphs-util';

describe('graphs-util', () => {
  it('hasBackingEvidence - user set no evidence', () => {
    let edge = null;
    edge = { polarity: 1, same: 0, opposite: 0, unknown: 0 };
    expect(hasBackingEvidence(edge)).to.equal(false);

    edge = { polarity: 1, same: 0, opposite: 10, unknown: 0 };
    expect(hasBackingEvidence(edge)).to.equal(false);
  });

  it('hasBackingEvidence - with evidence', () => {
    let edge = null;
    edge = { polarity: 1, same: 10, opposite: 10, unknown: 0 };
    expect(hasBackingEvidence(edge)).to.equal(true);

    edge = { polarity: 0, same: 0, opposite: 10, unknown: 5 };
    expect(hasBackingEvidence(edge)).to.equal(true);
  });

  it('hasBackingEvidence - unknown polarity cases', () => {
    let edge = null;
    edge = { polarity: 1, same: 0, opposite: 0, unknown: 10 };
    expect(hasBackingEvidence(edge)).to.equal(false);

    edge = { polarity: 0, same: 0, opposite: 0, unknown: 10 };
    expect(hasBackingEvidence(edge)).to.equal(true);
  });

  it('cycle detction - no cycles', () => {
    const edges = [
      { source: 'A', target: 'B' },
      { source: 'B', target: 'C' }
    ];
    const cycles = findCycles(edges);
    expect(cycles.length).to.equal(0);
  });

  it('cycle detction - simple cycles', () => {
    const edges = [
      { source: 'A', target: 'B' },
      { source: 'B', target: 'A' }
    ];
    const cycles = findCycles(edges);
    expect(cycles.length).to.equal(1);
  });

  it('cycle detction - multi cycles', () => {
    const edges = [
      { source: 'A', target: 'B' },
      { source: 'B', target: 'A' },
      { source: 'A', target: 'C' },
      { source: 'C', target: 'D' },
      { source: 'D', target: 'A' }
    ];
    const cycles = findCycles(edges);
    expect(cycles.length).to.equal(2);
  });

  it('cycle detction - multi cycles, infinity', () => {
    const edges = [
      { source: 'A', target: 'B' },
      { source: 'B', target: 'A' },
      { source: 'B', target: 'C' },
      { source: 'C', target: 'B' }
    ];
    const cycles = findCycles(edges);
    expect(cycles.length).to.equal(2);
  });

  it('cycle detction - multi cycles, islands', () => {
    const edges = [
      { source: 'A', target: 'B' },
      { source: 'B', target: 'A' },
      { source: 'B', target: 'C' },
      { source: 'C', target: 'B' },
      { source: 'X', target: 'Y' },
      { source: 'Y', target: 'X' }
    ];
    const cycles = findCycles(edges);
    expect(cycles.length).to.equal(3);
  });
});
