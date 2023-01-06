// utility functions expect an array of graphs in the following shape:
//
// {
//   nodes: [{ id: <abc> ...}],
//   edges: [{ source: <abc>, target: <xyz> ...}]
// }

export function _edgeId(e) {
  return e.source + '///' + e.target;
}

// Common nodes are nodes that occur in ALL graphs
export function commonNodes(graphs) {
  return _nodesNumOccurrence(graphs, graphs.length);
}

// Unique nodes are nodes that occur in ONE graph
export function uniqueNodes(graphs) {
  return _nodesNumOccurrence(graphs, 1);
}

// Common edges are directed-edges that occur in ALL graphs
export function commonEdges(graphs) {
  return _edgesNumOccurrence(graphs, graphs.length);
}

// Unique edges are directed-edges that occur in ONE graph
export function uniqueEdges(graphs) {
  return _edgesNumOccurrence(graphs, 1);
}

/**
 * Returns nodes that appear across graphs cnt times
 *
 * @param {array} graphs - array of graph object
 * @param {number} cnt - filter by cnt occurrences
 */
function _nodesNumOccurrence(graphs, cnt) {
  const key = 'id';
  const nodeSets = graphs.map((graph) => graph.nodes);
  const keyedNodes = {};
  const keyCounts = {};
  const results = [];

  nodeSets.forEach((set) => {
    set.forEach((node) => {
      if (keyCounts[node[key]]) {
        keyCounts[node[key]] += 1;
      } else {
        keyCounts[node[key]] = 1;
      }
      keyedNodes[node[key]] = node;
    });
  });
  Object.entries(keyedNodes).forEach(([key]) => {
    if (keyCounts[key] === cnt) {
      results.push(keyedNodes[key]);
    }
  });
  return results;
}

/**
 * Returns edges that appear across graphs cnt times
 *
 * @param {array} graphs - array of graph object
 * @param {number} cnt - filter by cnt occurrences
 */
function _edgesNumOccurrence(graphs, cnt) {
  const edgeSets = graphs.map((graph) => graph.edges);
  const keyedEdges = {};
  const keyCounts = {};
  const results = [];

  edgeSets.forEach((set) => {
    set.forEach((edge) => {
      const id = _edgeId(edge);
      if (keyCounts[id]) {
        keyCounts[id] += 1;
      } else {
        keyCounts[id] = 1;
      }
      keyedEdges[id] = edge;
    });
  });
  Object.entries(keyedEdges).forEach(([key]) => {
    if (keyCounts[key] === cnt) {
      results.push(keyedEdges[key]);
    }
  });
  return results;
}

export default {
  commonNodes,
  commonEdges,
  uniqueNodes,
  uniqueEdges,
};
