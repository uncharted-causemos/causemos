<template>
  <button
    :class="{
      'has-dropdown': hasDropdown,
      'white-bg': useWhiteBg,
    }"
    @click="onClick"
  >
    <slot />
    <i v-if="hasDropdown" class="fa fa-fw fa-caret-down" />
  </button>
</template>

<script lang="ts">
import { defineComponent } from 'vue';

export default defineComponent({
  name: 'SmallIconButton',
  props: {
    useWhiteBg: {
      type: Boolean,
      default: false,
    },
    hasDropdown: {
      type: Boolean,
      default: false,
    },
  },
  emits: ['click'],
  methods: {
    onClick(e: Event) {
      this.$emit('click', e);
    },
  },
});
</script>

<style lang="scss" scoped>
@import '~styles/variables';

button {
  background: #f0f0f0;
  color: #5a5a5a;
  border: none;
  padding: 0;
  border-radius: 2px;
  font-size: $font-size-small;
  height: 20px;
  width: 20px;
  position: relative;
  cursor: pointer;

  &:not(.has-dropdown) i {
    // Center icon inside button
    position: absolute;
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%);
  }

  &:disabled {
    background: none;
    color: #d4d4d4;
  }

  &:not(:disabled):hover {
    color: #000;
  }

  &.has-dropdown {
    width: auto;
    padding-left: 4px;
  }

  &.white-bg {
    background: #fff;
  }
}
</style>
