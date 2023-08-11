<template>
  <div class="index-projections-node-container" @click="emit('select', props.nodeData.id)">
    <div class="content node-header">
      {{ props.nodeData.name }}
      <span v-if="props.nodeData.name.length === 0" class="subdued">(Missing name)</span>
    </div>

    <div v-if="isConceptNodeWithDatasetAttached(props.nodeData)">
      <div class="content timeseries-label" style="display: flex">
        <i class="fa fa-fw" :class="DATASET_ICON" :style="{ color: DATASET_COLOR }" />
        <span class="subdued un-font-small overflow-ellipsis dataset-name">{{
          dataSourceText
        }}</span>
        <InvertedDatasetLabel class="inverted-label" v-if="isInvertedData" />
      </div>
      <IndexProjectionsNodeTimeseries
        class="timeseries"
        :class="{
          'outside-norm-viewable': showDataOutsideNorm,
        }"
        :projection-start-timestamp="projectionStartTimestamp"
        :projection-end-timestamp="projectionEndTimestamp"
        :timeseries="timeseries"
        :show-data-outside-norm="showDataOutsideNorm"
        :is-weighted-sum-node="false"
        :is-inverted="isInvertedData"
      />
      <IndexProjectionsNodeWarning class="warning-section" :data-warnings="dataWarnings" />
    </div>

    <div v-else-if="isEmptyNode(props.nodeData)" class="content">
      <span class="un-font-small warning">{{ dataSourceText }}</span>
    </div>

    <div v-else>
      <div class="content timeseries-label">
        <span class="subdued un-font-small overflow-ellipsis">{{ dataSourceText }}</span>
      </div>
      <IndexProjectionsNodeTimeseries
        class="timeseries"
        :class="{
          'outside-norm-viewable': showDataOutsideNorm,
        }"
        :projection-start-timestamp="projectionStartTimestamp"
        :projection-end-timestamp="projectionEndTimestamp"
        :timeseries="timeseries"
        :show-data-outside-norm="showDataOutsideNorm"
        :is-weighted-sum-node="true"
        :is-inverted="isInvertedData"
      />
    </div>
  </div>
</template>

<script setup lang="ts">
import { ConceptNode, IndexProjectionNodeDataWarning } from '@/types/Index';
import {
  DATASET_COLOR,
  DATASET_ICON,
  getNodeDataSourceText,
  isConceptNodeWithDatasetAttached,
  isEmptyNode,
} from '@/utils/index-tree-util';
import { computed } from 'vue';
import IndexProjectionsNodeTimeseries from './index-projections-node-timeseries.vue';
import IndexProjectionsNodeWarning from './index-projections-node-warning.vue';
import { ProjectionTimeseries } from '@/types/Timeseries';
import InvertedDatasetLabel from '@/components/widgets/inverted-dataset-label.vue';

const props = defineProps<{
  nodeData: ConceptNode;
  projectionStartTimestamp: number;
  projectionEndTimestamp: number;
  timeseries: ProjectionTimeseries[];
  showDataOutsideNorm: boolean;
  dataWarnings?: IndexProjectionNodeDataWarning[];
}>();

const emit = defineEmits<{
  (e: 'select', nodeId: string): void;
}>();

const dataSourceText = computed(() => getNodeDataSourceText(props.nodeData));
const isInvertedData = computed(() =>
  isConceptNodeWithDatasetAttached(props.nodeData) ? props.nodeData.dataset.isInverted : false
);
</script>

<style lang="scss" scoped>
@import '@/styles/uncharted-design-tokens';
@import '@/styles/index-graph';
@import '@/styles/common';

.index-projections-node-container {
  @include index-tree-node;

  &:hover {
    @include index-tree-node-hover;
  }
}

.content {
  @include index-tree-node-content;
}

.node-header {
  padding-bottom: 0;
}

.timeseries-label {
  display: flex;
  gap: 5px;
  align-items: center;

  .dataset-name {
    flex: 1;
    min-width: 0;
  }

  .inverted-label {
    flex: initial;
    min-width: initial;
  }
}

.timeseries {
  border-top: 1px solid $un-color-black-10;
  display: flex;
}
.warning-section {
  border-top: 1px solid $un-color-black-10;
}

.warning {
  color: $un-color-feedback-warning;
}

.full-width-button {
  width: 100%;
}
</style>
