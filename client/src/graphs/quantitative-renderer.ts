import { DeltaRenderer, INode, IEdge } from 'svg-flowgraph2';
import { NodeParameter, EdgeParameter } from '@/types/CAG';
import { SELECTED_COLOR } from '@/utils/colors-util';
import { translate, truncateTextToWidth } from '@/utils/svg-util';

export type D3SelectionINode<T> = d3.Selection<d3.BaseType, INode<T>, null, any>;
export type D3SelectionIEdge<T> = d3.Selection<d3.BaseType, IEdge<T>, null, any>;

const DEFAULT_STYLE = {
  node: {
    fill: '#FFFFFF',
    stroke: '#999',
    strokeWidth: 0.5,
    borderRadius: 4,
    cursor: 'pointer',
    highlighted: {
      stroke: SELECTED_COLOR,
      borderRadius: 2,
      strokeWidth: 2
    }
  },
  edge: {
    fill: 'none',
    stroke: '#000',
    strokeWidth: 5,
    controlRadius: 6,
    strokeDash: '3,2'
  },
  edgeBg: {
    fill: 'none',
    stroke: '#F2F2F2'
  },
  nodeHeader: {
    fill: 'none',
    stroke: '#999',
    strokeWidth: 0,
    borderRadius: 3
  }
};

const GRAPH_HEIGHT = 55;
const PADDING_HORIZONTAL = 5;

export class QuantitativeRenderer extends DeltaRenderer<NodeParameter, EdgeParameter> {
  constructor(options: any) {
    super(options);
    console.log('Quantitative Renderer');
  }

  renderNodesAdded(selection: D3SelectionINode<NodeParameter>) {
    console.log(selection);
    selection.append('rect')
      .classed('node-container', true)
      .attr('x', 0)
      .attr('y', 0)
      .attr('rx', DEFAULT_STYLE.node.borderRadius)
      .attr('width', d => d.width)
      .attr('height', d => d.height)
      .style('fill', DEFAULT_STYLE.node.fill)
      .style('stroke', DEFAULT_STYLE.node.stroke)
      .style('stroke-width', DEFAULT_STYLE.node.strokeWidth);


    const groupHeader = selection.append('g')
      .classed('node-header-group', true);

    const halfStrokeWidth = DEFAULT_STYLE.node.strokeWidth / 2;

    // Node header
    groupHeader
      .append('rect')
      .classed('node-header', true)
      .attr('x', halfStrokeWidth)
      .attr('y', halfStrokeWidth)
      .attr('rx', DEFAULT_STYLE.nodeHeader.borderRadius)
      .attr('width', d => d.width - DEFAULT_STYLE.node.strokeWidth)
      .attr('height', GRAPH_HEIGHT * 0.5)
      .style('fill', DEFAULT_STYLE.nodeHeader.fill)
      .style('stroke', DEFAULT_STYLE.nodeHeader.stroke)
      .style('stroke-width', DEFAULT_STYLE.nodeHeader.strokeWidth);

    selection.append('text')
      .classed('node-label', true)
      .attr('transform', translate(PADDING_HORIZONTAL, GRAPH_HEIGHT * 0.5 - 14))
      .style('stroke', 'none')
      .style('fill', '#000')
      .text(d => d.label)
      .each(function (d) { truncateTextToWidth(this, d.width - 2 * PADDING_HORIZONTAL); });

    selection.append('g')
      .classed('node-body-group', true)
      .append('rect')
      .classed('node-body', true)
      .attr('x', 0)
      .attr('y', GRAPH_HEIGHT * 0.5)
      .attr('width', d => d.width)
      .attr('height', GRAPH_HEIGHT)
      .style('fill', 'transparent');
  }

  renderNodesUpdated(selection: D3SelectionINode<NodeParameter>) {
    console.log(selection);
  }

  renderNodesRemoved(selection: D3SelectionINode<NodeParameter>) {
    console.log(selection);
  }

  renderEdgesAdded(selection: D3SelectionIEdge<EdgeParameter>) {
    console.log(selection);
  }

  renderEdgesUpdated(selection: D3SelectionIEdge<EdgeParameter>) {
    console.log(selection);
  }

  renderEdgesRemoved(selection: D3SelectionIEdge<EdgeParameter>) {
    console.log(selection);
  }
}
