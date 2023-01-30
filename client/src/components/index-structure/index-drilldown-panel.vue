<template>
  <div class="index-drilldown-panel-container" :class="{ hidden: type === null }">
    <template v-if="type === IndexNodeType.OutputIndex">
      <header>
        <span class="type-label"> Output Index </span>
        <div class="title-row">
          <h3>{{ panelTitle }}</h3>
          <button class="btn btn-sm" disabled>Rename</button>
        </div>
      </header>
      <IndexComponentWeights />
      <IndexResultsPreview />
      <IndexDocumentSnippets :selected-node-name="panelTitle" />
    </template>

    <template v-if="type === IndexNodeType.Index">
      <header>
        <div class="title-row space-between">
          <h3>{{ panelTitle }}</h3>
          <div class="button-group">
            <button class="btn btn-sm" disabled>Rename</button>
            <button class="btn btn-sm" disabled>
              <i class="fa fa-ellipsis-v" />
            </button>
          </div>
        </div>
      </header>
      <IndexComponentWeights />
      <IndexDocumentSnippets :selected-node-name="panelTitle" />
    </template>

    <template v-if="type === IndexNodeType.Dataset">
      <header>
        <div class="title-row space-between">
          <h3>{{ panelTitle }}</h3>
          <div class="button-group">
            <button class="btn btn-sm" disabled>Rename</button>
            <button class="btn btn-sm" disabled>
              <i class="fa fa-ellipsis-v" />
            </button>
          </div>
        </div>
      </header>
      <section>
        <IndexSpatialCoveragePreview />
      </section>
      <IndexDatasetMetadata />
      <section>
        <IndexDatasetSelectedDate />
      </section>
      <section>
        <IndexInvertData />
      </section>
      <IndexDocumentSnippets :selected-node-name="panelTitle" />
    </template>

    <template v-if="type === IndexEdgeType.Edge">
      <header>
        <div class="title-row space-between">
          <div class="edge-source-and-target">
            <h3>{{ 'Highest risk of drought' }}</h3>
            <h3 class="edge-target">{{ panelTitle }}</h3>
          </div>
          <button class="btn btn-sm" disabled>
            <i class="fa fa-ellipsis-v" />
          </button>
        </div>
      </header>
      <IndexComponentWeights />
      <IndexDocumentSnippets :selected-node-name="panelTitle" />
    </template>
  </div>
</template>

<script setup lang="ts">
import { IndexNodeType, IndexElementType, IndexEdgeType } from '@/types/Enums';
import IndexComponentWeights from './index-component-weights.vue';
import IndexDocumentSnippets from './index-document-snippets.vue';
import IndexResultsPreview from './index-results-preview.vue';
import IndexSpatialCoveragePreview from './index-spatial-coverage-preview.vue';
import IndexDatasetMetadata from './index-dataset-metadata.vue';
import IndexDatasetSelectedDate from './index-dataset-selected-date.vue';
import IndexInvertData from './index-invert-data.vue';
import { computed } from 'vue';
import useIndexWorkBench from '@/services/composables/useIndexWorkBench';
import useIndexTree from '@/services/composables/useIndexTree';
import { IndexNode, SelectableIndexElementId } from '@/types/Index';

const props = defineProps<{
  selectedElementId: SelectableIndexElementId | null;
}>();

const { findNode } = useIndexTree();
const { findNode: findNodeInWorkbench } = useIndexWorkBench();
const selectedNode = computed<IndexNode | null>(() => {
  if (!(typeof props.selectedElementId === 'string')) {
    return null;
  }
  // Check for node in main tree
  const foundInTree = findNode(props.selectedElementId);
  // If not found in main tree, check in the list of disconnected nodes and trees
  const found = foundInTree ?? findNodeInWorkbench(props.selectedElementId);
  // TODO: we'll want to keep the parent around when searching for edges
  return found?.found ?? null;
});

const selectedEdgeComponents = computed<{ source: IndexNode; target: IndexNode } | null>(() => {
  return null;
});

const type = computed<IndexElementType | null>(() => {
  if (selectedNode.value !== null) {
    return selectedNode.value.type;
  }
  if (selectedEdgeComponents.value !== null) {
    return IndexEdgeType.Edge;
  }
  return null;
});

const panelTitle = computed(() => {
  return selectedNode?.value?.name ?? '';
});
</script>

<style scoped lang="scss">
@import '~styles/variables';
@import '~styles/uncharted-design-tokens';

.index-drilldown-panel-container {
  padding: 20px;
  background: white;
  border-left: 1px solid $un-color-black-10;
  display: flex;
  flex-direction: column;
  gap: 30px;
  overflow-y: auto;

  &.hidden {
    display: none;
  }
}

header {
  display: flex;
  flex-direction: column;
}

.button-group {
  display: flex;
  gap: 5px;
}

.title-row {
  display: flex;
  gap: 10px;
  align-items: center;

  &.space-between {
    justify-content: space-between;
  }
}

.type-label {
  color: $accent-main;
}

section {
  display: flex;
  flex-direction: column;
  gap: 5px;
}

.edge-source-and-target {
  display: flex;
  flex-direction: column;
  gap: 5px;
}

.edge-target {
  border-top: 1px solid $separator;
}
</style>
