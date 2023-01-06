<template>
  <svg class="svg">
    <rect width="100%" height="100%" />
  </svg>
</template>

<script lang="ts">
import { defineComponent } from 'vue';

export default defineComponent({
  name: 'aggregation-checklist-rectangle',
});
</script>

<style lang="scss" scoped>
.svg {
  width: 2px;
  height: 8px;
  top: -2px;
  position: relative;
  & .rect {
    fill: #000000;
    opacity: 100%;
  }
}
</style>
