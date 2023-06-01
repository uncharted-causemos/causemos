<template>
  <div class="index-projections-expanded-node-container">
    <p class="add-horizontal-margin">{{ props.nodeData.name ?? 'none' }}</p>
    <span v-if="props.nodeData.name.length === 0" class="subdued add-horizontal-margin"
      >(Missing name)</span
    >
    <div v-if="isConceptNodeWithDatasetAttached(props.nodeData)">
      <div class="add-horizontal-margin timeseries-label">
        <i class="fa fa-fw" :class="DATASET_ICON" :style="{ color: DATASET_COLOR }" />
        <span class="subdued un-font-small">{{ dataSourceText }}</span>
        <OptionsButton :dropdown-below="true" :wider-dropdown-options="true">
          <template #content>
            <div
              v-for="item in optionsButtonMenu"
              class="dropdown-option"
              :key="item.text"
              @click="item.onClick()"
            >
              {{ item.text }}
            </div>
          </template>
        </OptionsButton>
      </div>
      <IndexProjectionsExpandedNodeTimeseries
        class="timeseries add-horizontal-margin"
        :projection-start-timestamp="projectionStartTimestamp"
        :projection-end-timestamp="projectionEndTimestamp"
        :timeseries="timeseries"
        @click-chart="(...params) => emit('click-chart', ...params)"
        :is-weighted-sum-node="false"
      />

      <div class="dataset-metadata add-horizontal-margin">
        <p class="margin-top">Dataset description</p>
        <p class="subdued un-font-small">{{ outputDescription }}</p>
        <p class="margin-top">Source: {{ props.nodeData.dataset.source }}</p>
        <p class="subdued un-font-small">{{ metadata?.description }}</p>
        <button class="btn btn-default margin-top" disabled>Explore dataset</button>
      </div>
    </div>

    <div v-else-if="isEmptyNode(props.nodeData)">
      <div class="add-horizontal-margin timeseries-label">
        <i class="fa fa-fw fa-exclamation-triangle warning" />
        <span class="un-font-small warning">{{ dataSourceText }}</span>
        <button class="btn btn-default" disabled>Enter data points</button>
      </div>
      <div class="timeseries add-horizontal-margin warning"><!-- TODO: --></div>
    </div>

    <div v-else>
      <div class="add-horizontal-margin timeseries-label">
        <span class="subdued un-font-small">{{ dataSourceText }}</span>
      </div>
      <IndexProjectionsExpandedNodeTimeseries
        class="timeseries add-horizontal-margin"
        :class="{ edit: editMode === EditMode.Constraints }"
        :projection-start-timestamp="projectionStartTimestamp"
        :projection-end-timestamp="projectionEndTimestamp"
        :timeseries="timeseries"
        @click-chart="(...params) => emit('click-chart', ...params)"
        :is-weighted-sum-node="true"
      />
    </div>
  </div>
</template>

<script lang="ts">
import { ConceptNode } from '@/types/Index';
import {
  DATASET_COLOR,
  DATASET_ICON,
  getNodeDataSourceText,
  isConceptNodeWithDatasetAttached,
  isEmptyNode,
} from '@/utils/index-tree-util';
import OptionsButton from '../widgets/options-button.vue';
import { computed } from 'vue';
import IndexProjectionsExpandedNodeTimeseries from './index-projections-expanded-node-timeseries.vue';
import { ProjectionTimeseries } from '@/types/Timeseries';
import useModelMetadataSimple from '@/services/composables/useModelMetadataSimple';

export enum EditMode {
  Constraints,
  DataPoints,
}
</script>
<script setup lang="ts">
const optionsButtonMenu = [
  {
    text: 'Edit data points',
    onClick: () => {
      console.log('This feature is under development.');
    },
  },
  {
    text: 'Remove dataset',
    onClick: () => {
      console.log('This feature is under development.');
    },
  },
  {
    text: 'Select another dataset',
    onClick: () => {
      console.log('This feature is under development.');
    },
  },
];

const props = defineProps<{
  nodeData: ConceptNode;
  projectionStartTimestamp: number;
  projectionEndTimestamp: number;
  timeseries: ProjectionTimeseries[];
  editMode?: EditMode;
}>();

const emit = defineEmits<{
  (e: 'click-chart', timestamp: number, value: number): void;
}>();

const dataSourceText = computed(() => getNodeDataSourceText(props.nodeData));

const dataId = computed(() => {
  if (!isConceptNodeWithDatasetAttached(props.nodeData)) {
    return null;
  }
  return props.nodeData.dataset.config.datasetId;
});
const outputVariable = computed(() => {
  if (!isConceptNodeWithDatasetAttached(props.nodeData)) {
    return null;
  }
  return props.nodeData.dataset.config.outputVariable;
});

const { metadata, outputDescription } = useModelMetadataSimple(dataId, outputVariable);
</script>

<style lang="scss" scoped>
@import '@/styles/uncharted-design-tokens';
@import '@/styles/index-graph';
@import '@/styles/common';

$expanded-node-width: $index-tree-node-width * 2 + $space-between-columns;
$horizontal-margin: 30px;

.index-projections-expanded-node-container {
  @include index-tree-node;
  padding: 10px 0;
  gap: 10px;
  width: $expanded-node-width;
}

.add-horizontal-margin {
  margin-left: $horizontal-margin;
  margin-right: $horizontal-margin;
}

.timeseries-label {
  display: flex;
  gap: 5px;
  align-items: center;

  span {
    flex: 1;
    min-width: 0;
  }
}

.timeseries {
  // $chartPadding should be kept in sync with the `projections-renderer.vue/PADDING_LEFT` constant.
  // It is used to make sure the start of the chart lines up with the other `.add-horizontal-margin`
  //  elements in this component, even though the left axis and svg have to extend past the margin.
  $chartPadding: 20px;
  $timeseriesWidth: $expanded-node-width - 2 * $horizontal-margin + $chartPadding;
  width: $timeseriesWidth;
  height: 1 / 4 * $timeseriesWidth + 40px;
  margin-top: 5px;
  margin-left: $horizontal-margin - $chartPadding;

  &.warning {
    :deep(g.focusMouseEventGroup) {
      outline: solid 2px $un-color-feedback-warning;
      outline-offset: -2px;
      cursor: pointer;
    }
  }
  &.edit {
    :deep(g.focusMouseEventGroup) {
      outline: solid 2px $accent-main;
      outline-offset: -2px;
      cursor: pointer;
    }
  }
}

.warning {
  color: $un-color-feedback-warning;
}

.dataset-metadata {
  margin-top: 10px;
  border-top: 1px solid $un-color-black-10;

  .margin-top {
    margin-top: 10px;
  }
}
</style>
