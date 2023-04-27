<template>
  <div class="index-projections-node-container" @click="emit('select', props.nodeData.id)">
    <div class="content node-header">
      {{ props.nodeData.name }}
      <span v-if="props.nodeData.name.length === 0" class="subdued">(Missing name)</span>
    </div>

    <div v-if="isConceptNodeWithDatasetAttached(props.nodeData)">
      <div class="content timeseries-label">
        <i class="fa fa-fw" :class="DATASET_ICON" :style="{ color: DATASET_COLOR }" />
        <span class="subdued un-font-small overflow-ellipsis">{{ dataSourceText }}</span>
      </div>
      <div class="timeseries"><!-- TODO: --></div>
    </div>

    <div v-else-if="isEmptyNode(props.nodeData)" class="content">
      <span class="un-font-small warning">{{ dataSourceText }}</span>
      <button class="btn btn-default full-width-button" disabled>Enter data points</button>
    </div>

    <div v-else>
      <div class="content timeseries-label">
        <span class="subdued un-font-small overflow-ellipsis">{{ dataSourceText }}</span>
      </div>
      <div class="timeseries"><!-- TODO: --></div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ConceptNode } from '@/types/Index';
import {
  DATASET_COLOR,
  DATASET_ICON,
  getNodeDataSourceText,
  isConceptNodeWithDatasetAttached,
  isEmptyNode,
} from '@/utils/index-tree-util';
import { computed } from 'vue';

const props = defineProps<{
  nodeData: ConceptNode;
}>();

const emit = defineEmits<{
  (e: 'select', nodeId: string): void;
}>();

const dataSourceText = computed(() => getNodeDataSourceText(props.nodeData));
</script>

<style lang="scss" scoped>
@import '@/styles/uncharted-design-tokens';
@import '@/styles/index-graph';
@import '@/styles/common';

.index-projections-node-container {
  @include index-tree-node;

  &:hover {
    @include index-tree-node-hover;
  }
}

.content {
  @include index-tree-node-content;
}

.node-header {
  padding-bottom: 0;
}

.timeseries-label {
  display: flex;
  gap: 5px;
  align-items: center;

  span {
    flex: 1;
    min-width: 0;
  }
}

.timeseries {
  border-top: 1px solid $un-color-black-10;
  height: 60px;
}

.warning {
  color: $un-color-feedback-warning;
}

.full-width-button {
  width: 100%;
}
</style>
