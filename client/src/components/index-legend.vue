<template>
  <div class="index-legend-container">
    <p>Legend</p>
    <div class="flex">
      <div v-if="props.isProjectionSpace" class="legend-column">
        <p class="un-font-small">
          <i class="fa fa-fw" :class="DATASET_ICON" :style="{ color: DATASET_COLOR }" />
          Concepts with datasets attached
        </p>
        <div class="constraint-row">
          <ConstraintIcon />
          <p class="un-font-small">&nbsp;Constraint</p>
        </div>
        <p class="un-font-small">
          <i class="fa fa-fw fa-circle" :style="{ color: 'black' }" />
          Dataset value
        </p>
        <p class="un-font-small">
          <i class="fa fa-fw fa-minus" :style="{ color: 'black' }" />
          Interpolated data
        </p>
        <p class="un-font-small">
          <i
            class="fa fa-minus"
            :style="{ color: 'black', transform: 'scale(0.5)', width: '7px' }"
          />
          <i
            class="fa fa-minus"
            :style="{ color: 'black', transform: 'scale(0.5)', width: '7px' }"
          />
          Extrapolated data
        </p>
      </div>
      <div v-if="props.isProjectionSpace" class="legend-column">
        <p class="un-font-small">Concepts without datasets</p>
        <div class="constraint-row">
          <ConstraintIcon />
          <p class="un-font-small">&nbsp;Constraint</p>
        </div>
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
    </div>
  </div>
</template>

<script setup lang="ts">
import { NEGATIVE_COLOR, POSITIVE_COLOR } from '@/utils/colors-util';
import { DATASET_COLOR, DATASET_ICON } from '@/utils/index-tree-util';
import { WEIGHTED_SUM_LINE_OPACITY } from '@/charts/projections-renderer-simple';
import ConstraintIcon from '@/components/widgets/constraint-icon.vue';

const props = defineProps<{ isProjectionSpace: boolean }>();
</script>

<style lang="scss" scoped>
@import '@/styles/uncharted-design-tokens';
.index-legend-container {
  display: flex;
  flex-direction: column;
  gap: 10px;
  padding: 10px 20px;
  background: var(--p-surface-50);
  border: 1px solid var(--p-surface-200);
  border-radius: 3px;
  max-width: 1100px;
}

.legend-column {
  flex: 1;
  min-width: 0;

  p:first-child {
    margin-bottom: 8px;
  }

  p:not(:first-child) {
    color: var(--p-text-muted-color);
    margin-bottom: 3px;
  }
}

.constraint-row {
  display: flex;
  align-items: baseline;
}
</style>
