<template>
  <div class="map-legend-container">
    <svg ref="colorRamp"></svg>
    <div class="label-container">
      <span v-if="props.ramp.length > 0" class="color-label">
        {{ formatter(props.ramp[0].minLabel) }}
      </span>
      <span v-for="bin in props.ramp" :key="bin.color" class="color-label">
        {{ formatter(bin.maxLabel) }}
      </span>
    </div>
  </div>
</template>
<script setup lang="ts">
import * as d3 from 'd3';
import { ref, watch } from 'vue';
import { MapLegendColor } from '@/types/Common';
import { exponentFormatter, valueFormatter } from '@/utils/string-util';
import { ramp } from '@/utils/colors-util';

const props = defineProps<{
  ramp: MapLegendColor[];
  isContinuous: boolean;
  formatter?: (value: number) => string;
}>();
const colorRamp = ref<SVGElement>();

const refresh = () => {
  const n = props.ramp.length;
  if (n === 0 || colorRamp.value === undefined) return;
  const colors = props.ramp.map((d) => d.color);
  const refSelection = d3.select(colorRamp.value);
  refSelection.selectAll('*').remove();
  refSelection
    .attr('viewBox', '0 0 1 ' + n)
    .attr('preserveAspectRatio', 'none')
    .style('display', 'block');

  if (props.isContinuous) {
    refSelection
      .append('image')
      .attr('width', '100%')
      .attr('height', '100%')
      .attr('preserveAspectRatio', 'none')
      .attr('href', ramp(d3.interpolateRgbBasis(colors))?.toDataURL() || '');
  } else {
    const margin = 0.01;
    refSelection
      .selectAll('rect')
      .data(props.ramp)
      .enter()
      .append('rect')
      .style('fill', (d) => d.color)
      .attr('y', (d, i) => n - 1 - i + margin)
      .attr('width', 1)
      .attr('height', 1 - margin * 2);
  }
};

watch([() => props.ramp, () => props.isContinuous], refresh, { immediate: true });

const formatter = (value: number) => {
  if (props.formatter !== undefined) {
    return props.formatter(value);
  }
  const result = valueFormatter(value);
  if (result.length > 12) {
    return exponentFormatter(value);
  }
  return result;
};
</script>
<style lang="scss" scoped>
$font-size: 12px;
.map-legend-container {
  font-size: $font-size;
  line-height: $font-size;
  position: relative;
  width: 12ch;
}
svg {
  position: absolute;
  right: 0;
  top: calc($font-size / 2);
  width: 50%;
  height: calc(100% - #{$font-size});
}
.label-container {
  position: relative;
  display: flex;
  flex-direction: column-reverse;
  justify-content: space-between;
  height: 100%;
}
.color-label {
  position: relative;
  text-align: right;
  background: white;
  padding: 2px 0;
}
</style>
