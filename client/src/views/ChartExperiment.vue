<template>
  <div>
    <h6>Chart Tests</h6>
    <div class="chart">
      <svg ref="lineChart" />
    </div>
    <div class="chart">
      <svg ref="scatter" />
    </div>
  </div>
</template>

<script>
import * as d3 from 'd3';
import renderTimeseries from '@/charts/timeseries-renderer';

const renderOptions = {
  viewport: {
    x1: 0,
    y1: 0,
    x2: 250,
    y2: 120
  },
  margin: {
    top: 10, bottom: 10, left: 10, right: 10
  }
};

const data = [
  {
    id: 'a',
    data: [
      { value: 1, timestamp: 100 },
      { value: 2, timestamp: 200 },
      { value: 3, timestamp: 300 },
      { value: 2, timestamp: 400 },
      { value: 4, timestamp: 500 },
      { value: 7, timestamp: 600 },
      { value: 3, timestamp: 700 },
      { value: 4, timestamp: 800 },
      { value: 2, timestamp: 900 },
      { value: 5, timestamp: 1000 }
    ]
  }
];

export default {
  name: 'ChartExperiment',
  mounted() {
    renderTimeseries(d3.select(this.$refs.lineChart), data, renderOptions, {
      mode: 'line'
    });
    renderTimeseries(d3.select(this.$refs.scatter), data, renderOptions, {
      mode: 'dots'
    });
  }
};
</script>

<style lang="scss" scoped>
.chart {
  width: 250px;
  height: 120px;
  border: 1px solid #BBB;
  box-sixing: border-box;
  margin: 5px;
}
</style>
