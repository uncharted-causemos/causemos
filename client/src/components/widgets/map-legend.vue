<template>
  <div class="map-legend-container">
    <div
      v-for="d in ramp"
      :key="d.color"
      class="color-row"
    >
      <span class="color-label">{{ d.label }}</span>
      <div class="color" v-bind:style="{backgroundColor: d.color }"></div>
    </div>
  </div>
</template>
<script lang="ts">
import { defineComponent, PropType } from 'vue';

export interface MapLegendColor {
  color: string;
  label?: string;
}

export default defineComponent({
  name: 'MapLegend',
  emits: [],
  props: {
    ramp: {
      type: Array as PropType<MapLegendColor[]>,
      default: []
    }
  }
});
</script>
<style lang="scss" scoped>
.color-row {
  margin: 2px;
  display: flex;
  flex-direction: row;
  justify-content: flex-end;
  flex-grow: 1;
}
.color {
  min-height: 17px;
  width: 17px;
}
.color-label {
  padding-right: 5px;
  font-size: 10px;
  display: inline-flex;
  align-items: center;
}
</style>
