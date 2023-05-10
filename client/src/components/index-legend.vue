<template>
  <div class="index-legend-container">
    <!-- TODO: icons and styling -->
    <div v-if="props.isProjectionSpace" class="legend-column">
      <p class="un-font-small">Concepts with datasets attached</p>
      <p class="un-font-small">Constraint</p>
      <p class="un-font-small">Dataset value</p>
      <p class="un-font-small">Interpolated data</p>
      <p class="un-font-small">Extrapolated data</p>
    </div>
    <div v-if="props.isProjectionSpace" class="legend-column">
      <p class="un-font-small">Concepts without datasets</p>
      <p class="un-font-small">Constraint</p>
      <p class="un-font-small">All components have values</p>
      <p class="un-font-small">Some components do not have values</p>
    </div>
    <div class="legend-column">
      <p class="un-font-small">Relationships</p>
      <p class="un-font-small">High levels of A represent <span>high</span> levels of B</p>
      <p class="un-font-small">Low levels of A represent <span>low</span> levels of B</p>
    </div>
    <div v-if="props.isProjectionSpace" class="legend-column">
      <p class="un-font-small">Data quality</p>
      <p class="un-font-small">Old data</p>
      <p class="un-font-small">Ignored due to insufficient data</p>
    </div>
  </div>
</template>

<script setup lang="ts">
const props = defineProps<{ isProjectionSpace: boolean }>();
</script>

<style lang="scss" scoped>
@import '@/styles/uncharted-design-tokens';
.index-legend-container {
  display: flex;
  padding: 10px 20px;
  background: white;
  border-radius: 3px 3px 0 0;
}

.legend-column {
  flex: 1;
  min-width: 0;

  p:not(:first-child) {
    color: $un-color-black-40;
  }
}
</style>
