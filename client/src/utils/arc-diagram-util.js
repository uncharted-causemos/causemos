import _ from 'lodash';

/**
 * Implementation of the Algorithm GR described here: https://pdfs.semanticscholar.org/c7ed/d9acce96ca357876540e19664eb9d976637f.pdf
 * Code taken from the following github repository: https://github.com/nkronenfeld/konigsburg
 */
function calculateBestGraphOrder(graph) {
  const getEdgeWeight = (source, target) => {
    const matchingEdge = graph.edges.find(
      (edge) => edge.source === source && edge.target === target
    );
    if (matchingEdge) {
      return matchingEdge.total;
    } else {
      return 0;
    }
  };
  const numNodes = graph.nodes.length;
  const nodesLeft = [];
  for (let i = 0; i < numNodes; i++) {
    nodesLeft.push(graph.nodes[i].concept);
  }

  let result = [];
  if (numNodes < 2) {
    result = nodesLeft;
  } else {
    const startSeq = [];
    const endSeq = [];
    const addToStart = (i) => {
      nodesLeft.splice(nodesLeft.indexOf(i), 1);
      startSeq.push(i);
    };
    const addToEnd = (i) => {
      nodesLeft.splice(nodesLeft.indexOf(i), 1);
      endSeq.unshift(i);
    };
    const nonSelfDegree = (sources, sinks) => {
      let total = 0;
      for (let i = 0; i < sources.length; ++i) {
        for (let j = 0; j < sinks.length; ++j) {
          if (sources[i] !== sinks[j]) {
            total = total + getEdgeWeight(sources[i], sinks[j]);
          }
        }
      }
      return total;
    };

    const sinkScore = (node) => {
      return nonSelfDegree([node], nodesLeft);
    };
    const sourceScore = (node) => {
      return nonSelfDegree(nodesLeft, [node]);
    };
    const degreeDeltaLeft = (node) => {
      const inDegree = nonSelfDegree(nodesLeft, [node]);
      const outDegree = nonSelfDegree([node], nodesLeft);
      return outDegree - inDegree;
    };

    while (nodesLeft.length > 0) {
      // Look for clear sinks
      const clearSinks = nodesLeft.filter((n) => sinkScore(n) === 0);
      if (clearSinks.length > 0) {
        clearSinks.forEach(addToEnd);
      } else {
        // Look for clear sources
        const clearSources = nodesLeft.filter((n) => sourceScore(n) === 0);
        if (clearSources.length > 0) {
          clearSources.forEach(addToStart);
        } else {
          // No clear sinks or soures; pick our best candidate
          // and move it.
          let bestDelta = Number.MIN_VALUE;
          let bestNode = nodesLeft[0]; // Arbitrary tie-breaker
          nodesLeft.forEach((n) => {
            const delta = degreeDeltaLeft(n);
            if (Math.abs(delta) > Math.abs(bestDelta)) {
              bestDelta = delta;
              bestNode = n;
            }
          });
          if (bestDelta > 0) {
            addToStart(bestNode);
          } else {
            addToEnd(bestNode);
          }
        }
      }
    }
    result = startSeq.concat(endSeq);
  }
  return result;
}

/**
 * Merge an array of graphs and perform node ordering. The nodes are merged as a
 * set of unique nodes. The edges are merged as unique source/target sets, with
 * the weight/total recalculated based on provided aggregation function.
 *
 * @param {array} graphs - an array of graph (nodes/edges) objects
 * @param {function} edgeAggregationFn - a function acting an array of numeric weights
 */
function calculateBestMultiGraphsOrder(graphs, edgeAggregationFn = _.max) {
  const rawNodes = _.flatten(graphs.map((g) => g.nodes));
  const rawEdges = _.flatten(graphs.map((g) => g.edges));

  // Merge nodes
  const nodes = _.uniqBy(rawNodes, (d) => d.id);

  // Merge edges, and recompute total
  const groupedEdges = _.groupBy(rawEdges, (d) => {
    return d.source + '///' + d.target;
  });
  const edges = Object.values(groupedEdges).map((v) => {
    const edge = v[0];
    edge.total = edgeAggregationFn(v.map((d) => d.total));
    return edge;
  });

  // Assemble and compute as single graph
  const globalGraph = { nodes, edges };
  return calculateBestGraphOrder(globalGraph);
}

export default {
  calculateBestGraphOrder,
  calculateBestMultiGraphsOrder,
};
