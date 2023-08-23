<template>
  <div class="index-results-dataset-weights-container">
    <header>
      <h4>Datasets weights</h4>
      <p class="de-emphasized">with respect to {{ props.selectedNodeName }}</p>
    </header>
    <div class="list-items">
      <div v-for="item of listItems" :key="item.conceptWithDataset.id" class="list-item">
        <i class="fa fa-fw" :style="{ color: DATASET_COLOR }" :class="[DATASET_ICON]" />
        <span class="name">{{ item.conceptWithDataset.name }}</span>
        <InvertedDatasetLabel
          v-if="item.conceptWithDataset.dataset.isInverted"
          v-tooltip.top="getInvertedTooltip(item)"
        />
        <span
          v-if="item.oppositeEdgeCount > 0"
          v-tooltip.top="getOppositeEdgeTooltip(item)"
          class="opposite-edges"
        >
          <i class="fa fa-fw fa-arrow-right" :style="{ color: NEGATIVE_COLOR }" />
          <span v-if="item.oppositeEdgeCount > 1">{{ item.oppositeEdgeCount }}</span>
        </span>
        <IndexResultsDatasetWeight class="dataset-weight" :weight="item.overallWeight" />
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import _ from 'lodash';
import useIndexTree from '@/composables/useIndexTree';
import {
  calculateOverallWeight,
  findAllDatasets,
  DATASET_COLOR,
  DATASET_ICON,
  countOppositeEdgesBetweenNodes,
} from '@/utils/index-tree-util';
import { computed } from 'vue';
import IndexResultsDatasetWeight from './index-results-dataset-weight.vue';
import InvertedDatasetLabel from '../widgets/inverted-dataset-label.vue';
import { NEGATIVE_COLOR } from '@/utils/colors-util';
import { ConceptNodeWithDatasetAttached } from '@/types/Index';

const props = defineProps<{ selectedNodeName: string }>();

const { tree } = useIndexTree();

interface ListItem {
  conceptWithDataset: ConceptNodeWithDatasetAttached;
  oppositeEdgeCount: number;
  overallWeight: number;
}

const getInvertedTooltip = (item: ListItem) => {
  return `High ${item.conceptWithDataset.dataset.datasetName} values represent low ${item.conceptWithDataset.name} values.`;
};

const getOppositeEdgeTooltip = (item: ListItem) => {
  const count = item.oppositeEdgeCount;
  const isOppositeEdgeCountOdd = count % 2 === 1;
  return `There ${count === 1 ? 'is' : 'are'} ${count} opposite-polarity edge${
    count === 1 ? '' : 's'
  } between ${item.conceptWithDataset.name} and ${tree.value.name}, so ${
    item.conceptWithDataset.name
  } represents ${isOppositeEdgeCountOdd ? 'low' : 'high'} ${tree.value.name} values.`;
};

const listItems = computed(() => {
  const conceptsWithDatasets = findAllDatasets(tree.value);
  const unsortedResults = conceptsWithDatasets.map(
    (conceptWithDataset): ListItem => ({
      conceptWithDataset,
      oppositeEdgeCount: countOppositeEdgesBetweenNodes(conceptWithDataset, tree.value),
      overallWeight: calculateOverallWeight(tree.value, conceptWithDataset),
    })
  );
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

.opposite-edges {
  margin-right: 5px;
}
</style>
