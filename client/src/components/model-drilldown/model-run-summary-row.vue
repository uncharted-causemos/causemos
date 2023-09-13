<template>
  <div class="model-run-summary-row-container">
    <span class="parameter-name un-font-small">{{ parameter.name }}</span>
    <span class="parameter-value un-font-small" :style="{ color: color }">{{
      parameter.value
    }}</span>
  </div>
</template>

<script setup lang="ts">
import { ModelRunParameter } from '@/types/ModelRun';
defineProps<{
  parameter: ModelRunParameter;
  color: string;
}>();
</script>

<style lang="scss" scoped>
@import '@/styles/uncharted-design-tokens';
.model-run-summary-row-container {
  display: flex;
  gap: 5px;
  border-top: 1px solid $un-color-black-10;
  padding: 2px 0 1px;
}

.parameter-value {
  // This is the width of the "select model runs" button.
  // Forcing the parameter values to this width aligns them with the button.
  width: 122px;
}

.parameter-name {
  flex: 1;
  min-width: 0;
  overflow-x: hidden;
  text-overflow: ellipsis;
}
</style>
