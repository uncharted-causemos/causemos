import * as d3 from 'd3';
import _ from 'lodash';
import svgUtil from '@/utils/svg-util';
import { DeltaRenderer, IEdge, INode, moveTo, highlight, unHighlight } from 'svg-flowgraph2';
import { DEFAULT_STYLE } from './cag-style';

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

    chart.selectAll('.node-container') // Clean up previous highlights
      .style('border-radius', DEFAULT_STYLE.node.borderRadius)
      .style('stroke', DEFAULT_STYLE.node.stroke)
      .style('stroke-width', DEFAULT_STYLE.node.strokeWidth);
  }

  selectNode(node: D3SelectionINode<V>, color: string) {
    node.select('.node-container')
      .style('border-radius', DEFAULT_STYLE.node.highlighted.borderRadius)
      .style('stroke', _.isEmpty(color) ? DEFAULT_STYLE.node.highlighted.stroke : color)
      .style('stroke-width', DEFAULT_STYLE.node.highlighted.strokeWidth);
  }

  selectEdge(evt: Event, edge: D3SelectionIEdge<E>) {
    const mousePoint = d3.pointer(evt, edge.node());
    const pathNode = edge.select('.edge-path').node();
    const controlPoint = (svgUtil.closestPointOnPath(pathNode as any, mousePoint) as number[]);

    edge.append('g')
      .classed('edge-control', true)
      .attr('transform', svgUtil.translate(controlPoint[0], controlPoint[1]));

    this.renderEdgeControls(edge);
  }

  selectNodeByConcept(concept: string, color: string) {
    const node = this.chart.selectAll('.node').filter((node: any) => node.label === concept);
    if (node) {
      this.selectNode(node as any, color);
    }
  }
}

export {
  moveTo,
  highlight,
  unHighlight
};
