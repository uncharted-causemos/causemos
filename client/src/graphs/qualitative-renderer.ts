import * as d3 from 'd3';
import { NodeParameter, EdgeParameter } from '@/types/CAG';
import { DeltaRenderer, IEdge, INode } from 'svg-flowgraph2';

import svgUtil from '@/utils/svg-util';
import { calcEdgeColor, scaleByWeight } from '@/utils/scales-util';
import { hasBackingEvidence } from '@/utils/graphs-util';

type D3SelectionINode<T> = d3.Selection<d3.BaseType, INode<T>, null, any>;
type D3SelectionIEdge<T> = d3.Selection<d3.BaseType, IEdge<T>, null, any>;


const DEFAULT_STYLE = {
  edge: {
    fill: 'none',
    strokeWidth: 5,
    controlRadius: 6,
    strokeDash: '3,2'
  },
  edgeBg: {
    fill: 'none',
    stroke: '#F2F2F2'
  },
  nodeHeader: {
    iconRadius: 6,
    fill: '#FFFFFF',
    stroke: '#999',
    strokeWidth: 0.5,
    borderRadius: 4,
    highlighted: {
      stroke: '#60B5E2',
      borderRadius: 4,
      strokeWidth: 2
    }
  },
  nodeHandles: {
    width: 15
  }
};

const pathFn = svgUtil.pathFn.curve(d3.curveBasis);

export class QualitativeRenderer extends DeltaRenderer<NodeParameter, EdgeParameter> {
  constructor(options: any) {
    super(options);
    console.log('qualitative constructor');
  }

  renderNodesAdded(selection: D3SelectionINode<NodeParameter>) {
    console.log(selection);
    selection.append('g').classed('node-handles', true);

    selection.append('rect')
      .classed('node-header', true)
      .attr('x', 0)
      .attr('y', 0)
      .attr('rx', DEFAULT_STYLE.nodeHeader.borderRadius)
      .attr('width', d => d.width || 0)
      .attr('height', d => d.height || 0)
      .style('stroke', DEFAULT_STYLE.nodeHeader.stroke)
      .style('stroke-width', DEFAULT_STYLE.nodeHeader.strokeWidth)
      .style('cursor', 'pointer')
      .style('fill', DEFAULT_STYLE.nodeHeader.fill);

    selection
      .append('text')
      .classed('node-label', true)
      .attr('x', 10)
      .attr('y', 20)
      .style('pointer-events', 'none')
      .text(d => d.label)
      .each(function (d) {
        if (d.width) {
          svgUtil.truncateTextToWidth(this, d.width - 20);
        }
      });
  }

  renderNodesUpdated(selection: D3SelectionINode<NodeParameter>) {
    console.log(selection);
  }

  renderNodesRemoved(selection: D3SelectionINode<NodeParameter>) {
    console.log(selection);
  }

  renderEdgesAdded(selection: D3SelectionIEdge<EdgeParameter>) {
    console.log(selection);
    selection
      .append('path')
      .classed('edge-path-bg', true)
      .style('fill', DEFAULT_STYLE.edgeBg.fill)
      .style('stroke', DEFAULT_STYLE.edgeBg.stroke)
      .style('stroke-width', d => scaleByWeight(DEFAULT_STYLE.edge.strokeWidth, d.data) + 2)
      .attr('d', d => pathFn(d.points as any));

    selection
      .append('path')
      .classed('edge-path', true)
      .style('fill', DEFAULT_STYLE.edge.fill)
      .attr('d', d => pathFn(d.points as any))
      .style('stroke-width', d => scaleByWeight(DEFAULT_STYLE.edge.strokeWidth, d.data))
      .style('stroke-dasharray', d => hasBackingEvidence(d.data) ? null : DEFAULT_STYLE.edge.strokeDash)
      .style('stroke', d => calcEdgeColor(d.data))
      .attr('marker-end', d => {
        const source = d.data.source.replace(/\s/g, '');
        const target = d.data.target.replace(/\s/g, '');
        return `url(#arrowhead-${source}-${target})`;
      })
      .attr('marker-start', d => {
        const source = d.data.source.replace(/\s/g, '');
        const target = d.data.target.replace(/\s/g, '');
        return `url(#start-${source}-${target})`;
      });
  }

  renderEdgesUpdated(selection: D3SelectionIEdge<EdgeParameter>) {
    console.log(selection);
  }

  renderEdgesRemoved(selection: D3SelectionIEdge<EdgeParameter>) {
    console.log(selection);
  }
}
