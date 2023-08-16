<template>
  <div class="index-projections-expanded-node-container">
    <p class="add-horizontal-margin">{{ props.nodeData.name ?? 'none' }}</p>
    <span v-if="props.nodeData.name.length === 0" class="subdued add-horizontal-margin"
      >(Missing name)</span
    >
    <div v-if="isConceptNodeWithDatasetAttached(props.nodeData)">
      <div class="add-horizontal-margin timeseries-label">
        <i class="fa fa-fw" :class="DATASET_ICON" :style="{ color: DATASET_COLOR }" />
        <span class="subdued un-font-small dataset-name">{{ dataSourceText }}</span>
        <InvertedDatasetLabel class="inverted-label" v-if="isInvertedData" />
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
        :class="{
          edit: editMode === EditMode.Constraints,
          'outside-norm-viewable': showDataOutsideNorm,
        }"
        :projection-start-timestamp="projectionStartTimestamp"
        :projection-end-timestamp="projectionEndTimestamp"
        :timeseries="timeseries"
        :show-data-outside-norm="showDataOutsideNorm"
        @click-chart="(...params) => emit('click-chart', ...params)"
        :is-weighted-sum-node="false"
        :is-inverted="isInvertedData"
      />

      <IndexProjectionsExpandedNodeWarning
        class="warning-section add-horizontal-margin"
        :data-warnings="dataWarnings"
      />

      <IndexProjectionsExpandedNodeResilience
        class="add-horizontal-margin"
        :node-data="nodeData"
        :historical-data="historicalData"
        :constraints="constraints"
        :projection-temporal-resolution-option="projectionTemporalResolutionOption"
        :projection-start-timestamp="projectionStartTimestamp"
        :projection-end-timestamp="projectionEndTimestamp"
        :projection-timeseries="timeseries"
      />

      <div class="dataset-metadata add-horizontal-margin">
        <p class="margin-top">Dataset description</p>
        <p class="subdued un-font-small">{{ outputDescription }}</p>
        <p class="margin-top">Source: {{ props.nodeData.dataset.source }}</p>
        <p class="subdued un-font-small">{{ metadata?.description }}</p>
        <button
          class="btn btn-default margin-top"
          @click="navigateToDataset"
          :disabled="metadata !== null"
        >
          <i class="fa fa-fw fa-cube" />Explore dataset
        </button>
      </div>
    </div>

    <div v-else-if="isEmptyNode(props.nodeData)">
      <div class="add-horizontal-margin timeseries-label">
        <i class="fa fa-fw fa-exclamation-triangle warning" />
        <span class="un-font-small warning">{{ dataSourceText }}</span>
      </div>
      <div class="timeseries add-horizontal-margin warning"><!-- TODO: --></div>
    </div>

    <div v-else>
      <div class="add-horizontal-margin timeseries-label">
        <span class="subdued un-font-small">{{ dataSourceText }}</span>
      </div>
      <IndexProjectionsExpandedNodeTimeseries
        class="timeseries add-horizontal-margin"
        :class="{
          edit: editMode === EditMode.Constraints,
          'outside-norm-viewable': showDataOutsideNorm,
        }"
        :projection-start-timestamp="projectionStartTimestamp"
        :projection-end-timestamp="projectionEndTimestamp"
        :timeseries="timeseries"
        :show-data-outside-norm="showDataOutsideNorm"
        @click-chart="(...params) => emit('click-chart', ...params)"
        :is-weighted-sum-node="true"
        :is-inverted="isInvertedData"
      />
    </div>
  </div>
</template>

<script setup lang="ts">
import { ConceptNode, IndexProjectionNodeDataWarning, ProjectionConstraint } from '@/types/Index';
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
import { ProjectionTimeseries, TimeseriesPoint } from '@/types/Timeseries';
import useModelMetadataSimple from '@/services/composables/useModelMetadataSimple';
import InvertedDatasetLabel from '@/components/widgets/inverted-dataset-label.vue';
import { EditMode } from '@/utils/projection-util';
import IndexProjectionsExpandedNodeWarning from './index-projections-expanded-node-warning.vue';
import IndexProjectionsExpandedNodeResilience from './index-projections-expanded-node-resilience.vue';
import { TemporalResolutionOption } from '@/types/Enums';

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
  historicalData: { countryName: string; points: TimeseriesPoint[] };
  constraints: { scenarioId: string; constraints: ProjectionConstraint[] }[];
  projectionStartTimestamp: number;
  projectionEndTimestamp: number;
  projectionTemporalResolutionOption: TemporalResolutionOption;
  timeseries: ProjectionTimeseries[];
  showDataOutsideNorm: boolean;
  editMode?: EditMode;
  dataWarnings?: IndexProjectionNodeDataWarning[];
}>();

const emit = defineEmits<{
  (e: 'click-chart', timestamp: number, value: number): void;
  (e: 'open-drilldown', datacubeId: string, datacubeItemId: string): void;
}>();

const dataSourceText = computed(() => getNodeDataSourceText(props.nodeData));
const isInvertedData = computed(() =>
  isConceptNodeWithDatasetAttached(props.nodeData) ? props.nodeData.dataset.isInverted : false
);

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

const navigateToDataset = () => {
  if (metadata.value !== null) {
    const itemId = ''; // TODO: itemId is a qualitative analysis thing that we don't have access to yet. Interface will render but some controls will fail (generate errors)
    emit('open-drilldown', metadata.value.id, itemId);
  } else {
    throw new Error('Dataset metadata not assigned.  Drill-down aborted.');
  }
};
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
  // $chartPadding should be kept in sync with the `projections-renderer.vue/PADDING_LEFT` constant.
  // It is used to make sure the start of the chart lines up with the other `.add-horizontal-margin`
  //  elements in this component, even though the left axis and svg have to extend past the margin.
  $chartPadding: 20px;
  display: flex; // prevents a slight change in node size when showing outside norm values.
  margin-top: 5px;
  margin-left: $horizontal-margin - $chartPadding;
  width: $expanded-node-width - 2 * $horizontal-margin + $chartPadding;

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

.warning-section {
  margin-top: 10px;
  border-top: 1px solid $un-color-black-10;
}

.dataset-metadata {
  margin-top: 10px;
  margin-bottom: 10px;
  border-top: 1px solid $un-color-black-10;

  .margin-top {
    margin-top: 10px;
  }
}
</style>
