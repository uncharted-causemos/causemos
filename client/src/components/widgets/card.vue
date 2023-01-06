<template>
  <div class="card-container" :class="{ hoverable: isHoverable }" @click="onClick">
    <slot />
  </div>
</template>

<script lang="ts">
import { defineComponent } from 'vue';

export default defineComponent({
  name: 'Card',
  props: {
    isHoverable: {
      type: Boolean,
      default: true,
    },
  },
  emits: ['click'],
  methods: {
    onClick() {
      this.$emit('click');
    },
  },
});
</script>

<style lang="scss" scoped>
@import '~styles/variables.scss';

.card-container {
  background-color: white;
  position: relative;
  border-radius: 3px;
  transition: all 0.15s;
  transform: none;

  /*
    Animating the opacity on a pseudo element drop-shadow
    is more performant than animating the colour of a box-shadow
    property directly.
  */
  &::after {
    content: '';
    position: absolute;
    opacity: 0.66;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    box-shadow: $shadow-level-1;
    transition: all 0.15s;
    border-radius: 3px;
    pointer-events: none;
  }

  &.hoverable:hover {
    cursor: pointer;
    transform: translateY(-2px);

    &::after {
      opacity: 1;
    }
  }
}
</style>
