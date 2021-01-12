export const layered = {
  id: 'layered',
  layoutOptions: () => {
    return {
      'elk.algorithm': 'layered',
      'elk.edgeRouting': 'POLYLINE', // [POLYLINE, ORTHOGONAL, SPLINES]
      'elk.direction': 'RIGHT',
      // 'elk.layered.layering.strategy': 'COFFMAN_GRAHAM',
      'elk.hierarchyHandling': 'INCLUDE_CHILDREN',
      'elk.padding': '[top=25, left=25, bottom=25, right=25]',
      'elk.validateGraph': true,
      'elk.layered.spacing.edgeEdgeBetweenLayers': 5,
      'elk.layered.spacing.edgeNodeBetweenLayers': 1
    };
  },
  nodesLayoutOptions: () => {
    return {
      'elk.portConstraints': 'FIXED_SIDE',
      'elk.portAlignment.default': 'DISTRIBUTED',
      'elk.padding': '[top=20, left=20, bottom=20, right=20]', // Hierarchical padding
      'elk.layered.spacing.edgeEdgeBetweenLayers': 5,
      'elk.layered.spacing.edgeNodeBetweenLayers': 1
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

