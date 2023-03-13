<template>
  <div class="index-result-dataset-weight-container">
    <span>{{ precisionFormatter(props.weight) }}%</span>
    <div class="bar-background">
      <div class="bar-filled" :style="{ width: `${props.weight}%` }" />
    </div>
  </div>
</template>

<script setup lang="ts">
import precisionFormatter from '@/formatters/precision-formatter';

const props = defineProps<{ weight: number }>();
</script>

<style lang="scss" scoped>
@import '~styles/uncharted-design-tokens';
.index-result-dataset-weight-container {
  display: flex;
  position: relative;
  // The number text is approximately 6 characters wide when it has two leading digits, e.g. 50.00%
  width: 6ch;
}

.bar-background {
  background: $un-color-black-5;
  height: 4px;
  width: 100%;
  position: absolute;
  top: calc(100% - 2px);
  right: 0;
}
.bar-filled {
  background: $un-color-black-30;
  position: absolute;
  top: 0;
  left: 0;
  height: 100%;
  // width: set dynamically on the bar element
}
</style>
