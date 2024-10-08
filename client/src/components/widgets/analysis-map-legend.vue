<template>
  <div class="map-legend-container" :class="{ 'right-align-labels': shouldRightAlignLabels }">
    <span class="color-label subdued" v-if="ramp.length > 0">
      {{ formatter(ramp[ramp.length - 1].maxLabel) }}
    </span>
    <svg ref="colorRamp"></svg>
    <span class="color-label subdued" v-if="ramp.length > 0">
      {{ formatter(ramp[0].minLabel) }}
    </span>
  </div>
</template>

<script lang="ts" setup>
import * as d3 from 'd3';
import { computed, onMounted, ref, toRefs, watch } from 'vue';
import { MapLegendColor } from '@/types/Common';
import { ramp as createRamp } from '@/utils/colors-util';

const props = defineProps<{
  ramp: MapLegendColor[];
  isContinuous: boolean;
}>();
const { ramp, isContinuous } = toRefs(props);
const colorRamp = ref<SVGElement>();

const refresh = () => {
  const n = ramp.value.length;
  if (n === 0 || colorRamp.value === undefined) return;
  const colors = ramp.value.map((d) => d.color);
  const refSelection = d3.select(colorRamp.value);
  refSelection.selectAll('*').remove();
  refSelection
    .attr('viewBox', '0 0 1 ' + n)
    .attr('preserveAspectRatio', 'none')
    .style('display', 'block');

  if (isContinuous.value) {
    refSelection
      .append('image')
      .attr('width', '100%')
      .attr('height', '100%')
      .attr('preserveAspectRatio', 'none')
      .attr('href', createRamp(d3.interpolateRgbBasis(colors))?.toDataURL() || '');
  } else {
    const margin = 0.01;
    refSelection
      .selectAll('rect')
      .data(ramp.value)
      .enter()
      .append('rect')
      .style('fill', (d) => d.color)
      .attr('y', (d, i) => n - 1 - i + margin)
      .attr('width', 1)
      .attr('height', 1 - margin * 2);
  }
};
onMounted(() => refresh());
watch([ramp, isContinuous], refresh);

const formatter = (value: number) => d3.format(',.0f')(value);

// Right-align the visible ramp numbers when they are in the thousands and one
//  has at least 2 more digits than the other.
const shouldRightAlignLabels = computed(() => {
  if (ramp.value.length === 0) return false;
  const minAbsoluteValue = Math.abs(ramp.value[0].minLabel);
  const maxAbsoluteValue = Math.abs(ramp.value[ramp.value.length - 1].maxLabel);
  const digitCountDifference = Math.abs(
    minAbsoluteValue.toString().length - maxAbsoluteValue.toString().length
  );
  return minAbsoluteValue > 1000 && maxAbsoluteValue > 1000 && digitCountDifference > 1;
});
</script>

<style lang="scss" scoped>
@import '@/styles/uncharted-design-tokens.scss';

$font-size: 12px;
.map-legend-container {
  font-size: $font-size;
  line-height: $font-size;
  background: white;
  display: flex;
  flex-direction: column;
  justify-content: space-between;
  align-items: center;
  padding: 5px;
}
svg {
  max-width: 10px;
  flex: 1;
  min-height: 0;
}
.color-label {
  position: relative;
  padding: 2px 0;
}
.map-legend-container.right-align-labels .color-label {
  align-self: flex-end;
}
</style>
