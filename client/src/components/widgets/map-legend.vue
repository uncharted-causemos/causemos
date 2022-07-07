<template>
  <div class="map-legend-container">
    <svg ref="colorRamp"></svg>
    <div class="label-container">
      <span
        v-if="ramp.length > 0"
        class="color-label"
      >
        {{formatter(ramp[0].minLabel)}}
      </span>
      <span
        v-for="bin in ramp"
        :key="bin.color"
        class="color-label"
      >
        {{formatter(bin.maxLabel)}}
      </span>
    </div>
  </div>
</template>
<script lang="ts">
import * as d3 from 'd3';
import { defineComponent, PropType } from 'vue';
import { MapLegendColor } from '@/types/Common';
import { exponentFormatter, valueFormatter } from '@/utils/string-util';
import { ramp } from '@/utils/colors-util';

export default defineComponent({
  name: 'MapLegend',
  emits: [],
  props: {
    ramp: {
      type: Array as PropType<MapLegendColor[]>,
      default: []
    },
    isContinuous: {
      type: Boolean,
      default: true
    }
  },
  watch: {
    ramp() {
      this.refresh();
    },
    isContinuous() {
      this.refresh();
    }
  },
  mounted() {
    this.refresh();
  },
  methods: {
    refresh() {
      const n = this.ramp.length;
      if (n === 0) return;
      const colors = this.ramp.map(d => d.color);
      const refSelection = d3.select((this.$refs as any).colorRamp);
      refSelection.selectAll('*').remove();
      refSelection
        .attr('viewBox', '0 0 1 ' + n)
        .attr('preserveAspectRatio', 'none')
        .style('display', 'block');

      if (this.isContinuous) {
        refSelection.append('image')
          .attr('width', '100%')
          .attr('height', '100%')
          .attr('preserveAspectRatio', 'none')
          .attr('href', ramp(d3.interpolateRgbBasis(colors))?.toDataURL() || '');
      } else {
        const margin = 0.01;
        refSelection
          .selectAll('rect')
          .data(this.ramp)
          .enter().append('rect')
          .style('fill', d => d.color)
          .attr('y', (d, i) => n - 1 - i + margin)
          .attr('width', 1)
          .attr('height', 1 - (margin * 2));
      }
    },
    formatter(value: number) {
      const result = valueFormatter(value);
      if (result.length > 12) {
        return exponentFormatter(value);
      }
      return result;
    }
  }
});

</script>
<style lang="scss" scoped>
$font-size: 12px;
.map-legend-container {
  font-size: $font-size;
  line-height: $font-size;
  position: relative;
  height: 100%;
  width: 12ch;
}
svg {
  position: absolute;
  right: 0;
  top: $font-size / 2;
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
