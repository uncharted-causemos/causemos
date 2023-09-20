const { MAX_ES_BUCKET_SIZE } = require('#@/adapters/es/adapter.js');

const NODE_AGGREGATION_QUERY = {
  aggs: {
    subjects: {
      terms: {
        size: MAX_ES_BUCKET_SIZE,
        field: 'subj.concept.raw',
      },
      aggs: {
        grounding_score: {
          avg: {
            field: 'subj.concept_score',
          },
        },
      },
    },
    objects: {
      terms: {
        size: MAX_ES_BUCKET_SIZE,
        field: 'obj.concept.raw',
      },
      aggs: {
        grounding_score: {
          avg: {
            field: 'obj.concept_score',
          },
        },
      },
    },
  },
};

const EDGE_AGGREGATION_QUERY = {
  aggs: {
    edges: {
      terms: {
        field: 'wm.edge',
        size: MAX_ES_BUCKET_SIZE,
      },
      aggs: {
        same: {
          sum: {
            field: 'wm.statement_polarity',
            script: {
              lang: 'painless',
              source: 'if (_value == 1) { return 1 }  else { return 0 }',
            },
          },
        },
        opposite: {
          sum: {
            field: 'wm.statement_polarity',
            script: {
              lang: 'painless',
              source: 'if (_value == -1) { return 1 }  else { return 0 }',
            },
          },
        },
        unknown: {
          sum: {
            field: 'wm.statement_polarity',
            script: {
              lang: 'painless',
              source: 'if (_value == 0) { return 1 }  else { return 0 }',
            },
          },
        },
        contradictions: {
          sum: {
            field: 'wm.num_contradictions',
          },
        },
        total: {
          sum: {
            field: 'wm.statement_polarity',
            script: {
              lang: 'painless',
              source: 'return 1',
            },
          },
        },
        belief_score: {
          avg: {
            field: 'belief',
          },
        },
      },
    },
  },
};

const _weightedMean = (values, weights) => {
  let dividend = 0;
  let divisor = 0;
  for (let i = 0; i < values.length; i++) {
    dividend += weights[i] * values[i];
    divisor += weights[i];
  }
  return dividend / divisor;
};

/**
 * Format node aggregation for clients consumption
 * @params resultNodes output of ES `getNodeAggregationQuery`
 * @params resultEdges output of ES `getEdgeAggregationQuery`
 * */
const formatNodeAggregation = (resultNodes, resultEdges) => {
  const subjects = resultNodes.body.aggregations.subjects.buckets;
  const objects = resultNodes.body.aggregations.objects.buckets;
  const concepts = [].concat(subjects).concat(objects);
  const edges = resultEdges.body.aggregations.edges.buckets.map((edge) => edge.key);

  // Calculate node degree
  const degreeMap = new Map();
  edges.forEach((edge) => {
    const [source, target] = edge.split('///'); // Encoded as $source///$target for ES aggregation
    if (degreeMap.has(source)) {
      degreeMap.set(source, degreeMap.get(source) + 1);
    } else {
      degreeMap.set(source, 1);
    }

    if (degreeMap.has(target)) {
      degreeMap.set(target, degreeMap.get(target) + 1);
    } else {
      degreeMap.set(target, 1);
    }
  });

  const nodeMap = {};
  for (const concept of concepts) {
    const id = concept.key;
    const groundingScore = concept.grounding_score.value;
    const degree = degreeMap.get(id);
    if (id in nodeMap) {
      nodeMap[id].groundingScore = _weightedMean(
        [nodeMap[id].groundingScore, groundingScore],
        [nodeMap[id].degree, degree]
      );
    } else {
      nodeMap[id] = {
        groundingScore: groundingScore,
        degree: degree,
      };
    }
  }
  const nodes = [];
  for (const [id, concept] of Object.entries(nodeMap)) {
    nodes.push({
      id,
      grounding_score: concept.groundingScore,
      count: concept.degree,
    });
  }
  return nodes;
};

/**
 * Format node aggregation for clients consumption
 * @params result   output of ES `getEdgeAggregationQuery`
 * */
const formatEdgeAggregation = (result) => {
  const edges = result.body.aggregations.edges.buckets.map((edge) => {
    const [source, target] = edge.key.split('///');
    return {
      source,
      target,
      same: edge.same.value,
      opposite: edge.opposite.value,
      unknown: edge.unknown.value,
      total: edge.total.value,
      contradictions: edge.contradictions.value,
      belief_score: edge.belief_score.value,
    };
  });
  return edges;
};

module.exports = {
  NODE_AGGREGATION_QUERY,
  EDGE_AGGREGATION_QUERY,
  formatNodeAggregation,
  formatEdgeAggregation,
};
