<template>
  <div class="datacube-timeline-container">
    <main>
      <timeline-chart
        class="timeseries-chart"
        :timeseries-data="timeseriesData"
        :timeseriesToDatacubeMap="timeseriesToDatacubeMap"
        :selected-timestamp="selectedTimestamp"
        :breakdown-option="breakdownOption"
        @select-timestamp="emitTimestampSelection"
        @select-timestamp-range="emitTimestampRangeSelection"
      />
    </main>
  </div>
</template>

<script lang="ts">
import { AggregationOption } from '@/types/Enums';
import { defineComponent, PropType } from 'vue';
import TimelineChart from '@/components/widgets/charts/timeline-chart.vue';
import { Timeseries } from '@/types/Timeseries';

export default defineComponent({
  name: 'DatacubeComparativeTimelineSync',
  components: {
    TimelineChart
  },
  props: {
    timeseriesData: {
      type: Array as PropType<Timeseries[]>,
      default: []
    },
    timeseriesToDatacubeMap: {
      type: Object as PropType<{[timeseriesId: string]: { datacubeName: string; datacubeOutputVariable: string }}>,
      default: {}
    },
    selectedTimestamp: {
      type: Number,
      default: 0
    },
    breakdownOption: {
      type: String as PropType<string | null>,
      default: null
    }
  },
  emits: ['select-timestamp', 'select-timestamp-range'],
  setup(props, { emit }) {
    const emitTimestampSelection = (newTimestamp: number) => {
      emit('select-timestamp', newTimestamp);
    };

    const emitTimestampRangeSelection = (newTimestampRange: {start: number; end: number}) => {
      emit('select-timestamp-range', newTimestampRange);
    };

    return {
      AggregationOption,
      emitTimestampSelection,
      emitTimestampRangeSelection
    };
  },
  methods: {
  }
});
</script>

<style lang="scss" scoped>
@import '~styles/variables';

.datacube-timeline-container {
  background: $background-light-1;
  border-radius: 3px;
  display: flex;
  padding: 10px;
}

main {
  display: flex;
  flex: 1;
  min-height: 0;
}

.timeseries-chart {
  flex: 1;
  min-width: 0;
}

</style>
