<template>
  <div class="index-results-bar-chart-row-container">
    <div class="flex-col index-result-table-output-value-column">
      <div class="flex country-name-and-value">
        <p class="index-result-table-dataset-country-column">
          {{ `${props.rank}. ${props.rowData.countryName}` }}
        </p>
        <p>{{ precisionFormatter(props.rowData.value, 0) }}</p>
      </div>
      <div class="bar-background">
        <div
          class="bar"
          :style="{ width: `${props.rowData.value ?? 0}%`, background: props.color }"
        />
      </div>
    </div>
    <div v-if="props.isExpanded" class="flex-col index-result-table-key-datasets-column">
      <div
        v-for="dataset of visibleKeyDatasets"
        :key="dataset.dataset.id"
        class="flex key-dataset-row"
      >
        <p class="index-result-table-dataset-name-column un-font-small">
          {{ dataset.dataset.name }}
        </p>
        <p class="de-emphasized index-result-table-dataset-weight-column un-font-small">
          {{ precisionFormatter(dataset.overallWeight) }}%
        </p>
        <div class="index-result-table-dataset-value-column">
          <p class="de-emphasized un-font-small">{{ precisionFormatter(dataset.datasetValue) }}</p>
        </div>
        <min-max-info
          :placement="'left'"
          :dataset="dataset.dataset.dataset"
          :oppositeEdgeCount="indexTree.oppositeEdgeCountToRoot(dataset.dataset)"
        />
      </div>
      <button
        v-if="props.rowData.contributingDatasets.length > SHOW_TOP_N_DATASETS_BY_DEFAULT"
        class="btn btn-sm"
        @click="isShowingAllDatasets = !isShowingAllDatasets"
      >
        {{ showMoreToggleButtonLabel }}
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
import precisionFormatter from '@/formatters/precision-formatter';
import { IndexResultsData } from '@/types/Index';
import { ref, computed } from 'vue';
import MinMaxInfo from '@/components/min-max-info.vue';
import useIndexTree from '@/composables/useIndexTree';

const SHOW_TOP_N_DATASETS_BY_DEFAULT = 3;

const props = defineProps<{
  rank: number;
  rowData: IndexResultsData;
  color: string;
  isExpanded: boolean;
}>();

const indexTree = useIndexTree();
const isShowingAllDatasets = ref(false);

const visibleKeyDatasets = computed(() => {
  const keyDatasets = props.rowData.contributingDatasets;
  if (isShowingAllDatasets.value || keyDatasets.length <= SHOW_TOP_N_DATASETS_BY_DEFAULT) {
    return keyDatasets;
  }
  return keyDatasets.slice(0, SHOW_TOP_N_DATASETS_BY_DEFAULT);
});

const showMoreToggleButtonLabel = computed(() =>
  isShowingAllDatasets.value
    ? 'Show less'
    : `Show all ${props.rowData.contributingDatasets.length} datasets`
);
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

.index-result-table-dataset-country-column {
  text-overflow: ellipsis;
  overflow: hidden;
  white-space: nowrap;
}

.bar-background {
  position: relative;
  height: 20px;
  box-shadow: 0 0 0 1px $un-color-black-10 inset;
}
.bar {
  position: absolute;
  top: 0;
  left: 0;
  height: 100%;
}

.index-result-table-key-datasets-column {
  gap: 5px;

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
