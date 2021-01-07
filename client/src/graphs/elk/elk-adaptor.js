
import _ from 'lodash';
import ELK from 'elkjs/lib/elk.bundled';
import { createGraph } from '@/graphs/elk/elk-data';
import { traverse } from '@/utils/graphs-util';
import { layered } from '@/graphs/elk/elk-strategies';

export default class ElkAdaptor {
  constructor(options) {
    this.nodeWidth = options.nodeWidth;
    this.nodeHeight = options.nodeHeight;
    this.strategy = options.strategy || layered;
  }

  makeRenderingGraph(graphData) {
    traverse(graphData, (node, parent) => {
      if (!node.nodes) {
        node.width = this.nodeWidth;
        node.height = this.nodeHeight;
      }
      if (parent) node.parent = parent;
      node.data = node;
    }, null);

    graphData.edges.forEach(e => {
      e.data = e;
    });

    return graphData;
  }

  async run(renderGraph) {
    const graph = createGraph(renderGraph, {
      nodeSize: { width: this.nodeWidth, height: this.nodeHeight }
    });

    // 1) Apply layout options
    graph.nodes.forEach(n => {
      n.layoutOptions = this.strategy.nodesLayoutOptions(n);
      if (n.ports) {
        n.ports.forEach(p => {
          p.layoutOptions = this.strategy.portsLayoutOptions(n, p);
        });
      }
    });

    // 1.1) Populate the source and target id fields in the format that svg-flowgraph wants (this primary enables nodeDrag)
    graph.edges.forEach(e => {
      e.source = _.first(e.sources[0].split(':'));
      e.target = _.first(e.targets[0].split(':'));
      e.source = graph.nodes.find(node => node.concept === e.source).id;
      e.target = graph.nodes.find(node => node.concept === e.target).id;
    });

    // 2) Run the layout algorithm, rawLayout is the hierarchical output which we will
    // flatten later to make node access easier.
    const elk = new ELK();
    const rawLayout = await elk.layout({
      id: this.strategy.id,
      layoutOptions: this.strategy.layoutOptions(renderGraph),
      edges: graph.edges,
      children: graph.nodes
    });

    // 3) Compensate for relative, absolute positions. Add cache.
    for (const edge of rawLayout.edges) {
      const { startPoint, bendPoints = [], endPoint } = edge.sections[0];
      edge.points = [startPoint, ...bendPoints, endPoint];

      // perfectly straight edges can be ugly - adding simple points to give the d3 spline function something to work with.
      if (bendPoints.length === 0 && edge.points[0].x < edge.points[1].x && Math.abs(edge.points[0].y - edge.points[1].y) > 10) {
        edge.points.splice(1, 0, ..._.cloneDeep(edge.points));
        edge.points[1].x += 10;
        edge.points[2].x -= 10;
      }

      // Cache initial starting position
      edge.points.forEach(point => {
        point.lastY = point.y;
      });
    }

    // 4) Rearrange the nested data structure to make delta computation easier
    const groups = rawLayout.children.filter(d => d.type === 'container');
    const ungroupedNodes = rawLayout.children.filter(d => d.type === 'node');
    const groupedNodes = _.flatten(groups.map(g => g.children));

    return {
      width: rawLayout.width,
      height: rawLayout.height,
      nodes: [...ungroupedNodes, ...groupedNodes],
      edges: rawLayout.edges,
      groups: groups
    };
  }
}
