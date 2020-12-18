<template>
  <div
    class="color-legend-container"
    :class="[showLegend ? '' : 'legend-hidden']"
    @mouseenter="showActions=true"
    @mouseleave="showActions=false"
  >
    <div class="color-legend-controls">
      <button
        v-if="showActions || !showLegend"
        class="btn btn-light"
        @click="toggleLegend"
      >
        <i
          v-tooltip.top="'Expand/Collapse Legend'"
          class="fa"
          :class="{ 'fa-angle-double-down': showLegend, 'fa-angle-double-up': !showLegend}" />
      </button>
    </div>
    <div
      ref="container"
      class="color-legend"
    >
      <svg />
    </div>
  </div>
</template>
<script>

import * as d3 from 'd3';
import * as vsup from 'vsup';
import { createVSUPscale } from '@/utils/scales-util';
import { createChart, translate } from '@/utils/svg-util';

const UNCERTAINTY_COLOR_PALETTE_SIZE = 50;
export default {
  name: 'ColorLegend',
  components: {
  },
  props: {
    size: {
      type: Array,
      default: () => ([180, 90])
    },
    showCagEncodings: {
      type: Boolean,
      default: false
    }
  },
  data: () => ({
    showActions: false,
    showLegend: true
  }),
  mounted() {
    this.refresh();
  },
  methods: {
    refresh() {
      const width = this.size[0];
      const height = this.size[1];
      const svg = d3.select(this.$refs.container).select('svg');
      const margin = 15;
      createChart(svg, width, height);

      // Value-Suppressing uncertainty palettes
      const uncertaintyScale = createVSUPscale();
      const uncertaintyLegend = vsup.legend.heatmapLegend();
      uncertaintyLegend
        .scale(uncertaintyScale)
        .size(UNCERTAINTY_COLOR_PALETTE_SIZE)
        .x(margin - 5)
        .y((height * 0.5) - margin)
        .vtitle('Polarity')
        .utitle('Belief');

      svg.append('g').call(uncertaintyLegend);
      // Adjust labels for uncertainty legend
      svg.select('.legend').selectAll('text').filter(function() {
        const label = d3.select(this).text();
        if (label === 'Polarity') {
          d3.select(this).attr('transform', translate(25, -10));
        } else if (label === 'Belief') {
          d3.select(this).attr('transform', 'translate(60, 25)rotate(90)');
        }
      });

      if (this.showCagEncodings) {
        const edgeLegend = svg.append('g').attr('class', 'edgeLegend');
        edgeLegend
          .append('line')
          .attr('x1', (width * 0.5) - 10)
          .attr('x2', (width * 0.5) + 5)
          .attr('y1', 20)
          .attr('y2', 20)
          .style('stroke-dasharray', '3,2')
          .style('stroke', '#808080');

        edgeLegend
          .append('text')
          .attr('x', (width * 0.5) + 10)
          .attr('y', 25)
          .attr('font-size', '70%')
          .attr('font-weight', 'bold')
          .attr('color', 'black')
          .text('No Evidence');
      }

      // Node color legend container
      const nodeLegend = svg.append('g')
        .attr('class', 'legendNodeColor');

      // Interventions
      nodeLegend.append('path')
        .attr('transform', translate(width * 0.5, height - 45))
        .attr('d', d3.symbol().type(d3.symbolDiamond).size(70))
        .style('stroke', '#FFFFF')
        .style('fill', '#FFFFF');

      nodeLegend
        .append('text')
        .attr('x', (width * 0.5) + 10)
        .attr('y', height - 40)
        .attr('font-size', '70%')
        .attr('font-weight', 'bold')
        .attr('color', 'black')
        .text('Interventions');

      if (!this.showCagEncodings) {
      // Grounding score
        const groundingScoreNode = nodeLegend.append('circle')
          .attr('cx', width * 0.5)
          .attr('cy', height - 20)
          .attr('r', 5);

        // Add def for blurriness
        svg
          .append('defs')
          .append('filter')
          .attr('id', 'grounding_score')
          .append('feGaussianBlur')
          .attr('stdDeviation', 1.5);

        groundingScoreNode
          .style('fill', '#808080')
          .attr('filter', 'url(#grounding_score)');

        nodeLegend
          .append('text')
          .attr('x', (width * 0.5) + 10)
          .attr('y', height - margin)
          .attr('font-size', '70%')
          .attr('font-weight', 'bold')
          .attr('color', 'black')
          .text('Grounding Score');
      }
    },
    toggleLegend() {
      this.showLegend = !this.showLegend;
    }
  }
};
</script>

<style lang='scss'>
@import "~styles/variables";

$color-legend-width: 180px;
$color-legend-height: 90px;
$color-legend-tab-width: 50px;
$color-legend-tab-height: 20px;

.color-legend-container {
  box-shadow: 0 4px 8px 0 rgba(0,0,0,0.2);
  position: absolute;
  display: flex;
  flex-direction: column;
  box-sizing: border-box;
  bottom: 2.5vh;
  left: 10px;
  width: $color-legend-width;
  height: $color-legend-height;
  z-index: map-get($z-index-order, side-panel);
  align-items: center;
  transition: height 0.5s ease;

  // Always apply the transition property, not just when .legend-hidden is active
  .color-legend {
    transition: opacity 0.2s ease;
  }

  &.legend-hidden {
    height: 0px;

    .color-legend {
      opacity: 0;
    }
  }
}

.color-legend-controls {
  position: absolute;
  left: 10px;
  top: -2vh;
  width: $color-legend-tab-width;
  height: $color-legend-tab-height;
  display: flex;
  flex-direction: row;
  align-items: center;
  .btn {
    padding: 5px;
    box-shadow: 0 -1px 0 #e5e5e5, 0 0 2px rgba(0,0,0,.12), 0 2px 4px rgba(0,0,0,.24);
  }
}

/**VSUP overriden styles since they use inline styles*/
.legend {
  text {
    font-size: 10px !important;
  }

  .tick:nth-child(4) { //Remove the middle tick for Belief score scale so "Belief" doesn't overlap
    text {
     display: none !important;
    }
  }
  .tick:nth-child(3) { //Remove the middle tick for Belief score scale so "Belief" doesn't overlap
    text {
     display: none !important;
    }
  }
}

/**d3-svg-legend overrides*/
.legendTitle {
  font-size: 75%;
  font-weight: bold;
}

</style>
