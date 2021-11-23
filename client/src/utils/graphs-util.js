import _ from 'lodash';
import { STATEMENT_POLARITY } from '@/utils/polarity-util';
import { SELECTED_COLOR } from '@/utils/colors-util';

class Graph {
  PROCESSING = 1
  PROCESSED = 2

  constructor(edges) {
    const adjacentVertices = {};
    edges.forEach(e => {
      if (!(e.source in adjacentVertices)) {
        adjacentVertices[e.source] = [];
      }

      adjacentVertices[e.source].push(e.target);
    });
    this.cycleCount = 0;
    this.adjacentVertices = adjacentVertices;
  }

  /**
   * Uses depth first traveral to traverse the graph, starting from `node`.
   * Before traversing the children of a node, we set the current node's state to PROCESSING.
   * If a node in the PROCESSING state is encountered during our traversal, we know that a loop exists.
   * We then use the parentTracker to backtrack through our traversal and
   * add each of the nodes in the cycle to our cycleTracker.
  */
  findCycles(node, parent, stateTracker, cycleTracker, parentTracker) {
    if (stateTracker[node] === this.PROCESSED) {
      return;
    }

    if (stateTracker[node] === this.PROCESSING) {
      // We just hit a node that we are currently processing i.e. a loop
      this.cycleCount += 1;

      cycleTracker[this.cycleCount.toString()] = [];
      cycleTracker[this.cycleCount.toString()].push(node);

      // Mark all the nodes in the cycle as part of the same loop
      let currNode = parent;
      while (currNode !== node) {
        cycleTracker[this.cycleCount.toString()].push(currNode);
        currNode = parentTracker[currNode];
      }

      return;
    }

    stateTracker[node] = this.PROCESSING;
    parentTracker[node] = parent;

    for (const ind in this.adjacentVertices[node]) {
      this.findCycles(this.adjacentVertices[node][ind], node, stateTracker, cycleTracker, parentTracker);
    }

    stateTracker[node] = this.PROCESSED;
  }
}

/**
 * Get all the cycles in the graph
 * @returns A list of lists, where the inner lists are cycles in the graph
 */
export function findCycles(edges) {
  if (edges.length === 0) { return; }

  const g = new Graph(edges);
  const parent = null;
  const stateTracker = {};
  const cycleTracker = {};
  const parentTracker = {};

  const nodes = new Set();
  edges.forEach(e => {
    nodes.add(e.source);
    nodes.add(e.target);
  });
  for (const n of nodes) {
    g.findCycles(n, parent, stateTracker, cycleTracker, parentTracker);
  }

  for (const c in cycleTracker) {
    cycleTracker[c].reverse();
  }

  // FIXME: Remove after testing
  console.log(Object.values(cycleTracker));

  return Object.values(cycleTracker);
}

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

/**
 * Check if two elements are sufficiently overlapped
 */
export function overlap (node1, node2, threshold) {
  const rec1 = node1.getBoundingClientRect();
  const rec2 = node2.getBoundingClientRect();

  const xover = Math.max(0,
    Math.min(rec1.left + rec1.width, rec2.left + rec2.width) - Math.max(rec1.left, rec2.left));

  const yover = Math.max(0,
    Math.min(rec1.top + rec1.height, rec2.top + rec2.height) - Math.max(rec1.top, rec2.top));

  const aover = xover * yover;
  const a1 = rec1.width * rec1.height;
  const a2 = rec2.width * rec2.height;
  const hasOverlap = ((aover / a1) >= threshold || (aover / a2) > threshold);
  return hasOverlap;
}

export default {
  calculateNeighborhood,
  overlap,
  traverse
};
