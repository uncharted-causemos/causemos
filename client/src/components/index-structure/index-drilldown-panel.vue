<template>
  <!-- If an edge or node is selected, selectedNode will not be null -->
  <div class="index-drilldown-panel-container" :class="{ hidden: selectedNode === null }">
    <!--
    If an edge is selected, `selectedEdgeComponents` will be an object and `selectedNode` will be a
    node with one or more inputs
    -->
    <template
      v-if="
        selectedEdgeComponents !== null && selectedNode && isConceptNodeWithoutDataset(selectedNode)
      "
    >
      <div>
        <h4>{{ nodeUpstreamName }}</h4>
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
        <h4>{{ nodeName }}</h4>
        <div class="polarity-select-container">
          <p class="polarity-statement start">High {{ nodeUpstreamName }} represents</p>
          <dropdown-button
            :is-dropdown-left-aligned="true"
            :inner-button-label="''"
            :items="isPolarityOppositeOptions"
            :selected-item="isUpstreamNodePolarityNegative"
            @item-selected="selectPolarity"
          />&nbsp;
          <p class="polarity-statement end">{{ nodeName }} values.</p>
        </div>
      </div>
      <IndexComponentWeights :target-name="nodeName" :inputs="selectedNode.components ?? []" />
      <IndexDocumentSnippets
        :selected-node-name="panelTitle"
        :selected-upstream-node-name="selectedUpstreamNodeName"
        :geo-context-string="countryContextForSnippets"
        @save-geo-context="(value) => emit('save-geo-context', value)"
      />
    </template>
    <!-- Output node is selected -->
    <template v-else-if="selectedNode?.isOutputNode && isConceptNodeWithoutDataset(selectedNode)">
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
          <button class="btn btn-sm" @click="startRenaming">Rename</button>
        </div>
      </header>
      <IndexComponentWeights :target-name="nodeName" :inputs="selectedNode.components ?? []" />
      <IndexResultsPreview :analysis-id="indexTree.getAnalysisId()" />
      <IndexDocumentSnippets
        :selected-node-name="panelTitle"
        :selected-upstream-node-name="null"
        :geo-context-string="countryContextForSnippets"
        @save-geo-context="(value) => emit('save-geo-context', value)"
      />
    </template>
    <!-- Node without dataset is selected -->
    <template v-else-if="selectedNode && isConceptNodeWithoutDataset(selectedNode)">
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
      <IndexComponentWeights :target-name="nodeName" :inputs="selectedNode.components ?? []" />
      <IndexDocumentSnippets
        :selected-node-name="panelTitle"
        :selected-upstream-node-name="null"
        :geo-context-string="countryContextForSnippets"
        @save-geo-context="(value) => emit('save-geo-context', value)"
      />
    </template>
    <!-- Node with dataset is selected -->
    <template v-else-if="selectedNode && isConceptNodeWithDatasetAttached(selectedNode)">
      <header>
        <div v-if="isRenaming" class="rename-controls">
          <input
            v-focus
            class="form-control"
            type="text"
            v-model="renameInputText"
            v-on:keyup.enter="handleRenameDone"
            :placeholder="selectedNode.dataset.datasetName"
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
      <!-- ASSUMPTION: Model-type datacubes cannot be attached to a concept node -->
      <IndexDatasetMetadata
        :node="selectedNode"
        :dataset-metadata="(datasetMetadata as Indicator | null)"
        :output-description="outputDescription"
      />
      <section>
        <h4>Coverage</h4>
        <!-- ASSUMPTION: Model-type datacubes cannot be attached to a concept node -->
        <IndexTemporalCoveragePreview
          :output-variable="selectedNode.dataset.config.outputVariable"
          :selected-timestamp="selectedNode.dataset.config.selectedTimestamp"
          :metadata="(datasetMetadata as Indicator | null)"
        />
        <IndexSpatialCoveragePreview
          :node="selectedNode"
          :countries="datasetMetadata?.geography.country ?? null"
        />
        <button class="btn btn-sm" @click="navigateToDataset">
          <i class="fa fa-fw fa-cube" />Explore dataset
        </button>
      </section>
      <section>
        <h4>Settings</h4>
        <IndexInvertData
          :selected-node="selectedNode"
          @set-inverted="(newValue) => setDatasetIsInverted((selectedNode as ConceptNode).id, newValue)"
        />
        <div>
          <p>Selected date</p>
          <p class="subdued">
            Using data from
            <span :style="{ color: 'black' }">
              {{ timestampFormatter(selectedNode.dataset.config.selectedTimestamp, null, null) }}
            </span>
            in index results.
          </p>
        </div>
      </section>
      <IndexDocumentSnippets
        :selected-node-name="panelTitle"
        :selected-upstream-node-name="null"
        :geo-context-string="countryContextForSnippets"
        @save-geo-context="(value) => emit('save-geo-context', value)"
      />
    </template>
  </div>
</template>

<script setup lang="ts">
import OptionsButton from '../widgets/options-button.vue';
import IndexComponentWeights from './index-component-weights.vue';
import IndexDocumentSnippets from './index-document-snippets.vue';
import IndexResultsPreview from './index-results-preview.vue';
import IndexSpatialCoveragePreview from './index-spatial-coverage-preview.vue';
import IndexDatasetMetadata from './index-dataset-metadata.vue';
import IndexInvertData from './index-invert-data.vue';
import { computed, watch, ref } from 'vue';
import useIndexWorkBench from '@/composables/useIndexWorkBench';
import useIndexTree from '@/composables/useIndexTree';
import { ConceptNode, SelectableIndexElementId } from '@/types/Index';
import {
  duplicateNode,
  isOutputIndexNode,
  isConceptNodeWithoutDataset,
  isConceptNodeWithDatasetAttached,
  isEdge,
} from '@/utils/index-tree-util';
import { OptionButtonMenu, MENU_OPTIONS } from '@/utils/index-common-util';
import useModelMetadataSimple from '@/composables/useModelMetadataSimple';
import DropdownButton from '@/components/dropdown-button.vue';
import { NEGATIVE_COLOR, POSITIVE_COLOR } from '@/utils/colors-util';
import timestampFormatter from '@/formatters/timestamp-formatter';
import IndexTemporalCoveragePreview from './index-temporal-coverage-preview.vue';
import { Indicator } from '@/types/Datacube';

const props = defineProps<{
  selectedElementId: SelectableIndexElementId | null;
  countryContextForSnippets: string;
}>();

const emit = defineEmits<{
  (e: 'delete-edge', value: SelectableIndexElementId): void;
  (e: 'open-drilldown', datacubeId: string, datacubeItemId: string): void;
  (e: 'save-geo-context', value: string): void;
}>();

const indexTree = useIndexTree();
const { findNode, updateIsOppositePolarity } = indexTree;
const workbench = useIndexWorkBench();

const setDatasetIsInverted = (nodeId: string, newValue: boolean) => {
  workbench.setDatasetIsInverted(nodeId, newValue);
  indexTree.setDatasetIsInverted(nodeId, newValue);
};

const navigateToDataset = () => {
  if (datasetMetadata.value !== null) {
    const itemId = ''; // TODO: itemId is a qualitative analysis thing that we don't have access to yet. Interface will render but some controls will fail (generate errors)
    emit('open-drilldown', datasetMetadata.value.id, itemId);
  } else {
    throw new Error('Dataset metadata not assigned.  Drill-down aborted.');
  }
};

const renameNode = (newName: string) => {
  if (selectedNode.value === null) {
    return;
  }
  workbench.findAndRenameNode(selectedNode.value.id, newName);
  indexTree.findAndRenameNode(selectedNode.value.id, newName);
};

const isPolarityOppositeOptions = [
  { displayName: 'high', value: false, color: POSITIVE_COLOR },
  { displayName: 'low', value: true, color: NEGATIVE_COLOR },
];

// Options button

const optionsButtonMenu = computed(() => {
  if (selectedNode.value !== null && isConceptNodeWithDatasetAttached(selectedNode.value)) {
    return [MENU_OPTIONS.RENAME, MENU_OPTIONS.DUPLICATE, MENU_OPTIONS.REMOVE_DATASET];
  }
  return [MENU_OPTIONS.DUPLICATE, MENU_OPTIONS.DELETE];
});

const edgeOptionsButtonMenu = [
  {
    type: OptionButtonMenu.DeleteEdge,
    text: 'Delete Edge',
    icon: 'fa-trash',
  },
];

const selectPolarity = (value: boolean) => {
  const edge = selectedEdgeComponents.value;
  if (edge !== null) {
    if (!updateIsOppositePolarity(edge.source.id, value)) {
      workbench.updateIsOppositePolarity(edge.source.id, value);
    }
  }
};
const handleOptionsButtonClick = (option: OptionButtonMenu) => {
  const node = selectedNode.value;
  if (node === null || isOutputIndexNode(node)) {
    return;
  }
  switch (option) {
    case OptionButtonMenu.Duplicate:
      workbench.addItem(duplicateNode(node));
      break;
    case OptionButtonMenu.Delete:
      workbench.findAndDeleteItem(node.id);
      indexTree.findAndDelete(node.id);
      break;
    case OptionButtonMenu.RemoveDataset:
      workbench.detachDatasetFromNode(node.id);
      indexTree.detachDatasetFromNode(node.id);
      break;
    default:
      break;
  }
};

const handleEdgeOptionsButtonClick = (option: OptionButtonMenu) => {
  if (option === OptionButtonMenu.DeleteEdge && props.selectedElementId) {
    emit('delete-edge', props.selectedElementId);
  }
};

const nodeName = computed<string | null>(() => {
  let idToSearch = null;
  if (props.selectedElementId && typeof props.selectedElementId === 'string') {
    idToSearch = props.selectedElementId;
  } else if (props.selectedElementId && isEdge(props.selectedElementId)) {
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

const nodeUpstreamName = computed<string | null>(() => {
  if (props.selectedElementId && isEdge(props.selectedElementId)) {
    const node = searchForNode(props.selectedElementId.sourceId);
    if (node) {
      return node.found.name;
    }
  }
  return null;
});

const selectedNode = computed<ConceptNode | null>(() => {
  let idToSearch = null;
  if (props.selectedElementId && !isEdge(props.selectedElementId)) {
    idToSearch = props.selectedElementId;
  } else if (props.selectedElementId && isEdge(props.selectedElementId)) {
    idToSearch = props.selectedElementId.targetId;
  } else {
    return null;
  }
  const found = searchForNode(idToSearch);
  return found?.found ?? null;
});

const selectedDatasetDataId = computed(() => {
  if (selectedNode.value === null || !isConceptNodeWithDatasetAttached(selectedNode.value)) {
    return null;
  }
  return selectedNode.value.dataset.config.datasetId;
});

const selectedDatasetOutputVariable = computed(() => {
  if (selectedNode.value === null || !isConceptNodeWithDatasetAttached(selectedNode.value)) {
    return null;
  }
  return selectedNode.value.dataset.config.outputVariable;
});

const selectedEdgeComponents = computed<{ source: ConceptNode; target: ConceptNode } | null>(() => {
  if (props.selectedElementId && isEdge(props.selectedElementId)) {
    const sourceNode = searchForNode(props.selectedElementId.sourceId);
    if (sourceNode?.found && sourceNode?.parent) {
      return { source: sourceNode.found, target: sourceNode.parent };
    }
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

const isUpstreamNodePolarityNegative = computed(() => {
  const edges = selectedEdgeComponents.value;
  if (edges !== null && isConceptNodeWithoutDataset(edges.target)) {
    const childNode = edges.target.components.filter(
      (component) => component.componentNode.id === edges.source.id
    );
    if (childNode.length > 0) {
      return childNode[0].isOppositePolarity;
    }
  }
  return false;
});

const { metadata: datasetMetadata, outputDescription } = useModelMetadataSimple(
  selectedDatasetDataId,
  selectedDatasetOutputVariable
);

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
    (renameInputText.value === '' && !isConceptNodeWithDatasetAttached(selectedNode.value))
  ) {
    return;
  }
  const shouldRevertToDatasetName =
    renameInputText.value === '' && isConceptNodeWithDatasetAttached(selectedNode.value);
  const newNodeName = shouldRevertToDatasetName
    ? selectedNode.value.dataset.datasetName
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
@import '@/styles/variables';
@import '@/styles/uncharted-design-tokens';

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
  gap: 15px;
}

.edge-source-and-target {
  display: flex;
  flex-direction: column;
  gap: 5px;
}

.edge-target {
  border-top: 1px solid $separator;
}

.polarity-select-container {
  display: flex;
  flex-direction: row;
  flex-wrap: wrap;
  .polarity-statement {
    padding-top: 3px;
    &.start {
      margin-right: 5px;
    }
    &.end {
      margin-left: 5px;
    }
  }
}
</style>
