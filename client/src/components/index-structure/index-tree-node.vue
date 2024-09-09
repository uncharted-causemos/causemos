<template>
  <div class="index-tree-node-container">
    <div class="index-tree-node-body" :class="classObject" @click="selectNode">
      <div class="disable-overlay" />
      <div v-if="isConceptNodeWithoutDataset(props.nodeData)" class="input-arrow" />
      <template v-if="showDatasetSearch">
        <IndexTreeNodeSearchBar
          :initial-search-text="props.nodeData.name"
          :countryFilters="countryFilters"
          @select-dataset="attachDataset"
          @set-node-name="setNodeName"
          @cancel="cancelDatasetSearch"
          @add-country-filter="(countryFilter: CountryFilter) => emit('add-country-filter', countryFilter)"
          @update-country-filter="(countryFilter: CountryFilter) => emit('update-country-filter', countryFilter)"
          @delete-country-filter="(countryFilter: CountryFilter) => emit('delete-country-filter', countryFilter)"
        />
        <IndexTreeNodeAdvancedSearchButton
          class="advanced-search-button"
          :node-id="props.nodeData.id"
        />
      </template>
      <div v-else-if="showEditName" class="rename content flex">
        <InputText
          v-focus
          class="form-control"
          :placeholder="renameInputTextPlaceholder"
          v-model="renameInputText"
          @keyup.escape="cancelRename"
          @keyup.enter="handleRenameDone"
        />
        <Button
          label="Done"
          severity="secondary"
          @click="handleRenameDone"
          :disabled="renameInputText === '' && renameInputTextPlaceholder === ''"
        />
      </div>
      <div v-else class="header content">
        <div class="name">
          {{ props.nodeData.name }}
        </div>
        <OptionsButton :dropdown-below="true" :wider-dropdown-options="true" @click.stop="">
          <template #content>
            <div
              v-for="item in optionsButtonMenu"
              class="dropdown-option"
              :key="item.type"
              @click="handleOptionsButtonClick(item.type)"
            >
              <i class="fa fa-fw" :class="item.icon" />
              {{ item.text }}
            </div>
          </template>
        </OptionsButton>
      </div>
      <div v-if="isConceptNodeWithoutDataset(props.nodeData) && !showDatasetSearch" class="content">
        <p
          v-if="dataSourceText.length > 0"
          class="un-font-small data-source-text subdued"
          :class="{ warning: isEmptyNode(props.nodeData) }"
        >
          {{ dataSourceText }}
        </p>
        <Button
          v-if="!showEditName"
          class="full-width-button"
          label="Add input concept"
          severity="secondary"
          @click.stop="emit('create-child', props.nodeData.id)"
        />
        <Button
          v-if="showAttachDatasetButton"
          class="full-width-button button-top-margin"
          label="Attach dataset"
          severity="secondary"
          :icon="`fa fa-fw ${DATASET_ICON}`"
          @click="isSearchingForDataset = true"
        />
      </div>
      <div v-if="isConceptNodeWithDatasetAttached(props.nodeData)" class="content">
        <div class="flex dataset-label" :style="{ color: DATASET_COLOR }">
          <i class="fa fa-fw" :class="DATASET_ICON" />
          <span class="un-font-small expand">Dataset</span>
          <InvertedDatasetLabel v-if="props.nodeData.dataset.isInverted" />
        </div>
        <p class="un-font-small subdued">
          {{ dataSourceText }}
        </p>
      </div>
    </div>
    <IndexStructureRecommendations
      v-if="props.nodeData.name === ''"
      class="recommendations"
      :parent-node="parentNode"
      :geo-context-string="geoContextString"
      @add-suggestion="addSuggestion"
      @save-geo-context="(context: string) => emit('save-geo-context', context)"
    />
  </div>
</template>
<script setup lang="ts">
import { computed, ref, watch } from 'vue';
import { ConceptNode, DatasetSearchResult } from '@/types/Index';
import {
  duplicateNode,
  isEmptyNode,
  isConceptNodeWithoutDataset,
  isConceptNodeWithDatasetAttached,
  DATASET_ICON,
  isOutputIndexNode,
  getNodeDataSourceText,
  DATASET_COLOR,
  hasChildren,
} from '@/utils/index-tree-util';
import OptionsButton from '@/components/widgets/options-button.vue';
import IndexTreeNodeSearchBar from '@/components/index-structure/index-tree-node-search-bar.vue';
import IndexTreeNodeAdvancedSearchButton from '@/components/index-structure/index-tree-node-advanced-search-button.vue';
import { OptionButtonMenu, MENU_OPTIONS } from '@/utils/index-common-util';
import InvertedDatasetLabel from '../widgets/inverted-dataset-label.vue';
import useIndexTree from '@/composables/useIndexTree';
import IndexStructureRecommendations from './index-structure-recommendations.vue';
import useIndexWorkBench from '@/composables/useIndexWorkBench';
import { CountryFilter } from '@/types/Analysis';
import InputText from 'primevue/inputtext';
import Button from 'primevue/button';

interface Props {
  nodeData: ConceptNode;
  isSelected: boolean;
  isConnecting: boolean;
  isDescendentOfConnectingNode: boolean;
  geoContextString: string;
  countryFilters: CountryFilter[];
}
const props = defineProps<Props>();

const emit = defineEmits<{
  (e: 'rename', nodeId: string, newName: string): void;
  (e: 'delete', deleted: ConceptNode): void;
  (e: 'duplicate', duplicated: ConceptNode): void;
  (e: 'select', nodeId: string): void;
  (e: 'create-child', parentNodeId: string): void;
  (e: 'detach-dataset', nodeId: string): void;
  (e: 'switch-dataset', nodeId: string): void;
  (
    e: 'attach-dataset',
    nodeId: string,
    dataset: DatasetSearchResult,
    nodeNameAfterAttachingDataset: string
  ): void;
  (e: 'create-edge', nodeId: string): void;
  (e: 'save-geo-context', context: string): void;
  (e: 'add-country-filter', selectedCountries: CountryFilter): void;
  (e: 'update-country-filter', selectedCountries: CountryFilter): void;
  (e: 'delete-country-filter', selectedCountries: CountryFilter): void;
}>();

const canSelectNode = computed(() => {
  if (props.isConnecting) {
    // We're adding a new edge, so we can select the node if
    //  - it has no dataset and
    //  - adding an edge to it won't create a loop in the graph
    return isConceptNodeWithoutDataset(props.nodeData) && !props.isDescendentOfConnectingNode;
  } else {
    // We're not adding a new edge, so we can select the node if it has been given a name already.
    return props.nodeData.name !== '';
  }
});

const classObject = computed(() => ({
  selected: props.isSelected,
  'flexible-width': showDatasetSearch.value,
  disabled: disableInteraction.value,
  'highlight-on-hover': canSelectNode.value,
  'click-not-allowed': props.isConnecting && !canSelectNode.value,
  'has-children': hasChildren(props.nodeData),
  'is-first-child-opposite-polarity':
    hasChildren(props.nodeData) && props.nodeData.components[0].isOppositePolarity,
}));

const selectNode = () => {
  if (!canSelectNode.value) {
    return;
  }
  if (props.isConnecting) {
    emit('create-edge', props.nodeData.id);
  } else {
    emit('select', props.nodeData.id);
  }
};

// Rename

const isRenaming = ref(false);
const renameInputText = ref('');

const showEditName = computed(() => {
  // props.nodeData.name === '' means that the node has never been given a name
  return props.nodeData.name === '' || isRenaming.value;
});
const renameInputTextPlaceholder = computed(() => {
  return isConceptNodeWithDatasetAttached(props.nodeData) ? props.nodeData.dataset.datasetName : '';
});

const cancelRename = () => {
  if (props.nodeData.name === '') {
    // the "create index node" flow has never been completed, so delete node.
    emit('delete', props.nodeData);
  } else {
    isRenaming.value = false;
  }
};
const handleRenameDone = () => {
  if (
    // Can't exit the flow with an empty rename bar unless this is a dataset node
    renameInputText.value === '' &&
    !isConceptNodeWithDatasetAttached(props.nodeData)
  ) {
    return;
  }
  const shouldRevertToDatasetName =
    renameInputText.value === '' && isConceptNodeWithDatasetAttached(props.nodeData);
  const newNodeName = shouldRevertToDatasetName
    ? props.nodeData.dataset.datasetName
    : renameInputText.value;
  emit('rename', props.nodeData.id, newNodeName);
  isRenaming.value = false;
  renameInputText.value = '';
};

const optionsButtonMenu = computed(() => {
  if (props.nodeData.isOutputNode) {
    return [MENU_OPTIONS.RENAME];
  }
  if (showEditName.value) {
    return [MENU_OPTIONS.DELETE];
  }
  if (isConceptNodeWithDatasetAttached(props.nodeData)) {
    return [
      MENU_OPTIONS.RENAME,
      MENU_OPTIONS.DUPLICATE,
      MENU_OPTIONS.DELETE,
      MENU_OPTIONS.REMOVE_DATASET,
    ];
  }
  return [MENU_OPTIONS.RENAME, MENU_OPTIONS.DUPLICATE, MENU_OPTIONS.DELETE];
});

const handleOptionsButtonClick = (option: OptionButtonMenu) => {
  switch (option) {
    case OptionButtonMenu.Rename:
      renameInputText.value = props.nodeData.name;
      isRenaming.value = true;
      break;
    case OptionButtonMenu.Duplicate:
      emit('duplicate', duplicateNode(props.nodeData));
      break;
    case OptionButtonMenu.Delete:
      emit('delete', props.nodeData);
      break;
    case OptionButtonMenu.ChangeDataset:
      emit('detach-dataset', props.nodeData.id); // menu option has been removed for now, to be reassessed later
      break;
    case OptionButtonMenu.RemoveDataset:
      emit('switch-dataset', props.nodeData.id);
      break;
    default:
      break;
  }
};

const showAttachDatasetButton = computed(
  () =>
    isEmptyNode(props.nodeData) &&
    !isOutputIndexNode(props.nodeData) &&
    !showDatasetSearch.value &&
    !showEditName.value
);

const indexTree = useIndexTree();

// Dataset search

const disableInteraction = ref(false);
// Whenever the data for this node changes (e.g. when attaching a dataset), re-enable interactions.
watch(
  () => props.nodeData,
  () => {
    disableInteraction.value = false;
  },
  { deep: true }
);
const isSearchingForDataset = ref(false);

const showDatasetSearch = computed(
  () =>
    isEmptyNode(props.nodeData) &&
    // props.nodeData.name === '' means that the "create dataset node" flow has never been completed.
    (isSearchingForDataset.value === true || props.nodeData.name === '')
);

const cancelDatasetSearch = () => {
  if (props.nodeData.name === '') {
    // the "create dataset node" flow has never been completed, so delete node.
    emit('delete', props.nodeData);
  } else {
    isSearchingForDataset.value = false;
  }
};
const setNodeName = (value: string) => {
  emit('rename', props.nodeData.id, value);
  isSearchingForDataset.value = false;
};
const attachDataset = (dataset: DatasetSearchResult, nodeNameAfterAttachingDataset: string) => {
  emit('attach-dataset', props.nodeData.id, dataset, nodeNameAfterAttachingDataset);
  isSearchingForDataset.value = false;
  // Once attach-dataset event is fired, further interaction with data search or selection should
  //  not be done until the node data is changed and the watcher above has fired to re-enable
  //  interactions.
  disableInteraction.value = true;
};

const dataSourceText = computed(() => getNodeDataSourceText(props.nodeData));

const indexWorkbench = useIndexWorkBench();
const parentNode = computed(() => {
  const foundInTree = indexTree.findNode(props.nodeData.id);
  const found = foundInTree ?? indexWorkbench.findNode(props.nodeData.id);
  return found?.parent ?? null;
});
const addSuggestion = (suggestion: string) => {
  if (parentNode.value === null) {
    return;
  }
  indexTree.findAndAddNewChild(parentNode.value.id, suggestion);
  indexWorkbench.findAndAddNewChild(parentNode.value.id, suggestion);
};
</script>

<style scoped lang="scss">
@import '@/styles/variables';
@import '@/styles/uncharted-design-tokens';
@import '@/styles/common';
@import '@/styles/index-graph';

$option-button-width: 16px;

.index-tree-node-body {
  @include index-tree-node;

  &.flexible-width {
    width: auto;
  }

  &.highlight-on-hover:hover {
    @include index-tree-node-hover;
  }

  &.click-not-allowed:hover {
    cursor: not-allowed;
  }

  &.selected {
    --border-width: 2px;
    --border-colour: var(--p-primary-500);
  }

  // When node is selected, we want to show a 2px accent color border outside.
  // To avoid adjusting the size of the node element, use ::before to make a
  //  slightly larger pseudoelement within it.
  &.selected::before {
    content: '';
    display: block;
    position: absolute;
    pointer-events: none;
    width: calc(100% + calc(2 * var(--border-width)));
    height: calc(100% + calc(2 * var(--border-width)));
    top: calc(-1 * var(--border-width));
    left: calc(-1 * var(--border-width));
    border-radius: 3px;
    border: var(--border-width) solid var(--border-colour);
  }

  &.disabled {
    pointer-events: none;
    .disable-overlay {
      display: block;
    }
  }

  .disable-overlay {
    display: none;
    position: absolute;
    width: 100%;
    height: 100%;
    z-index: 999;
    opacity: 0.4;
    background: white;
  }

  .input-arrow {
    --arrow-side-length: 10px;
    position: absolute;
    top: 8px;
    width: var(--arrow-side-length);
    height: var(--arrow-side-length);
    left: calc(-0.5 * var(--arrow-side-length) - var(--border-width));
    rotate: 45deg;
    background: var(--p-surface-100);
    border-top: var(--border-width) solid var(--border-colour);
    border-right: var(--border-width) solid var(--border-colour);
    clip-path: polygon(0 0, 100% 0, 100% 100%);
  }

  &.has-children .input-arrow {
    background: $positive;
  }

  &.has-children.is-first-child-opposite-polarity .input-arrow {
    background: $negative;
  }

  .options-button-container {
    width: $option-button-width;
    height: $option-button-width;
    :deep(i) {
      font-size: 12px;
    }
    display: none;
    :deep(.dropdown-container) {
      top: $option-button-width;
      right: $option-button-width;
    }
  }

  &:hover .options-button-container,
  .options-button-container.active {
    display: block;
  }

  .content {
    @include index-tree-node-content;
  }
  .full-width-button {
    width: 100%;
  }

  .header {
    display: flex;
    align-items: center;

    > i {
      display: grid;
      align-items: center;
      margin-right: $node-content-horizontal-padding;
    }

    > span {
      flex: 1;
      min-width: 0;
    }
  }

  .rename {
    .form-control {
      height: 32px;
      padding: 8px 8px;
    }
    button {
      width: 100%;
      max-width: 59px;
      margin-left: 5px;
    }
  }

  .name {
    flex: 1;
  }

  .advanced-search-button {
    margin: 5px 0 10px 10px;
  }
}

.dataset-label {
  gap: 2px;
  align-items: center;
  margin-bottom: 2px;

  .expand {
    flex: 1;
    min-width: 0;
  }
}

.data-source-text {
  margin-bottom: 2px;
}

.button-top-margin {
  margin-top: 10px;
}

.warning {
  color: $un-color-feedback-warning;
}

.recommendations {
  margin-top: 20px;
}
</style>
