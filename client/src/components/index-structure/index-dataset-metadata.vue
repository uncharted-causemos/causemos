<template>
  <!--
    v-bind="$attrs" is required to allow multiple root elements
    https://v3-migration.vuejs.org/new/fragments.html
  -->
  <section v-bind="$attrs">
    <h4 v-if="hasBeenRenamed">Original name: {{ props.node.datasetName }}</h4>
    <p class="de-emphasized">
      {{ datasetMetadata?.outputs[0].description ?? '' }}
    </p>
  </section>
  <section v-bind="$attrs">
    <h4>Source: {{ props.node.source }}</h4>
    <p class="de-emphasized">
      {{ datasetMetadata?.description ?? '' }}
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
</script>

<style lang="scss" scoped>
@import '~styles/uncharted-design-tokens';

.de-emphasized {
  color: $un-color-black-40;
}
</style>
