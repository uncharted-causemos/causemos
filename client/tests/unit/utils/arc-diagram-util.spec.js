import { expect } from 'chai';
import ArcDiagramUtil from '@/utils/arc-diagram-util';

const GRAPH = {
  nodes: [{ id: 'a' }, { id: 'b' }],
  edges: [
    { source: 'a', target: 'b', total: 1 },
    { source: 'b', target: 'a', total: 1 },
  ],
};

describe('arc-diagram-util', () => {
  it('check if there are undefined nodes', () => {
    const sortedNodes = ArcDiagramUtil.calculateBestGraphOrder(GRAPH);
    const found = sortedNodes.filter((node) => node === 'undefined');
    expect(found.length).to.deep.equal(0);
  });

  it('check graph ordering', () => {
    const g1 = {
      nodes: [{ id: 'a' }, { id: 'b' }, { id: 'c' }, { id: 'd' }],
      edges: [
        { source: 'a', target: 'b', total: 10 },
        { source: 'a', target: 'c', total: 10 },
        { source: 'c', target: 'd', total: 10 },
      ],
    };

    const g2n1 = {
      nodes: [{ id: 'a' }, { id: 'b' }, { id: 'c' }],
      edges: [
        { source: 'a', target: 'b', total: 10 },
        { source: 'a', target: 'c', total: 10 },
      ],
    };
    const g2n2 = {
      nodes: [{ id: 'a' }, { id: 'c' }, { id: 'd' }],
      edges: [
        { source: 'a', target: 'c', total: 10 },
        { source: 'c', target: 'd', total: 10 },
      ],
    };

    const g1Result = ArcDiagramUtil.calculateBestGraphOrder(g1);
    const g2Result = ArcDiagramUtil.calculateBestMultiGraphsOrder([g2n1, g2n2]);
    expect(g1Result).to.deep.equal(g2Result);
  });
});
