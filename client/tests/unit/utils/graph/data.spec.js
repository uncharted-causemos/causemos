import { expect } from 'chai';
import { getRandomGraph, getRandomNode, getOntologyGraph } from '../../../utils/graph-factory';
import { calcHierarchyDepth, groupEdges } from '../../../../src/utils/graph/data';
import { getArrayOfRandomLength, getRandomInt } from '../../../utils/random';

describe('utils/graph/data', () => {
  let ontologyGraph;
  let randomGraph;

  before(() => {
    randomGraph = getRandomGraph();
    ontologyGraph = getOntologyGraph();
  });

  describe('calcHierarchyDepth', () => {
    let nodes;

    before(() => {
      nodes = getArrayOfRandomLength(10, 1000, () => {
        let id = '';
        const idLength = getRandomInt(1, 10);

        for (let i = 0; i < idLength; i++) {
          id += '/';
        }
        return getRandomNode({
          id
        });
      });
    });

    it('hierarchy depth equal levels in ontology', () => {
      const idLengths = nodes.map(node => node.data.id.length);
      const hierarchyDepth = calcHierarchyDepth({ groundedNodes: nodes });
      expect(hierarchyDepth).to.equal(Math.max(...idLengths));
    });
  });

  describe('groupEdges', () => {
    it('ontology - default level should be 1', () => {
      const edges = ontologyGraph.edges.filter(element => element.source);
      const groupedEdges = groupEdges(edges);
      const levelOneGroup = groupEdges(edges, 1);
      expect(groupedEdges).to.deep.equal(levelOneGroup);
    });
    it('random - default level should be 1', () => {
      const edges = randomGraph.edges.filter(element => element.source);
      const groupedEdges = groupEdges(edges);
      const levelOneGroup = groupEdges(edges, 1);
      expect(groupedEdges).to.deep.equal(levelOneGroup);
    });

    it('', () => {

    });
    // TODO: missing test cases
    // test all rollup levels
    // use actual and random ontology
    // check counts of grouped edges
    // edges only between leaf nodes

    // edge aggregation when one side is collapsed and the other is expanded, all go to one in parent, go to multiple within same parent

    // inter edges and intra edges
    // combinations of edges within a parent
    // one to many, many to one, many to many
    // outgoing and incoming

    // need to test the event handler util
    // null case
    // random case
    // random + 1 case
  });
});
