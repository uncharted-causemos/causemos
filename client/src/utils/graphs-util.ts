import _ from 'lodash';
import { STATEMENT_POLARITY } from '@/utils/polarity-util';
import { SELECTED_COLOR } from '@/utils/colors-util';
import { CAGGraph, EdgeParameter } from '@/types/CAG';

interface Edge {
  source: string;
  target: string;
  polarity?: number;
}

export class Vertex {
  name = '';
  index: number | null = null;
  lowestNode: number | null = null;
  inStack = false;
  removed = false;

  constructor(name: string) {
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
  cycleCount: 0;
  vertices: Set<Vertex> = new Set();
  adjacentVertices: { [key: string]: Set<Vertex> } = {};

  constructor(edges: Edge[]) {
    const vertices: { [key: string]: Vertex } = {};
    const adjacentVertices: { [key: string]: Set<Vertex> } = {};
    edges.forEach((e) => {
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
    function unblock(node: Vertex, blocked: Set<Vertex>, B: { [key: string]: Set<Vertex> }) {
      const stack = [node];
      while (stack.length > 0) {
        const node = stack.pop();
        if (node && blocked.has(node)) {
          blocked.delete(node);
          Array.from(B[node.name]).forEach((e) => stack.push(e));
          B[node.name].clear();
        }
      }
    }

    const cycles: Vertex[][] = [];
    let sccs = this.findSCC();
    while (sccs.length > 0) {
      const scc = sccs.pop();
      const startNode = scc?.values().next().value;
      const path: Vertex[] = [startNode];
      const blocked: Set<Vertex> = new Set();
      const closed: Set<Vertex> = new Set();
      blocked.add(startNode);

      // Initialize blockedMap
      const blockedMap: { [key: string]: Set<Vertex> } = {};
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
            path.forEach((e) => closed.add(e));
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
    const sccs: Set<Vertex>[] = [];
    const stack: Vertex[] = [];
    const adjacentVertices = this.adjacentVertices;
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

    function findSCCRecurse(node: Vertex) {
      node.index = index;
      node.lowestNode = index;
      stack.push(node);
      node.inStack = true;
      index += 1;

      for (const v of adjacentVertices[node.name]) {
        if (v.index === null) {
          findSCCRecurseBind(v);

          // @ts-ignore: heavy computation, not worth typescript shenanigans
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
        const scc = new Set<Vertex>();
        let w = null;
        do {
          w = stack.pop();
          if (w) {
            w.inStack = false;
            scc.add(w);
          }
        } while (w?.name !== node.name);
        sccs.push(scc);
      }
    }

    return sccs;
  }
}

export function findSCC(edges: Edge[]) {
  if (edges.length === 0) {
    return;
  }
  const g = new Graph(edges);
  return g.findSCC();
}

/**
 * Helper function: Trace adjacency matrix recursively
 *
 * @param {string} id - node
 * @param {array} buffer - current path
 * @param {Map} adjMap - adjacency data
 * @param {Set} visited - visited tracker
 * @param {array} paths - result accumulator
 */
type TracePath = string[];
function trace(
  id: string,
  buffer: string[],
  adjMap: Map<string, string[]>,
  visited: Set<string>,
  paths: TracePath[]
) {
  if (visited.has(id)) {
    paths.push(buffer);
    return;
  }
  visited.add(id);

  const parents = adjMap.get(id);
  if (parents && parents.length > 0) {
    for (const newId of parents) {
      trace(newId, [newId, ...buffer], adjMap, visited, paths);
    }
  } else {
    paths.push(buffer);
  }
}

/**
 * Trace ancestor paths given a node, we do not consider a singular
 * node to be a "path"
 */
export function findAllAncestorPaths(node: string, edges: Edge[]) {
  const adjMap = new Map<string, string[]>();
  const visited = new Set<string>();
  const paths: TracePath[] = [];

  for (const edge of edges) {
    if (!adjMap.has(edge.target)) {
      adjMap.set(edge.target, []);
    }
    const p = adjMap.get(edge.target);
    if (p) {
      p.push(edge.source);
    }
  }
  trace(node, [node], adjMap, visited, paths);
  return paths.filter((path) => path.length > 1);
}

export function findAllDescendantPaths(node: string, edges: Edge[]) {
  const adjMap = new Map<string, string[]>();
  const visited = new Set<string>();
  const paths: TracePath[] = [];

  for (const edge of edges) {
    if (!adjMap.has(edge.source)) {
      adjMap.set(edge.source, []);
    }
    const p = adjMap.get(edge.source);
    if (p) {
      p.push(edge.target);
    }
  }
  trace(node, [node], adjMap, visited, paths);
  return paths.filter((path) => path.length > 1).map((path) => path.reverse());
}

export function findPaths(source: string, target: string, edges: Edge[]) {
  function traceToTarget(
    id: string,
    target: string,
    buffer: string[],
    adjMap: Map<string, string[]>,
    paths: TracePath[]
  ) {
    if (buffer.indexOf(id) >= 0) return;
    buffer.push(id);

    if (id === target) {
      paths.push(buffer);
      return;
    }
    const parents = adjMap.get(id);
    if (parents && parents.length > 0) {
      for (const newId of parents) {
        traceToTarget(newId, target, [...buffer], adjMap, paths);
      }
    }
  }

  const adjMap = new Map<string, string[]>();
  const paths: TracePath[] = [];

  for (const edge of edges) {
    if (!adjMap.has(edge.source)) {
      adjMap.set(edge.source, []);
    }
    const p = adjMap.get(edge.source);
    if (p) {
      p.push(edge.target);
    }
  }

  traceToTarget(source, target, [], adjMap, paths);
  return paths;
}

/**
 * Get all the cycles in the graph
 * @returns A list of lists, where the inner lists are cycles in the graph
 */
export function findCycles(edges: Edge[]) {
  if (!edges || edges.length === 0) {
    return [];
  }
  const g = new Graph(edges);
  return g.findCycles();
}

/**
 *  Classify cycles as either balancing, reinforcing or ambiguous
 */
export function classifyCycles(cyclePaths: Vertex[][], graphEdges: Edge[]) {
  const g = new Graph(graphEdges);
  const numNodes = g.vertices.size;

  // Mark each node with a unique numerical identifier
  const nameToId: { [key: string]: number } = {};
  let uniqueIdentifier = 0;
  for (const v of g.vertices) {
    nameToId[v.name] = uniqueIdentifier;
    uniqueIdentifier++;
  }

  // Initialize an adjacency matrix
  const adjacencyMatrix: number[][] = [];
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

    // @ts-ignore: heavy computation, not worth typescript shenanigans
    adjacencyMatrix[sourceId][targetId] = e.polarity;
  }

  const balancing = [];
  const reinforcing = [];
  const ambiguous = [];

  // Check status of cycle path
  for (const path of cyclePaths) {
    let negativePolarity = 0;
    let isAmbiguous = false;
    for (let k = 0; k < path.length; k++) {
      const source = nameToId[path[k].name];
      const target = nameToId[path[(k + 1) % path.length].name];
      if (adjacencyMatrix[source][target] === 1) {
        continue;
      } else if (adjacencyMatrix[source][target] === -1) {
        negativePolarity += 1;
      } else {
        isAmbiguous = true;
        break;
      }
    }

    if (isAmbiguous) {
      ambiguous.push(path);
    } else if (negativePolarity % 2 === 0) {
      reinforcing.push(path);
    } else {
      balancing.push(path);
    }
  }

  return {
    balancing: balancing,
    reinforcing: reinforcing,
    ambiguous: ambiguous,
  };
}

/**
 * Get the neighborhood graph for a selected node
 * @param {object} graph - an object of nodes/edges arrays
 * @param {string} node - a node id
 */

export const highlightOptions = {
  duration: 4000,
  color: SELECTED_COLOR,
};

export function calculateNeighborhood(graph: CAGGraph, node: string) {
  const neighborEdges = graph.edges
    .filter((edge) => {
      return edge.target === node || edge.source === node;
    })
    .map((edge) => {
      return { source: edge.source, target: edge.target, reference_ids: edge.reference_ids };
    });

  // Reverse-engineer nodes from edges
  const neighborNodes = _.uniq(
    _.flatten(
      neighborEdges.map((edge) => {
        return [edge.source, edge.target];
      })
    ).concat(node)
  ).map((concept) => ({ concept })); // Include the selected node (added into .uniq)

  return { nodes: neighborNodes, edges: neighborEdges };
}

/**
 * Check if edge has backing evidence
 */
export function hasBackingEvidence(edge: EdgeParameter) {
  const sameCount = edge.same || 0;
  const oppositeCount = edge.opposite || 0;
  const unknownCount = edge.unknown || 0;

  if (edge.polarity === STATEMENT_POLARITY.SAME) return sameCount > 0;
  else if (edge.polarity === STATEMENT_POLARITY.OPPOSITE) return oppositeCount > 0;

  return oppositeCount + sameCount + unknownCount > 0;
  /*
  if (edge.polarity === null || edge.polarity === STATEMENT_POLARITY.UNKNOWN) return edge.opposite === 0 && edge.same === 0 && edge.unknown === 0;
  if (edge.polarity === STATEMENT_POLARITY.SAME) return edge.same === 0;
  if (edge.polarity === STATEMENT_POLARITY.OPPOSITE) return edge.opposite === 0;
  return edge.opposite === edge.same === edge.unknown === 0;
  */
}

export default {
  calculateNeighborhood,
};
