<template>
  <div class="map-legend-container">
    <div
      v-for="d in data"
      :key="d.color"
      class="color-row"
    >
      <div class="color" v-bind:style="{backgroundColor: d.color }"></div>
      <span class="color-label">{{ d.label }}</span>
    </div>
  </div>
</template>
<script lang="ts">
import { defineComponent, PropType } from 'vue';

export interface MapLegendData {
  color: string;
  label?: string;
}

export default defineComponent({
  name: 'MapLegend',
  emits: [],
  props: {
    data: {
      type: Array as PropType<MapLegendData[]>,
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
  justify-content: space-between;
}
.color {
  height: 17px;
  width: 17px;
}
.color-label {
  padding-left: 5px;
  font-size: 10px;
  display: inline-flex;
  align-items: center;
}
</style>
