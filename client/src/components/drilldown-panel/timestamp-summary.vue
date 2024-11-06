<script setup lang="ts">
import { BreakdownState } from '@/types/Datacube';
import { AggregationOption } from '@/types/Enums';
import { Timeseries } from '@/types/Timeseries';
import {
  isBreakdownStateNone,
  isBreakdownStateOutputs,
  isBreakdownStateQualifiers,
  isBreakdownStateRegions,
  isBreakdownStateYears,
} from '@/utils/datacube-util';
import { getActionSuperscript, getActionTooltip } from '@/utils/incomplete-data-detection';
import { valueFormatter } from '@/utils/string-util';
import { computed, toRefs } from 'vue';

const props = defineProps<{
  aggregationMethod: AggregationOption;
  unit: string;
  timeseriesData: Timeseries[];
  breakdownState: BreakdownState;
  selectedTimestamp: number | null;
}>();

const { timeseriesData, breakdownState, selectedTimestamp } = toRefs(props);

const timeseriesTypeLabel = computed(() => {
  const state = breakdownState.value;
  if (isBreakdownStateRegions(state)) return 'Region';
  if (isBreakdownStateYears(state)) return 'Year';
  if (isBreakdownStateOutputs(state)) return 'Output';
  if (isBreakdownStateQualifiers(state)) return state.qualifier;
  // No breakdown is active.
  // Either we're showing one or more model runs, or we're showing an indicator
  //  and this label will be hidden.
  return 'Model run';
});

const isIndicatorWithoutSplitByActive = computed(
  () =>
    isBreakdownStateNone(breakdownState.value) &&
    breakdownState.value.modelRunIds.length === 1 &&
    breakdownState.value.modelRunIds[0] === 'indicator'
);

// TODO: remove this from timeseries-chart?
const dataAtSelectedTimestamp = computed(() =>
  timeseriesData.value
    .map(({ id, name, color, points, correctiveAction }) => ({
      timeseriesId: id,
      name,
      color,
      superscript: getActionSuperscript(correctiveAction),
      tooltip: getActionTooltip(correctiveAction),
      value: points.find((point) => point.timestamp === selectedTimestamp.value)?.value,
    }))
    .sort(({ value: a }, { value: b }) => {
      return (b as number) - (a as number);
    })
);
</script>

<template>
  <p>{{ aggregationMethod === AggregationOption.Mean ? 'Average' : 'Total' }} {{ unit }}</p>
  <div class="timestamp-summary-headers">
    <span v-if="!isIndicatorWithoutSplitByActive"> {{ timeseriesTypeLabel }} </span>
    <span> {{ unit }} </span>
  </div>
  <div>
    <div
      v-for="timeseriesValue of dataAtSelectedTimestamp"
      :key="timeseriesValue.timeseriesId"
      class="timeseries-summary-row"
    >
      <!-- If we're displaying data for an indicator instead of a model and no
      "split by" state is active, don't label the row, just show the value. -->
      <span v-if="!isIndicatorWithoutSplitByActive">
        <div class="timeseries-color-indicator" :style="{ background: timeseriesValue.color }" />
        {{ timeseriesValue.name }}
      </span>
      <span> {{ valueFormatter(timeseriesValue.value ?? null) }} </span>
    </div>
  </div>
</template>

<style lang="scss" scoped>
@import '~styles/variables';
.timestamp-summary-headers,
.timeseries-summary-row {
  display: flex;
  justify-content: space-between;

  & > span {
    color: var(--p-text-muted-color);
    font-size: $font-size-small;
  }
}

.timeseries-summary-row > span {
  color: var(--p-text-color);
}

.timeseries-color-indicator {
  width: 6px;
  height: 6px;
  display: inline-block;
}
</style>
