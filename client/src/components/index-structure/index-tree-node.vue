<template>
  <div class="index-tree-node">
    <div>{{ typeText }}</div>
    <div>{{ nameText }}</div>
    <div>{{ inputText }}</div>

    <div style="color: grey">
      {{ JSON.stringify(props.data) }}
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import { Dataset, IndexNode } from '@/types/Index';

interface Props {
  data: IndexNode;
}
const props = defineProps<Props>();
const childNodes = computed(() => props.data.inputs || []);

const typeText = computed(() => {
  switch (props.data.type) {
    case 'OutputIndex':
      return 'Output Index';
    case 'Index':
      return 'Index';
    case 'Dataset':
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
      return 'No inputs.';
    case 1:
      return (child as IndexNode).type === 'Dataset' ? (child as Dataset).datasetName : '1 input.';
    default:
      return `Combination of ${numInputs} inputs.`;
  }
});
</script>

<style scoped lang="scss">
@import '~styles/variables';
.index-tree-node {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  padding: 0px;

  position: absolute;
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
