<template>
  <div class="datacube-timeline-container">
    <div class="timeseries-chart">
      <timeline-chart
        :timeseries-data="timeseriesData"
        :selected-timestamp="selectedTimestamp"
        :breakdown-option="breakdownOption"
        @select-timestamp="emitTimestampSelection"
        @select-timestamp-range="emitTimestampRangeSelection"
      />
    </div>
    <div class="datacube-map-placeholder" />
  </div>
</template>

<script lang="ts">
import { AggregationOption } from '@/types/Enums';
import { defineComponent, PropType, ref } from 'vue';
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
    selectedTimestamp: {
      type: Number,
      default: 0
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

    const breakdownOption = ref<string | null>(null);
    const setBreakdownOption = (newValue: string | null) => {
      breakdownOption.value = newValue;
    };

    return {
      breakdownOption,
      setBreakdownOption,
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

.timeseries-chart {
  flex: 1;
  min-width: 0;
}

.datacube-map-placeholder {
  background-color: #fafafa;
  height: 100%;
  width: 150px;
  display: flex;
  flex-direction: column;
  padding: 5px;
}

.country-list {
  flex: 1;
  min-height: 0;
  overflow-y: auto;
}

</style>
