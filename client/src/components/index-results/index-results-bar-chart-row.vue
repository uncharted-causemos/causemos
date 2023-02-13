<template>
  <div class="index-results-bar-chart-row-container">
    <div class="flex-col index-result-table-output-value-column">
      <div class="flex country-name-and-value">
        <p class="country-name">
          {{ `${props.rank}. ${props.rowData.countryName}` }}
        </p>
        <p>{{ precisionFormatter(props.rowData.value) }}</p>
      </div>
      <div class="bar-background">
        <div class="bar" :style="{ width: `${props.rowData.value ?? 0}%` }" />
      </div>
    </div>
    <div v-if="props.isExpanded" class="flex-col index-result-table-key-datasets-column">
      <div v-for="dataset of keyDatasets" :key="dataset.datasetId" class="flex key-dataset-row">
        <p class="index-result-table-dataset-name-column un-font-small">
          {{ dataset.datasetName }}
        </p>
        <p class="de-emphasized index-result-table-dataset-weight-column un-font-small">
          {{ precisionFormatter(dataset.weight) }}%
        </p>
        <div class="index-result-table-dataset-value-column">
          <p class="de-emphasized un-font-small">{{ precisionFormatter(dataset.value) }}</p>
        </div>
      </div>
      <button class="btn btn-sm" @click="isShowingAllDatasets = !isShowingAllDatasets">
        {{ isShowingAllDatasets ? 'Hide' : 'Show' }} other {{ '11' }} datasets
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
import precisionFormatter from '@/formatters/precision-formatter';
import { ref } from 'vue';

const props = defineProps<{
  rank: number;
  rowData: {
    countryName: string;
    value: number | null;
  };
  isExpanded: boolean;
}>();

const isShowingAllDatasets = ref(false);
// TODO: replace with real data
const keyDatasets = [
  {
    datasetId: '1',
    datasetName: 'World population by country',
    weight: 12,
    value: 100,
  },
  {
    datasetId: '2',
    datasetName: 'Highest poverty index ranking',
    weight: 36,
    value: 80,
  },
  {
    datasetId: '3',
    datasetName: 'Greatest recent temperature increase',
    weight: 9,
    value: 28,
  },
];
</script>

<style lang="scss" scoped>
@import '@/styles/variables';
@import '@/styles/uncharted-design-tokens';
@import '@/styles/index-results';
.index-results-bar-chart-row-container {
  display: flex;
  gap: $index-result-table-column-gap;
}

.country-name-and-value {
  gap: 10px;
}

.country-name {
  flex: 1;
  min-width: 0;
  text-overflow: ellipsis;
  overflow: hidden;
  white-space: nowrap;
}

.bar-background {
  position: relative;
  height: 20px;
  // TODO: move border inside
  border: 1px solid $un-color-black-10;
}
.bar {
  position: absolute;
  top: 0;
  left: 0;
  height: 100%;
  background: $accent-main;
}

.index-result-table-key-datasets-column {
  // Align the top of the key datasets list with the top of the overall value bar.
  margin-top: 17px;
  gap: 10px;

  button {
    align-self: flex-start;
    margin-top: 5px;
  }
}

.key-dataset-row {
  gap: $index-result-table-key-datasets-column-gap;
}

.index-result-table-dataset-name-column {
  white-space: nowrap;
  text-overflow: ellipsis;
  overflow: hidden;
}

.de-emphasized {
  color: $un-color-black-40;
}
</style>
