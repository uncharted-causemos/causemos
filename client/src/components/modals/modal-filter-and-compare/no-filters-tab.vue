<template>
  <div class="no-filters-tab-container">
    <p v-if="areTabsDisabled" class="subdued un-font-small tab-description">
      No more than one model run may be selected to filter and compare
      {{ namesOfSplitByOptions }}.
    </p>
    <p class="tab-content">
      Aggregated data from all {{ namesOfSplitByOptions }} will be displayed.
    </p>
  </div>
</template>

<script setup lang="ts">
defineProps<{
  areTabsDisabled: boolean;
  namesOfSplitByOptions: string;
}>();
</script>

<style lang="scss" scoped>
@import '@/styles/uncharted-design-tokens';
@import '@/styles/modal-filter-and-compare';
.no-filters-tab-container {
}
</style>
