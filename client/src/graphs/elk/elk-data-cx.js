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
    const source = edge.source.id;
    const target = edge.target.id;

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
    const source = edge.source.id;
    const target = edge.target.id;
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
      data: {
        source,
        target
      }
    });
  });
  return result;
};

const DEFAULT_NODE_SIZE = 40;

/**
 * Creates nodes
 * @param {Object} g - graph
 * @param {Object} options - options
 * @param {Object} options.width - node width
 * @param {Object} options.height - node height
 */
const createNodes = (g, options = {}) => {
  const metadata = _metadata(g);
  const {
    width = DEFAULT_NODE_SIZE,
    height = DEFAULT_NODE_SIZE
  } = options;
  const result = [];
  g.nodes.forEach(node => {
    const ports = [];
    const outgoingPorts = metadata.outgoingMap[node.id] || 0;
    const incomingPorts = metadata.incomingMap[node.id] || 0;
    for (let i = 0; i < outgoingPorts; i++) {
      ports.push({ id: `${node.id}:source:${i}`, layoutOptions: { 'elk.port.side': 'EAST' }, type: 'outgoing' });
    }
    for (let i = 0; i < incomingPorts; i++) {
      ports.push({ id: `${node.id}:target:${i}`, layoutOptions: { 'elk.port.side': 'WEST' }, type: 'incoming' });
    }


    result.push({
      id: node.id,
      width,
      height,
      minimized: false,
      data: node,
      layoutOptions: {
        'elk.portConstraints': 'FIXED_SIDE',
        'elk.portAlignment.default': 'DISTRIBUTED'
        // 'elk.margins': '[top=50,left=50,bottom=50,right=50]'
        // 'elk.margins': '[top=25, left=0, bottom=0, right=0]',
      },
      ports: ports
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
export const createGraph = (graph, options = {}) => {
  return {
    nodes: createNodes(graph, { ...options.nodeSize }),
    edges: createEdges(graph)
  };
};

export default {
  createGraph
};
