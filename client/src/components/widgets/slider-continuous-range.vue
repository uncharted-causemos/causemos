<template>
  <svg ref="svgElement" />
</template>

<script>
import _ from 'lodash';
import * as d3 from 'd3';
import { COLOR, getColorScale } from '@/utils/colors-util';
import SVGUtil from '@/utils/svg-util';
import { chartValueFormatter } from '@/utils/string-util';

const FONT_SIZE = 10;

export default {
  name: 'SliderContinuousRange',
  props: {
    /**
     * Props for v-model two way binding
     */
    value: {
      type: Object,
      default: () => (null) // { min: number, max: number }
    },
    labelWidth: {
      type: Number,
      default: 60
    },
    barWidth: {
      type: Number,
      default: 15
    },
    // Center the 15px wide slider below a 23px wide button:
    //  (23px - 15px) / 2 = 4px
    horizontalBarMargin: {
      type: Number,
      default: 4
    },
    barHeight: {
      type: Number,
      default: 120
    },
    min: {
      type: Number,
      default: 0
    },
    max: {
      type: Number,
      default: 100
    },
    colorOption: {
      type: Object,
      default: () => ({
        color: COLOR.WM_RED,
        scaleFn: d3.scaleLinear
      })
    },
    rangePrecision: { // Number of significant digits
      type: Number,
      default: 2
    }
  },
  data: () => ({
    selectedRange: null
  }),
  watch: {
    value: {
      handler() {
        // TODO: watch for value change and set brush programatically. Becarefull not to fall into the infinite loop
        // by emitting input change event again. We should probably need to diable event temporarily.
      },
      deep: true
    },
    min() {
      this.refresh();
    },
    max() {
      this.refresh();
    }
  },
  mounted() {
    this.refresh();
  },
  methods: {
    refresh () {
      const barXStart = this.labelWidth + this.horizontalBarMargin;
      // Add half of the font size on the top and bottom since labels extend past the height of the bar
      const verticalBarMargin = FONT_SIZE / 2;

      const svgElement = d3.select(this.$refs.svgElement);
      svgElement.selectAll('*').remove();

      // This was largely repurposed from here: https://bl.ocks.org/alexmacy/eb284831aff6f9d0119b
      const prevMin = _.get(this.value, 'min', this.min);
      const prevMax = _.get(this.value, 'max', this.max);
      this.selectedRange = {
        min: _.min([_.max([this.min, prevMin]), this.max]),
        max: _.max([_.min([this.max, prevMax]), this.min])
      };

      const { color, scaleFn } = this.colorOption;
      // Create the linear scale
      this.y = scaleFn()
        .domain([this.min, this.max])
        .range([this.barHeight, 0]); // height followed by 0 because y scale is inverted so that 0 is at the bottom

      // G element for linear scale
      this.sliderGElement = svgElement
        .attr('width', barXStart + this.barWidth + this.horizontalBarMargin)
        .attr('height', this.barHeight + (verticalBarMargin * 2))
        .append('g')
        .attr('transform', SVGUtil.translate(this.labelWidth, verticalBarMargin));
      const numBuckets = 20;
      const rangeBucket = d3.range(0, numBuckets);
      const colorInterpolator = getColorScale(color);
      const colorScale = d3.scaleSequential().domain([0, numBuckets]).interpolator(colorInterpolator);

      this.sliderGElement.selectAll('.color-bucket')
        .data(rangeBucket)
        .enter()
        .append('rect')
        .classed('color-bucket', true)
        .attr('x', this.horizontalBarMargin)
        .attr('y', (d, i) => (numBuckets - 1 - i) * this.barHeight / numBuckets)
        .attr('width', this.barWidth)
        .attr('height', this.barHeight / numBuckets)
        .style('fill', colorScale);

      const valueFormatter = chartValueFormatter(this.min, this.max);
      this.sliderGElement.call(d3.axisLeft()
        .scale(this.y)
        .tickValues([this.min, this.max])
        .tickFormat(valueFormatter)
        .tickSize(0)
      );

      this.sliderGElement.selectAll('.domain')
        .attr('stroke', 'none');

      this.sliderGElement.selectAll('.tick text')
        .style('fill', '#000')
        .style('stroke', '#fff')
        .style('stroke-width', '3px')
        .style('paint-order', 'stroke')
        .style('font-size', FONT_SIZE);

      // Create labels for selected range
      this.sliderGElement.append('text')
        .attr('class', 'min-range')
        .attr('x', -this.horizontalBarMargin)
        .attr('y', 0)
        .style('fill', '#000')
        .style('stroke', '#fff')
        .style('stroke-width', '3px')
        .style('paint-order', 'stroke')
        .style('font-size', FONT_SIZE);

      this.sliderGElement.append('text')
        .attr('class', 'max-range')
        .attr('x', -this.horizontalBarMargin)
        .attr('y', this.barHeight)
        .style('fill', '#000')
        .style('stroke', '#fff')
        .style('stroke-width', '3px')
        .style('paint-order', 'stroke')
        .style('font-size', FONT_SIZE);

      // Instantiate a brush for the y-dimension
      this.brush = d3
        .brushY()
        .extent([
          [this.horizontalBarMargin, 0],
          [this.horizontalBarMargin + this.barWidth, this.barHeight]
        ])
        .on('start brush end', this.brushed);

      // SVG element for brush
      this.brushg = this.sliderGElement.append('g')
        .attr('class', 'brush')
        .call(this.brush);
      this.brush.move(
        this.brushg,
        [this.selectedRange.max, this.selectedRange.min].map(this.y)
      ); // max followed by min because y scale is inverted so that 0 is at the bottom
    },
    brushed () {
      const range = d3
        .brushSelection(this.brushg.node())
        .map(this.y.invert);

      this.selectedRange = {
        min: range[1],
        max: range[0]
      };

      // Display selected range labels
      const { min, max } = this.selectedRange;
      const valueFormatter = chartValueFormatter(min, max);
      const minLabel = this.sliderGElement.select('.min-range');
      const maxLabel = this.sliderGElement.select('.max-range');

      if (this.min !== min) {
        minLabel.attr('y', this.y(min)).text(valueFormatter(min));
      } else {
        minLabel.text('');
      }

      if (this.max !== max) {
        maxLabel.attr('y', this.y(max) + (FONT_SIZE / 2)).text(valueFormatter(max));
      } else {
        maxLabel.text('');
      }

      this.brushg.select('.selection')
        .style('stroke', '#777')
        .style('stroke-width', 1)
        .style('fill', 'none');
      this.brushg.selectAll('.handle')
        .attr('width', this.barWidth + (2 * this.horizontalBarMargin))
        .attr('x', 0)
        .style('fill', '#777');

      this.$emit('input', this.selectedRange);
    }
  }
};
</script>

<style lang="scss" scoped>
</style>
