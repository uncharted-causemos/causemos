<template>
  <button :disabled="disabled" @click="onClick">
    <slot name="leading" />
    {{ label }}
    <slot name="trailing" />
  </button>
</template>

<script lang="ts">
import { defineComponent } from 'vue';

export default defineComponent({
  name: 'SmallTextButton',
  props: {
    label: {
      type: String,
      default: 'Label'
    },
    disabled: {
      type: Boolean,
      default: false
    }
  },
  emits: ['click'],
  methods: {
    onClick(e: Event) {
      this.$emit('click', e);
    }
  }
});
</script>

<style lang="scss" scoped>
@import '~styles/variables';
button {
  background: #f0f0f0;
  color: #5a5a5a;
  border: none;
  padding: 1px 8px 3px; // Hack to center text
  border-radius: 2px;
  font-size: $font-size-small;
  height: 20px;
  cursor: pointer;

  &:hover {
    color: #000;
  }
  &:disabled {
    color: #c6c6c6;
    cursor: default;
  }
}
</style>
