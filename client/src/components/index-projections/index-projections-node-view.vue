<template>
  <div class="index-projections-node-view-container">
    <div class="node-column child-column">
      <div
        v-for="(inputComponent, i) of inputComponents"
        :key="inputComponent.componentNode.id"
        class="node-and-edge-container"
      >
        <IndexProjectionsNode
          :node-data="inputComponent.componentNode"
          :projection-start-timestamp="projectionStartTimestamp"
          :projection-end-timestamp="projectionEndTimestamp"
          :timeseries="getProjectionsForNode(projectionData, inputComponent.componentNode.id)"
          :show-data-outside-norm="showDataOutsideNorm"
          :data-warnings="dataWarnings[inputComponent.componentNode.id]"
          @select="emit('select-element', inputComponent.componentNode.id)"
        />
        <div
          class="edge outgoing visible"
          :class="{
            'last-child': i === inputComponents.length - 1,
            'next-sibling-polarity-negative': inputComponents[i + 1]?.isOppositePolarity,
            'polarity-negative': inputComponent.isOppositePolarity,
          }"
        />
      </div>
    </div>
    <div class="node-and-edge-container">
      <div
        class="edge incoming"
        :class="{
          visible: inputComponents.length > 0,
          'polarity-negative': inputComponents[0]?.isOppositePolarity,
        }"
      />
      <IndexProjectionsExpandedNode
        v-if="selectedNode !== null"
        :node-data="selectedNode.found"
        :historical-data="getHistoricalDataForNode(historicalData, selectedNode.found.id)"
        :constraints="getConstraintsForNode(scenarios, selectedNode.found.id)"
        :projection-start-timestamp="projectionStartTimestamp"
        :projection-end-timestamp="projectionEndTimestamp"
        :projection-temporal-resolution-option="projectionTemporalResolutionOption"
        :timeseries="getProjectionsForNode(projectionData, selectedNode.found.id)"
        :show-data-outside-norm="showDataOutsideNorm"
        :edit-mode="projectionForScenarioBeingEdited !== null ? EditMode.Constraints : undefined"
        :data-warnings="dataWarnings[selectedNode.found.id]"
        @click-chart="(...params) => emit('click-chart', ...params)"
        @open-drilldown="
          (datacubeId, datacubeItemId) => emit('open-drilldown', datacubeId, datacubeItemId)
        "
      />
      <div
        class="edge outgoing last-child"
        :class="{
          visible: parentNode !== null,
          'polarity-negative': isOutgoingEdgeOppositePolarity,
        }"
      />
    </div>
    <div class="node-column">
      <div v-if="parentNode !== null" class="node-and-edge-container">
        <div
          class="edge incoming visible"
          :class="{ 'polarity-negative': isOutgoingEdgeOppositePolarity }"
        />
        <IndexProjectionsNode
          :node-data="parentNode"
          :projection-start-timestamp="projectionStartTimestamp"
          :projection-end-timestamp="projectionEndTimestamp"
          :timeseries="getProjectionsForNode(projectionData, parentNode.id)"
          :show-data-outside-norm="showDataOutsideNorm"
          :data-warnings="dataWarnings[parentNode.id]"
          @select="() => emit('select-element', (parentNode as ConceptNodeWithoutDataset).id)"
        />
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import useIndexTree from '@/composables/useIndexTree';
import useIndexWorkBench from '@/composables/useIndexWorkBench';
import { computed } from 'vue';
import { isConceptNodeWithoutDataset } from '@/utils/index-tree-util';
import {
  getProjectionsForNode,
  getHistoricalDataForNode,
  getConstraintsForNode,
} from '@/utils/index-projection-util';
import {
  ConceptNodeWithoutDataset,
  IndexProjection,
  IndexProjectionNodeDataWarning,
  IndexProjectionScenario,
  SelectableIndexElementId,
} from '@/types/Index';
import IndexProjectionsNode from './index-projections-node.vue';
import IndexProjectionsExpandedNode from './index-projections-expanded-node.vue';
import { EditMode } from '@/utils/projection-util';
import { TimeseriesPoint } from '@/types/Timeseries';
import { TemporalResolutionOption } from '@/types/Enums';
const props = defineProps<{
  selectedNodeId: string | null;
  historicalData: { [countryName: string]: { [nodeId: string]: TimeseriesPoint[] } };
  scenarios: IndexProjectionScenario[];
  projectionStartTimestamp: number;
  projectionEndTimestamp: number;
  projectionTemporalResolutionOption: TemporalResolutionOption;
  projections: IndexProjection[];
  projectionForScenarioBeingEdited: IndexProjection | null;
  showDataOutsideNorm: boolean;
  dataWarnings: { [nodeId: string]: IndexProjectionNodeDataWarning[] };
}>();

const emit = defineEmits<{
  (e: 'select-element', selectedElement: SelectableIndexElementId): void;
  (e: 'click-chart', timestamp: number, value: number): void;
  (e: 'open-drilldown', datacubeId: string, datacubeItemId: string): void;
}>();

const { findNode } = useIndexTree();
const workbench = useIndexWorkBench();

const searchForNode = (id: string) => {
  const foundInTree = findNode(id);
  return foundInTree ?? workbench.findNode(id);
};
const projectionData = computed(() => {
  return !props.projectionForScenarioBeingEdited
    ? props.projections
    : [props.projectionForScenarioBeingEdited];
});
const selectedNode = computed(() => {
  if (props.selectedNodeId === null) {
    return null;
  }
  return searchForNode(props.selectedNodeId) ?? null;
});
const inputComponents = computed(() => {
  if (!selectedNode.value || !isConceptNodeWithoutDataset(selectedNode.value.found)) {
    return [];
  }
  return selectedNode.value.found.components;
});
const parentNode = computed(() => {
  return selectedNode.value?.parent ?? null;
});
const isOutgoingEdgeOppositePolarity = computed(() => {
  const selectedNodeComponent = parentNode.value?.components.find(
    ({ componentNode }) => componentNode.id === props.selectedNodeId
  );
  return selectedNodeComponent !== undefined && selectedNodeComponent.isOppositePolarity;
});
</script>

<style lang="scss" scoped>
@import '@/styles/uncharted-design-tokens';
@import '@/styles/index-graph';
.index-projections-node-view-container {
  padding: $index-graph-padding-vertical $index-graph-padding-horizontal;
  overflow: auto;
  display: flex;
  // When the graph is too small to take up the full available screen width, don't expand columns
  //  to fill the empty space.
  justify-content: flex-start;
}

.node-column {
  // Make sure columns take the width of a node even if the column is empty.
  width: calc($index-tree-node-width + $incoming-edge-minimum-length);
}

.child-column {
  display: flex;
  flex-direction: column;
  gap: $space-between-rows;
}

.node-and-edge-container {
  position: relative;
  display: flex;
}

.edge {
  @include index-tree-edge();
}

.edge.incoming {
  flex: 0;
}
</style>
