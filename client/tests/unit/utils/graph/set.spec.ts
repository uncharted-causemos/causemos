import {
  commonNodes,
  commonEdges,
  uniqueNodes,
  uniqueEdges,
} from '../../../../src/utils/graph/set';

describe('utils/graph/set', () => {
  const nonRandomGraphs = [
    {
      nodes: [{ id: 1 }, { id: 2 }, { id: 3 }],
      edges: [
        { source: 1, target: 1 },
        { source: 1, target: 2 },
      ],
    },
    {
      nodes: [{ id: 1 }, { id: 2 }, { id: 3 }],
      edges: [
        { source: 1, target: 1 },
        { source: 1, target: 2 },
      ],
    },
    {
      nodes: [{ id: 1 }, { id: 2 }, { id: 3 }],
      edges: [
        { source: 1, target: 1 },
        { source: 1, target: 2 },
      ],
    },
  ];

  describe('commonNodes', () => {
    it('correct count of predefined common nodes', () => {
      const commonNodeSet = commonNodes(nonRandomGraphs);
      expect(commonNodeSet.length).to.equal(3);
    });

    it('no nodes common among all graphs returns empty array', () => {
      const g1 = {
        nodes: [{ id: 'a' }, { id: 'b' }],
        edges: [],
      };
      const g2 = {
        nodes: [{ id: 'a' }, { id: 'b' }],
        edges: [],
      };
      const g3 = {
        nodes: [{ id: 'c' }, { id: 'd' }],
        edges: [],
      };
      const commonNodeSet = commonNodes([g1, g2, g3]);
      expect(commonNodeSet.length).to.equal(0);
    });
  });

  describe('commonEdges', () => {
    it('correct count of predefined common edges', () => {
      const commonEdgeSet = commonEdges(nonRandomGraphs);
      expect(commonEdgeSet.length).to.equal(2);
    });

    it('no edges common among all graphs returns empty array', () => {
      const g1 = {
        nodes: [],
        edges: [{ source: 'a', target: 'b' }],
      };
      const g2 = {
        nodes: [],
        edges: [{ source: 'a', target: 'b' }],
      };
      const g3 = {
        nodes: [],
        edges: [{ source: 'c', target: 'd' }],
      };
      const commonNodeSet = commonNodes([g1, g2, g3]);
      expect(commonNodeSet.length).to.equal(0);
    });
  });

  describe('uniqueNodes', () => {
    it('correct count of predefined unique nodes', () => {
      const uniqueNodeSet = uniqueNodes(nonRandomGraphs);
      expect(uniqueNodeSet.length).to.equal(0);
    });

    it('all nodes common among all graphs returns empty array', () => {
      const g1 = {
        nodes: [{ id: 'a' }, { id: 'b' }],
        edges: [],
      };
      const g2 = {
        nodes: [{ id: 'a' }, { id: 'b' }],
        edges: [],
      };
      const g3 = {
        nodes: [{ id: 'a' }, { id: 'b' }],
        edges: [],
      };
      const uniqueNodeSet = uniqueNodes([g1, g2, g3]);
      expect(uniqueNodeSet.length).to.equal(0);
    });
  });

  describe('uniqueEdges', () => {
    it('correct count of predefined unique edges', () => {
      const uniqueEdgeSet = uniqueEdges(nonRandomGraphs);
      expect(uniqueEdgeSet.length).to.equal(0);
    });

    it('all edges common among all graphs returns empty array', () => {
      const g1 = {
        nodes: [],
        edges: [{ source: 'a', target: 'b' }],
      };
      const g2 = {
        nodes: [],
        edges: [{ source: 'a', target: 'b' }],
      };
      const g3 = {
        nodes: [],
        edges: [{ source: 'a', target: 'b' }],
      };
      const uniqueEdgeSet = uniqueEdges([g1, g2, g3]);
      expect(uniqueEdgeSet.length).to.equal(0);
    });
  });
});
