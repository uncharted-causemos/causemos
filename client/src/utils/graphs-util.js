import _ from 'lodash';
import { STATEMENT_POLARITY } from '@/utils/polarity-util';
import { SELECTED_COLOR } from '@/utils/colors-util';

class Vertex {
  constructor(name) {
    this.name = name;
    this.index = null;
    this.lowestNode = null;
    this.inStack = false;
    this.removed = false;
  }

  reset() {
    this.index = null;
    this.lowestNode = null;
    this.inStack = false;
    this.removed = false;
  }
}
class Graph {
  constructor(edges) {
    const vertices = {};
    const adjacentVertices = {};
    edges.forEach(e => {
      const sourceVertex = vertices[e.source] ? vertices[e.source] : new Vertex(e.source);
      const targetVertex = vertices[e.target] ? vertices[e.target] : new Vertex(e.target);

      if (!(sourceVertex.name in adjacentVertices)) {
        adjacentVertices[sourceVertex.name] = new Set();
      }
      if (!(targetVertex.name in adjacentVertices)) {
        adjacentVertices[targetVertex.name] = new Set();
      }

      adjacentVertices[sourceVertex.name].add(targetVertex);

      vertices[sourceVertex.name] = sourceVertex;
      vertices[targetVertex.name] = targetVertex;
    });

    this.cycleCount = 0;
    this.adjacentVertices = adjacentVertices;
    this.vertices = new Set(Object.values(vertices));
  }

  /**
   * Finds all cycles in a graph using Johnson's algorithm.
   *
   * Paper: https://www.cs.tufts.edu/comp/150GA/homeworks/hw1/Johnson%2075.PDF
   *
   * Reference Implementation: https://github.com/networkx/networkx/blob/main/networkx/algorithms/cycles.py#L99
   *
   * Johnson's algorithm keeps track of many things:
   * - blocked set: the set of nodes that have already been visited in the DFS traversal of a node
   * - closed set: the set of nodes that participate in a cycle
   * - blockedMap: a map keeping track of what nodes should be unblocked if a given node is unblocked
   *
   * Starting with the first strongly connected component, we pop off a node (startNode), and start performing iterative DFS.
   * As we visit each node, we mark it as part of the blocked set.
   * If we form a cycle, take note, and then mark all the nodes in the cycle as part of the closed set.
   * When there are no more neighbors left, it means that either the neighboring nodes are blocked, and so should be tracked in the blockedMap
   * or the currNode needs to be unblocked.
   *
   * @returns cycles - an array of arrays, where each subarray represents a cycle
   */
  findCycles() {
    function unblock (node, blocked, B) {
      const stack = [node];
      while (stack.length > 0) {
        node = stack.pop();
        if (blocked.has(node)) {
          blocked.delete(node);
          Array.from(B[node.name]).forEach(e => stack.push(e));
          B[node.name].clear();
        }
      }
    }

    const cycles = [];
    let sccs = this.findSCC();
    while (sccs.length > 0) {
      const scc = sccs.pop();
      const startNode = scc.values().next().value;
      const path = [startNode];
      const blocked = new Set();
      const closed = new Set();
      blocked.add(startNode);

      // Initialize blockedMap
      const blockedMap = {};
      for (const v of this.vertices) {
        blockedMap[v.name] = new Set();
      }

      const stack = [[startNode, Array.from(this.adjacentVertices[startNode.name])]];
      while (stack.length > 0) {
        // const lastStacked = stack.at(-1);
        const lastStacked = stack[stack.length - 1];
        const currNode = lastStacked[0];
        const neighbors = lastStacked[1];

        if (neighbors.length > 0) {
          const nextNode = neighbors.pop();
          if (nextNode === startNode) {
            cycles.push(_.cloneDeep(path));
            path.forEach(e => closed.add(e));
          } else if (!blocked.has(nextNode)) {
            path.push(nextNode);
            stack.push([nextNode, Array.from(this.adjacentVertices[nextNode.name])]);
            closed.delete(nextNode);
            blocked.add(nextNode);
            continue;
          }
        }

        if (neighbors.length === 0) {
          if (closed.has(currNode)) {
            unblock(currNode, blocked, blockedMap);
          } else {
            for (const neighbor of this.adjacentVertices[currNode.name]) {
              if (!blockedMap[neighbor.name].has(currNode)) {
                blockedMap[neighbor.name].add(currNode);
              }
            }
          }

          stack.pop();
          path.pop();
        }
      }

      // Now remove the node, and recompute sccs
      for (const n of this.vertices) {
        this.adjacentVertices[n.name].delete(startNode);
      }
      delete this.adjacentVertices[startNode.name];
      this.vertices.delete(startNode);

      // Now find all the new strongly connected components
      sccs = this.findSCC();
    }

    return cycles;
  }

  /**
   * Finds all strongly connected components in a graph using Tarjan's algorithm
   *
   * Reference implementation: https://en.wikipedia.org/wiki/Tarjan%27s_strongly_connected_components_algorithm#The_algorithm_in_pseudocode
   *
   * A strongly connected component is a subgraph such that every node is reachable from every other node.
   *
   * Tarjan's algorithm performs DFS on the graph, assigning a unique index to each vertex.
   * It also keeps track of the lowest indexed node that can be reached in a given nodes subtree.
   *
   * When it reaches a node whose lowestNode == index, it means that either the DFS formed a loop
   * or that this node's subtree has no loops, and thus it forms a strongly connected component as a stand alone vertex.
   *
   * @returns an array of sets of vertices, where each set represents a strongly connected component in the graph
   */
  findSCC() {
    const sccs = [];
    const stack = [];
    let index = 0;

    // TODO: Make this prettier somehow
    const findSCCRecurseBind = findSCCRecurse.bind(this);

    // Reset the vertex properties that may have been set from a previous call to findSCC()
    for (const v of this.vertices) {
      v.reset();
    }

    for (const v of this.vertices) {
      if (v.index === null) {
        findSCCRecurseBind(v);
      }
    }

    function findSCCRecurse(node) {
      node.index = index;
      node.lowestNode = index;
      stack.push(node);
      node.inStack = true;
      index += 1;

      for (const v of this.adjacentVertices[node.name]) {
        if (v.index === null) {
          findSCCRecurseBind(v);
          node.lowestNode = Math.min(node.lowestNode, v.lowestNode);
        } else if (v.inStack) {
          // We've hit a loop, and lowestNode only tracks the lowestNode in the subtree.
          // So here we take the min of node.lowestNode and the index of the child node
          node.lowestNode = Math.min(node.lowestNode, v.index);
        }
      }

      if (node.index === node.lowestNode) {
        // If this is the lowest node we can reach, then we've either:
        // - formed a cycle, in which case this is a SCC
        // - or have no cycle what so ever, so the stand-alone node is a SCC
        const scc = new Set();
        let w = null;
        do {
          w = stack.pop();
          w.inStack = false;
          scc.add(w);
        } while (w.name !== node.name);
        sccs.push(scc);
      }
    }

    return sccs;
  }
}

export function findSCC(edges) {
  if (edges.length === 0) { return; }
  const g = new Graph(edges);
  return g.findSCC();
}

/**
 * Get all the cycles in the graph
 * @returns A list of lists, where the inner lists are cycles in the graph
 */
export function findCycles(edges) {
  if (!edges || edges.length === 0) { return []; }
  const g = new Graph(edges);
  return g.findCycles();
}

/**
 *  Classify cycles as either balancing, reinforcing or ambiguous
 */
export function classifyCycles(cyclePaths, graphEdges) {
  const g = new Graph(graphEdges);
  const numNodes = g.vertices.size;

  // Mark each node with a unique numerical identifier
  const nameToId = {};
  let uniqueIdentifier = 0;
  for (const v of g.vertices) {
    nameToId[v.name] = uniqueIdentifier;
    uniqueIdentifier++;
  }

  // Initialize an adjacency matrix
  const adjacencyMatrix = [];
  for (let i = 0; i < numNodes; i++) {
    adjacencyMatrix.push([]);
    for (let j = 0; j < numNodes; j++) {
      adjacencyMatrix[i].push(0);
    }
  }

  // Fill the adjacency matrix
  for (const e of graphEdges) {
    const sourceId = nameToId[e.source];
    const targetId = nameToId[e.target];
    adjacencyMatrix[sourceId][targetId] = e.polarity;
  }

  const balancing = [];
  const reinforcing = [];
  const ambiguous = [];

  // Check status of cycle path
  for (const path of cyclePaths) {
    let negativePolarity = 0;
    let positivePolarity = 0;
    let isAmbiguous = false;
    for (let k = 0; k < path.length; k++) {
      const source = nameToId[path[k].name];
      const target = nameToId[path[(k + 1) % path.length].name];
      if (adjacencyMatrix[source][target] === 1) {
        positivePolarity += 1;
      } else if (adjacencyMatrix[source][target] === -1) {
        negativePolarity += 1;
      } else {
        isAmbiguous = true;
        break;
      }
    }

    if (isAmbiguous) {
      ambiguous.push(path);
    } else if (negativePolarity === positivePolarity) {
      balancing.push(path);
    } else {
      reinforcing.push(path);
    }
  }

  return {
    balancing: balancing,
    reinforcing: reinforcing,
    ambiguous: ambiguous
  };
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
