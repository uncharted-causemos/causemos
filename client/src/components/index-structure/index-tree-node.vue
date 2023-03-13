<template>
  <div class="index-tree-node-container" :class="classObject" @click="selectNode">
    <div class="disable-overlay" />
    <div v-if="isParentNode(props.nodeData)" class="input-arrow" />
    <div class="header content" :style="{ color: getIndexNodeTypeColor(props.nodeData.type) }">
      <i class="fa fa-fw un-font-small" :class="[getIndexNodeTypeIcon(props.nodeData.type)]" />
      <span class="un-font-small">
        {{ headerText }}
      </span>
      <OptionsButton
        v-if="props.nodeData.type !== IndexNodeType.OutputIndex"
        :dropdown-below="true"
        :wider-dropdown-options="true"
        @click.stop=""
      >
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
    <div v-if="showDatasetSearch">
      <div class="search-bar-container flex content">
        <input
          class="form-control"
          type="text"
          v-model="datasetSearchText"
          placeholder="Search for a dataset"
        />
        <button class="btn btn-default" @click="cancelDatasetSearch">Cancel</button>
      </div>
      <IndexTreeNodeSearchResults
        :searchText="datasetSearchText"
        @keep-as-placeholder="keepAsPlaceholder"
        @select-dataset="attachDataset"
      />
    </div>
    <div v-else-if="showEditName" class="rename content flex">
      <input
        v-focus
        class="form-control"
        type="text"
        :placeholder="renameInputTextPlaceholder"
        v-model="renameInputText"
        v-on:keyup.enter="handleRenameDone"
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
      v-if="classObject.placeholder && !showDatasetSearch && !showEditName"
      class="btn btn-default content replace-dataset-button"
      @click="isSearchingForDataset = true"
    >
      Replace with dataset
    </button>
    <div
      v-if="isParentNode(props.nodeData) && !showEditName"
      class="add-component-btn-container footer content"
    >
      <DropdownButton
        :is-dropdown-left-aligned="true"
        :items="addInputDropdownOptions"
        :selected-item="'Add component'"
        @item-selected="(option) => emit('create-child', props.nodeData.id, option)"
      />
    </div>
  </div>
</template>
<script lang="ts">
import { computed, ref } from 'vue';
import { Dataset, DatasetSearchResult, IndexNode } from '@/types/Index';
import { IndexNodeType } from '@/types/Enums';
import {
  duplicateNode,
  getIndexNodeTypeColor,
  getIndexNodeTypeIcon,
  isDatasetNode,
  isParentNode,
  isPlaceholderNode,
} from '@/utils/index-tree-util';
import DropdownButton from '@/components/dropdown-button.vue';
import OptionsButton from '@/components/widgets/options-button.vue';
import IndexTreeNodeSearchResults from '@/components/index-structure/index-tree-node-search-results.vue';

const addInputDropdownOptions = [IndexNodeType.Index, IndexNodeType.Dataset];

export enum OptionButtonMenu {
  Rename = 'Rename',
  Duplicate = 'Duplicate',
  Delete = 'Delete',
  DeleteEdge = 'DeleteEdge',
}
</script>
<script setup lang="ts">
interface Props {
  nodeData: IndexNode;
  isSelected: boolean;
}
const props = defineProps<Props>();

const emit = defineEmits<{
  (e: 'rename', nodeId: string, newName: string): void;
  (e: 'delete', deleted: IndexNode): void;
  (e: 'duplicate', duplicated: IndexNode): void;
  (e: 'select', nodeId: string): void;
  (
    e: 'create-child',
    parentNodeId: string,
    childType: IndexNodeType.Index | IndexNodeType.Dataset
  ): void;
  (e: 'attach-dataset', nodeId: string, dataset: DatasetSearchResult): void;
}>();

const classObject = computed(() => {
  return {
    placeholder: props.nodeData.type === IndexNodeType.Placeholder,
    selected: props.isSelected,
    'flexible-width': showDatasetSearch.value,
    disabled: disableInteraction.value,
  };
});

const selectNode = () => {
  // Can't select Placeholder nodes
  if (props.nodeData.type !== IndexNodeType.Placeholder) {
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
  return isDatasetNode(props.nodeData) ? props.nodeData.datasetName : '';
});

const handleRenameDone = () => {
  if (
    // Can't exit the flow with an empty rename bar unless this is a dataset node
    renameInputText.value === '' &&
    !isDatasetNode(props.nodeData)
  ) {
    return;
  }
  const shouldRevertToDatasetName = renameInputText.value === '' && isDatasetNode(props.nodeData);
  const newNodeName = shouldRevertToDatasetName
    ? props.nodeData.datasetName
    : renameInputText.value;
  emit('rename', props.nodeData.id, newNodeName);
  isRenaming.value = false;
  renameInputText.value = '';
};

// Header

const headerText = computed(() => {
  switch (props.nodeData.type) {
    case IndexNodeType.OutputIndex:
      return 'Output Index';
    case IndexNodeType.Index:
      return 'Index';
    case IndexNodeType.Dataset:
      return 'Dataset';
    case IndexNodeType.Placeholder:
      return 'Placeholder Dataset';
    default:
      return '';
  }
});

// Options button

const optionsButtonMenu = computed(() => {
  const menu = [
    {
      type: OptionButtonMenu.Rename,
      text: 'Rename',
      icon: 'fa-pencil',
    },
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
  return showEditName.value ? [menu[2]] : menu;
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

const showDatasetSearch = computed(
  () =>
    isPlaceholderNode(props.nodeData) &&
    // props.nodeData.name === '' means that the "create dataset node" flow has never been completed.
    (isSearchingForDataset.value === true || props.nodeData.name === '')
);
const disableInteraction = ref(false);
const isSearchingForDataset = ref(false);
const datasetSearchText = ref('');
const cancelDatasetSearch = () => {
  if (props.nodeData.name === '') {
    // the "create dataset node" flow has never been completed, so delete node.
    emit('delete', props.nodeData);
  } else {
    datasetSearchText.value = '';
    isSearchingForDataset.value = false;
  }
};
const keepAsPlaceholder = () => {
  emit('rename', props.nodeData.id, datasetSearchText.value);
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

const childNodes = computed(() => (isParentNode(props.nodeData) ? props.nodeData.inputs : []));
const footerText = computed(() => {
  const dataNodes = childNodes.value.filter((node) => node.type !== IndexNodeType.Placeholder);
  const numInputs = dataNodes.length;
  switch (numInputs) {
    case 0:
      if (isDatasetNode(props.nodeData)) return getDatasetFooterText(props.nodeData);
      return isParentNode(props.nodeData) && props.nodeData.name ? 'No inputs.' : '';
    case 1:
      return '1 input.';
    default:
      return `Combination of ${numInputs} inputs.`;
  }
});

const getDatasetFooterText = (data: Dataset) => {
  return data.name === data.datasetName ? '' : data.datasetName;
};
</script>

<style scoped lang="scss">
@import '~styles/variables';
@import '~styles/uncharted-design-tokens';

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

  .btn-default {
    background: $un-color-black-5;
    border: 1px solid $un-color-black-20;
    box-shadow: 0px 1px 0px rgb(54 55 56 / 10%), inset 0px -8px 10px -8px rgb(54 55 56 / 10%);
    border-radius: 3px;
    font-size: $font-size-small;
    font-weight: 600;
    padding: 3px 8px;
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

  .options-button-container {
    width: 16px;
    height: 16px;
    :deep(i) {
      font-size: 12px;
    }
    display: none;
    :deep(.dropdown-container) {
      top: 16px;
      right: 16px;
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
    padding: 5px 10px;
  }
  .replace-dataset-button {
    margin: 5px 10px;
  }

  .header {
    display: flex;

    > i {
      display: grid;
      align-items: center;
      margin-right: 5px;
    }

    > span {
      flex: 1;
      min-width: 0;
    }
  }

  .rename,
  .search-bar-container {
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
  .rename button {
    color: white;
    background-color: $call-to-action-color;
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
}
</style>
