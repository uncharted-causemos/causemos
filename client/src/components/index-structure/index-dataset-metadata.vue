<template>
  <!--
    v-bind="$attrs" is required to allow multiple root elements
    https://v3-migration.vuejs.org/new/fragments.html
  -->
  <section v-bind="$attrs">
    <h4 class="type-label" :style="{ color: DATASET_COLOR }">
      <i class="fa fa-fw" :class="[DATASET_ICON]" />
      Dataset
    </h4>
    <div>
      <h5>{{ props.node.dataset.datasetName }}</h5>
      <p class="subdued" :class="{ collapsed: isDescriptionCollapsed }">
        {{ description }}
      </p>
    </div>
    <div v-if="!isDescriptionCollapsed">
      <h5>Source: {{ props.node.dataset.source }}</h5>
      <p class="subdued">
        {{ props.datasetMetadata?.description ?? '' }}
      </p>
    </div>
    <button
      @click="isDescriptionCollapsed = !isDescriptionCollapsed"
      class="btn btn-default btn-sm"
    >
      Show {{ isDescriptionCollapsed ? 'more' : 'less' }}
    </button>
  </section>
</template>

<script setup lang="ts">
import { Indicator } from '@/types/Datacube';
import { ConceptNodeWithDatasetAttached } from '@/types/Index';
import { DATASET_COLOR, DATASET_ICON } from '@/utils/index-tree-util';
import { computed, ref } from 'vue';

const props = defineProps<{
  node: ConceptNodeWithDatasetAttached;
  datasetMetadata: Indicator | null;
}>();

const description = computed(() => {
  if (props.datasetMetadata === null) {
    return '';
  }
  return props.datasetMetadata.outputs[0].description;
});

const isDescriptionCollapsed = ref(true);
</script>

<style lang="scss" scoped>
@import '~styles/uncharted-design-tokens';

section > *:not(:first-child) {
  margin-top: 10px;
}

.collapsed {
  display: block;
  text-overflow: ellipsis;
  word-wrap: break-word;
  overflow: hidden;
  line-height: 2rem;
  max-height: 6rem;
}
</style>
