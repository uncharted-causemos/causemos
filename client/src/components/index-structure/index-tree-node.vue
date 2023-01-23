<template>
  <div class="index-tree-node-container" :class="classObject">
    <div class="header">
      {{ headerText }}
    </div>
    <div class="content">
      {{ nameText }}
    </div>
    <div class="footer" v-if="footerText">
      {{ footerText }}
    </div>
    <div v-if="classObject.placeholder" class="placeholder-btn">
      <button>Replace with dataset</button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import { Dataset, IndexNode } from '@/types/Index';
import { IndexNodeType } from '@/types/Enums';
import { isDatasetNode, isParentNode } from '@/utils/indextree-util';

interface Props {
  data: IndexNode;
}
const props = defineProps<Props>();
const childNodes = computed(() => (isParentNode(props.data) ? props.data.inputs : []));

const getDatasetFooterText = (data: Dataset) => {
  return data.name === data.datasetName ? '' : data.datasetName;
};

const classObject = computed(() => {
  return {
    'output-index': props.data.type === IndexNodeType.OutputIndex,
    index: props.data.type === IndexNodeType.Index,
    dataset: props.data.type === IndexNodeType.Dataset,
    placeholder: props.data.type === IndexNodeType.Placeholder,
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

const nameText = computed(() => {
  return props.data.name;
});

const footerText = computed(() => {
  const dataNodes = childNodes.value.filter((node) => node.type !== IndexNodeType.Placeholder);
  const numInputs = dataNodes.length;
  switch (numInputs) {
    case 0:
      if (isDatasetNode(props.data)) return getDatasetFooterText(props.data);
      return isParentNode(props.data) ? 'No inputs.' : '';
    case 1:
      return '1 input.';
    default:
      return `Combination of ${numInputs} inputs.`;
  }
});
</script>

<style scoped lang="scss">
@import '~styles/variables';
.index-tree-node-container {
  $border-color: #b3b4b5;
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  padding: 0px;

  background: #ffffff;
  width: 240px;
  height: fit-content;
  border: 1px solid $border-color;
  border-radius: 3px;

  .header,
  .footer {
    font-size: $font-size-small;
    color: $text-color-medium;
  }
  .header,
  .content,
  .footer,
  .placeholder-btn {
    width: 100%;
    padding: 5px;
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
    .content {
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
}
</style>
