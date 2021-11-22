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

class Graph {
  constructor(cag) {
    const adjacent_vertices = {};
    cag.edges.forEach(e => {
      if (!(e.source in adjacent_vertices)) {
        adjacent_vertices[e.source] = [];
      }

      adjacent_vertices[e.source].push(e.target);
    });
    this.cycle_count = 0;
    this.adjacent_vertices = adjacent_vertices;
  }

  dfs(node, parent, color_tracker, cycle_tracker, parent_tracker) {
    if (color_tracker[node] === 2) {
      return;
    }

    if (color_tracker[node] === 1) {
      // We just hit a node that we are currently processing i.e. a loop
      this.cycle_count += 1;

      cycle_tracker[this.cycle_count.toString()] = [];
      cycle_tracker[this.cycle_count.toString()].push(node);

      // Mark all the nodes in the cycle as part of the same loop
      let curr_node = parent;
      while (curr_node !== node) {
        cycle_tracker[this.cycle_count.toString()].push(curr_node);
        curr_node = parent_tracker[curr_node];
      }

      return;
    }

    color_tracker[node] = 1;
    parent_tracker[node] = parent;

    for (const ind in this.adjacent_vertices[node]) {
      this.dfs(this.adjacent_vertices[node][ind], node, color_tracker, cycle_tracker, parent_tracker);
    }

    color_tracker[node] = 2;
  }
}

export function getCircularPaths(cag) {
  if (cag.edges.length === 0) { return; }

  const g = new Graph(cag);
  const parent = null;
  const color_tracker = {};
  const cycle_tracker = {};
  const parent_tracker = {};

  const nodes = new Set();
  cag.edges.forEach(e => {
    nodes.add(e.source);
    nodes.add(e.target);
  });
  for (const n of nodes) {
    g.dfs(n, parent, color_tracker, cycle_tracker, parent_tracker);
  }

  for (const c in cycle_tracker) {
    cycle_tracker[c].reverse();
  }

  // FIXME: Remove after testing
  console.log(cycle_tracker);

  return cycle_tracker;
}

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
