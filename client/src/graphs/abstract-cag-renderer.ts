import * as d3 from 'd3';
import _ from 'lodash';
import svgUtil from '@/utils/svg-util';
import { DeltaRenderer, IEdge, INode, moveTo, highlight, unHighlight } from 'svg-flowgraph';
import { DEFAULT_STYLE } from './cag-style';

const FADED_OPACITY = 0.2;
const AMBIGUOUS_MSG = 'To make CAG projections easier to interpret, <br /> select each grey edge and clarify its polarity in the side panel.';

type NeighborNode = {
  concept: string;
};
type NeighborEdge = {
  source: string;
  target: string;
};

export type D3SelectionINode<V> = d3.Selection<d3.BaseType, INode<V>, null, any>;
export type D3SelectionIEdge<E> = d3.Selection<d3.BaseType, IEdge<E>, null, any>;

const createStatsGroup = (foregroundLayer: any) => {
  let statsGroup = d3.select('.graph-stats-info');
  if (statsGroup.size() === 0) {
    statsGroup = foregroundLayer.append('g')
      .attr('transform', svgUtil.translate(5, 10))
      .classed('graph-stats-info', true);

    statsGroup.append('text')
      .classed('graph-stats-ambiguouity', true)
      .attr('fill', '#D80')
      .attr('x', 15)
      .attr('y', 15)
      .text('');
  }
  return statsGroup;
};


export abstract class AbstractCAGRenderer<V, E> extends DeltaRenderer<V, E> {
  labelFormatter: (label: string) => string = (s) => s;

  setLabelFormatter(fn: (label: string) => string) {
    this.labelFormatter = fn;
  }

  displayGraphStats() {
    const graph = this.graph;
    const svg = d3.select(this.svgEl);
    const foregroundLayer = svg.select('.foreground-layer');

    const statsGroup = createStatsGroup(foregroundLayer);

    let hasAmbiguousEdges = false;
    for (const edge of graph.edges) {
      const polarity = (edge as any).data.polarity; // FIXME
      if (polarity !== 1 && polarity !== -1) {
        hasAmbiguousEdges = true;
        break;
      }
    }

    // Update ambiguouity status
    if (hasAmbiguousEdges) {
      statsGroup.select('.graph-stats-ambiguouity').text('Ambiguous edges detected')
        .on('mouseover', (evt) => {
          const point = d3.pointer(evt);

          // Force tooltip to go near the end of the text
          const x = +statsGroup.select('.graph-stats-ambiguouity').attr('x') + 150;
          svgUtil.showSvgTooltip(foregroundLayer, AMBIGUOUS_MSG, [x, point[1]], Math.PI / 2);
        })
        .on('mouseout', () => svgUtil.hideSvgTooltip(foregroundLayer));
    } else {
      statsGroup.select('.graph-stats-ambiguouity').text('').on('mouseover', null).on('mouseout', null);
    }
  }


  // Override render function to also check for ambigous edges and highlight them
  async render() {
    await super.render();
    this.displayGraphStats();
  }

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
    // chart.selectAll('.edge-control-temp').remove();

    chart.selectAll('.node-container, .node-container-outer') // Clean up previous highlights
      .style('border-radius', DEFAULT_STYLE.node.borderRadius)
      .style('stroke', DEFAULT_STYLE.node.stroke)
      .style('stroke-width', DEFAULT_STYLE.node.strokeWidth);
  }

  selectNode(node: D3SelectionINode<V>, color: string) {
    node.selectAll('.node-container, .node-container-outer')
      .style('border-radius', DEFAULT_STYLE.node.highlighted.borderRadius)
      .style('stroke', _.isEmpty(color) ? DEFAULT_STYLE.node.highlighted.stroke : color)
      .style('stroke-width', DEFAULT_STYLE.node.highlighted.strokeWidth);
  }

  selectEdge(/* evt: Event, edge: D3SelectionIEdge<E> */) {
    /*
    const mousePoint = d3.pointer(evt, edge.node());
    const pathNode = edge.select('.edge-path').node();
    const controlPoint = (svgUtil.closestPointOnPath(pathNode as any, mousePoint) as number[]);

    edge.append('g')
      .classed('edge-control-temp', true)
      .attr('transform', svgUtil.translate(controlPoint[0], controlPoint[1]));

    this.renderEdgeControls(edge);
   */
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
