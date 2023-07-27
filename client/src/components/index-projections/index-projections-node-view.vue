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
          :data-warnings="dataWarnings"
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
        :projection-start-timestamp="projectionStartTimestamp"
        :projection-end-timestamp="projectionEndTimestamp"
        :timeseries="getProjectionsForNode(projectionData, selectedNode.found.id)"
        :show-data-outside-norm="showDataOutsideNorm"
        :edit-mode="projectionForScenarioBeingEdited !== null ? EditMode.Constraints : undefined"
        :data-warnings="dataWarnings"
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
          :data-warnings="dataWarnings"
          @select="emit('select-element', parentNode.id)"
        />
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import useIndexTree from '@/services/composables/useIndexTree';
import useIndexWorkBench from '@/services/composables/useIndexWorkBench';
import { computed } from 'vue';
import { isConceptNodeWithoutDataset } from '@/utils/index-tree-util';
import { getProjectionsForNode } from '@/utils/index-projection-util';
import { IndexProjection, SelectableIndexElementId } from '@/types/Index';
import IndexProjectionsNode from './index-projections-node.vue';
import IndexProjectionsExpandedNode from './index-projections-expanded-node.vue';
import { EditMode } from '@/utils/projection-util';
import { DataWarning } from '@/types/Timeseries';

const props = defineProps<{
  selectedNodeId: string | null;
  projectionStartTimestamp: number;
  projectionEndTimestamp: number;
  projections: IndexProjection[];
  projectionForScenarioBeingEdited: IndexProjection | null;
  showDataOutsideNorm: boolean;
  dataWarnings?: Map<string, DataWarning>;
}>();

const emit = defineEmits<{
  (e: 'select-element', selectedElement: SelectableIndexElementId): void;
  (e: 'click-chart', timestamp: number, value: number): void;
  (e: 'open-drilldown', datacubeId: any, datacubeItemId: any): void;
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
