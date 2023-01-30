<template>
  <div class="index-tree-node-container" :class="classObject" @click="selectNode">
    <div v-if="isParentNode(props.data)" class="input-arrow" />
    <div class="header content">
      <span>
        {{ headerText }}
      </span>
      <OptionsButton
        v-if="props.data.type !== IndexNodeType.OutputIndex"
        :dropdown-below="true"
        :wider-dropdown-options="true"
      >
        <template #content>
          <div
            v-for="item in optionsButtonMenu"
            class="dropdown-option"
            :key="item.type"
            @click.stop="handleOptionsButtonClick(item.type)"
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
      <IndexTreeNodeSearchResults :searchText="datasetSearchText" />
    </div>
    <div v-else-if="showEditName" class="rename content flex">
      <input
        class="form-control"
        type="text"
        v-model="newNodeName"
        v-on:keyup.enter="handleRenameDone"
      />
      <button class="btn btn-default" @click="handleRenameDone">Done</button>
    </div>
    <div v-else class="name content">
      {{ props.data.name }}
    </div>
    <div v-if="footerText" class="footer content">
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
      v-if="isParentNode(props.data) && !showEditName"
      class="add-component-btn-container footer content"
    >
      <DropdownButton
        :is-dropdown-left-aligned="true"
        :items="Object.values(AddInputDropdownOptions)"
        :selected-item="'Add Component'"
        @item-selected="handleAddInput"
      />
    </div>
  </div>
</template>
<script lang="ts">
import { computed, ref } from 'vue';
import { Dataset, IndexNode } from '@/types/Index';
import { IndexNodeType } from '@/types/Enums';
import {
  createNewIndex,
  duplicateNode,
  isDatasetNode,
  isParentNode,
  isPlaceholderNode,
} from '@/utils/indextree-util';
import DropdownButton from '@/components/dropdown-button.vue';
import OptionsButton from '@/components/widgets/options-button.vue';
import IndexTreeNodeSearchResults from '@/components/index-structure/index-tree-node-search-results.vue';

export enum AddInputDropdownOptions {
  Dataset = 'Dataset',
  Index = 'Index',
}
export enum OptionButtonMenu {
  Rename = 'Rename',
  Duplicate = 'Duplicate',
  Delete = 'Delete',
}
</script>
<script setup lang="ts">
interface Props {
  data: IndexNode;
  isSelected: boolean;
}
const props = defineProps<Props>();

const emit = defineEmits<{
  (e: 'update', updated: IndexNode): void;
  (e: 'delete', deleted: IndexNode): void;
  (e: 'duplicate', deleted: IndexNode): void;
  (e: 'select', nodeId: string): void;
}>();

const classObject = computed(() => {
  return {
    'output-index': props.data.type === IndexNodeType.OutputIndex,
    index: props.data.type === IndexNodeType.Index,
    dataset: props.data.type === IndexNodeType.Dataset,
    placeholder: props.data.type === IndexNodeType.Placeholder,
    selected: props.isSelected,
    'flexible-width': showDatasetSearch.value,
  };
});

const selectNode = () => {
  // Can't select Placeholder nodes
  if (props.data.type !== IndexNodeType.Placeholder) {
    emit('select', props.data.id);
  }
};

// Rename

const isRenaming = ref(false);
const newNodeName = ref('');

const showEditName = computed(() => {
  // props.data.name === '' means that the node has never been given a name
  return props.data.name === '' || isRenaming.value;
});

const handleRenameDone = () => {
  if (!newNodeName.value) return;
  const updated = { ...props.data, name: newNodeName.value };
  emit('update', updated);
  isRenaming.value = false;
  newNodeName.value = '';
};

// Header

const headerText = computed(() => {
  switch (props.data.type) {
    case IndexNodeType.OutputIndex:
      return 'Output Index';
    case IndexNodeType.Index:
      return 'Index';
    case IndexNodeType.Dataset:
      return 'Dataset';
    case IndexNodeType.Placeholder:
      return 'Placeholder';
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
      newNodeName.value = props.data.name;
      isRenaming.value = true;
      break;
    case OptionButtonMenu.Duplicate:
      emit('duplicate', duplicateNode(props.data));
      break;
    case OptionButtonMenu.Delete:
      emit('delete', props.data);
      break;
    default:
      break;
  }
};

// Dataset search

const showDatasetSearch = computed(
  () =>
    isPlaceholderNode(props.data) &&
    // props.data.name === '' means that the "create dataset node" flow has never been completed.
    (isSearchingForDataset.value === true || props.data.name === '')
);
const isSearchingForDataset = ref(false);
const datasetSearchText = ref('');
const cancelDatasetSearch = () => {
  if (props.data.name === '') {
    // the "create dataset node" flow has never been completed, so delete node.
    emit('delete', props.data);
  } else {
    isSearchingForDataset.value = false;
  }
};

// Footer

const childNodes = computed(() => (isParentNode(props.data) ? props.data.inputs : []));
const footerText = computed(() => {
  const dataNodes = childNodes.value.filter((node) => node.type !== IndexNodeType.Placeholder);
  const numInputs = dataNodes.length;
  switch (numInputs) {
    case 0:
      if (isDatasetNode(props.data)) return getDatasetFooterText(props.data);
      return isParentNode(props.data) && props.data.name ? 'No inputs.' : '';
    case 1:
      return '1 input.';
    default:
      return `Combination of ${numInputs} inputs.`;
  }
});

const getDatasetFooterText = (data: Dataset) => {
  return data.name === data.datasetName ? '' : data.datasetName;
};

// Footer button - add component

const handleAddInput = (option: AddInputDropdownOptions) => {
  if (!isParentNode(props.data)) return;
  // Clone node since props.data is read only
  // TODO: instead of using 'update', emit an add node event with this node id as parent id and new node as child payload.
  // Then handle adding new node to the tree inside useIndexTree/useIndexWorkbench
  const node = JSON.parse(JSON.stringify(props.data));
  switch (option) {
    case AddInputDropdownOptions.Index:
      node.inputs.unshift(createNewIndex());
      emit('update', node);
      break;
    case AddInputDropdownOptions.Dataset:
      // Not Yet Implemented
      break;
    default:
      break;
  }
};
</script>

<style scoped lang="scss">
@import '~styles/variables';

.index-tree-node-container {
  $border-color: #b3b4b5;
  display: flex;
  flex-direction: column;
  position: relative;

  background: #ffffff;
  width: 240px;
  &.flexible-width {
    width: auto;
  }
  height: fit-content;
  border: 1px solid $border-color;
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

  .btn-default {
    background: #f0f1f2;
    border: 1px solid #cacbcc;
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
    justify-content: space-between;
  }

  .header,
  .footer {
    font-size: $font-size-small;
    color: $text-color-medium;
  }

  .name {
    padding-bottom: 0px;
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

  .footer {
    padding-top: 0px;
  }

  &.output-index,
  &.index {
    .header {
      padding-bottom: 0px;
    }
  }
  &.output-index {
    .header {
      color: $accent-main;
    }
  }
  &.dataset {
    .header {
      height: 26px;
      background: #e3e4e6;
      color: $label-color;
    }
  }
  &.placeholder {
    border-style: dashed;
    .header {
      height: 26px;
      border-bottom: 1px dashed $border-color;
    }
  }
}
</style>
