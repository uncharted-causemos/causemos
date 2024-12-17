<template>
  <div class="index-projections-expanded-node-container">
    <p class="add-horizontal-margin un-font-large">{{ props.nodeData.name ?? 'none' }}</p>
    <span v-if="props.nodeData.name.length === 0" class="subdued add-horizontal-margin"
      >(Missing name)</span
    >
    <div v-if="isConceptNodeWithDatasetAttached(props.nodeData)">
      <div
        class="dataset-info add-horizontal-margin"
        :class="{ 'is-expanded': isDatasetInfoExpanded }"
        @click="isDatasetInfoExpanded = !isDatasetInfoExpanded"
      >
        <div class="timeseries-label">
          <i
            class="fa fa-fw expand-collapse-icon"
            :class="{
              'fa-angle-right': !isDatasetInfoExpanded,
              'fa-angle-down': isDatasetInfoExpanded,
            }"
          />
          <i class="fa fa-fw" :class="DATASET_ICON" :style="{ color: DATASET_COLOR }" />
          <p class="dataset-name">{{ dataSourceText }}</p>
          <InvertedDatasetLabel class="inverted-label" v-if="isInvertedData" />
          <!-- TODO: options to edit dataset -->
          <!-- <OptionsButton :dropdown-below="true" :wider-dropdown-options="true">
          <template #content>
            <div
              v-for="item in ['Edit data points', 'Remove dataset', 'Select another dataset']"
              class="dropdown-option"
              :key="item.text"
              @click="item.onClick()"
            >
              {{ item.text }}
            </div>
          </template>
        </OptionsButton> -->
        </div>
        <div class="dataset-metadata" v-if="isDatasetInfoExpanded">
          <p class="subdued un-font-small">{{ outputDescription }}</p>
          <p class="margin-top">
            Source:
            {{
              isConceptNodeWithDatasetAttached(props.nodeData) ? props.nodeData.dataset.source : ''
            }}
          </p>
          <p class="subdued un-font-small">{{ metadata?.description }}</p>
          <Button
            class="margin-top w-100 explore-dataset-button"
            @click.stop="navigateToDataset"
            :disabled="metadata === null"
            severity="secondary"
            label="Explore dataset"
          />
        </div>
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

      <MinMaxInfo
        class="add-horizontal-margin min-max-info"
        :message="'What do 0 and 1 represent?'"
        :dataset="props.nodeData.dataset"
        :oppositeEdgeCount="oppositeEdgeCountToRoot"
      />

      <IndexProjectionsExpandedNodeWarning
        class="add-horizontal-margin"
        :data-warnings="dataWarnings"
      />

      <IndexProjectionsExpandedNodeResilience
        class="add-horizontal-padding"
        :node-data="(nodeData as ConceptNodeWithDatasetAttached)"
        :historical-data="historicalData"
        :constraints="constraints"
        :projection-temporal-resolution-option="(projectionTemporalResolutionOption as TemporalResolutionOption.Month | TemporalResolutionOption.Year)"
        :projection-start-timestamp="projectionStartTimestamp"
        :projection-end-timestamp="projectionEndTimestamp"
        :projection-timeseries="timeseries"
        :weighting-behaviour="weightingBehaviour"
      />
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
import {
  ConceptNode,
  ConceptNodeWithDatasetAttached,
  IndexProjectionNodeDataWarning,
  ProjectionConstraint,
} from '@/types/Index';
import {
  DATASET_COLOR,
  DATASET_ICON,
  getNodeDataSourceText,
  isConceptNodeWithDatasetAttached,
  isEmptyNode,
} from '@/utils/index-tree-util';
import { computed, ref } from 'vue';
import IndexProjectionsExpandedNodeTimeseries from './index-projections-expanded-node-timeseries.vue';
import { ProjectionTimeseries, TimeseriesPoint } from '@/types/Timeseries';
import useModelMetadataSimple from '@/composables/useModelMetadataSimple';
import InvertedDatasetLabel from '@/components/widgets/inverted-dataset-label.vue';
import { EditMode } from '@/utils/projection-util';
import IndexProjectionsExpandedNodeWarning from './index-projections-expanded-node-warning.vue';
import IndexProjectionsExpandedNodeResilience from './index-projections-expanded-node-resilience.vue';
import { IndexWeightingBehaviour, TemporalResolutionOption } from '@/types/Enums';
import MinMaxInfo from '@/components/min-max-info.vue';
import useIndexTree from '@/composables/useIndexTree';
import Button from 'primevue/button';

const indexTree = useIndexTree();

const props = defineProps<{
  nodeData: ConceptNode;
  historicalData: { countryName: string; points: TimeseriesPoint[] }[];
  constraints: { scenarioId: string; constraints: ProjectionConstraint[] }[];
  projectionStartTimestamp: number;
  projectionEndTimestamp: number;
  projectionTemporalResolutionOption: TemporalResolutionOption;
  timeseries: ProjectionTimeseries[];
  showDataOutsideNorm: boolean;
  editMode?: EditMode;
  dataWarnings?: IndexProjectionNodeDataWarning[];
  weightingBehaviour: IndexWeightingBehaviour;
}>();

const emit = defineEmits<{
  (e: 'click-chart', timestamp: number, value: number): void;
  (e: 'open-drilldown', datacubeId: string): void;
}>();

const oppositeEdgeCountToRoot = computed(() => {
  return indexTree.oppositeEdgeCountToRoot(props.nodeData);
});

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

const isDatasetInfoExpanded = ref(false);

const navigateToDataset = () => {
  if (metadata.value !== null) {
    emit('open-drilldown', metadata.value.id);
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
$horizontal-margin: 20px;

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

.add-horizontal-padding {
  padding-left: $horizontal-margin;
  padding-right: $horizontal-margin;
}

.dataset-info {
  border: 1px solid var(--border-0);
  border-radius: 3px;
  cursor: pointer;
  position: relative;

  // Highlight the expand/collapse icon when the mouse is over any part of the
  //  dataset-info section except the explore-dataset-button.
  &:hover:not(:has(.explore-dataset-button:hover)) .expand-collapse-icon {
    color: var(--p-primary-900);
    background: var(--p-primary-100);
  }
}

.timeseries-label {
  display: flex;
  gap: 5px;
  align-items: baseline;
  padding: 5px;
  padding-right: 10px;

  .expand-collapse-icon {
    font-size: 1.6rem;
    color: var(--p-text-muted-color);
    border-radius: 100%;
    width: 30px;
    aspect-ratio: 1;
    display: grid;
    place-items: center;
  }

  .dataset-name {
    flex: 1;
    min-width: 0;
    padding-block: 5px;
  }

  .inverted-label {
    flex: initial;
    min-width: initial;
  }
}

.dataset-info:not(.is-expanded) {
  .dataset-name {
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }
}

.timeseries {
  display: flex; // prevents a slight change in node size when showing outside norm values.
  margin-top: 5px;
  margin-right: $horizontal-margin;
  // -2 for the 1px border on each side
  // -(2 * horizontal margin) for the margin on each side
  width: $expanded-node-width - 2 - (2 * $horizontal-margin);

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

.min-max-info {
  margin-bottom: 10px;
  background: var(--p-surface-50);
  padding: 5px $horizontal-margin;
  border-radius: 3px;
}

.dataset-metadata {
  background: var(--p-surface-50);
  padding: 5px 10px;

  .margin-top {
    margin-top: 10px;
  }
}
</style>
