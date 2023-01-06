<template>
  <div ref="container" class="spark-container">
    <svg class="chart" />
  </div>
</template>

<script lang="ts">
import _ from 'lodash';
import * as d3 from 'd3';
import { defineComponent, PropType } from 'vue';
import { SELECTED_COLOR_DARK } from '@/utils/colors-util';

const DEFAULT_LINE_COLOR = SELECTED_COLOR_DARK;

interface SparklineData {
  series: number[];
  name: string;
  color: string;
}

export default defineComponent({
  name: 'SparkLine',
  props: {
    data: {
      type: Array as PropType<SparklineData[]>,
      default: () => {
        return [];
      },
    },
    size: {
      type: Array as PropType<number[]>,
      default: () => [110, 50],
    },
    viewBox: {
      type: Array as PropType<number[]>,
      default: () => null,
    },
  },
  watch: {
    data(n) {
      if (n) {
        this.refresh();
      }
    },
  },
  mounted() {
    this.refresh();
  },
  methods: {
    refresh() {
      const chart = d3.select(this.$refs.container as any).select('.chart');
      chart.selectAll('*').remove();

      if (_.isEmpty(this.data)) return;

      const W = this.size[0];
      const H = this.size[1];

      chart.attr('width', W + 'px');
      chart.attr('height', H + 'px');

      const yExtent = d3.extent(_.flatten(this.data.map((s) => s.series))) as [number, number];
      const xExtent = [0, this.data[0].series.length];

      // Degenerate case where everything is the same value
      if (yExtent[0] === yExtent[1]) {
        yExtent[0] -= 1;
        yExtent[1] += 1;
      }

      let autoViewBox = _.cloneDeep(this.viewBox);
      if (_.isNil(autoViewBox)) {
        // Inserts a little buffer space so we don't start at the very edge
        const yPadding = Math.abs(0.05 * (yExtent[1] - yExtent[0]));
        const xPadding = Math.abs(0.05 * (xExtent[1] - xExtent[0]));
        autoViewBox = [
          xExtent[0] - xPadding, // min-x
          yExtent[0] - yPadding, // min-y
          xExtent[1] - xExtent[0] + 2 * xPadding, // width
          yExtent[1] - yExtent[0] + 2 * yPadding, // height
        ];
      }
      chart.attr('viewBox', autoViewBox.join(' '));
      chart.attr('preserveAspectRatio', 'none');

      const yScale = d3.scaleLinear().range([yExtent[1], yExtent[0]]).domain(yExtent);
      const xScale = d3.scaleLinear().range([xExtent[0], xExtent[1]]).domain(xExtent);
      // If data is supplied for only one line, return the DEFAULT_LINE_COLOR.
      // Else the user wants to render multiple lines on the same axis, so
      //  return a different color for each line (assuming their `name`s are
      //  different.)
      const getDefaultLineColor =
        this.data.length === 1
          ? () => DEFAULT_LINE_COLOR
          : d3.scaleOrdinal(d3.schemeCategory10).domain(this.data.map((s) => s.name));

      const valueFn = d3
        .line()
        .x(function (_d, i) {
          return xScale(i);
        })
        .y(function (d) {
          return yScale(d as any);
        });

      chart
        .append('rect')
        .attr('x', autoViewBox[0])
        .attr('y', autoViewBox[1])
        .attr('width', autoViewBox[2])
        .attr('height', autoViewBox[3])
        .style('stroke', 'none')
        .style('fill', '#F4F4F4');

      chart
        .selectAll('path')
        .data(this.data)
        .enter()
        .append('path')
        .attr('class', 'sparkline')
        .attr('d', (d) => {
          return valueFn(d.series as any);
        })
        .style('stroke', (d) => d.color || getDefaultLineColor(d.name))
        .style('stroke-width', 2)
        .style('vector-effect', 'non-scaling-stroke')
        .style('fill', 'none')
        .style('fill-opacity', 0.8);
    },
  },
});
</script>

<style lang="scss" scoped>
.spark-container {
  display: flex;
  flex-direction: column;
  padding: 1px;
  justify-content: center;
}
</style>
