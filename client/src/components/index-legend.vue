<template>
  <div class="index-legend-container">
    <div v-if="props.isProjectionSpace" class="legend-column">
      <p class="un-font-small">
        <i class="fa fa-fw" :class="DATASET_ICON" :style="{ color: DATASET_COLOR }" />
        Concepts with datasets attached
      </p>
      <p class="un-font-small">
        <i class="fa fa-fw fa-square-o" :style="{ color: 'black' }" />
        Constraint
      </p>
      <p class="un-font-small">
        <i class="fa fa-fw fa-circle" :style="{ color: 'black' }" />
        Dataset value
      </p>
      <p class="un-font-small">
        <i class="fa fa-fw fa-minus" :style="{ color: 'black' }" />
        Interpolated data
      </p>
      <p class="un-font-small">
        <i class="fa fa-minus" :style="{ color: 'black', transform: 'scale(0.5)', width: '7px' }" />
        <i class="fa fa-minus" :style="{ color: 'black', transform: 'scale(0.5)', width: '7px' }" />
        Extrapolated data
      </p>
    </div>
    <div v-if="props.isProjectionSpace" class="legend-column">
      <p class="un-font-small">Concepts without datasets</p>
      <p class="un-font-small">
        <i class="fa fa-fw fa-square-o" :style="{ color: 'black' }" />
        Constraint
      </p>
      <p class="un-font-small">
        <i class="fa fa-fw fa-circle" :style="{ color: 'black' }" />All components have values
      </p>
      <p class="un-font-small">
        <i
          class="fa fa-fw fa-minus"
          :style="{ color: 'black', opacity: WEIGHTED_SUM_LINE_OPACITY }"
        />Some components do not have values
      </p>
    </div>
    <div class="legend-column">
      <p class="un-font-small">Relationships</p>
      <p class="un-font-small">
        <i class="fa fa-fw fa-minus" :style="{ color: POSITIVE_COLOR }" />
        High levels of A represent
        <span class="un-font-small" :style="{ color: POSITIVE_COLOR }">high</span> levels of B
      </p>
      <p class="un-font-small">
        <i class="fa fa-fw fa-minus" :style="{ color: NEGATIVE_COLOR }" />
        High levels of A represent
        <span class="un-font-small" :style="{ color: NEGATIVE_COLOR }">low</span> levels of B
      </p>
    </div>
    <div class="legend-column">
      <p class="un-font-small">Data quality</p>
      <p class="un-font-small">
        <i class="fa fa-fw fa-square"></i>
        Old data
      </p>
      <p class="un-font-small">
        <i class="fa fa-fw fa-exclamation-triangle"></i>
        Ignored due to insufficient data
      </p>
    </div>
  </div>
</template>

<script setup lang="ts">
import { NEGATIVE_COLOR, POSITIVE_COLOR } from '@/utils/colors-util';
import { DATASET_COLOR, DATASET_ICON } from '@/utils/index-tree-util';
import { WEIGHTED_SUM_LINE_OPACITY } from '@/charts/projections-renderer-simple';

const props = defineProps<{ isProjectionSpace: boolean }>();
</script>

<style lang="scss" scoped>
@import '@/styles/uncharted-design-tokens';
.index-legend-container {
  display: flex;
  padding: 10px 20px;
  background: white;
  border-radius: 3px 3px 0 0;
  max-width: 1100px;
}

.legend-column {
  flex: 1;
  min-width: 0;

  p:not(:first-child) {
    color: $un-color-black-40;
  }
}

.fa-exclamation-triangle {
  color: $un-color-feedback-warning;
}

.fa-square-o {
  color: #f0edd9;
}
</style>
