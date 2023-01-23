<template>
  <div class="index-drilldown-panel-container">
    <header>
      <span v-if="type === IndexNodeType.OutputIndex" class="type-label"> Output Index </span>
      <div class="title-row" :class="{ 'space-between': canDeleteSelectedNode }">
        <h3>{{ panelTitle }}</h3>
        <button v-if="canDeleteSelectedNode" class="btn btn-sm" disabled>...</button>
        <button v-else class="btn btn-sm" disabled>Rename</button>
      </div>
    </header>
    <IndexComponentWeights v-if="shouldShowWeights" />
    <div v-if="type === IndexNodeType.OutputIndex" class="results">
      <h4>Index results</h4>
      <button class="btn" disabled>See results</button>
    </div>
    <IndexDocumentSnippets :selected-node-name="panelTitle" />
  </div>
</template>

<script setup lang="ts">
import { IndexNodeType } from '@/types/Enums';
import IndexComponentWeights from './index-component-weights.vue';
import IndexDocumentSnippets from './index-document-snippets.vue';
import { computed } from 'vue';

// TODO: populate from props
const type = IndexNodeType.OutputIndex;
const panelTitle = 'Overall priority';
const shouldShowWeights = computed(
  () => type === IndexNodeType.OutputIndex || type === IndexNodeType.Index
);
const canDeleteSelectedNode = computed(() => type !== IndexNodeType.OutputIndex);
</script>

<style scoped lang="scss">
@import '~styles/variables';
@import '~styles/uncharted-design-tokens';
.index-drilldown-panel-container {
  padding: 40px 88px;
  background: white;
  border-left: 1px solid #f0f1f2;
  display: flex;
  flex-direction: column;
  gap: 30px;
  overflow-y: auto;
}

header {
  display: flex;
  flex-direction: column;
}

.title-row {
  display: flex;
  gap: 10px;
  align-items: center;

  &.space-between {
    justify-content: space-between;
  }
}

.type-label {
  color: $accent-main;
}

.results {
  display: flex;
  flex-direction: column;
  gap: 10px;
  align-items: flex-start;
}
</style>
