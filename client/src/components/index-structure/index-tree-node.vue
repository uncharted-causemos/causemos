<template>
  <div class="index-tree-node-container" :class="classObject" @click="selectNode">
    <div class="disable-overlay" />
    <div v-if="isConceptNodeWithoutDataset(props.nodeData)" class="input-arrow" />
    <div class="header content">
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
    <template v-if="showDatasetSearch">
      <IndexTreeNodeSearchBar
        :initial-search-text="props.nodeData.name"
        @select-dataset="attachDataset"
        @set-node-name="setNodeName"
        @cancel="cancelDatasetSearch"
      />
      <IndexTreeNodeAdvancedSearchButton
        class="advanced-search-button"
        :node-id="props.nodeData.id"
      />
    </template>
    <div v-else-if="showEditName" class="rename content flex">
      <input
        v-focus
        class="form-control"
        type="text"
        :placeholder="renameInputTextPlaceholder"
        v-model="renameInputText"
        @keyup.escape="cancelRename"
        @keyup.enter="handleRenameDone"
      />
      <button
        class="btn btn-default"
        @click="handleRenameDone"
        :disabled="renameInputText === '' && renameInputTextPlaceholder === ''"
      >
        Done
      </button>
    </div>
    <div v-else class="name content">
      {{ props.nodeData.name }}
    </div>
    <div v-if="footerText" class="footer content un-font-small">
      {{ footerText }}
    </div>
    <!-- footer buttons -->
    <button
      v-if="classObject['is-empty'] && !showDatasetSearch && !showEditName"
      class="btn btn-default content replace-dataset-button"
      @click="isSearchingForDataset = true"
    >
      Attach dataset
    </button>
    <div
      v-if="isConceptNodeWithoutDataset(props.nodeData) && !showEditName"
      class="add-component-btn-container footer content"
    >
      <button class="btn btn-default" @click="emit('create-child', props.nodeData.id)">
        Add input concept
      </button>
    </div>
  </div>
</template>
<script lang="ts">
import { computed, ref } from 'vue';
import { ConceptNode, ConceptNodeWithDatasetAttached, DatasetSearchResult } from '@/types/Index';
import {
  duplicateNode,
  isEmptyNode,
  isConceptNodeWithoutDataset,
  isConceptNodeWithDatasetAttached,
} from '@/utils/index-tree-util';
import OptionsButton from '@/components/widgets/options-button.vue';
import IndexTreeNodeSearchBar from '@/components/index-structure/index-tree-node-search-bar.vue';
import IndexTreeNodeAdvancedSearchButton from '@/components/index-structure/index-tree-node-advanced-search-button.vue';

export enum OptionButtonMenu {
  Rename = 'Rename',
  Duplicate = 'Duplicate',
  Delete = 'Delete',
  DeleteEdge = 'DeleteEdge',
}
</script>
<script setup lang="ts">
interface Props {
  nodeData: ConceptNode;
  isSelected: boolean;
}
const props = defineProps<Props>();

const emit = defineEmits<{
  (e: 'rename', nodeId: string, newName: string): void;
  (e: 'delete', deleted: ConceptNode): void;
  (e: 'duplicate', duplicated: ConceptNode): void;
  (e: 'select', nodeId: string): void;
  (e: 'create-child', parentNodeId: string): void;
  (e: 'attach-dataset', nodeId: string, dataset: DatasetSearchResult): void;
}>();

const classObject = computed(() => {
  return {
    'is-empty': isEmptyNode(props.nodeData),
    selected: props.isSelected,
    'flexible-width': showDatasetSearch.value,
    disabled: disableInteraction.value,
  };
});

const selectNode = () => {
  emit('select', props.nodeData.id);
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

// Options button

const MENU_OPTION_RENAME = {
  type: OptionButtonMenu.Rename,
  text: 'Rename',
  icon: 'fa-pencil',
};

const MENU_OPTION_DUPLICATE = {
  type: OptionButtonMenu.Duplicate,
  text: 'Duplicate',
  icon: 'fa-copy',
};

const MENU_OPTION_DELETE = {
  type: OptionButtonMenu.Delete,
  text: 'Delete',
  icon: 'fa-trash',
};

const optionsButtonMenu = computed(() => {
  if (props.nodeData.isOutputNode) {
    return [MENU_OPTION_RENAME];
  }
  if (showEditName.value) {
    return [MENU_OPTION_DELETE];
  }
  return [MENU_OPTION_RENAME, MENU_OPTION_DUPLICATE, MENU_OPTION_DELETE];
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
    default:
      break;
  }
};

// Dataset search

const disableInteraction = ref(false);
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
const attachDataset = (dataset: DatasetSearchResult) => {
  emit('attach-dataset', props.nodeData.id, dataset);
  isSearchingForDataset.value = false;
  // Once attach-dataset event is fired, we are finished with interacting with the placeholder node and expecting the node to be converted to a dataset node.
  // Further interaction with data search or selection should not be done until the node is changed and re-rendered as a dataset node.
  disableInteraction.value = true;
};

// Footer

const childNodes = computed(() =>
  isConceptNodeWithoutDataset(props.nodeData) ? props.nodeData.components : []
);
const footerText = computed(() => {
  const dataNodes = childNodes.value.filter((node) => isEmptyNode(node.componentNode));
  const numInputs = dataNodes.length;
  switch (numInputs) {
    case 0:
      if (isConceptNodeWithDatasetAttached(props.nodeData))
        return getDatasetFooterText(props.nodeData);
      return props.nodeData.name ? 'No inputs.' : '';
    case 1:
      return '1 input.';
    default:
      return `Combination of ${numInputs} inputs.`;
  }
});

const getDatasetFooterText = (data: ConceptNodeWithDatasetAttached) => {
  return data.name === data.dataset.datasetName ? '' : data.dataset.datasetName;
};
</script>

<style scoped lang="scss">
@import '@/styles/variables';
@import '@/styles/uncharted-design-tokens';
@import '@/styles/common';

// The space between the edges of the node and the content within it.
//  This would be applied to .index-tree-node-container directly, but some elements (namely the
//  search results) need to expand to take the full width of the node.
$horizontal-padding: 10px;
// Standard padding that's applied to each element within the node by default
$vertical-padding: 5px;

$option-button-width: 16px;

.index-tree-node-container {
  display: flex;
  flex-direction: column;
  position: relative;

  background: white;
  width: 240px;
  &.flexible-width {
    width: auto;
  }
  height: fit-content;
  border: 1px solid $un-color-black-30;
  border-radius: 3px;

  &:not(.placeholder):hover {
    border-color: $accent-main;
  }

  // When node is selected, we want to show a 2px accent color border outside.
  // To avoid adjusting the size of the node element, use ::before to make a
  //  slightly larger pseudoelement within it.
  &.selected::before {
    --border-width: 2px;
    content: '';
    display: block;
    position: absolute;
    pointer-events: none;
    width: calc(100% + calc(2 * var(--border-width)));
    height: calc(100% + calc(2 * var(--border-width)));
    top: calc(-1 * var(--border-width));
    left: calc(-1 * var(--border-width));
    border-radius: 3px;
    border: var(--border-width) solid $accent-main;
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
    position: absolute;
    top: 8px;
    width: 0;
    height: 0;
    border-top: 5px solid transparent;
    border-bottom: 5px solid transparent;
    border-left: 5px solid #b3b4b5;
  }

  .inverted-label {
    margin-left: 5px;
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

  .add-component-btn-container :deep(button) {
    @extend .btn-default;
    strong {
      padding-right: 5px;
      font-weight: 600;
      font-size: $font-size-small;
    }
  }

  &:hover .options-button-container,
  .options-button-container.active {
    display: block;
  }

  .content {
    padding: $vertical-padding $horizontal-padding;
  }
  .replace-dataset-button {
    margin: $vertical-padding $horizontal-padding;
  }

  .header {
    display: flex;

    > i {
      display: grid;
      align-items: center;
      margin-right: $horizontal-padding;
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
      color: white;
      background-color: $call-to-action-color;
    }
  }

  .name {
    padding-top: 0px;
  }

  .footer {
    color: $un-color-black-40;
    padding-top: 0px;
  }
  &.placeholder {
    border-style: dashed;
  }
  .advanced-search-button {
    margin: 5px 0 10px 10px;
  }
}
</style>
