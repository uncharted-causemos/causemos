<template>
  <button
    :disabled="disabled"
    @click="onClick">
    {{ label }}
  </button>
</template>

<script>
export default {
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
  methods: {
    onClick(e) {
      this.$emit('click', e);
    }
  }
};
</script>


<style lang="scss" scoped>
button {
  background: #F0F0F0;
  color: #5A5A5A;
  border: none;
  padding: 1px 8px 3px; // Hack to center text
  border-radius: 2px;
  font-size: 12px;
  height: 20px;

  &:hover {
    color: #000;
  }
  &:disabled {
    color: #c6c6c6;
  }
}
</style>
