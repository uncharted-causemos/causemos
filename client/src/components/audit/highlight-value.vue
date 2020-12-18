<template>
  <span :class="{ 'highlight': displayValue !== compareValue }">
    {{ displayValue }}
  </span>
</template>

<script>
export default {
  name: 'HighlightValue',
  props: {
    displayValue: {
      type: String,
      default: ''
    },
    compareValue: {
      type: String,
      default: ''
    }
  }
};
</script>

<style scoped lang='scss'>
  .highlight {
    background-color: rgb(255, 200, 168);
  }
</style>
