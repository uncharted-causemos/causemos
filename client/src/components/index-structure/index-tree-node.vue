<template>
  <div class="index-tree-node-container">
    <div>{{ typeText }}</div>
    <div>{{ nameText }}</div>
    <div>{{ inputText }}</div>

    <!-- <div style="color: grey">
      {{ JSON.stringify(props.data) }}
    </div> -->
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import { Dataset, IndexNode } from '@/types/Index';
import { IndexNodeType } from '@/types/Enums';

interface Props {
  data: IndexNode;
}
const props = defineProps<Props>();
const childNodes = computed(() =>
  props.data.type === IndexNodeType.Dataset ? [] : props.data.inputs
);

const typeText = computed(() => {
  switch (props.data.type) {
    case IndexNodeType.OutputIndex:
      return 'Output Index';
    case IndexNodeType.Index:
      return 'Index';
    case IndexNodeType.Dataset:
      return 'Dataset';
    default:
      return '';
  }
});

const nameText = computed(() => {
  return props.data.name;
});

const inputText = computed(() => {
  const numInputs = childNodes.value.length;
  const child = childNodes.value[0];
  switch (numInputs) {
    case 0:
      return props.data.type === IndexNodeType.Dataset
        ? (props.data as Dataset).datasetName
        : 'No inputs.';
    case 1:
      return (child as IndexNode).type === IndexNodeType.Dataset
        ? (child as Dataset).datasetName
        : '1 input.';
    default:
      return `Combination of ${numInputs} inputs.`;
  }
});
</script>

<style scoped lang="scss">
@import '~styles/variables';
.index-tree-node-container {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  padding: 0px;

  background: #ffffff;
  width: 240px;
  height: 67px;
  border: 1px solid #b3b4b5;
  border-radius: 3px;

  &.selected {
    border: 2px solid $selected;
  }
}
</style>
