<template>
  <div class="index-drilldown-panel-container">
    <template v-if="type === IndexNodeType.OutputIndex">
      <header>
        <span class="type-label"> Output Index </span>
        <div class="title-row">
          <h3>{{ panelTitle }}</h3>
          <button class="btn btn-sm" disabled>Rename</button>
        </div>
      </header>
      <IndexComponentWeights />
      <IndexResultsPreview />
      <IndexDocumentSnippets :selected-node-name="panelTitle" />
    </template>

    <template v-if="type === IndexNodeType.Index">
      <header>
        <div class="title-row space-between">
          <h3>{{ panelTitle }}</h3>
          <div class="button-group">
            <button class="btn btn-sm" disabled>Rename</button>
            <button class="btn btn-sm" disabled>
              <i class="fa fa-ellipsis-v" />
            </button>
          </div>
        </div>
      </header>
      <IndexComponentWeights />
      <IndexDocumentSnippets :selected-node-name="panelTitle" />
    </template>

    <template v-if="type === IndexNodeType.Dataset">
      <header>
        <div class="title-row space-between">
          <h3>{{ panelTitle }}</h3>
          <div class="button-group">
            <button class="btn btn-sm" disabled>Rename</button>
            <button class="btn btn-sm" disabled>
              <i class="fa fa-ellipsis-v" />
            </button>
          </div>
        </div>
      </header>
      <section>
        <IndexSpatialCoveragePreview />
      </section>
      <IndexDatasetMetadata />
      <section>
        <IndexDatasetSelectedDate />
      </section>
      <section>
        <IndexInvertData />
      </section>
      <IndexDocumentSnippets :selected-node-name="panelTitle" />
    </template>

    <template v-if="type === IndexEdgeType.Edge">
      <header>
        <div class="title-row space-between">
          <div class="edge-source-and-target">
            <h3>{{ 'Highest risk of drought' }}</h3>
            <h3 class="edge-target">{{ panelTitle }}</h3>
          </div>
          <button class="btn btn-sm" disabled>
            <i class="fa fa-ellipsis-v" />
          </button>
        </div>
      </header>
      <IndexComponentWeights />
      <IndexDocumentSnippets :selected-node-name="panelTitle" />
    </template>
  </div>
</template>

<script setup lang="ts">
import { IndexNodeType, IndexElementType, IndexEdgeType } from '@/types/Enums';
import IndexComponentWeights from './index-component-weights.vue';
import IndexDocumentSnippets from './index-document-snippets.vue';
import IndexResultsPreview from './index-results-preview.vue';
import IndexSpatialCoveragePreview from './index-spatial-coverage-preview.vue';
import IndexDatasetMetadata from './index-dataset-metadata.vue';
import IndexDatasetSelectedDate from './index-dataset-selected-date.vue';
import IndexInvertData from './index-invert-data.vue';

// TODO: populate from props
const type: IndexElementType = IndexEdgeType.Edge;
const panelTitle = 'Overall priority';
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

.button-group {
  display: flex;
  gap: 5px;
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

section {
  display: flex;
  flex-direction: column;
  gap: 5px;
}

.placeholder {
  background: $un-color-black-5;
}

.edge-source-and-target {
  display: flex;
  flex-direction: column;
  gap: 5px;
}

.edge-target {
  border-top: 1px solid $separator;
}
</style>
