<template>
  <div
    class="hideable-legend-container"
    :class="[showLegend ? '' : 'legend-hidden']"
    @click="toggleLegend"
  >
    <h4
      class="legend-label"
      :class="{'visible': !showLegend}"
    >
      LEGEND
    </h4>
    <div class="content">
      <slot />
    </div>
    <h4
      class="legend-label bottom"
      :class="{'visible': showLegend}"
    >
      HIDE
    </h4>
  </div>
</template>

<script>
export default {
  name: 'HideableLegend',
  data: () => ({
    showLegend: true
  }),
  methods: {
    toggleLegend() {
      this.showLegend = !this.showLegend;
    }
  }
};
</script>

<style lang="scss" scoped>
@import "~styles/variables";
@import "~styles/wm-theme/wm-theme";

$hover-nudge-height: 25px;
$padding: 10px;

.hideable-legend-container {
  box-shadow: $shadow-level-1;
  position: absolute;
  bottom: 0;
  left: 10px;
  padding: $padding;
  padding-bottom: $padding + $hover-nudge-height;
  z-index: map-get($z-index-order, column-selector);
  border-top-left-radius: 5px;
  border-top-right-radius: 5px;
  cursor: pointer;
  transform: translate3d(0, $hover-nudge-height, 0);
  transition: transform 0.15s ease-out;
  background: $color-background-lvl-2;

  .content {
    transition: opacity 0.2s ease;
  }

  &:hover {
    transform: translate3d(0, 0, 0);
  }

  &.legend-hidden {
    transform: translate3d(0, calc(100% - #{$hover-nudge-height}), 0);

    &:hover {
      transform: translate3d(0, calc(100% - #{2 * $hover-nudge-height}), 0);
    }

    .content {
      opacity: 0;
    }
  }
}

.legend-label {
  $font-size: 15px;

  color: $color-text-disable-light;
  position: absolute;
  top: 2.5px;
  left: 50%;
  transform: translateX(-50%);
  font-size: $font-size;
  line-height: $font-size;
  letter-spacing: 2px;
  margin: 0;
  opacity: 0;
  transition: opacity 0.2s ease;

  &.bottom {
    top: auto;
    bottom: ($hover-nudge-height + $padding - $font-size) / 2;
  }

  &.visible {
    opacity: 1;
  }
}

</style>
