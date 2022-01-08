import _ from 'lodash';
import { DeltaRenderer, IEdge, INode } from 'svg-flowgraph2';

const FADED_OPACITY = 0.2;

type NeighborNode = {
  concept: string;
};
type NeighborEdge = {
  source: string;
  target: string;
};


export type D3SelectionINode<T> = d3.Selection<d3.BaseType, INode<T>, null, any>;
export type D3SelectionIEdge<T> = d3.Selection<d3.BaseType, IEdge<T>, null, any>;

export abstract class AbstractCAGRenderer<V, E> extends DeltaRenderer<V, E> {
  neighborhoodAnnotation({ nodes, edges }: { nodes: NeighborNode[]; edges: NeighborEdge[] }) {
    const chart = this.chart;

    // FIXME: not very efficient
    const nonNeighborNodes = chart.selectAll('.node').filter((d: any) => {
      return !nodes.map(node => node.concept).includes(d.label);
    });
    nonNeighborNodes.style('opacity', FADED_OPACITY);

    const nonNeighborEdges = chart.selectAll('.edge').filter((d: any) => !_.some(edges, edge => edge.source === d.data.source && edge.target === d.data.target));
    nonNeighborEdges.style('opacity', FADED_OPACITY);
  }

  resetAnnotations() {
    const chart = this.chart;
    chart.selectAll('.node').style('opacity', 1);
    chart.selectAll('.edge').style('opacity', 1);
    chart.selectAll('.node-header').classed('node-selected', false);
    chart.selectAll('.edge-control').remove();
  }
}
