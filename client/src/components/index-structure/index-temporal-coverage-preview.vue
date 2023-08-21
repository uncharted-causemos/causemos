<template>
  <div>
    <p>{{ coverageSummaryString }}</p>
    <div v-if="sparklineData !== null" class="sparkline-and-labels">
      <div class="y-labels flex-col space-between">
        <p>{{ range.maximum ? precisionFormatter(range.maximum) : '' }}</p>
        <p>{{ range.minimum ? precisionFormatter(range.minimum) : '' }}</p>
      </div>
      <Sparkline v-bind="$attrs" :data="[sparklineData]" :size="[300, 75]" />
      <div class="x-labels flex space-between">
        <p>{{ temporalCoverage.from }}</p>
        <p>{{ temporalCoverage.to }}</p>
      </div>
    </div>
    <div v-else class="timeseries placeholder" v-bind="$attrs" />
  </div>
</template>

<script setup lang="ts">
import _ from 'lodash';
import precisionFormatter from '@/formatters/precision-formatter';
import Sparkline from '@/components/widgets/charts/sparkline.vue';
import { computed, toRefs } from 'vue';
import { Indicator } from '@/types/Datacube';
import useModelMetadataCoverage from '@/composables/useModelMetadataCoverage';
import { getYearFromTimestamp } from '@/utils/date-util';

const props = defineProps<{
  outputVariable: string;
  metadata: Indicator | null;
}>();

const { metadata, outputVariable } = toRefs(props);

const { range, sparklineData, temporalCoverage, temporalCoverageTimestamps } =
  useModelMetadataCoverage(metadata, outputVariable);

const coverageSummaryString = computed(() => {
  const { from, to } = temporalCoverageTimestamps.value;
  if (from === null || to === null) {
    return 'Unable to determine temporal coverage.';
  }
  const startYear = getYearFromTimestamp(from);
  const endYear = getYearFromTimestamp(to);
  const coverageLength = endYear - startYear;
  return `${coverageLength} year${coverageLength === 1 ? '' : 's'}.`;
});
</script>

<style lang="scss" scoped>
@import '~styles/uncharted-design-tokens';

.placeholder {
  background: $un-color-black-5;
}

.timeseries {
  height: 75px;
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
