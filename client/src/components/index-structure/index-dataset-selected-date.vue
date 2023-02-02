<template>
  <div class="section-header">
    <h4>Selected date</h4>
    <button disabled class="btn btn-sm btn-default">Change</button>
  </div>
  <p>
    Using data from <strong>{{ timestampDisplayString }}</strong> in index results.
  </p>
  <div v-if="sparklineData !== null" class="sparkline-and-labels">
    <div class="y-labels flex-col space-between">
      <p>{{ range.maximum }}</p>
      <p>{{ range.minimum }}</p>
    </div>
    <Sparkline v-bind="$attrs" :data="[sparklineData]" :size="[300, 100]" />
    <div class="x-labels flex space-between">
      <p>{{ temporalCoverage.from }}</p>
      <p>{{ temporalCoverage.to }}</p>
    </div>
  </div>
  <div v-else class="timeseries placeholder" v-bind="$attrs" />
</template>

<script setup lang="ts">
import _ from 'lodash';
import timestampFormatter from '@/formatters/timestamp-formatter';
import Sparkline, { SparklineData } from '@/components/widgets/charts/sparkline.vue';
import { computed } from 'vue';
import { Indicator } from '@/types/Datacube';

const props = defineProps<{
  datasetId: string;
  selectedTimestamp: number;
  metadata: Indicator | null;
}>();

const timestampDisplayString = computed(() =>
  timestampFormatter(props.selectedTimestamp, null, null)
);

const sparklineData = computed<SparklineData | null>(() => {
  if (props.metadata?.sparkline === undefined) {
    return null;
  }
  return {
    name: '', // unused
    color: 'grey',
    series: props.metadata.sparkline,
  };
});
const temporalCoverage = computed(() => ({
  from: timestampFormatter(props.metadata?.period.gte ?? 0, null, null),
  to: timestampFormatter(props.metadata?.period.lte ?? 0, null, null),
}));
const range = computed(() => ({
  minimum: _.min(props.metadata?.sparkline),
  maximum: _.max(props.metadata?.sparkline),
}));
</script>

<style lang="scss" scoped>
@import '~styles/uncharted-design-tokens';

.section-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.placeholder {
  background: $un-color-black-5;
}

.timeseries {
  height: 100px;
}

.sparkline-and-labels {
  display: grid;
  grid-template-areas:
    'y-labels sparkline'
    '. x-labels';
}

.x-labels {
  grid-area: x-labels;
}

.y-labels {
  grid-area: y-labels;
  align-items: flex-end;
  margin-right: 5px;
}

.x-labels,
.y-labels {
  justify-content: space-between;
  color: $un-color-black-40;
}
</style>
