import _ from 'lodash';
import { STATEMENT_POLARITY } from '@/utils/polarity-util';
import { SELECTED_COLOR } from '@/utils/colors-util';

/**
 * Get the neighborhood graph for a selected node
 * @param {object} graph - an object of nodes/edges arrays
 * @param {string} node - a node id
 */

export const highlightOptions = {
  duration: 4000,
  color: SELECTED_COLOR
};

export function calculateNeighborhood(graph, node) {
  const neighborEdges = graph.edges.filter(edge => {
    return edge.target === node || edge.source === node;
  }).map(edge => {
    return { source: edge.source, target: edge.target, reference_ids: edge.reference_ids };
  });

  // Reverse-engineer nodes from edges
  const neighborNodes = _.uniq(_.flatten(neighborEdges.map(edge => {
    return [edge.source, edge.target];
  })).concat(node)).map(concept => ({ concept })); // Include the selected node (added into .uniq)

  return { nodes: neighborNodes, edges: neighborEdges };
}

/**
 * Check if edge has backing evidence
 */
export function hasBackingEvidence(edge) {
  if (edge.polarity === STATEMENT_POLARITY.SAME) return edge.same > 0;
  else if (edge.polarity === STATEMENT_POLARITY.OPPOSITE) return edge.opposite > 0;

  return (edge.opposite + edge.same + edge.unknown) > 0;
  /*
  if (edge.polarity === null || edge.polarity === STATEMENT_POLARITY.UNKNOWN) return edge.opposite === 0 && edge.same === 0 && edge.unknown === 0;
  if (edge.polarity === STATEMENT_POLARITY.SAME) return edge.same === 0;
  if (edge.polarity === STATEMENT_POLARITY.OPPOSITE) return edge.opposite === 0;
  return edge.opposite === edge.same === edge.unknown === 0;
  */
}

export function traverse (root, callBackFn, p) {
  callBackFn(root, p);
  if (root.nodes) {
    for (let i = 0; i < root.nodes.length; i++) {
      traverse(root.nodes[i], callBackFn, root);
    }
  }
}

export default {
  calculateNeighborhood,
  traverse
};
