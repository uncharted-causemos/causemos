<template>
  <div class="index-projections-node-container" @click="emit('select', props.nodeData.id)">
    <div class="content">
      {{ props.nodeData.name }}
      <span v-if="props.nodeData.name.length === 0" class="subdued">(Missing name)</span>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ConceptNode } from '@/types/Index';

const props = defineProps<{
  nodeData: ConceptNode;
}>();

const emit = defineEmits<{
  (e: 'select', nodeId: string): void;
}>();
</script>

<style lang="scss" scoped>
@import '@/styles/uncharted-design-tokens';
@import '@/styles/index-graph';
.index-projections-node-container {
  @include index-tree-node;

  &:hover {
    @include index-tree-node-hover;
  }
}

.content {
  @include index-tree-node-content;
}
</style>
