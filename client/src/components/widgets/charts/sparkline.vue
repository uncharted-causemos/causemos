<template>
  <div
    ref="container"
    class="spark-container">
    <svg class="chart" />
  </div>
</template>

<script>
import _ from 'lodash';
import * as d3 from 'd3';

export default {
  name: 'SparkLine',
  props: {
    data: {
      type: Array,
      default: () => { return []; }
    },
    size: {
      type: Array,
      default: () => ([110, 50])
    },
    viewBox: {
      type: Array,
      default: () => (null)
    }
  },
  mounted() {
    const W = this.size[0];
    const H = this.size[1];
    const chart = d3.select(this.$refs.container).select('.chart');
    chart.attr('width', W + 'px');
    chart.attr('height', H + 'px');

    if (_.isEmpty(this.data)) return;

    const yExtent = d3.extent(_.flatten(this.data.map(s => s.series)));
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
        (xExtent[1] - xExtent[0]) + (2 * xPadding), // width
        (yExtent[1] - yExtent[0]) + (2 * yPadding) // height
      ];
    }
    chart.attr('viewBox', autoViewBox.join(' '));
    chart.attr('preserveAspectRatio', 'none');

    const yScale = d3.scaleLinear().range([yExtent[1], yExtent[0]]).domain(yExtent);
    const xScale = d3.scaleLinear().range([xExtent[0], xExtent[1]]).domain(xExtent);
    const color = d3.scaleOrdinal(d3.schemeCategory10).domain(this.data.map(s => s.name));

    const valueFn = d3.line()
      .x(function(d, i) { return xScale(i); })
      .y(function(d) { return yScale(d); });

    chart.append('rect')
      .attr('x', autoViewBox[0])
      .attr('y', autoViewBox[1])
      .attr('width', autoViewBox[2])
      .attr('height', autoViewBox[3])
      .style('stroke', 'none')
      .style('fill', '#F4F4F4');

    chart.selectAll('path')
      .data(this.data)
      .enter()
      .append('path')
      .attr('class', 'sparkline')
      .attr('d', (d) => {
        return valueFn(d.series);
      })
      .style('stroke', (d) => d.color || color(d.name))
      .style('stroke-width', 2)
      .style('vector-effect', 'non-scaling-stroke')
      .style('fill', 'none')
      .style('fill-opacity', 0.8);
  }
};
</script>

<style lang="scss" scoped>
.spark-container {
  display: flex;
  flex-direction: column;
  padding: 1px;
  justify-content: center;
}

</style>
