<template>
  <div class="map-legend-container">
    <div
      v-for="d in data"
      :key="d.color"
    >
      <div class="color" v-bind:style="{backgroundColor: d.color }">1</div>
      <span class="label">2</span>
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
      default: [
        {
          color: '#4d9221',
          label: '> 100'
        },
        {
          color: '#a1d76a',
          label: '1'
        },
        {
          color: '#e6f5d0',
          label: '> 100'
        },
        {
          color: '#f7f7f7',
          label: '> 100'
        },
        {
          color: '#fde0ef',
          label: '> 100'
        },
        {
          color: '#e9a3c9',
          label: '> 100'
        },
        {
          color: '#c51b7d',
          label: '> 100'
        }
      ]
    }
  }
});
</script>
<style lang="scss" scoped>
</style>
