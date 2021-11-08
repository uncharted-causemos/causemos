import * as d3 from 'd3';
import { SVGRenderer } from 'svg-flowgraph';
import {
  translate,
  showSvgTooltip,
  hideSvgTooltip
} from '@/utils/svg-util';

const AMBIGUOUS_MSG = 'To make model projections easier to interpret, <br /> select each grey edge and clarify its polarity in the side panel.';

// Returns the stats control group if it exist, if not then create
// and initialize it.
const createStatsGroup = (foregroundLayer) => {
  let statsGroup = d3.select('.graph-stats-info');
  if (statsGroup.size() === 0) {
    statsGroup = foregroundLayer.append('g')
      .attr('transform', translate(5, 10))
      .classed('graph-stats-info', true);

    statsGroup.append('text')
      .classed('graph-stats-ambiguouity', true)
      .attr('fill', '#D80')
      .attr('x', 15)
      .attr('y', 15)
      .text('');

    // const squareSize = 22;
    // const infoGroup = statsGroup.append('g')
    //   .classed('infoGroup', true);

    // infoGroup
    //   .append('rect')
    //   .style('width', squareSize.toString())
    //   .style('height', squareSize.toString())
    //   .style('rx', '6')
    //   .style('fill', 'white')
    //   .style('fill-opacity', '0')
    //   .style('stroke', '#545353');

    // infoGroup
    //   .append('text')
    //   .style('font-family', 'FontAwesome')
    //   .style('font-size', '16px')
    //   .style('stroke', 'none')
    //   .style('fill', '#545353')
    //   .style('cursor', 'pointer')
    //   .style('text-anchor', 'middle')
    //   .style('alignment-baseline', 'middle')
    //   .attr('x', (squareSize / 2).toString())
    //   .attr('y', ((squareSize / 2) + 1).toString())
    //   .text('\uf05a');

    // statsGroup
    //   .append('text')
    //   .classed('graph-stats-text', true)
    //   .style('font-size', '14px')
    //   .style('stroke', 'none')
    //   .style('fill', '#545353')
    //   .style('text-anchor', 'left')
    //   .style('alignment-baseline', 'middle')
    //   .attr('y', (squareSize + 15).toString())
    //   .style('opacity', 0)
    //   .attr('pointer-events', 'none');

    // infoGroup
    //   .on('click', function() {
    //     const selection = statsGroup.selectAll('.graph-stats-text');
    //     const active = selection.style('opacity');
    //     const newOpacity = parseInt(active) ? 0 : 1;
    //     selection
    //       .transition()
    //       .duration(100)
    //       .style('opacity', newOpacity);
    //   });
  }
  return statsGroup;
};


export default class BaseCAGRenderer extends SVGRenderer {
  displayGraphStats() {
    const graph = this.layout;
    const svg = d3.select(this.svgEl);
    const foregroundLayer = svg.select('.foreground-layer');

    const statsGroup = createStatsGroup(foregroundLayer);

    let hasAmbiguousEdges = false;
    for (const edge of graph.edges) {
      const polarity = edge.data.polarity;
      if (polarity !== 1 && polarity !== -1) {
        hasAmbiguousEdges = true;
        break;
      }
    }

    // Update ambiguouity status
    if (hasAmbiguousEdges) {
      statsGroup.select('.graph-stats-ambiguouity').text('Ambiguous edges detected').on('mouseover', (evt) => {
        const point = d3.pointer(evt);

        // Force tooltip to go near the end of the text
        const x = +statsGroup.select('.graph-stats-ambiguouity').attr('x') + 150;
        showSvgTooltip(foregroundLayer, AMBIGUOUS_MSG, [x, point[1]], Math.PI / 2);
      }).on('mouseout', () => hideSvgTooltip(foregroundLayer));
    } else {
      statsGroup.select('.graph-stats-ambiguouity').text('').on('mouseover', null).on('mouseout', null);
    }
  }
}
