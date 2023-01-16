<template>
  <div class="index-tree-pane-container">
    <div class="flex h-100">
      <div class="node-col">
        <IndexTreeNode v-for="(node, index) in datasetNodes" :key="index" :data="node" />
      </div>
      <div class="node-col">
        <IndexTreeNode v-for="(node, index) in outputChildren" :key="index" :data="node" />
      </div>
      <div class="node-col">
        <IndexTreeNode :data="props.indexTree" />
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import IndexTreeNode from '@/components/index-structure/index-tree-node.vue';
import { IndexNodeType } from '@/types/Enums';
import { OutputIndex } from '@/types/Index';
import { computed } from 'vue';

// This component is being implemented

interface Props {
  indexTree: OutputIndex;
}
const props = defineProps<Props>();

const outputChildren = computed(() => {
  return props.indexTree.inputs;
});

const datasetNodes = computed(() => {
  const nodes = [];
  for (const node of outputChildren.value) {
    if (node.type === IndexNodeType.Index) {
      nodes.push(...node.inputs);
    }
  }
  return nodes;
});
</script>

<style scoped lang="scss">
.index-tree-pane-container {
  padding: 40px 88px;
  .node-col {
    width: 400px;
  }
}
</style>
