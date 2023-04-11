<template>
  <div class="index-drilldown-panel-container" :class="{ hidden: type === null }">
    <template v-if="type === IndexEdgeType.Edge">
      <div>
        <div>
          <div
            class="header content"
            :style="{ color: getIndexNodeTypeColor(selectedEdgeComponents?.source.type) }"
          >
            <i
              class="fa fa-fw un-font-small"
              :class="[getIndexNodeTypeIcon(selectedEdgeComponents?.source.type)]"
            />
            <span class="un-font-small">
              {{ selectedEdgeComponents?.source.type }}
            </span>
          </div>
          <div>
            <h4>{{ nodeUpstreamName }}</h4>
          </div>
        </div>
        <div class="title-row space-between centered">
          <i class="fa fa-long-arrow-right" />
          <div class="button-group">
            <OptionsButton :dropdown-below="true" :wider-dropdown-options="true">
              <template #content>
                <div
                  v-for="item in edgeOptionsButtonMenu"
                  :key="item.type"
                  class="dropdown-option"
                  @click="handleEdgeOptionsButtonClick(item.type)"
                >
                  <i class="fa fa-fw" :class="item.icon" />
                  {{ item.text }}
                </div>
              </template>
            </OptionsButton>
          </div>
        </div>

        <div>
          <div
            class="header content"
            :style="{ color: getIndexNodeTypeColor(selectedEdgeComponents?.target.type) }"
          >
            <i
              class="fa fa-fw un-font-small"
              :class="[getIndexNodeTypeIcon(selectedEdgeComponents?.target.type)]"
            />
            <span class="un-font-small">
              {{ selectedEdgeComponents?.target.type }}
            </span>
          </div>
          <div>
            <h4>{{ nodeName }}</h4>
          </div>
        </div>
      </div>
      <IndexComponentWeights :target-name="nodeName" :inputs="selectedNode?.inputs ?? []" />
      <IndexDocumentSnippets
        :selected-node-name="panelTitle"
        :selected-upstream-node-name="selectedUpstreamNodeName"
      />
    </template>
    <template v-if="type === IndexNodeType.OutputIndex">
      <header>
        <span class="type-label" :style="{ color: getIndexNodeTypeColor(type) }">
          <i class="fa fa-fw" :class="[getIndexNodeTypeIcon(type)]" />
          Output Index
        </span>
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
      <IndexComponentWeights :target-name="nodeName" :inputs="selectedNode?.inputs ?? []" />
      <IndexResultsPreview :analysis-id="indexTree.getAnalysisId()" />
      <IndexDocumentSnippets :selected-node-name="panelTitle" :selected-upstream-node-name="null" />
    </template>

    <template v-if="type === IndexNodeType.Index">
      <header>
        <span class="type-label" :style="{ color: getIndexNodeTypeColor(type) }">
          <i class="fa fa-fw" :class="[getIndexNodeTypeIcon(type)]" />
          Index
        </span>
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
      <IndexComponentWeights :target-name="nodeName" :inputs="selectedNode?.inputs ?? []" />
      <IndexDocumentSnippets :selected-node-name="panelTitle" :selected-upstream-node-name="null" />
    </template>

    <template v-if="type === IndexNodeType.Dataset">
      <header>
        <span class="type-label" :style="{ color: getIndexNodeTypeColor(type) }">
          <i class="fa fa-fw" :class="[getIndexNodeTypeIcon(type)]" />
          Dataset
        </span>
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
        <IndexSpatialCoveragePreview
          :node="selectedNode"
          :countries="datasetMetadata?.geography.country ?? null"
        />
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
      <IndexDocumentSnippets :selected-node-name="panelTitle" :selected-upstream-node-name="null" />
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
import {
  duplicateNode,
  isDatasetNode,
  isOutputIndexNode,
  getIndexNodeTypeColor,
  getIndexNodeTypeIcon,
} from '@/utils/index-tree-util';
import { OptionButtonMenu } from './index-tree-node.vue';
import useModelMetadataSimple from '@/services/composables/useModelMetadataSimple';

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

const edgeOptionsButtonMenu = [
  {
    type: OptionButtonMenu.DeleteEdge,
    text: 'Delete Edge',
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

const handleEdgeOptionsButtonClick = (option: OptionButtonMenu) => {
  console.log(`WIP: do the edge delete here. ${JSON.stringify(option)}`);
};

const nodeName = computed<String | null>(() => {
  let idToSearch = null;
  if (props.selectedElementId && typeof props.selectedElementId === 'string') {
    idToSearch = props.selectedElementId;
  } else if (props.selectedElementId && typeof props.selectedElementId === 'object') {
    idToSearch = props.selectedElementId.targetId;
  }

  if (idToSearch) {
    const node = searchForNode(idToSearch);
    if (node) {
      return node.found.name;
    }
  }
  return null;
});

const nodeUpstreamName = computed<String | null>(() => {
  if (props.selectedElementId && typeof props.selectedElementId === 'object') {
    const node = searchForNode(props.selectedElementId.sourceId);
    if (node) {
      return node.found.name;
    }
  }
  return null;
});

const selectedNode = computed<IndexNode | null>(() => {
  let idToSearch = null;
  if (props.selectedElementId && typeof props.selectedElementId === 'string') {
    idToSearch = props.selectedElementId;
  } else if (props.selectedElementId && typeof props.selectedElementId === 'object') {
    idToSearch = props.selectedElementId.targetId;
  } else {
    return null;
  }
  const found = searchForNode(idToSearch);
  return found?.found ?? null;
});

const selectedDatasetDataId = computed(() => {
  if (selectedNode.value === null || !isDatasetNode(selectedNode.value)) {
    return null;
  }
  return selectedNode.value.datasetId;
});

const selectedEdgeComponents = computed<{ source: IndexNode; target: IndexNode } | null>(() => {
  if (props.selectedElementId && typeof props.selectedElementId === 'object') {
    const sourceNode = searchForNode(props.selectedElementId.sourceId);
    if (sourceNode?.found && sourceNode?.parent) {
      return { source: sourceNode.found, target: sourceNode.parent };
    }
  }
  return null;
});

const type = computed<IndexElementType | null>(() => {
  if (selectedEdgeComponents.value !== null) {
    return IndexEdgeType.Edge;
  } else if (selectedNode.value !== null) {
    return selectedNode.value.type;
  }
  return null;
});

const panelTitle = computed(() => {
  return selectedNode?.value?.name ?? '';
});

const selectedUpstreamNodeName = computed(() => {
  if (selectedEdgeComponents.value) {
    return selectedEdgeComponents.value.source.name;
  }
  return null;
});

const datasetMetadata = useModelMetadataSimple(selectedDatasetDataId);

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

const searchForNode = (id: string) => {
  const foundInTree = findNode(id);
  return foundInTree ?? workbench.findNode(id);
};
</script>

<style scoped lang="scss">
@import '@/styles/variables.scss';
@import '@/styles/uncharted-design-tokens.scss';

.fa-long-arrow-right {
  color: $un-color-black-20;
}

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
    &.centered {
      align-items: center;
    }
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
