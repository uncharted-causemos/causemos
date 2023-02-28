<template>
  <div class="index-drilldown-panel-container" :class="{ hidden: type === null }">
    <template v-if="type === IndexNodeType.OutputIndex">
      <header>
        <span class="type-label"> Output Index </span>
        <div v-if="isRenaming" class="rename-controls">
          <input
            v-focus
            class="form-control"
            type="text"
            v-model="renameInputText"
            v-on:keyup.enter="handleRenameDone"
          />
          <button
            class="btn btn-default"
            @click="handleRenameDone"
            :disabled="renameInputText === ''"
          >
            Done
          </button>
        </div>
        <div v-else class="title-row space-between">
          <h3>{{ panelTitle }}</h3>
          <button class="btn btn-sm" @click="startRenaming">Rename</button>
        </div>
      </header>
      <IndexComponentWeights :inputs="selectedNode?.inputs ?? []" />
      <IndexResultsPreview :analysis-id="indexTree.getAnalysisId()" />
      <IndexDocumentSnippets :selected-node-name="panelTitle" />
    </template>

    <template v-if="type === IndexNodeType.Index">
      <header>
        <div v-if="isRenaming" class="rename-controls">
          <input
            v-focus
            class="form-control"
            type="text"
            v-model="renameInputText"
            v-on:keyup.enter="handleRenameDone"
          />
          <button
            class="btn btn-default"
            @click="handleRenameDone"
            :disabled="renameInputText === ''"
          >
            Done
          </button>
        </div>
        <div v-else class="title-row space-between">
          <h3>{{ panelTitle }}</h3>
          <div class="button-group">
            <button class="btn btn-sm" @click="startRenaming">Rename</button>
            <OptionsButton :dropdown-below="true" :wider-dropdown-options="true">
              <template #content>
                <div
                  v-for="item in optionsButtonMenu"
                  :key="item.type"
                  class="dropdown-option"
                  @click="handleOptionsButtonClick(item.type)"
                >
                  <i class="fa fa-fw" :class="item.icon" />
                  {{ item.text }}
                </div>
              </template>
            </OptionsButton>
          </div>
        </div>
      </header>
      <IndexComponentWeights :inputs="selectedNode?.inputs ?? []" />
      <IndexDocumentSnippets :selected-node-name="panelTitle" />
    </template>

    <template v-if="type === IndexNodeType.Dataset">
      <header>
        <div v-if="isRenaming" class="rename-controls">
          <input
            v-focus
            class="form-control"
            type="text"
            v-model="renameInputText"
            v-on:keyup.enter="handleRenameDone"
            :placeholder="selectedNode.datasetName"
          />
          <button class="btn btn-default" @click="handleRenameDone">Done</button>
        </div>
        <div v-else class="title-row space-between">
          <h3>{{ panelTitle }}</h3>
          <div class="button-group">
            <button class="btn btn-sm" @click="startRenaming">Rename</button>
            <OptionsButton :dropdown-below="true" :wider-dropdown-options="true">
              <template #content>
                <div
                  v-for="item in optionsButtonMenu"
                  :key="item.type"
                  class="dropdown-option"
                  @click="handleOptionsButtonClick(item.type)"
                >
                  <i class="fa fa-fw" :class="item.icon" />
                  {{ item.text }}
                </div>
              </template>
            </OptionsButton>
          </div>
        </div>
      </header>
      <section>
        <IndexSpatialCoveragePreview :countries="datasetMetadata?.geography.country ?? null" />
      </section>
      <IndexDatasetMetadata :node="selectedNode" :dataset-metadata="datasetMetadata" />
      <section>
        <IndexDatasetSelectedDate
          :dataset-id="selectedNode.datasetId"
          :selected-timestamp="selectedNode.selectedTimestamp"
          :metadata="datasetMetadata"
        />
      </section>
      <section>
        <IndexInvertData
          :selected-node-name="panelTitle"
          :output-index-name="tree.name"
          :is-inverted="selectedNode.isInverted"
          @toggle-inverted="() => toggleDatasetIsInverted(selectedNode.id)"
        />
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
import OptionsButton from '../widgets/options-button.vue';
import IndexComponentWeights from './index-component-weights.vue';
import IndexDocumentSnippets from './index-document-snippets.vue';
import IndexResultsPreview from './index-results-preview.vue';
import IndexSpatialCoveragePreview from './index-spatial-coverage-preview.vue';
import IndexDatasetMetadata from './index-dataset-metadata.vue';
import IndexDatasetSelectedDate from './index-dataset-selected-date.vue';
import IndexInvertData from './index-invert-data.vue';
import { computed, watch, ref } from 'vue';
import useIndexWorkBench from '@/services/composables/useIndexWorkBench';
import useIndexTree from '@/services/composables/useIndexTree';
import { IndexNode, IndexWorkBenchItem, SelectableIndexElementId } from '@/types/Index';
import { duplicateNode, isDatasetNode, isOutputIndexNode } from '@/utils/index-tree-util';
import { OptionButtonMenu } from './index-tree-node.vue';
import useModelMetadata from '@/services/composables/useModelMetadata';

const props = defineProps<{
  selectedElementId: SelectableIndexElementId | null;
}>();

const indexTree = useIndexTree();
const { findNode, tree } = indexTree;
const workbench = useIndexWorkBench();

const toggleDatasetIsInverted = (nodeId: string) => {
  workbench.toggleDatasetIsInverted(nodeId);
  indexTree.toggleDatasetIsInverted(nodeId);
};

const renameNode = (newName: string) => {
  if (selectedNode.value === null) {
    return;
  }
  workbench.findAndRenameNode(selectedNode.value.id, newName);
  indexTree.findAndRenameNode(selectedNode.value.id, newName);
};

// Options button

const optionsButtonMenu = [
  {
    type: OptionButtonMenu.Duplicate,
    text: 'Duplicate',
    icon: 'fa-copy',
  },
  {
    type: OptionButtonMenu.Delete,
    text: 'Delete',
    icon: 'fa-trash',
  },
];

const handleOptionsButtonClick = (option: OptionButtonMenu) => {
  const node = selectedNode.value;
  if (node === null || isOutputIndexNode(node)) {
    return;
  }
  switch (option) {
    case OptionButtonMenu.Duplicate:
      workbench.addItem(duplicateNode(node) as IndexWorkBenchItem);
      break;
    case OptionButtonMenu.Delete:
      workbench.findAndDeleteItem(node.id);
      indexTree.findAndDelete(node.id);
      break;
  }
};

const selectedNode = computed<IndexNode | null>(() => {
  if (!(typeof props.selectedElementId === 'string')) {
    return null;
  }
  // Check for node in main tree
  const foundInTree = findNode(props.selectedElementId);
  // If not found in main tree, check in the list of disconnected nodes and trees
  const found = foundInTree ?? workbench.findNode(props.selectedElementId);
  // TODO: we'll want to keep the parent around when searching for edges
  return found?.found ?? null;
});
const selectedDatasetMetadataId = computed(() => {
  if (selectedNode.value === null || !isDatasetNode(selectedNode.value)) {
    return null;
  }
  return selectedNode.value.datasetMetadataDocId;
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

const datasetMetadata = useModelMetadata(selectedDatasetMetadataId);

const isRenaming = ref(false);
// Exit rename flow if another node is selected before it completes
watch([selectedNode], () => {
  isRenaming.value = false;
});
const renameInputText = ref('');
const startRenaming = () => {
  renameInputText.value = selectedNode.value?.name ?? '';
  isRenaming.value = true;
};
const handleRenameDone = () => {
  if (
    selectedNode.value === null ||
    // Can't exit the flow with an empty rename bar unless this is a dataset node
    (renameInputText.value === '' && !isDatasetNode(selectedNode.value))
  ) {
    return;
  }
  const shouldRevertToDatasetName =
    renameInputText.value === '' && isDatasetNode(selectedNode.value);
  const newNodeName = shouldRevertToDatasetName
    ? selectedNode.value.datasetName
    : renameInputText.value;
  renameNode(newNodeName);
  isRenaming.value = false;
  renameInputText.value = '';
};
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
  align-items: flex-start;

  &.space-between {
    justify-content: space-between;
  }
}

.rename-controls {
  display: flex;
  gap: 5px;
  input {
    flex: 1;
    min-width: 0;
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
