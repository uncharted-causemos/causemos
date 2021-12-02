<template>
  <div class="map-legend-container" v-bind:class="{ 'label-right': labelPosition.right, 'label-top': labelPosition.top }">
    <div class="label-container">
      <div
        v-for="d in ramp"
        :key="d.color"
        class="color-label"
      >
          <span>{{d.label}}</span>
          <span>{{d.decor}}</span>
          <!-- Theses are dummy duplicates which are not visible to just make the width to auto fit the text since original labels are absolute positioned -->
          <div class="flex-col">
            <span style="position: relative; visibility: hidden;">{{d.label}}</span>
            <span style="position: relative; visibility: hidden;">{{d.decor}}</span>
          </div>
      </div>
    </div>
    <svg class="color-ramp" ref="colorRamp" />
  </div>
</template>
<script lang="ts">
import * as d3 from 'd3';
import { defineComponent, PropType } from 'vue';
import { MapLegendColor } from '@/types/Common';
import { ramp } from '@/utils/colors-util';

export default defineComponent({
  name: 'MapLegend',
  emits: [],
  props: {
    ramp: {
      type: Array as PropType<MapLegendColor[]>,
      default: []
    },
    labelPosition: {
      type: Object as PropType<{ top: boolean; right: boolean }>,
      default: { top: true, right: true }
    },
    discrete: {
      type: Boolean,
      default: true
    }
  },
  watch: {
    ramp() {
      this.refresh();
    },
    labelPosition() {
      this.refresh();
    },
    discrete() {
      this.refresh();
    }
  },
  mounted() {
    this.refresh();
  },
  methods: {
    refresh() {
      const n = this.ramp.length;
      const colors = this.ramp.map(d => d.color);
      const refSelection = d3.select((this.$refs as any).colorRamp);
      refSelection.selectAll('*').remove();
      refSelection
        .attr('viewBox', '0 0 1 ' + n)
        .attr('preserveAspectRatio', 'none')
        .style('display', 'block');

      if (this.discrete) {
        const margin = 0.01;
        refSelection
          .selectAll('rect')
          .data(this.ramp)
          .enter().append('rect')
          .style('fill', d => d.color)
          .attr('y', (d, i) => n - 1 - i + margin)
          .attr('width', 1)
          .attr('height', 1 - (margin * 2));
      } else {
        refSelection.append('image')
          .attr('width', '100%')
          .attr('height', '100%')
          .attr('preserveAspectRatio', 'none')
          .attr('xlink:href', ramp(d3.interpolateRgbBasis(colors))?.toDataURL() || '');
      }
    }
  }
});

</script>
<style lang="scss" scoped>
.map-legend-container {
  position: relative;
  height: 100%;
  display: flex;
  padding: 0 1px;
  &.label-right {
    flex-direction: row-reverse;
  }
}
svg {
  width: 17px;
}
.label-container {
  position: relative;
  display: flex;
  flex-direction: column-reverse;
  padding: 0 2px;
}
.color-label {
  flex-grow: 1;
  font-size: 10px;
  position: relative;

  span {
    position: absolute;
    right: 0px;
    &:first-child {
      top: -7px;
    }
    &:nth-child(2) {
      bottom: -7px;
    }
  }
}
.label-right {
  .color-label {
    span {
      left: 0px;
    }
  }
}

</style>
