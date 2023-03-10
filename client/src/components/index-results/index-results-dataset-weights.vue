<template>
  <div class="index-results-dataset-weights-container">
    <header>
      <h4>Datasets weights</h4>
      <p class="de-emphasized">with respect to {{ 'Overall Priority' }}</p>
    </header>
    <div class="list-items">
      <div v-for="item of listItems" :key="item.dataset.id" class="list-item">
        <i
          class="fa fa-fw"
          :style="{ color: getIndexNodeTypeColor(IndexNodeType.Dataset) }"
          :class="[getIndexNodeTypeIcon(IndexNodeType.Dataset)]"
        />
        <span class="name">{{ item.dataset.name }}</span>
        <IndexResultsDatasetWeight :weight="item.overallWeight" />
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import _ from 'lodash';
import useIndexTree from '@/services/composables/useIndexTree';
import {
  calculateOverallWeight,
  findAllDatasets,
  getIndexNodeTypeColor,
  getIndexNodeTypeIcon,
} from '@/utils/index-tree-util';
import { computed } from 'vue';
import { IndexNodeType } from '@/types/Enums';
import IndexResultsDatasetWeight from './index results-dataset-weight.vue';

const { tree } = useIndexTree();

const listItems = computed(() => {
  const datasets = findAllDatasets(tree.value);
  const unsortedResults = datasets.map((dataset) => ({
    dataset,
    overallWeight: calculateOverallWeight(tree.value, dataset),
  }));
  // Sort descending, by weight
  return _.sortBy(unsortedResults, (item) => -item.overallWeight);
});
</script>

<style lang="scss" scoped>
@import '~styles/uncharted-design-tokens';
.index-results-dataset-weights-container {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.de-emphasized {
  color: $un-color-black-40;
}

.list-item {
  display: flex;
  padding: 5px 0;
  align-items: center;
  gap: 5px;
}

.name {
  flex: 1;
  min-width: 0;
  overflow-x: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
</style>
