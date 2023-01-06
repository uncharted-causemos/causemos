export const layered = {
  id: 'layered',
  layoutOptions: (graph) => {
    // FIXME: These should take the graph size into account
    const layerBound = 6;

    let spacingOptions = null;
    if (graph && graph.nodes && graph.nodes.length > 35) {
      spacingOptions = {
        'elk.layered.layering.strategy': 'COFFMAN_GRAHAM',
        'elk.layered.layering.coffmanGraham.layerBound': layerBound + 2,
        'elk.layered.spacing.nodeNodeBetweenLayers': 15, // space between vertical lanes
        'elk.spacing.nodeNode': 10,
        'elk.spacing.edgeEdge': 5,
        'elk.spacing.edgeNode': 5,
        'elk.layered.spacing.edgeEdgeBetweenLayers': 8,
        'elk.layered.spacing.edgeNodeBetweenLayers': 10,
      };
    } else {
      spacingOptions = {
        'elk.layered.layering.strategy': 'COFFMAN_GRAHAM',
        'elk.layered.layering.coffmanGraham.layerBound': layerBound,
        'elk.layered.spacing.nodeNodeBetweenLayers': 35, // space between vertical lanes
        'elk.spacing.nodeNode': 15,
        'elk.spacing.edgeEdge': 10,
        'elk.spacing.edgeNode': 10,
        'elk.layered.spacing.edgeEdgeBetweenLayers': 15,
        'elk.layered.spacing.edgeNodeBetweenLayers': 10,
      };
    }

    return {
      'elk.algorithm': 'layered',
      'elk.hierarchyHandling': 'INCLUDE_CHILDREN',
      'elk.edgeRouting': 'POLYLINE', // [POLYLINE, ORTHOGONAL, SPLINES]
      'elk.direction': 'RIGHT',
      'elk.randomSeed': 666, // might as well be a coool number
      'elk.padding': '[top=25, left=25, bottom=25, right=25]',
      'elk.validateGraph': true,
      ...spacingOptions,
    };
  },
  nodesLayoutOptions: (/* node */) => {
    return {
      'elk.portConstraints': 'FIXED_SIDE',
      'elk.portAlignment.default': 'DISTRIBUTED',
      'elk.padding': '[top=20, left=20, bottom=20, right=20]', // Hierarchical padding
      'elk.layered.spacing.edgeEdgeBetweenLayers': 5,
      'elk.layered.spacing.edgeNodeBetweenLayers': 1,
    };
  },
  portsLayoutOptions: (node, port) => {
    if (port.type === 'outgoing') {
      return { 'elk.port.side': 'EAST' };
    } else {
      return { 'elk.port.side': 'WEST' };
    }
  },
};
