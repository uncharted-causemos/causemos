<template>
  <div class="index-results-bar-chart-column-container flex-col">
    <header class="flex-col">
      <div class="flex">
        <button
          class="btn btn-sm toggle-key-datasets-button"
          @click="emit('toggle-is-showing-key-datasets')"
        >
          {{ isShowingKeyDatasets ? 'Hide' : 'Show' }} key datasets for each country
        </button>
      </div>
      <div class="table-header">
        <div class="index-result-table-output-value-column flex">
          <p class="index-result-table-dataset-country-column">Country</p>
          <p v-if="!isShowingKeyDatasets">{{ props.selectedNodeName }}</p>
        </div>
        <div
          v-if="isShowingKeyDatasets"
          class="key-datasets-labels index-result-table-key-datasets-column"
        >
          <p class="index-result-table-dataset-name-column">Key datasets</p>
          <p class="index-result-table-dataset-weight-column">Dataset weight</p>
          <p class="index-result-table-dataset-value-column">Country's value</p>
        </div>
      </div>
    </header>
    <div class="flex-col results-rows">
      <IndexResultsBarChartRow
        v-for="(data, index) of indexResultsData"
        :key="index"
        :rank="index + 1"
        :row-data="data"
        :color="colorConfig.scaleFn(data.value || 0)"
        :is-expanded="isShowingKeyDatasets"
      />
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import IndexResultsBarChartRow from '@/components/index-results/index-results-bar-chart-row.vue';
import { IndexResultsData, IndexResultsSettings } from '@/types/Index';
import { getIndexResultsColorConfig } from '@/utils/index-results-util';

const props = defineProps<{
  isShowingKeyDatasets: boolean;
  indexResultsData: IndexResultsData[];
  indexResultsSettings: IndexResultsSettings;
  selectedNodeName: string;
}>();

const emit = defineEmits<{
  (e: 'toggle-is-showing-key-datasets'): void;
}>();

const colorConfig = computed(() =>
  getIndexResultsColorConfig(props.indexResultsData, props.indexResultsSettings)
);
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

.toggle-key-datasets-button {
  width: 100%;
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
  border-bottom: 1px solid $un-color-black-10;
  color: $un-color-black-40;
  .key-datasets-labels {
    display: flex;
    gap: $index-result-table-key-datasets-column-gap;
    align-items: flex-end;
  }
}
</style>
