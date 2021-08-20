import _ from 'lodash';
import ELK from 'elkjs/lib/elk.bundled';

/**
 * Recursively traverse a graph that looks like
 * {
 *   nodes: [
 *     {
 *       nodes: [
 *         {
 *           nodes: [ ... ],
 *           edges: [ ... ]
 *         }
 *       ],
 *       edges: [ ... ]
 *     },
 *     ...
 *   ],
 *   edges: [...]
 * }
 */
export const traverse = (root, callBackFn, depth = 0) => {
  callBackFn(root, depth);
  if (root.nodes) {
    const d = depth + 1;
    for (let i = 0; i < root.nodes.length; i++) {
      traverse(root.nodes[i], callBackFn, d);
    }
  }
};

/**
 * Returns a flat representation of all nodes and edges.
 */
export const flatten = (root) => {
  let nodes = [];
  let edges = [];

  traverse(root, (node, depth) => {
    if (depth > 0) {
      nodes = nodes.concat(node);
    }
    if (node.edges) {
      edges = edges.concat(node.edges);
    }
  });
  return {
    nodes, edges
  };
};

/**
 * Figure out the number of incoming and outgoing edges per node
 */
export const makeEdgeMaps = (root) => {
  const incoming = {};
  const outgoing = {};

  traverse(root, (node) => {
    if (node.edges) {
      node.edges.forEach(edge => {
        const source = edge.source;
        const target = edge.target;

        if (!{}.hasOwnProperty.call(outgoing, source)) {
          outgoing[source] = 1;
        } else {
          outgoing[source] = outgoing[source] + 1;
        }

        if (!{}.hasOwnProperty.call(incoming, target)) {
          incoming[target] = 1;
        } else {
          incoming[target] = incoming[target] + 1;
        }
      });
    }
  });

  return {
    incoming,
    outgoing
  };
};


/**
 * Convert graph data structure to a basic graph structure that can be used by the renderer
 *
 * @param {object] root - { nodes, edges }
 */
const build = (root) => {
  const _walk = (node, depth, parent) => {
    const nodeSpec = {
      id: node.concept || '',
      concept: node.concept, // FIXME ... should just rely on id
      label: node.label,
      depth: depth,
      type: 'normal',
      parent: parent,
      data: node
    };

    // Build edges
    if (node.edges) {
      nodeSpec.edges = [];
      for (let i = 0; i < node.edges.length; i++) {
        const edge = node.edges[i];
        const source = edge.source;
        const target = edge.target;
        nodeSpec.edges.push({
          id: source + ':' + target,
          source: source,
          target: target,
          data: edge
        });
      }
    }

    // Recurse children nodes
    if (node.nodes && node.nodes.length > 0) {
      nodeSpec.nodes = node.nodes.map(n => _walk(n, depth + 1, nodeSpec));
    }
    return nodeSpec;
  };
  return _walk(root, 0, null);
};


/**
 * Add ELK engine specific data so we can run layout
 *
 * - Clear positions and set default width/height
 * - Add port options to nodes
 * - Add targets/sources to edges
 * - Compute layout options
 *
 * @param {object} renderGraph
 */
const injectELKOptions = (renderGraph, options) => {
  const edgeMaps = makeEdgeMaps(renderGraph);
  const outgoingMap = new Map();
  const incomingMap = new Map();
  const layout = options.layout;

  // Set up nodes end edges
  traverse(renderGraph, (node) => {
    const ports = [];
    const outgoingPorts = edgeMaps.outgoing[node.id] || 0;
    const incomingPorts = edgeMaps.incoming[node.id] || 0;
    for (let i = 0; i < outgoingPorts; i++) {
      ports.push({ id: `${node.id}:source:${i}`, type: 'outgoing' });
    }
    for (let i = 0; i < incomingPorts; i++) {
      ports.push({ id: `${node.id}:target:${i}`, type: 'incoming' });
    }
    node.ports = ports;

    if (!node.nodes || node.nodes.length === 0) {
      node.width = node.width || options.nodeWidth;
      node.height = node.height || options.nodeHeight;
    } else {
      delete node.width;
      delete node.height;
    }

    if (!node.edges || node.edges.length === 0) return;
    node.edges.forEach(edge => {
      const source = edge.source;
      const target = edge.target;
      if (!outgoingMap.has(source)) {
        outgoingMap.set(source, -1);
      }
      if (!incomingMap.has(target)) {
        incomingMap.set(target, -1);
      }
      outgoingMap.set(source, outgoingMap.get(source) + 1);
      incomingMap.set(target, incomingMap.get(target) + 1);

      edge.sources = [`${source}:source:${outgoingMap.get(source)}`];
      edge.targets = [`${target}:target:${incomingMap.get(target)}`];

      delete edge.points;
      delete edge.sections;
    });
  });

  // Apply and inject layout options
  traverse(renderGraph, (node, depth) => {
    if (depth === 0) {
      node.layoutOptions = layout.layoutOptions(renderGraph);
    } else {
      node.layoutOptions = layout.nodesLayoutOptions(node);
      if (node.ports && node.ports.length > 0) {
        node.ports.forEach(p => {
          p.layoutOptions = layout.portsLayoutOptions(node, p);
        });
      }
    }
  });
};

const postProcess = (layout) => {
  const nodeGlobalPosition = new Map();
  const nodeMap = new Map();

  // Move edge points xy to world coordinates
  const convertPointsToGlobalXY = (edge) => {
    const { startPoint, bendPoints = [], endPoint } = edge.sections[0];
    let tx = 0;
    let ty = 0;

    const sourceNode = nodeMap.get(edge.source);
    const targetNode = nodeMap.get(edge.target);

    const edgeContainerId = getEdgeContainerId(sourceNode, targetNode);
    if (edgeContainerId) {
      tx += nodeGlobalPosition.get(edgeContainerId).x;
      ty += nodeGlobalPosition.get(edgeContainerId).y;
    }

    edge.points = [startPoint, ...bendPoints, endPoint].map(p => {
      return {
        x: p.x + tx,
        y: p.y + ty
      };
    });

    // perfectly straight edges can be ugly - adding simple points to give the d3 spline function something to work with.
    // if (bendPoints.length === 0 && edge.points[0].x < edge.points[1].x && Math.abs(edge.points[0].y - edge.points[1].y) > 10) {
    //   edge.points.splice(1, 0, ..._.cloneDeep(edge.points));
    //   edge.points[1].x += 10;
    //   edge.points[2].x -= 10;
    // }
  };

  const splitLineSegments = (edge) => {
    const t = edge.points;
    edge.points = [];
    edge.points.push(_.first(t));
    let p = _.first(t);
    for (let i = 1; i < t.length - 1; i++) {
      edge.points.push({
        x: 0.5 * (p.x + t[i].x),
        y: 0.5 * (p.y + t[i].y)
      });
      edge.points.push(t[i]);
      p = t[i];
    }
    edge.points.push(_.last(t));
  };

  // Precompute nodes global positions
  traverse(layout, (node) => {
    nodeMap.set(node.id, node);
    if (!node.parent) {
      nodeGlobalPosition.set(node.id, {
        x: node.x,
        y: node.y
      });
    } else {
      nodeGlobalPosition.set(node.id, {
        x: node.x + nodeGlobalPosition.get(node.parent.id).x,
        y: node.y + nodeGlobalPosition.get(node.parent.id).y
      });
    }
  });

  // Reassign edges to the top level
  let globalEdges = [];
  traverse(layout, (node) => {
    if (node.edges) {
      for (const edge of node.edges) {
        convertPointsToGlobalXY(edge);
        splitLineSegments(edge);
      }
      globalEdges = globalEdges.concat(node.edges);
      delete node.edges;
    }
  });
  layout.edges = globalEdges;

  return layout;
};

// ELK has a different naming convention
const changeKey = (obj, before, after) => {
  if ({}.hasOwnProperty.call(obj, before)) {
    obj[after] = obj[before];
    delete obj[before];
    obj[after].forEach(child => {
      changeKey(child, before, after);
    });
  }
};


const getEdgeContainerId = (sourceNode, targetNode) => {
  if (sourceNode.parent === null || targetNode.parent === null) {
    return null;
  } else if (sourceNode.parent === targetNode.parent) {
    return sourceNode.parent.id;
  }
  return getEdgeContainerId(sourceNode.parent, targetNode.parent);
};


// Reshuffle edges into the right compound nodes for layout
const reshuffle = (renderGraph) => {
  const nodeMap = new Map();
  traverse(renderGraph, (node) => {
    nodeMap.set(node.id, node);
    if (!node.edges) node.edges = [];
  });

  const edges = renderGraph.edges;
  renderGraph.edges = [];

  for (let i = 0; i < edges.length; i++) {
    const edge = edges[i];

    // FIXME: common parent
    nodeMap.get(renderGraph.id).edges.push(edge);
  }
};

/**
 * Handles and transforms ELK layout engine
 * https://www.eclipse.org/elk/
*/
export default class ELKAdapter {
  constructor(options) {
    this.options = options;
  }

  makeRenderingGraph(graphData) {
    const renderGraph = build(graphData);
    return renderGraph;
  }

  async run(renderGraph) {
    reshuffle(renderGraph);

    const elk = new ELK();
    injectELKOptions(renderGraph, this.options);
    changeKey(renderGraph, 'nodes', 'children');
    const result = await elk.layout(renderGraph);
    changeKey(result, 'children', 'nodes');
    return postProcess(result);
  }
}
