/* Layout adapater for CAGs */
// import { layered } from './elk/layouts';
import { CAGGraph, NodeParameter, EdgeParameter } from '@/types/CAG';
import { IGraph, INode, IEdge } from 'svg-flowgraph2';
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
  } else {
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
      nodes: []
    });
  }

  for (const edge of modelComponents.edges) {
    edges.push({
      id: edge.id,
      source: edge.source,
      target: edge.target,
      data: edge
    });
  }

  return {
    nodes, edges
  };
};


interface ELKNode {
  id: string;
  label: string;
  children: ELKNode[];
  ports?: any;
  width?: number;
  height?: number;
  layoutOptions?: any;
  edges: {
    id: string;
    source: string;
    target: string;
    sources?: any;
    targets?: any;
    points?: any;
    sections?: any;
  }[];
}


const walkNode = <T>(node: INode<T>, parentNode: ELKNode | null): ELKNode => {
  const elkNode = {
    id: node.id,
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


const traverseELK = (root: ELKNode, callBackFn: any) => {
  callBackFn(root);
  if (root.children && root.children.length > 0) {
    for (let i = 0; i < root.children.length; i++) {
      traverseELK(root.children[i], callBackFn);
    }
  }
};


const reshuffle = (elkGraph: ELKNode): void => {
  const nodeMap = new Map();
  traverseELK(elkGraph, (node: any) => {
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


export const runLayout = async <V, E> (
  graphData: IGraph<V, E>
): Promise<IGraph<V, E>> => {
  // 0. Prepare lookups
  console.log('step 0');
  const edgeMaps = makeEdgeMaps(graphData.edges);

  // 1. Convert from IGraph to ELK nested representation
  console.log('step 1');
  const elkGraph = convert2ELK(graphData);

  // 2. Reshuffle edges into correct ELK hierarhy
  console.log('step 2');
  reshuffle(elkGraph);

  // 3. Apply port config and layout options
  console.log('step 3');
  const outgoingMap = new Map();
  const incomingMap = new Map();
  traverseELK(elkGraph, (node: ELKNode) => {
    // Create port configs
    const ports = [];
    const outgoingPorts = edgeMaps.outgoing.get(node.label) || 0;
    const incomingPorts = edgeMaps.incoming.get(node.label) || 0;
    for (let i = 0; i < outgoingPorts; i++) {
      ports.push({ id: `${node.label}:source:${i}`, type: 'outgoing' });
    }
    for (let i = 0; i < incomingPorts; i++) {
      ports.push({ id: `${node.label}:target:${i}`, type: 'incoming' });
    }

    if (node.children.length === 0) {
      node.width = node.width || 40; // FIXME
      node.height = node.height || 100; // FIXME
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
  });
  elkGraph.layoutOptions = makeGeneralLayout(30);

  // 4. Run layout
  console.log('step 4');
  console.log(JSON.stringify(elkGraph, null, 2));
  const elkEngine = new ELK();
  try {
    const result = await elkEngine.layout(elkGraph);
    console.log(result);
  } catch (err) {
    console.error(err);
  }

  // 5. Post processing and extract positions

  // 6. Apply mappings to IGraph
  console.log(edgeMaps, elkGraph);

  return {
    nodes: [],
    edges: []
  };
};
