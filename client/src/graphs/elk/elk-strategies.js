/**
 * Reference to elk layout algorithms and options:
 * https://www.eclipse.org/elk/reference.html
 */

/**
 * Example config
 */
// layoutOptions: {
//   'elk.algorithm': 'layered',
//   'org.eclipse.elk.edgeRouting': 'ORTHOGONAL',
//   // 'org.eclipse.elk.edgeRouting': 'POLYLINE',
//   // 'org.eclipse.elk.edgeRouting': 'SPLINES',
//   'org.eclipse.elk.direction': 'RIGHT',
//   'org.eclipse.elk.layered.layering.strategy': 'COFFMAN_GRAHAM',
//   'org.eclipse.elk.layered.layering.coffmanGraham.layerBound': 5,
//
//
//   // 'org.eclipse.elk.margins': '[top=250, left=25, bottom=25, right=25]',
//   // 'elk.spacing.portsSurrounding': '[top=20, left=25, bottom=0, right=25]',
//
//   'org.eclipse.elk.spacing.edgeEdge': 10,
//   'org.eclipse.elk.spacing.edgeNode': 25, // space between horizontal layer nodes
//   'org.eclipse.elk.layered.spacing.edgeEdgeBetweenLayers': 25, // space between vertical layer nodes
//   'org.eclipse.elk.layered.spacing.edgeNodeBetweenLayers': 20
// }

export const force = {
  id: 'force',
  layoutOptions: (/* nodes , edges */) => {
    const algorithmOptions = {
      'elk.algorithm': 'force'
    };
    return Object.assign({}, algorithmOptions);
  },
  nodesLayoutOptions: (/* node */) => {
    return {
      'elk.portConstraints': 'FREE',
      'elk.portAlignment.default': 'DISTRIBUTED'
    };
  },
  portsLayoutOptions: (/* node, port */) => {
    return {};
  }
};

export const layered = {
  id: 'layered',
  layoutOptions: ({ nodes /*, / *edges */ }) => {
    const layerBound = Math.max(5, Math.ceil(Math.sqrt(nodes.length)));
    const algorithmOptions = {
      'elk.algorithm': 'layered',
      'elk.edgeRouting': 'POLYLINE', // [POLYLINE, ORTHOGONAL, SPLINES]
      'elk.direction': 'RIGHT',
      'elk.randomSeed': 666, // might as well be a coool number
      'elk.layered.layering.strategy': 'COFFMAN_GRAHAM',
      'elk.layered.layering.coffmanGraham.layerBound': layerBound,
      // 'elk.separateConnectedComponents': false,
      'elk.hierarchyHandling': 'INCLUDE_CHILDREN'
    };
    // Reduce space to make larger graphs a tighter fit
    let spacingOptions = {};
    if (nodes.length > 20) {
      spacingOptions = {
        'elk.layered.spacing.nodeNodeBetweenLayers': 10,
        'elk.spacing.nodeNode': 15,
        'elk.spacing.edgeEdge': 10,
        'elk.spacing.edgeNode': 10,
        'elk.layered.spacing.edgeEdgeBetweenLayers': 5,
        'elk.layered.spacing.edgeNodeBetweenLayers': 10
      };
    } else {
      spacingOptions = {
        'elk.layered.spacing.nodeNodeBetweenLayers': 30,
        'elk.spacing.nodeNode': 20,
        'elk.spacing.edgeEdge': 10,
        'elk.spacing.edgeNode': 25, // space between horizontal layer nodes
        'elk.layered.spacing.edgeEdgeBetweenLayers': 25, // space between vertical layer nodes
        'elk.layered.spacing.edgeNodeBetweenLayers': 20
      };
    }
    return Object.assign({}, algorithmOptions, spacingOptions);
  },
  nodesLayoutOptions: (/* node */) => {
    return {
      'elk.portConstraints': 'FIXED_SIDE',
      'elk.portAlignment.default': 'DISTRIBUTED'
    };
  },
  portsLayoutOptions: (node, port) => {
    if (port.type === 'outgoing') {
      return { 'elk.port.side': 'EAST' };
    } else {
      return { 'elk.port.side': 'WEST' };
    }
  }
};
