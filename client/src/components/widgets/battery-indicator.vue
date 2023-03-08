<template>
  <div class="battery-indicator-container">
    <div v-for="bar in bars" :key="bar.id" class="bar" :class="{ isActive: bar.isActive }" />
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue';

const props = defineProps<{
  totalBarCount: number;
  activeBarCount: number;
}>();

const bars = computed(() => {
  return Array.from({ length: props.totalBarCount }, (_, i) => {
    return {
      id: i,
      isActive: i < props.activeBarCount,
    };
  });
});
</script>

<style lang="scss" scoped>
@import '~styles/uncharted-design-tokens';
.battery-indicator-container {
  display: flex;
  align-items: stretch;
  gap: 2px;
}

.bar {
  flex: 1;
  min-width: 0;
  background: $un-color-black-10;

  &.isActive {
    background: $un-color-black-50;
  }
}
</style>
