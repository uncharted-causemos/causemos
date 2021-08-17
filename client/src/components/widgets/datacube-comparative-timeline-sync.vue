<template>
  <div class="row datacube-card-container">
    <div>
      <div class="col-md-9 timeseries-chart">
        <timeline-chart
          :timeseries-data="timeseriesData"
          :selected-timestamp="selectedTimestamp"
          :breakdown-option="breakdownOption"
          @select-timestamp="emitTimestampSelection"
          @select-timestamp-range="emitTimestampRangeSelection"
        />
      </div>
      <div class="datacube-map-placeholder col-md-3">
        <!-- placeholder for mini map -->
        <b>Global Regional Info:</b>
        <div class="fixed-height-column">
        </div>
      </div>
    </div>
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

.datacube-card-container {
  background: $background-light-1;
  box-shadow: $shadow-level-1;
  // padding: 10px;
  margin: 10px;
  border-radius: 3px;
}

.datacube-expanded {
  min-width: 0;
  flex: 1;
  margin: 10px;
  margin-top: 0;
}

.datacube-header {
  flex: 1;
  margin-left: 20px;
  display: flex;
  align-items: center;

  .drilldown-btn {
    padding: 5px;
    margin-left:auto;
  }
}

.timeseries-chart {
  display: flex;
  flex-direction: column;
  padding-left: 5px;
  padding-right: 5px;
}

.datacube-map-placeholder {
  background-color: aliceblue;
  height: 100%;
  border-color: darkgray;
  border-style: solid;
  border-width: thin;
  margin-bottom: 5px;
  margin-top: 2rem;
}

.fixed-height-column {
  // height: 12vh;
  overflow-y: scroll;
}

</style>
