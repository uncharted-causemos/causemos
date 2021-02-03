<template>
  <div class="color-scale-container">
    <div class="color-scale" />
    <div class="labels">
      <label>{{ labels[0] }}</label>
      <label>{{ labels[1] }}</label>
    </div>
  </div>
</template>

<script>

import { COLOR_SCALES, createColorScaleCanvas } from '@/utils/render-util';
import { removeChildren } from '@/utils/dom-util';

export default {
  name: 'MapColorLegends',
  props: {
    labels: {
      type: Array,
      default: () => ['', '']
    },
    colorScaleName: {
      type: String,
      default: () => { return COLOR_SCALES.TURBO; }
    }
  },
  watch: {
    labels() {
      this.refresh();
    },
    colorScaleName() {
      this.refresh();
    }
  },
  mounted() {
    this.parentComponent = this.$parent;
    if (!this.parentComponent.mapObject) {
      return console.error('Parent element is not a map object');
    }
    this.refresh();
  },
  methods: {
    refresh() {
      const colorScale = this.$el.querySelector('.color-scale');
      removeChildren(colorScale).appendChild(createColorScaleCanvas(this.colorScaleName));
    }
  }
};
</script>

<style lang="scss" scoped>
@import "~styles/variables";

.color-scale-container {
  position: absolute;
  top: 0;
  right: 10px;
  z-index: 500;
  .labels {
    display: flex;
    justify-content: space-between;
  }
}
.color-scale {
  height: 10px;
}
.color-scale /deep/ canvas {
  height: 10px;
  width: 150px;
}
</style>
