// @ts-nocheck
// Typescript is being unreasonable when it comes to using maps, which we utilize heavily in the layout. Basically #map.get is
// guaranteed but to add undefined-checks will add about ~20-25% of uncessary overhead. There is no opitons to ignore blocks
// as of this writing (Dec 2021) and ts-ignore render the code unreadable.

/* Layout adapater for CAGs */
import { CAGGraph, NodeParameter, EdgeParameter } from '@/types/CAG';
import { IGraph, INode, IEdge, traverseGraph } from 'svg-flowgraph';
import ELK from 'elkjs/lib/elk.bundled';

const makeGeneralLayout = (numLeafNodes: number) => {
  const layerBound = 6;
  let spacingOptions = null;
  if (numLeafNodes > 35) {
    spacingOptions = {
      'elk.layered.layering.strategy': 'COFFMAN_GRAHAM',
      'elk.layered.layering.coffmanGraham.layerBound': layerBound + 2,
      'elk.layered.spacing.nodeNodeBetweenLayers': 15, // space between vertical lanes
      'elk.spacing.nodeNode': 10,
      'elk.spacing.edgeEdge': 5,
      'elk.spacing.edgeNode': 5,
      'elk.layered.spacing.edgeEdgeBetweenLayers': 8,
      'elk.layered.spacing.edgeNodeBetweenLayers': 10
    };
  } else if (numLeafNodes > 15) {
    spacingOptions = {
      'elk.layered.layering.strategy': 'COFFMAN_GRAHAM',
      'elk.layered.layering.coffmanGraham.layerBound': layerBound,
      'elk.layered.spacing.nodeNodeBetweenLayers': 35, // space between vertical lanes
      'elk.spacing.nodeNode': 15,
      'elk.spacing.edgeEdge': 10,
      'elk.spacing.edgeNode': 10,
      'elk.layered.spacing.edgeEdgeBetweenLayers': 15,
      'elk.layered.spacing.edgeNodeBetweenLayers': 10
    };
  } else {
    spacingOptions = {
      'elk.layered.layering.strategy': 'COFFMAN_GRAHAM',
      'elk.layered.layering.coffmanGraham.layerBound': layerBound,
      'elk.layered.spacing.nodeNodeBetweenLayers': 65, // space between vertical lanes
      'elk.spacing.nodeNode': 15,
      'elk.spacing.edgeEdge': 10,
      'elk.spacing.edgeNode': 10,
      'elk.layered.spacing.edgeEdgeBetweenLayers': 15,
      'elk.layered.spacing.edgeNodeBetweenLayers': 10
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
    ...spacingOptions
  };
};

const makeNodeLayout = () => {
  return {
    'elk.portConstraints': 'FIXED_SIDE',
    'elk.portAlignment.default': 'DISTRIBUTED',
    'elk.padding': '[top=20, left=20, bottom=20, right=20]', // Hierarchical padding
    'elk.layered.spacing.edgeEdgeBetweenLayers': 5,
    'elk.layered.spacing.edgeNodeBetweenLayers': 1
  };
};

const makePortLayout = (port: any) => {
  if (port.type === 'outgoing') {
    return { 'elk.port.side': 'EAST' };
  } else {
    return { 'elk.port.side': 'WEST' };
  }
};



const makeEdgeMaps = (edges: any) => {
  const incoming: Map<string, number> = new Map();
  const outgoing: Map<string, number> = new Map();

  for (const edge of edges) {
    const source = edge.source;
    const target = edge.target;

    if (!outgoing.has(source)) {
      outgoing.set(source, 1);
    } else {
      const num = outgoing.get(source) || 0;
      outgoing.set(source, num + 1);
    }

    if (!incoming.has(target)) {
      incoming.set(target, 1);
    } else {
      const num = incoming.get(target) || 0;
      incoming.set(target, num + 1);
    }
  }

  return {
    incoming,
    outgoing
  };
};



/* Coherce CAG to a hierarchical format for rendering */
export const buildInitialGraph = (modelComponents: CAGGraph): IGraph<NodeParameter, EdgeParameter> => {
  const nodes: INode<NodeParameter>[] = [];
  const edges: IEdge<EdgeParameter>[] = [];

  for (const node of modelComponents.nodes) {
    nodes.push({
      id: node.id,
      label: node.concept,
      data: node,
      nodes: [],
      x: 0,
      y: 0,
      width: 0,
      height: 0
    });
  }

  for (const edge of modelComponents.edges) {
    edges.push({
      id: edge.id,
      source: edge.source,
      target: edge.target,
      points: [],
      data: edge
    });
  }

  return {
    nodes, edges
  };
};


interface ELKEdge {
  id: string;
  source: string;
  target: string;
  sources?: any;
  targets?: any;
  points?: any;
  sections?: any;
}

interface ELKNode {
  id: string;
  label: string;
  children: ELKNode[];
  ports?: any;
  x?: number;
  y?: number;
  width?: number;
  height?: number;
  layoutOptions?: any;
  edges: ELKEdge[];
}

const walkNode = <T>(node: INode<T>, parentNode: ELKNode | null): ELKNode => {
  const elkNode = {
    id: node.label, // Note we use label in place of id, makes working wigh edges a little easier
    label: node.label,
    children: [],
    edges: []
  };
  if (parentNode) {
    parentNode.children.push(elkNode);
  }
  for (let i = 0; i < node.nodes.length; i++) {
    walkNode(node.nodes[i], elkNode);
  }
  return elkNode;
};

export const convert2ELK = <V, E> (graph: IGraph<V, E>): ELKNode => {
  const elkNodes = [];
  const elkEdges = [];

  for (let i = 0; i < graph.nodes.length; i++) {
    elkNodes.push(walkNode(graph.nodes[i], null));
  }
  for (const edge of graph.edges) {
    elkEdges.push({
      id: edge.id,
      source: edge.source,
      target: edge.target
    });
  }

  return {
    id: 'root',
    label: 'root',
    children: elkNodes,
    edges: elkEdges
  };
};


const traverseELK = (root: ELKNode, callBackFn: (node: ELKNode) => void) => {
  callBackFn(root);
  if (root.children && root.children.length > 0) {
    for (let i = 0; i < root.children.length; i++) {
      traverseELK(root.children[i], callBackFn);
    }
  }
};


const reshuffle = (elkGraph: ELKNode): void => {
  const nodeMap = new Map();
  traverseELK(elkGraph, (node) => {
    nodeMap.set(node.id, node);
    if (!node.edges) node.edges = [];
  });

  const edges = elkGraph.edges;
  elkGraph.edges = [];

  for (let i = 0; i < edges.length; i++) {
    const edge = edges[i];

    // FIXME: common parent
    nodeMap.get(elkGraph.id).edges.push(edge);
  }
};


const extractEdgePoints = (
  edge: ELKEdge,
  nodeMap: Map<string, ELKNode>,
  parentMap: Map<string, ELKNode>,
  nodeGlobalPosition: Map<string, { x: number; y: number }>
): { x: number; y: number }[] => {
  const { startPoint, bendPoints = [], endPoint } = edge.sections[0];
  let tx = 0;
  let ty = 0;

  const sourceNode = nodeMap.get(edge.source);
  const targetNode = nodeMap.get(edge.target);

  let sourceInTarget = false;
  let targetInSource = false;
  let p = sourceNode;
  while (true && p) {
    p = parentMap.get(p.id);
    if (!p) break;
    if (p.id === targetNode?.id) {
      sourceInTarget = true;
    }
  }
  p = targetNode;
  while (true && p) {
    p = parentMap.get(p.id);
    if (!p) break;
    if (p.id === sourceNode?.id) {
      targetInSource = true;
    }
  }

  if (sourceNode.id === targetNode.id) {
    const p = parentMap.get(sourceNode.id);
    tx += nodeGlobalPosition.get(p.id).x;
    ty += nodeGlobalPosition.get(p.id).y;
  } else {
    if (targetInSource) {
      tx += nodeGlobalPosition.get(sourceNode.id).x;
      ty += nodeGlobalPosition.get(sourceNode.id).y;
    } else if (sourceInTarget) {
      tx += nodeGlobalPosition.get(targetNode.id).x;
      ty += nodeGlobalPosition.get(targetNode.id).y;
    } else {
      const sourceParent = parentMap.get(sourceNode.id);
      const targetParent = parentMap.get(targetNode.id);
      if (sourceParent.id === targetParent.id) {
        tx += nodeGlobalPosition.get(sourceParent.id).x;
        ty += nodeGlobalPosition.get(sourceParent.id).y;
      }
    }
  }

  const points = [startPoint, ...bendPoints, endPoint].map(p => {
    return {
      x: p.x + tx,
      y: p.y + ty
    };
  });
  return points;
};

const splitLineSegments = (points: { x: number; y: number }[]) => {
  const result = [];
  result.push(_.first(points));
  let p = _.first(points);
  for (let i = 1; i < points.length - 1; i++) {
    result.push({
      x: 0.5 * (p.x + points[i].x),
      y: 0.5 * (p.y + points[i].y)
    });
    result.push(points[i]);
    p = points[i];
  }
  result.push(_.last(points));
  return result;
};



/**
 * Given an ELK layout, extract the node and edge positions
 */
const extractELKPositions = (root: ELKNode) => {
  // const nodeGlobalPosition = new Map();
  const parentMap: Map<string, ELKNode> = new Map();
  const nodeMap: Map<string, ELKNode> = new Map();

  const nodeGlobalPosition: Map<string, { x: number; y: number; width: number; height: number }> = new Map();
  const edgeGlobalPOsition: Map<string, { x: number; y: number }[]> = new Map();

  // 1. Prepare lookups - need parent map first
  traverseELK(root, (node) => {
    if (node.children && node.children.length > 0) {
      node.children.forEach(child => {
        parentMap.set(child.id, node);
      });
    }
  });

  // 2. Prepare lookups - now need to calculate global node positions as oopose to relative
  traverseELK(root, (node) => {
    nodeMap.set(node.id, node);
    if (!parentMap.has(node.id)) {
      nodeGlobalPosition.set(node.id, {
        x: node.x,
        y: node.y,
        width: node.width,
        height: node.height
      });
    } else {
      const parentNode = parentMap.get(node.id);
      const pos = nodeGlobalPosition.get(parentNode.id);
      // console.log('node', node.label, node.x, node.y);
      // FIXME: check if need to add parent coord
      if (pos) {
        nodeGlobalPosition.set(node.id, {
          x: node.x,
          y: node.y,
          width: node.width,
          height: node.height
        });
      }
    }
  });

  // 3. Reposition edges
  traverseELK(root, (node) => {
    if (node.edges && node.edges.length > 0) {
      for (const edge of node.edges) {
        const edgePathPoints = splitLineSegments(extractEdgePoints(
          edge,
          nodeMap,
          parentMap,
          nodeGlobalPosition
        ));
        edgeGlobalPOsition.set(edge.id, edgePathPoints);
      }
    }
  });

  // Return positions
  return {
    nodeGlobalPosition,
    edgeGlobalPOsition
  };
};


/**
 * The functions works by creating a graph structure in ELK's format, run the layout and extract the
 * positional/dimension coordinates, which are then merged into the IGraph data structure
 */
export const runELKLayout = async <V, E> (
  graphData: IGraph<V, E>,
  nodeSize: { width: number; height: number}
): Promise<IGraph<V, E>> => {
  const R_PADDING = 10; // Edge spacer

  // 0. Prepare lookups
  const edgeMaps = makeEdgeMaps(graphData.edges);

  // 1. Convert from IGraph to ELK nested representation
  const elkGraph = convert2ELK(graphData);

  // 2. Reshuffle edges into correct ELK hierarhy
  reshuffle(elkGraph);

  // 3. Apply port config and layout options
  const outgoingMap = new Map();
  const incomingMap = new Map();
  traverseELK(elkGraph, (node: ELKNode) => {
    // Create port configs
    const ports = [];
    const outgoingPorts = edgeMaps.outgoing.get(node.id);
    const incomingPorts = edgeMaps.incoming.get(node.id);
    for (let i = 0; i < outgoingPorts; i++) {
      ports.push({ id: `${node.id}:source:${i}`, type: 'outgoing' });
    }
    for (let i = 0; i < incomingPorts; i++) {
      ports.push({ id: `${node.id}:target:${i}`, type: 'incoming' });
    }

    if (node.children.length === 0) {
      node.width = node.width || nodeSize.width;
      node.height = node.height || nodeSize.height;
      node.width += R_PADDING;
    } else {
      delete node.width;
      delete node.height;
    }
    node.ports = ports;

    // Align edges to the ports
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

    // Assign layout options
    node.layoutOptions = makeNodeLayout();
    node.ports.forEach(p => {
      p.layoutOptions = makePortLayout(p);
    });
  });

  // FIXME: should consider hierarchy
  elkGraph.layoutOptions = makeGeneralLayout(graphData.nodes.length);

  // 4. Run layout
  const elkEngine = new ELK();
  let elkLayoutResult = null;
  try {
    elkLayoutResult = await elkEngine.layout(elkGraph);
  } catch (err) {
    console.error(err);
  }

  // 5. Post processing and extract positions
  const positionMaps = extractELKPositions(elkLayoutResult);

  // 6. Apply mappings to IGraph
  traverseGraph(graphData, (node) => {
    const np = positionMaps.nodeGlobalPosition.get(node.label);
    node.x = np.x;
    node.y = np.y;
    node.width = np.width - R_PADDING;
    node.height = np.height;
  });
  for (const edge of graphData.edges) {
    const ep = positionMaps.edgeGlobalPOsition.get(edge.id);
    const first = ep[0];
    ep.unshift({
      x: first.x - R_PADDING,
      y: first.y
    });
    edge.points = ep;
  }
  graphData.width = elkLayoutResult.width;
  graphData.height = elkLayoutResult.height;
  return graphData;
};
