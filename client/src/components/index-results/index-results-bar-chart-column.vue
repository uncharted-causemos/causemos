<template>
  <div class="index-results-bar-chart-column-container flex-col">
    <header class="flex-col">
      <div class="flex">
        <h5>
          Countries ranked by <strong>{{ 'Overall Priority' }}</strong>
        </h5>
        <button class="btn btn-sm" @click="emit('toggle-is-showing-key-datasets')">
          {{ isShowingKeyDatasets ? 'Hide' : 'Show' }} key datasets for each country
        </button>
      </div>
      <div v-if="isShowingKeyDatasets" class="table-header">
        <p class="index-result-table-output-value-column" />
        <div class="key-datasets-labels index-result-table-key-datasets-column">
          <p class="index-result-table-dataset-name-column">Key datasets</p>
          <p class="index-result-table-dataset-weight-column">Dataset weight</p>
          <p class="index-result-table-dataset-value-column">Country's value</p>
        </div>
      </div>
    </header>
    <div class="flex-col results-rows">
      <IndexResultsBarChartRow
        v-for="(country, index) of indexResultsData"
        :key="index"
        :rank="index + 1"
        :row-data="country"
        :is-expanded="isShowingKeyDatasets"
      />
    </div>
  </div>
</template>

<script setup lang="ts">
import IndexResultsBarChartRow from '@/components/index-results/index-results-bar-chart-row.vue';
import { IndexResultsData } from '@/types/Index';

defineProps<{
  isShowingKeyDatasets: boolean;
  indexResultsData: IndexResultsData[];
}>();

const emit = defineEmits<{
  (e: 'toggle-is-showing-key-datasets'): void;
}>();
</script>

<style lang="scss" scoped>
@import '@/styles/uncharted-design-tokens';
@import '@/styles/index-results';
.index-results-bar-chart-column-container {
  overflow-y: auto;
  border-right: 1px solid $un-color-black-10;
  gap: 20px;
  padding: 20px;
}

header {
  gap: 10px;
  h5 {
    flex: 1;
    min-width: 0;
  }
}

.results-rows {
  gap: 40px;
}
.table-header {
  display: flex;
  gap: $index-result-table-column-gap;
  .key-datasets-labels {
    display: flex;
    border-bottom: 1px solid $un-color-black-10;
    gap: $index-result-table-key-datasets-column-gap;
    align-items: flex-end;
  }
}
</style>