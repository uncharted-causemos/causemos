<template>
  <span :class="{ highlight: displayValue !== compareValue }">
    {{ displayValue }}
  </span>
</template>

<script lang="ts">
import { defineComponent } from 'vue';

export default defineComponent({
  name: 'HighlightValue',
  props: {
    displayValue: {
      type: String,
      default: '',
    },
    compareValue: {
      type: String,
      default: '',
    },
  },
});
</script>

<style scoped lang="scss">
.highlight {
  background-color: rgb(255, 200, 168);
}
</style>
