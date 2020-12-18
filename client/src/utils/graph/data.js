import _ from 'lodash';
import ConceptUtil from '@/utils/concept-util.js';
import { calcEdgeColor } from '@/utils/scales-util';

export function calcHierarchyDepth(nodes) {
  const lengths = nodes.groundedNodes.map((node) => {
    return node.data.id.split('/').length;
  });
  return Math.max(...lengths) - 1;
}

export function getLabelForNode(node, minimumNodeDepth) {
  const steps = node.id.split('/');
  let label = steps.pop();
  if (steps.length < minimumNodeDepth) {
    label = node.id;
  }
  if (node.count > 0) {
    label += ` (${node.count})`;
  }
  return label;
}

function _createNodeDefinition(node, minimumNodeDepth) {
  const classes = ConceptUtil.isInterventionNode(node.id) ? 'intervention-nodes' : '';
  const steps = node.id.split('/');
  steps.pop();
  let parent = null;
  if (steps.length >= minimumNodeDepth) {
    parent = steps.join('/');
  }
  const label = getLabelForNode(node, minimumNodeDepth);

  return {
    data: {
      id: node.id,
      label: label,
      count: node.count,
      parent,
      groundingScore: node.grounding_score
    },
    group: 'nodes',
    removed: false,
    selected: false,
    selectable: true,
    locked: false,
    grabbed: false,
    grabbable: true,
    classes
  };
}

function _createGroundedNodeDefinitions(nodeData, minimumNodeDepth) {
  const groundedNodes = {};
  nodeData.forEach(node => {
    groundedNodes[node.id] = _createNodeDefinition(node, minimumNodeDepth);
  });
  return groundedNodes;
}

function _getMissingHierarchyIds(nodeData, groundedNodes, minimumNodeDepth) {
  const ids = {};
  nodeData.forEach(node => {
    const steps = node.id.split('/');
    for (let i = minimumNodeDepth; i < steps.length; i++) {
      const id = steps.slice(0, i).join('/');
      if (!groundedNodes[id] && !ids[id]) {
        ids[id] = {
          id,
          count: 0
        };
      }
    }
  });
  return Object.values(ids);
}

export function createNodes(nodeData, minimumNodeDepth) {
  const keyedGroundedNodes = _createGroundedNodeDefinitions(nodeData, minimumNodeDepth);
  const missingKeys = _getMissingHierarchyIds(nodeData, keyedGroundedNodes, minimumNodeDepth);
  const compoundNodes = missingKeys.map(key => _createNodeDefinition(key, minimumNodeDepth));
  const groundedNodes = Object.values(keyedGroundedNodes);

  return {
    groundedNodes,
    compoundNodes: compoundNodes,
    maxCount: _.maxBy(groundedNodes, 'data.count').data.count,
    minCount: _.minBy(groundedNodes, 'data.count').data.count
  };
}

function _createLinkDefinition(d) {
  return {
    data: {
      source: d.source,
      target: d.target,
      count: d.total || d.count,
      unknown: d.unknown,
      same: d.same,
      opposite: d.opposite,
      linkColor: d.linkColor,
      linkStyle: d.linkStyle
    },
    position: {},
    group: 'edges',
    removed: false,
    selected: false,
    selectable: true,
    locked: false,
    grabbed: false,
    grabbable: true,
    classes: d.classes
  };
}

export function createLinks(array, nodes) {
  // default values guarantee a spread for style calculation
  let maxCount = 0;
  let minCount = 0;

  const links = array.reduce((acc, d) => {
    const source = d.source;
    const target = d.target;

    d.linkColor = calcEdgeColor(d);
    d.linkStyle = (d.contradictions);

    // Check if the source and target nodes already exists
    const checkSource = _.find(nodes.groundedNodes, function(o) {
      return o.data.id === source;
    });
    const checkTarget = _.find(nodes.groundedNodes, function(o) {
      return o.data.id === target;
    });
    if (maxCount < d.total) {
      maxCount = d.total;
    } else if (minCount > d.total) {
      minCount = d.total;
    }
    if (!_.isEmpty(checkSource) && !_.isEmpty(checkTarget)) {
      acc.push(_createLinkDefinition(d));
    }
    return acc;
  }, []);

  if (minCount === 0) {
    minCount = 1;
  }
  if (maxCount === 0) {
    maxCount = minCount + 1;
  }

  return {
    links: links,
    minCountLinks: minCount,
    maxCountLinks: maxCount
  };
}

function _edgesToEdgeDefinitions(edges, levels) {
  if (!edges.toArray) {
    return edges;
  }

  return edges.toArray().map((edge) => {
    const source = edge.source().id();
    const target = edge.target().id();
    const newSource = source
      .split('/')
      .slice(0, levels)
      .join('/');
    const newTarget = target
      .split('/')
      .slice(0, levels)
      .join('/');
    return {
      source: newSource,
      target: newTarget,
      count: edge.data().count,
      unknown: edge.data().unknown,
      same: edge.data().same,
      opposite: edge.data().opposite
    };
  });
}

export function groupEdges(edges, levels = 1) {
  const tempEdgesArray = _edgesToEdgeDefinitions(edges, levels);

  const aggregatedEdges = [...tempEdgesArray.reduce((r, o) => {
    const key = o.source + '-' + o.target;
    const item = r.get(key) || Object.assign({}, o, {
      count: 0,
      unknown: 0,
      same: 0,
      opposite: 0
    });

    item.count += o.count;
    item.unknown += o.unknown;
    item.same += o.same;
    item.opposite += o.opposite;
    return r.set(key, item);
  }, new Map()).values()];

  return aggregatedEdges.map(edge => {
    edge.linkColor = calcEdgeColor(edge);
    edge.linkStyle = (edge.contradictions);
    return _createLinkDefinition(edge);
  });
}


/**
 * Custom comparator to check if relevant properties between nodes are the same since changes to count or labels would
 * trigger additional refresh on filter and on select change which we don't want
 * (addresses issue #257)
 *
 * @param {object} a - first node
 * @param {object} b - second node
 *
 */

export const compareNodesById = (a, b) => {
  const firstNode = a.node;
  const secondNode = b.node;
  if (_.isEmpty(firstNode) && _.isEmpty(secondNode)) return true;
  return firstNode.id === secondNode.id;
};
