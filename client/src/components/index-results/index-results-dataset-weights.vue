<template>
  <div class="index-results-dataset-weights-container">
    <header>
      <h4>Datasets weights</h4>
      <p class="de-emphasized">with respect to {{ props.selectedNodeName }}</p>
    </header>
    <div class="list-items">
      <div v-for="item of listItems" :key="item.dataset.id" class="list-item">
        <i class="fa fa-fw" :style="{ color: DATASET_COLOR }" :class="[DATASET_ICON]" />
        <span class="name">{{ item.dataset.name }}</span>
        <i
          v-if="item.oppositeEdgeCount > 0"
          v-tooltip.top="item.dataset.name + ' represents low ' + tree.name + ' values.'"
          class="fa fa-fw fa-arrow-right"
          :style="{ color: NEGATIVE_COLOR }"
        />
        <span v-if="item.oppositeEdgeCount > 1">{{ item.oppositeEdgeCount }}</span>
        <InvertedDatasetLabel v-if="item.dataset.dataset.isInverted" />
        <IndexResultsDatasetWeight class="dataset-weight" :weight="item.overallWeight" />
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
  DATASET_COLOR,
  DATASET_ICON,
} from '@/utils/index-tree-util';
import { computed } from 'vue';
import IndexResultsDatasetWeight from './index-results-dataset-weight.vue';
import InvertedDatasetLabel from '../widgets/inverted-dataset-label.vue';
import { countOppositeEdgesBetweenNodes } from '@/utils/index-results-util';
import { NEGATIVE_COLOR } from '@/utils/colors-util';

const props = defineProps<{ selectedNodeName: string }>();

const { tree } = useIndexTree();

const listItems = computed(() => {
  const datasets = findAllDatasets(tree.value);
  const unsortedResults = datasets.map((dataset) => ({
    dataset,
    oppositeEdgeCount: countOppositeEdgesBetweenNodes(dataset, tree.value),
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

.dataset-weight {
  // Nudge dataset weight upward to override text line-height and align weight with "inverted" label
  position: relative;
  bottom: 2px;
}
</style>
