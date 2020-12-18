/**
 * For more details on elk data structure/format and api refer to:
 * https://github.com/OpenKieler/elkjs
 * https://www.eclipse.org/elk/documentation/tooldevelopers/graphdatastructure/jsonformat.html
 */
/**
 * Generate graph meta data
 * - Generate node incoming/outgoing map
 *
 * @param {object} graph - graph
 */
const _metadata = (graph) => {
  const incomingMap = {};
  const outgoingMap = {};
  graph.edges.forEach(edge => {
    const source = edge.source;
    const target = edge.target;

    if (!{}.hasOwnProperty.call(outgoingMap, source)) {
      outgoingMap[source] = 1;
    } else {
      outgoingMap[source] = outgoingMap[source] + 1;
    }

    if (!{}.hasOwnProperty.call(incomingMap, target)) {
      incomingMap[target] = 1;
    } else {
      incomingMap[target] = incomingMap[target] + 1;
    }
  });

  return {
    incomingMap,
    outgoingMap
  };
};

/**
 * Create edges
 * @param {Object} g - graph
 */
const createEdges = (g) => {
  const result = [];

  const outgoingMap = {};
  const incomingMap = {};

  g.edges.forEach(edge => {
    const source = edge.source;
    const target = edge.target;
    if (!{}.hasOwnProperty.call(outgoingMap, source)) {
      outgoingMap[source] = -1;
    }
    if (!{}.hasOwnProperty.call(incomingMap, target)) {
      incomingMap[target] = -1;
    }

    outgoingMap[source] = outgoingMap[source] + 1;
    incomingMap[target] = incomingMap[target] + 1;

    result.push({
      id: source + ':' + target,
      sources: [`${source}:source:${outgoingMap[source]}`],
      targets: [`${target}:target:${incomingMap[target]}`],
      /*
      sources: [edge.source],
      targets: [edge.target],
      */
      data: edge
    });
  });
  return result;
};

/**
 * Creates nodes
 * @param {Object} g - graph
 * @param {Object} options - options
 * @param {Number} options.width - node width
 * @param {Number} options.height - node height
 * @param {Array} groups
 */
const createNodes = (g, options) => {
  const metadata = _metadata(g);
  const width = options.nodeSize.width;
  const height = options.nodeSize.height;
  const result = [];

  const compoundNodes = {};
  if (options.groups) {
    options.groups.forEach(g => {
      compoundNodes[g.id] = [];
    });
  }

  g.nodes.forEach(node => {
    const ports = [];
    const outgoingPorts = metadata.outgoingMap[node.concept] || 0;
    const incomingPorts = metadata.incomingMap[node.concept] || 0;
    for (let i = 0; i < outgoingPorts; i++) {
      ports.push({ id: `${node.concept}:source:${i}`, type: 'outgoing' });
    }
    for (let i = 0; i < incomingPorts; i++) {
      ports.push({ id: `${node.concept}:target:${i}`, type: 'incoming' });
    }

    const nodeSpec = {
      id: node.id,
      concept: node.concept,
      label: node.label,
      type: 'node',
      width,
      height,
      minimized: false,
      data: node,
      ports: ports,
      group: null
    };

    if (options.groups) {
      let added = false;
      options.groups.forEach(g => {
        if (g.members.includes(node.concept)) {
          nodeSpec.group = g.id;
          compoundNodes[g.id].push(nodeSpec);
          added = true;
        }
      });
      if (added === true) return;
    }

    // Default
    result.push(nodeSpec);
  });

  // Add compound nodes
  Object.keys(compoundNodes).forEach(key => {
    result.push({
      id: key,
      type: 'container',
      children: compoundNodes[key]
    });
  });

  return result;
};



/**
 * Create the basic nodes/edges data structure from a graph model
 * @param {Object} graph - graph
 * @param {Object} options - options
 * @param {Object} options.nodeSize - node size
 * @param {number} options.nodeSize.width  - node width
 * @param {number} options.nodeSize.height - node height
 */
export const createGraph = (graph, options) => {
  return {
    nodes: createNodes(graph, options),
    edges: createEdges(graph)
  };
};

export default {
  createGraph
};
