import _ from 'lodash';
import { calcEdgeColor } from '@/utils/scales-util';
import { DEFAULT_COLOR } from '@/utils/colors-util';

/* Convert graph.edges to cytoscape edge construct */
const createEdges = (edges) => {
  const result = [];
  edges.forEach((e) => {
    const property = {
      source: e.source,
      target: e.target,
      belief_score: e.belief_score,
      total: e.total,
      same: e.same,
      opposite: e.opposite,
      unknown: e.unknown,
      contradictions: e.contradictions,
    };
    result.push(_createEdge(property));
  });
  return result;
};

/* Convert graph.nodes to cytoscape node construct */
const createNodes = (nodes, depth = 100, formatter) => {
  const registry = {};
  const result = [];
  const orderedNodes = _.orderBy(nodes, (n) => n.id);
  orderedNodes.forEach((n) => {
    const tokens = n.id.split('/');

    let last = '';
    const maxDepth = Math.min(depth, tokens.length);
    for (let i = maxDepth; i <= tokens.length; i++) {
      const pid = _.take(tokens, i).join('/');
      if ({}.hasOwnProperty.call(registry, pid) === false) {
        const property = {
          id: pid,
        };

        if (i === tokens.length) {
          property.count = n.count;
          property.groundingScore = n.grounding_score;
        }

        if (i === 1) {
          result.push(_createNode(property, null, formatter));
        } else {
          result.push(_createNode(property, last, formatter));
        }
        registry[pid] = 1;
      }
      last = pid;
    }
  });

  return result;
};

const _createNode = (d, parent, formatter) => {
  const label = formatter ? formatter(d.id) : d.id;
  return {
    data: {
      id: d.id,
      label,
      count: d.count || 0,
      parent,
      groundingScore: d.groundingScore,
      style: {
        /* Defines the default node style */
        'background-color': DEFAULT_COLOR,
      },
    },
    group: 'nodes',
    removed: false,
    selected: false,
    selectable: true,
    locked: false,
    grabbed: false,
    grabbable: true,
    classes: null,
  };
};

const _createEdge = (d) => {
  return {
    data: {
      id: d.source + '///' + d.target,
      source: d.source,
      target: d.target,
      belief_score: d.belief_score,
      total: d.total || 0,
      same: d.same || 0,
      opposite: d.opposite || 0,
      unknown: d.unknown || 0,
      style: {
        /* Defines the default edge style */
        edgeColor: calcEdgeColor(d),
        edgeStyle: 'solid',
        opacity: 0.5,
      },
    },
    position: {},
    group: 'edges',
    removed: false,
    selected: false,
    selectable: true,
    locked: false,
    grabbed: false,
    grabbable: true,
    classes: d.classes,
  };
};

export default {
  createEdges,
  createNodes,
};
