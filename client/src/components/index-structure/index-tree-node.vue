<template>
  <div class="index-tree-node-container" :class="classObject">
    <div class="header content">
      {{ headerText }}
    </div>
    <div v-if="showEditName" class="content input flex">
      <input type="text" v-model="newNodeName" />
      <button @click="handleRename()">Done</button>
    </div>
    <div v-else class="name content">
      {{ props.data.name }}
    </div>
    <div v-if="footerText" class="footer content">
      {{ footerText }}
    </div>
    <!-- footer buttons -->
    <div v-if="classObject.placeholder" class="placeholder-btn content">
      <button>Replace with dataset</button>
    </div>
    <div
      v-if="classObject.index && props.showIndexAddButton && !showEditName"
      class="add-component-btn footer content"
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
import { createNewIndex, isDatasetNode, isParentNode } from '@/utils/indextree-util';
import DropdownButton from '@/components/dropdown-button.vue';

export enum AddInputDropdownOptions {
  Dataset = 'Dataset',
  Index = 'Index',
}
export enum NodeActionDropDownOptions {
  Rename = 'Rename',
  Duplicate = 'Duplicate',
  Delete = 'Delete',
}
</script>
<script setup lang="ts">
interface Props {
  data: IndexNode;
  showIndexAddButton: boolean;
}
const props = defineProps<Props>();

const emit = defineEmits<{
  (e: 'update', updated: IndexNode): void;
  (e: 'delete', deleted: IndexNode): void;
}>();

const childNodes = computed(() => (isParentNode(props.data) ? props.data.inputs : []));

const getDatasetFooterText = (data: Dataset) => {
  return data.name === data.datasetName ? '' : data.datasetName;
};

const isRenaming = ref(false);
const newNodeName = ref('');

const classObject = computed(() => {
  return {
    'output-index': props.data.type === IndexNodeType.OutputIndex,
    index: props.data.type === IndexNodeType.Index,
    dataset: props.data.type === IndexNodeType.Dataset,
    placeholder: props.data.type === IndexNodeType.Placeholder,
    editable: props.showIndexAddButton,
  };
});

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

const showEditName = computed(() => {
  return props.data.name === '' || isRenaming.value;
});

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

const handleRename = () => {
  const updated = { ...props.data, name: newNodeName.value };
  emit('update', updated);
  isRenaming.value = false;
  newNodeName.value = '';
};

const handleAddInput = (option: AddInputDropdownOptions) => {
  const node = props.data;
  if (!isParentNode(node)) return;
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
  align-items: flex-start;

  background: #ffffff;
  width: 240px;
  height: fit-content;
  border: 1px solid $border-color;
  border-radius: 3px;

  .content {
    width: 100%;
    padding: 5px;
  }

  .header,
  .footer {
    font-size: $font-size-small;
    color: $text-color-medium;
  }

  .footer {
    padding-top: 0;
  }

  .placeholder-btn button {
    width: 100%;
    font-size: $font-size-small;
    font-weight: 600;
  }

  &.selected {
    border: 2px solid $selected;
  }

  &.output-index,
  &.index {
    .header {
      padding-bottom: 0px;
    }
    .name {
      padding-top: 0px;
    }
  }
  &.output-index {
    .header {
      color: $selected;
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
  &.editable {
    .content {
      padding-left: 10px;
    }
    .name {
      padding-bottom: 0px;
    }
  }
  .add-component-btn :deep(button) {
    width: 126px;
    height: 24px;
    background: #f0f1f2;
    border: 1px solid #cacbcc;
    box-shadow: 0px 1px 0px rgba(54, 55, 56, 0.1), inset 0px -8px 10px -8px rgba(54, 55, 56, 0.1);
    border-radius: 3px;
    strong {
      padding: 0 8px;
      font-weight: 600;
      font-size: $font-size-small;
    }
  }
}
</style>
