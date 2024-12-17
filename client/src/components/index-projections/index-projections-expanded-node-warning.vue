<template>
  <div
    v-if="props.dataWarnings && props.dataWarnings.length > 0"
    class="index-projections-expanded-node-warning-container"
  >
    <div v-for="(w, index) in nodeWarnings" :key="index" class="warning">
      <p class="warning-title"><i class="fa fa-fw fa-exclamation-triangle"></i>{{ w.warning }}</p>
      <p class="subdued un-font-small message">{{ w.message }}</p>
    </div>
    <div v-for="(warnings, index) in Object.values(warningsPerProjection)" :key="index">
      <div v-for="(w, i) in warnings" :key="i" class="warning">
        <p>
          <i class="fa fa-fw fa-minus" :style="{ color: w.color }"></i>
          {{ w.warning }}
        </p>
        <p class="subdued un-font-small message">{{ w.message }}</p>
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
.index-projections-expanded-node-warning-container {
  padding-top: 10px;
  .warning {
    background: var(--background-warn);
    border-radius: 3px;
    padding: 5px 10px;
    display: flex;
    gap: 5px;
    align-items: baseline;
    margin-bottom: 5px;
    cursor: pointer;

    .message {
      flex: 1;
      min-width: 0;
    }

    &:not(:hover) .message {
      overflow: hidden;
      text-overflow: ellipsis;
      text-wrap: nowrap;
    }
  }
  .warning-title {
    color: $un-color-feedback-warning;
    i {
      margin-right: 5px;
    }
  }
}
</style>
