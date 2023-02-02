<template>
  <!--
    v-bind="$attrs" is required to allow multiple root elements
    https://v3-migration.vuejs.org/new/fragments.html
  -->
  <section v-bind="$attrs">
    <h4 v-if="hasBeenRenamed">Original name: {{ props.node.datasetName }}</h4>
    <h4 v-else>Description</h4>
    <p class="de-emphasized">
      {{ description }}
    </p>
  </section>
  <section v-bind="$attrs">
    <h4>Source: {{ props.node.source }}</h4>
    <p class="de-emphasized">
      {{ props.datasetMetadata?.description ?? '' }}
    </p>
  </section>
</template>

<script setup lang="ts">
import { Indicator } from '@/types/Datacube';
import { Dataset } from '@/types/Index';
import { computed } from 'vue';

const props = defineProps<{
  node: Dataset;
  datasetMetadata: Indicator | null;
}>();

const hasBeenRenamed = computed(() => props.node.datasetName !== props.node.name);

const description = computed(() => {
  if (props.datasetMetadata === null) {
    return '';
  }
  return props.datasetMetadata.outputs[0].description;
});
</script>

<style lang="scss" scoped>
@import '~styles/uncharted-design-tokens';

.de-emphasized {
  color: $un-color-black-40;
}
</style>
