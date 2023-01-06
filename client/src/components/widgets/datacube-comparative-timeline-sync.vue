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
    <div class="timeseries-footer">
      <div
        v-if="footnotes"
        v-tooltip="{ content: footnoteTooltip, html: true }"
        style="text-align: right"
      >
        {{ footnotes }}
      </div>
    </div>
  </div>
</template>

<script lang="ts">
import { AggregationOption } from '@/types/Enums';
import { computed, defineComponent, PropType, toRefs } from 'vue';
import TimelineChart from '@/components/widgets/charts/timeline-chart.vue';
import { Timeseries } from '@/types/Timeseries';
import { getFootnotes, getFootnoteTooltip } from '@/utils/incomplete-data-detection';

export default defineComponent({
  name: 'DatacubeComparativeTimelineSync',
  components: {
    TimelineChart,
  },
  props: {
    timeseriesData: {
      type: Array as PropType<Timeseries[]>,
      default: [],
    },
    timeseriesToDatacubeMap: {
      type: Object as PropType<{
        [timeseriesId: string]: { datacubeName: string; datacubeOutputVariable: string };
      }>,
      default: {},
    },
    selectedTimestamp: {
      type: Number,
      default: 0,
    },
    breakdownOption: {
      type: String as PropType<string | null>,
      default: null,
    },
  },
  emits: ['select-timestamp', 'select-timestamp-range'],
  setup(props, { emit }) {
    const { timeseriesData } = toRefs(props);
    const emitTimestampSelection = (newTimestamp: number) => {
      emit('select-timestamp', newTimestamp);
    };

    const emitTimestampRangeSelection = (newTimestampRange: { start: number; end: number }) => {
      emit('select-timestamp-range', newTimestampRange);
    };
    const footnotes = computed(() => {
      return getFootnotes(timeseriesData.value.map(({ correctiveAction }) => correctiveAction));
    });
    const footnoteTooltip = computed(() => {
      return getFootnoteTooltip(
        timeseriesData.value.map(({ correctiveAction }) => correctiveAction)
      );
    });

    return {
      footnotes,
      footnoteTooltip,
      AggregationOption,
      emitTimestampSelection,
      emitTimestampRangeSelection,
    };
  },
  methods: {},
});
</script>

<style lang="scss" scoped>
@import '~styles/variables';

.datacube-timeline-container {
  background: $background-light-1;
  border-radius: 3px;
  padding: 10px 10px 5px;
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

.timeseries-footer {
  justify-content: flex-end;
  display: flex;
  padding-top: 5px;
}
</style>
