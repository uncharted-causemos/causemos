<template>
  <div
    class="arrow-button-container"
    :class="{ 'pointing-left': isPointingLeft, 'disabled': disabled }"
    @click="if (!disabled) $emit('click');"
  >
    <button
      v-tooltip.top-center="text"
      type="button"
      class="btn btn-call-to-action"
      :class="{ 'pointing-left': isPointingLeft }"
      :disabled="disabled"
    >
      <i class="fa fa-fw" :class="icon" />
      {{ text }}
    </button>
  </div>
</template>

<script lang="ts">
import { defineComponent } from 'vue';
export default defineComponent({
  name: 'ArrowButton',
  emits: ['click'],
  props: {
    text: {
      type: String,
      required: true
    },
    icon: {
      type: String,
      default: 'fa-connectdevelop'
    },
    isPointingLeft: {
      type: Boolean,
      default: false
    },
    disabled: {
      type: Boolean,
      default: false
    }
  }
});
</script>

<style lang="scss" scoped>
@import '~styles/variables';
// HACK: this is a hardcoded dependency on the Bootstrap .btn styles
$buttonHeight: 37px;
// This component adds a diamond behind the button to create the arrow effect
// The diagonal of the diamond should be the height of the button
// 2 ^ (-1 / 2) = 0.70710678118
$diamondSideLength: 0.70710678118 * $buttonHeight;

.arrow-button-container {
  isolation: isolate;
  position: relative;
  padding-right: $diamondSideLength / 2;

  // Apply disabled styles to the whole element (including the diamond)
  //  not just the button
  &.disabled {
    opacity: 0.65;
    cursor: not-allowed;
    pointer-events: all;

    button {
      opacity: 1;
    }

    &::before {
      cursor: not-allowed;
    }
  }

  &::before {
    content: '';
    position: absolute;
    z-index: -1;
    width: $diamondSideLength;
    height: $diamondSideLength;
    border-radius: 0px 4px 0px 4px;
    background: $call-to-action-color;
    cursor: pointer;
    // Rotate square into a diamond
    transform: rotate(45deg);
    top: ($buttonHeight - $diamondSideLength) / 2;
    // Attach it to the right side
    right: 0;
  }

  &.pointing-left {
    padding-right: 0;
    padding-left: $diamondSideLength / 2;

    &::before {
      right: auto;
      left: 0;
    }
  }
}

button,
button:hover,
button:active,
button:focus {
  color: white;
}
</style>
