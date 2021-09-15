<template>
  <div class="map-legend-container" v-bind:class="{ 'label-right': labelPosition.right, 'label-top': labelPosition.top }">
    <div
      v-for="d in ramp"
      :key="d.color"
      class="color-row"
    >
      <span class="color-label">{{ d.label }}</span>
      <div class="color" v-bind:style="{backgroundColor: d.color }"></div>
    </div>
    <span v-if="labelPosition.top" class="bottom-label">{{bottomLabel}}</span>
  </div>
</template>
<script lang="ts">
import { defineComponent, PropType } from 'vue';
import { MapLegendColor } from '@/types/Common';

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
    // Optional label placed on the bottom of the legend (when label position is top)
    bottomLabel: {
      type: String,
      default: ''
    }
  }
});
</script>
<style lang="scss" scoped>
.map-legend-container {
  position: relative;
}
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
.bottom-label {
  font-size: 10px;
  position: absolute;
  right: 24px;
  bottom: -5px;
}
.label-right {
  .color-row {
    flex-direction: row-reverse;
  }
  .color-label {
    padding-right: 0px;
    padding-left: 2px;
  }
  .bottom-label {
    left: 20px;
    bottom: -5px;
  }
}
.label-top {
  .color-label {
    position: relative;
    top: -8px;
    flex-direction: column;
    justify-content: space-between;
  }
}
</style>
