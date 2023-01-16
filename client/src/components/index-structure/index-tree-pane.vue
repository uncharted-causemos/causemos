<template>
  <div class="index-tree-pane">
    <IndexTreeNode :data="props.indexTree" />
  </div>
</template>

<script setup lang="ts">
import IndexTreeNode from '@/components/index-structure/index-tree-node.vue';
import { OutputIndex } from '@/types/Index';

interface Props {
  indexTree: OutputIndex;
}
const props = defineProps<Props>();
</script>

<style scoped lang="scss">
.index-tree-pane {
  padding: 40px 88px;
}
</style>
