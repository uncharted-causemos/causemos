<template>
  <div
    class="histogram-arrow-container"
    :style="{ top, height }"
    :class="{ 'pointing-up': isPointingUp }"
  />
</template>

<script lang="ts">
import { computed, defineComponent, PropType, toRefs } from 'vue';
export default defineComponent({
  name: 'HistogramArrow',
  props: {
    arrow: {
      type: Object as PropType<{ from: number; to: number }>,
      required: true
    }
  },
  setup(props) {
    const { arrow } = toRefs(props);
    const { from, to } = arrow.value;
    const isPointingUp = computed(() => to < from);
    const top = computed(() => {
      let topIndex = Math.min(to, from);
      if (isPointingUp.value) {
        topIndex += 1;
      }
      return 20 * topIndex + '%';
    });
    return {
      height: computed(() => 20 * Math.abs(from - to) + '%'),
      isPointingUp,
      top
    };
  }
});
</script>

<style lang="scss" scoped>
$width: 10px;
$stem-width: 2px;

.histogram-arrow-container {
  position: absolute;
  width: $width;

  &::after {
    // Arrowhead
    content: '';
    display: block;
    width: $width;
    height: $width;
    position: absolute;
    bottom: 0;
    border-top: $width solid black;
    border-left: #{$width / 2} solid transparent;
    border-right: #{$width / 2} solid transparent;
  }

  &::before {
    // Stem of arrow
    content: '';
    display: block;
    top: $stem-width;
    height: calc(100% - #{2 * $stem-width});
    width: $stem-width;
    background: black;
    position: absolute;
    left: #{2 * $stem-width};
  }

  &.pointing-up::after {
    // Put arrowhead at the top instead of the bottom, and point it upward
    bottom: auto;
    top: 0px;
    border-top: none;
    border-bottom: $width solid black;
    border-left: #{$width / 2} solid transparent;
    border-right: #{$width / 2} solid transparent;
  }
}
</style>
