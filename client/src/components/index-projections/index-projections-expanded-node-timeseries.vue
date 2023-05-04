<template>
  <div class="index-projections-expanded-node-timeseries-container">
    <svg ref="chartRef"></svg>
  </div>
</template>

<script setup lang="ts">
import * as d3 from 'd3';
import _ from 'lodash';
import { ref, toRefs, watch } from 'vue';
import renderChart from '@/charts/projections-renderer';

// TODO: replace with real data
const TEST_TIMESERIES = [
  { timestamp: 788918400000, value: 0.599440336227417 },
  { timestamp: 820454400000, value: 0.5965178608894348 },
  { timestamp: 852076800000, value: 0.5933980345726013 },
  { timestamp: 883612800000, value: 0.5950198173522949 },
  { timestamp: 915148800000, value: 0.5962514281272888 },
  { timestamp: 946684800000, value: 0.5937133431434631 },
  { timestamp: 978307200000, value: 0.5968118906021118 },
  { timestamp: 1009843200000, value: 0.5883297324180603 },
  { timestamp: 1041379200000, value: 0.5928052067756653 },
  { timestamp: 1072915200000, value: 0.5966191291809082 },
  { timestamp: 1104537600000, value: 0.5909705758094788 },
  { timestamp: 1136073600000, value: 0.5926353335380554 },
  { timestamp: 1167609600000, value: 0.5898168683052063 },
  { timestamp: 1199145600000, value: 0.5909973978996277 },
  { timestamp: 1230768000000, value: 0.5879366397857666 },
  { timestamp: 1262304000000, value: 0.5860593318939209 },
  { timestamp: 1293840000000, value: 0.5855008959770203 },
  { timestamp: 1325376000000, value: 0.5788575410842896 },
  { timestamp: 1356998400000, value: 0.5733676552772522 },
  { timestamp: 1388534400000, value: 0.5706807971000671 },
  { timestamp: 1420070400000, value: 0.564184308052063 },
  { timestamp: 1451606400000, value: 0.5620650053024292 },
  { timestamp: 1483228800000, value: 0.566602349281311 },
  { timestamp: 1514764800000, value: 0.5657258629798889 },
  { timestamp: 1546300800000, value: 0.5617315769195557 },
  { timestamp: 1577836800000, value: 0.5630304217338562 },
];

const props = defineProps<{
  projectionStartTimestamp: number;
  projectionEndTimestamp: number;
}>();

const { projectionStartTimestamp, projectionEndTimestamp } = toRefs(props);
const chartRef = ref<HTMLElement | null>(null);

watch([projectionStartTimestamp, projectionEndTimestamp, chartRef], () => {
  const parentElement = chartRef.value?.parentElement;
  const svg = chartRef.value ? d3.select<HTMLElement, null>(chartRef.value) : null;
  if (parentElement === null || parentElement === undefined || svg === null) {
    return;
  }
  const { clientWidth: width, clientHeight: height } = parentElement;
  // Set new size
  svg.attr('width', width).attr('height', height);
  renderChart(
    svg,
    TEST_TIMESERIES,
    width,
    height,
    projectionStartTimestamp.value,
    projectionEndTimestamp.value
  );
});
</script>

<style lang="scss" scoped></style>
