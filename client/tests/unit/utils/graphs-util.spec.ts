import {
  hasBackingEvidence,
  findCycles,
  findAllAncestorPaths,
  findAllDescendantPaths,
  findPaths,
} from '@/utils/graphs-util';

const dummyEdge = {
  id: '',
  model_id: '',
  source: 'x',
  target: 'y',
  reference_ids: [],
  user_polarity: null,
};

describe('graphs-util', () => {
  it('hasBackingEvidence - user set no evidence', () => {
    let edge = null;
    edge = Object.assign(dummyEdge, { polarity: 1, same: 0, opposite: 0, unknown: 0 });
    expect(hasBackingEvidence(edge)).to.equal(false);

    edge = Object.assign(dummyEdge, { polarity: 1, same: 0, opposite: 10, unknown: 0 });
    expect(hasBackingEvidence(edge)).to.equal(false);
  });

  it('hasBackingEvidence - with evidence', () => {
    let edge = null;
    edge = Object.assign(dummyEdge, { polarity: 1, same: 10, opposite: 10, unknown: 0 });
    expect(hasBackingEvidence(edge)).to.equal(true);

    edge = Object.assign(dummyEdge, { polarity: 0, same: 0, opposite: 10, unknown: 5 });
    expect(hasBackingEvidence(edge)).to.equal(true);
  });

  it('hasBackingEvidence - unknown polarity cases', () => {
    let edge = null;
    edge = Object.assign(dummyEdge, { polarity: 1, same: 0, opposite: 0, unknown: 10 });
    expect(hasBackingEvidence(edge)).to.equal(false);

    edge = Object.assign(dummyEdge, { polarity: 0, same: 0, opposite: 0, unknown: 10 });
    expect(hasBackingEvidence(edge)).to.equal(true);
  });

  it('cycle detction - no cycles', () => {
    const edges = [
      { source: 'A', target: 'B' },
      { source: 'B', target: 'C' },
    ];
    const cycles = findCycles(edges);
    expect(cycles.length).to.equal(0);
  });

  it('cycle detction - simple cycles', () => {
    const edges = [
      { source: 'A', target: 'B' },
      { source: 'B', target: 'A' },
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
      { source: 'D', target: 'A' },
    ];
    const cycles = findCycles(edges);
    expect(cycles.length).to.equal(2);
  });

  it('cycle detction - multi cycles, infinity', () => {
    const edges = [
      { source: 'A', target: 'B' },
      { source: 'B', target: 'A' },
      { source: 'B', target: 'C' },
      { source: 'C', target: 'B' },
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
      { source: 'Y', target: 'X' },
    ];
    const cycles = findCycles(edges);
    expect(cycles.length).to.equal(3);
  });

  it('trace ancestor paths - no path', () => {
    const edges = [{ source: 'A', target: 'B' }];
    const paths = findAllAncestorPaths('C', edges);
    expect(paths.length).to.equal(0);
  });

  it('trace ancestor paths - simple', () => {
    const edges = [
      { source: 'A', target: 'B' },
      { source: 'B', target: 'C' },
      { source: 'C', target: 'D' },
    ];

    const paths = findAllAncestorPaths('C', edges);
    expect(paths.length).to.equal(1);
    expect(paths[0]).to.deep.equal(['A', 'B', 'C']);
  });

  it('trace ancestor paths - loop', () => {
    const edges = [
      { source: 'A', target: 'B' },
      { source: 'B', target: 'C' },
      { source: 'C', target: 'D' },
      { source: 'D', target: 'A' },
    ];

    const paths = findAllAncestorPaths('B', edges);
    expect(paths.length).to.equal(1);
    expect(paths[0]).to.deep.equal(['B', 'C', 'D', 'A', 'B']);
  });

  it('trace ancestor paths - multiple', () => {
    const edges = [
      { source: 'A', target: 'C' },
      { source: 'B', target: 'C' },
      { source: 'C', target: 'D' },
      { source: 'D', target: 'E' },
    ];

    const paths = findAllAncestorPaths('E', edges);
    expect(paths.length).to.equal(2);
  });

  it('trace descendant paths - collider', () => {
    const edges = [
      { source: 'A', target: 'C' },
      { source: 'B', target: 'C' },
      { source: 'C', target: 'D' },
      { source: 'D', target: 'E' },
    ];

    const p1 = findAllDescendantPaths('A', edges);
    expect(p1.length).to.equal(1);
    expect(p1[0]).to.deep.equal(['A', 'C', 'D', 'E']);

    const p2 = findAllDescendantPaths('B', edges);
    expect(p2.length).to.equal(1);
    expect(p2[0]).to.deep.equal(['B', 'C', 'D', 'E']);
  });

  it('trace descendant - multiple', () => {
    const edges = [
      { source: 'A', target: 'C' },
      { source: 'A', target: 'B' },
      { source: 'C', target: 'D' },
      { source: 'B', target: 'D' },
    ];

    const p1 = findAllDescendantPaths('A', edges);
    expect(p1.length).to.equal(2);
  });

  it('trace between source/target - simple', () => {
    const edges = [
      { source: 'A', target: 'B' },
      { source: 'B', target: 'C' },
      { source: 'C', target: 'D' },
      { source: 'D', target: 'E' },
    ];

    const p = findPaths('B', 'D', edges);
    expect(p.length).to.equal(1);
    expect(p[0]).to.deep.equal(['B', 'C', 'D']);
  });

  it('trace between source/target - no path', () => {
    const edges = [
      { source: 'A', target: 'B' },
      { source: 'B', target: 'C' },
      { source: 'C', target: 'D' },
      { source: 'D', target: 'E' },
    ];

    const p = findPaths('B', 'X', edges);
    expect(p.length).to.equal(0);
  });

  it('trace between source/target - multipath', () => {
    const edges = [
      { source: 'A', target: 'B' },
      { source: 'B', target: 'C' },
      { source: 'C', target: 'D' },
      { source: 'D', target: 'E' },
      { source: 'B', target: 'X' },
      { source: 'X', target: 'Y' },
      { source: 'Y', target: 'C' },
      { source: 'B', target: 'D' },
    ];

    const p = findPaths('B', 'D', edges);
    expect(p.length).to.equal(3);
  });

  it('trace between source/target - cycles', () => {
    const edges = [
      { source: 'A', target: 'B' },
      { source: 'B', target: 'C' },
      { source: 'C', target: 'D' },
      { source: 'D', target: 'E' },
      { source: 'E', target: 'A' },
    ];

    const p = findPaths('A', 'E', edges);
    expect(p.length).to.equal(1);
  });
});
