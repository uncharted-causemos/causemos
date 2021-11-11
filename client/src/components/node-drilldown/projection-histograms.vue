<template>
  <div class="projection-histograms-container">
  </div>
</template>

<script lang="ts">
import { ScenarioProjection } from '@/types/CAG';
import { TimeseriesPoint } from '@/types/Timeseries';
import { defineComponent, PropType } from 'vue';
export default defineComponent({
  name: 'ProjectionHistograms',
  props: {
    comparisonBaselineId: {
      type: String,
      default: null
    },
    historicalTimeseries: {
      type: Array as PropType<TimeseriesPoint[]>,
      default: []
    },
    projections: {
      type: Array as PropType<ScenarioProjection[]>,
      default: []
    }
  },
  setup() {
    return {

    };
  }
});
</script>

<style lang="scss" scoped>
</style>
