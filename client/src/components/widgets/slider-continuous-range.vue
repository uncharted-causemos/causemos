<template>
  <svg ref="slider" />
</template>

<script>
import _ from 'lodash';
import * as d3 from 'd3';
import { COLOR, getColorScale } from '@/utils/colors-util';
import SVGUtil from '@/utils/svg-util';
import { chartValueFormatter } from '@/utils/string-util';

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
    margin: {
      type: Object,
      default: () => ({ top: 10, right: 5, bottom: 10, left: 30 })
    },
    width: {
      type: Number,
      default: 15
    },
    height: {
      type: Number,
      default: 130
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
      const slider = d3.select(this.$refs.slider);
      slider.selectAll('*').remove();

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
        .range([this.height, 0]); // height followed by 0 because y scale is inverted so that 0 is at the bottom

      // SVG element for linear scale
      this.svg = slider
        .attr('width', this.width + this.margin.left + this.margin.right)
        .attr('height', this.height + this.margin.top + this.margin.bottom)
        .append('g')
        .attr('transform', SVGUtil.translate(this.margin.left, this.margin.top));
      const numBuckets = 20;
      const rangeBucket = d3.range(0, numBuckets);
      const colorInterpolator = getColorScale(color);
      const colorScale = d3.scaleSequential().domain([0, numBuckets]).interpolator(colorInterpolator);

      this.svg.selectAll('.color-bucket')
        .data(rangeBucket)
        .enter()
        .append('rect')
        .classed('color-bucket', true)
        .attr('x', 0)
        .attr('y', (d, i) => (numBuckets - 1 - i) * this.height / numBuckets)
        .attr('width', this.width)
        .attr('height', this.height / numBuckets)
        .style('fill', colorScale);

      const valueFormatter = chartValueFormatter(this.min, this.max);
      this.svg.call(d3.axisLeft()
        .scale(this.y)
        .tickValues([this.min, this.max])
        .tickFormat(valueFormatter)
        .tickSize(0)
      );

      // Create labels for selected range
      this.svg.append('text')
        .attr('class', 'min-range')
        .attr('x', -3) // Same than for the max, min tick labels
        .attr('y', 0)
        .style('fill', '#000');

      this.svg.append('text')
        .attr('class', 'max-range')
        .attr('x', -3)
        .attr('y', this.height)
        .style('fill', '#000');

      // Instantiate a brush for the x-dimension
      const offset = 2;
      this.brush = d3
        .brushY()
        .extent([[offset, 0], [this.width - offset, this.height]])
        .on('start brush end', this.brushed);

      // SVG element for brush
      this.brushg = this.svg.append('g')
        .attr('class', 'brush')
        .call(this.brush);
      this.brush.move(this.brushg, [this.selectedRange.max, this.selectedRange.min].map(this.y)); // max followed by min because y scale is inverted so that 0 is at the bottom
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
      const minLabel = this.svg.select('.min-range');
      const maxLabel = this.svg.select('.max-range');

      if (this.min !== min) {
        minLabel.attr('y', this.y(min)).text(valueFormatter(min));
      } else {
        minLabel.text('');
      }

      if (this.max !== max) {
        maxLabel.attr('y', this.y(max)).text(valueFormatter(max));
      } else {
        maxLabel.text('');
      }

      // Temp style hack
      this.brushg.select('.selection').style('stroke', '#000').style('stroke-width', 1).style('fill', 'none');
      this.brushg.selectAll('.handle').style('stroke', '#000').style('stroke-width', 1).style('fill', '#CCC').attr('x', 0);

      this.$emit('input', this.selectedRange);
    }
  }
};
</script>

<style lang="scss" scoped>
</style>
