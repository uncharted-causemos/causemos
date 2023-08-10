<template>
  <div
    v-if="props.dataWarnings && props.dataWarnings.length > 0"
    class="index-projection-node-warning-container"
  >
    <div v-for="(w, index) in nodeWarnings" :key="index">
      <i class="fa fa-fw fa-exclamation-triangle warning"></i>
      {{ w.warning }}
    </div>
    <div v-for="(warnings, index) in Object.values(warningsPerProjection)" :key="index">
      <div v-for="(w, i) in warnings" :key="i">
        <i class="fa fa-fw fa-minus" :style="{ color: i === 0 ? w.color : 'transparent' }"></i>
        <i class="fa fa-fw fa-exclamation-triangle warning"></i>
        {{ w.warning }}
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import _ from 'lodash';
import { ProjectionDataWarning } from '@/types/Enums';
import { IndexProjectionNodeDataWarning } from '@/types/Index';
import { computed } from 'vue';

// Warnings that should be displayed for each projection data.
const projectionWarnings = [ProjectionDataWarning.NoPatternDetected];

const props = defineProps<{
  dataWarnings?: IndexProjectionNodeDataWarning[];
}>();

const warnings = computed(() => props.dataWarnings || []);

// Warning that should be displayed once for this node
const nodeWarnings = computed(() =>
  _.uniqBy(
    warnings.value.filter((w) => !projectionWarnings.includes(w.warning)),
    'warning'
  )
);

const warningsPerProjection = computed(() =>
  _.groupBy(
    warnings.value.filter((w) => projectionWarnings.includes(w.warning)),
    'projectionId'
  )
);
</script>

<style lang="scss" scoped>
@import '@/styles/uncharted-design-tokens';
.index-projection-node-warning-container {
  padding: 5px 10px;
  .warning {
    color: $un-color-feedback-warning;
  }
}
</style>
