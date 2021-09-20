import * as d3 from 'd3';
import { SVGRenderer } from 'svg-flowgraph';
import {
  translate
} from '@/utils/svg-util';


export default class BaseCAGRenderer extends SVGRenderer {
  displayGraphStats() {
    const graph = this.layout;
    const svg = d3.select(this.svgEl);
    const foregroundLayer = svg.select('.foreground-layer');
    const edgeCount = graph.edges.length;
    const nodeCount = graph.nodes.length;

    const squareSize = 22;
    let statsGroup = null;
    let clickGroup = null;

    if (d3.select('.graph-stats-info').node()) {
      statsGroup = d3.select('.graph-stats-info');
      const selection = statsGroup.selectAll('.graph-stats-text');
      selection.text(`Nodes: ${nodeCount},\nEdges: ${edgeCount}`);
      clickGroup = statsGroup.selectAll('clickGroup');
    } else {
      statsGroup = foregroundLayer.append('g')
        .attr('transform', translate(5, 10))
        .classed('graph-stats-info', true)
        .style('cursor', 'pointer');

      clickGroup = statsGroup.append('g')
        .classed('clickGroup', true);

      clickGroup
        .append('rect')
        .style('width', squareSize.toString())
        .style('height', squareSize.toString())
        .style('rx', '6')
        .style('fill', 'white')
        .style('fill-opacity', '0')
        .style('stroke', '#545353');

      clickGroup
        .append('text')
        .style('font-family', 'FontAwesome')
        .style('font-size', '16px')
        .style('stroke', 'none')
        .style('fill', '#545353')
        .style('cursor', 'pointer')
        .style('text-anchor', 'middle')
        .style('alignment-baseline', 'middle')
        .attr('x', (squareSize / 2).toString())
        .attr('y', ((squareSize / 2) + 1).toString())
        .text('\uf05a');

      statsGroup
        .append('text')
        .classed('graph-stats-text', true)
        .style('font-size', '14px')
        .style('stroke', 'none')
        .style('fill', '#545353')
        .style('text-anchor', 'left')
        .style('alignment-baseline', 'middle')
        .attr('y', (squareSize + 15).toString())
        .text(`Nodes: ${nodeCount},\nEdges: ${edgeCount}`)
        .style('opacity', 0)
        .attr('pointer-events', 'none');
    }

    clickGroup
      .on('click', function() {
        const selection = statsGroup.selectAll('.graph-stats-text');
        const active = selection.style('opacity');
        const newOpacity = parseInt(active) ? 0 : 1;

        selection
          .transition()
          .duration(300)
          .style('opacity', newOpacity);
      });
  }
}
