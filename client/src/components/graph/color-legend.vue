<template>
  <hideable-legend>
    <div ref="container" class="color-legend">
      <svg />
    </div>
  </hideable-legend>
</template>

<script lang="ts">
import * as d3 from 'd3';
import * as vsup from 'vsup';
import { defineComponent } from 'vue';
import { createVSUPscale } from '@/utils/scales-util';
import { createChart, translate } from '@/utils/svg-util';
import HideableLegend from '../widgets/hideable-legend.vue';

const UNCERTAINTY_COLOR_PALETTE_SIZE = 50;

const FONT_SIZE = 10;
const LABEL_SIZE = 20;
const CHART_SIZE = 50;
const COLUMN_GAP_SIZE = 10;
const ICON_WIDTH = 15;
// Add 5px to the legend height so the bottom y axis label isn't cut off
const LEGEND_HEIGHT = LABEL_SIZE + CHART_SIZE + 5;

export default defineComponent({
  name: 'ColorLegend',
  components: {
    HideableLegend,
  },
  props: {
    showCagEncodings: {
      type: Boolean,
      default: false,
    },
  },
  mounted() {
    this.refresh();
  },
  methods: {
    refresh() {
      const svg = d3.select(this.$refs.container as HTMLDivElement).select('svg');
      // Clear any previous renders
      svg.selectAll('*').remove();
      const rightColumnStart = CHART_SIZE + LABEL_SIZE + COLUMN_GAP_SIZE;
      const rightColumnTextStart = rightColumnStart + ICON_WIDTH + COLUMN_GAP_SIZE / 2;
      // Total width depends on which labels are shown
      const labelWidth = this.showCagEncodings ? 80 : 105;
      const width = rightColumnTextStart + labelWidth;
      createChart(svg, width, LEGEND_HEIGHT);
      svg.style('overflow', 'visible');

      // Value-Suppressing uncertainty palettes
      const uncertaintyScale = createVSUPscale();
      const uncertaintyLegend = vsup.legend.heatmapLegend();
      uncertaintyLegend
        .scale(uncertaintyScale)
        .size(UNCERTAINTY_COLOR_PALETTE_SIZE)
        .x(0)
        .y(LABEL_SIZE)
        .vtitle('Polarity')
        .utitle('Belief');

      svg.append('g').call(uncertaintyLegend);
      // Adjust labels for uncertainty legend
      svg
        .select('.legend')
        .selectAll('text')
        .each(function () {
          const label = d3.select(this).text();
          if (label === 'Polarity') {
            d3.select(this).attr('transform', translate(25, -10));
          } else if (label === 'Belief') {
            d3.select(this).attr('transform', 'translate(60, 25)rotate(90)');
          }
        });

      const edgeLegend = svg.append('g').attr('class', 'edgeLegend');

      const line1Start = LABEL_SIZE + FONT_SIZE;

      if (this.showCagEncodings) {
        edgeLegend
          .append('line')
          .attr('x1', rightColumnStart)
          .attr('x2', rightColumnStart + ICON_WIDTH)
          .attr('y1', line1Start - FONT_SIZE / 2)
          .attr('y2', line1Start - FONT_SIZE / 2)
          .style('stroke-dasharray', '3,2')
          .style('stroke', '#808080');

        edgeLegend
          .append('text')
          .attr('x', rightColumnTextStart)
          .attr('y', line1Start)
          .attr('color', 'black')
          .text('No Evidence');
      }

      // Node color legend container
      const nodeLegend = svg.append('g').attr('class', 'legendNodeColor');

      if (!this.showCagEncodings) {
        // Grounding score
        const groundingScoreNode = nodeLegend
          .append('circle')
          .attr('cx', rightColumnStart + ICON_WIDTH / 2)
          .attr('cy', line1Start - FONT_SIZE / 2)
          .attr('r', ICON_WIDTH / 2);

        // Add def for blurriness
        svg
          .append('defs')
          .append('filter')
          .attr('id', 'grounding_score')
          .append('feGaussianBlur')
          .attr('stdDeviation', 1.5);

        groundingScoreNode.style('fill', '#808080').attr('filter', 'url(#grounding_score)');

        nodeLegend
          .append('text')
          .attr('x', rightColumnTextStart)
          .attr('y', line1Start)
          .attr('color', 'black')
          .text('Grounding Score');
      }
    },
  },
});
</script>

<style lang="scss" scoped>
:deep(.legend) {
  text {
    font-size: 10px !important;
  }

  // Remove middle tick lines
  .tick line {
    display: none;
  }

  // Remove middle tick labels
  .tick:nth-child(3),
  .tick:nth-child(4) {
    text {
      display: none;
    }
  }
}
</style>
