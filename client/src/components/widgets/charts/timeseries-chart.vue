<template>
  <div>
    <div class="timeseries-chart-container">
      <div class="chart">
        <svg ref="lineChart" />
        <resize-observer @notify="resize" />
      </div>
      <div class="selected-data">
        <span class="unit">{{ unit }}</span>
        <div class="selected-data-rows">
          <div
            v-for="timeseries in dataAtSelectedTimestamp"
            :key="timeseries.id"
            class="selected-data-row"
            :style="{ color: timeseries.color }"
          >
            <strong v-tooltip="{ content: timeseries.tooltip, html: true }"
              >{{ timeseries.name }}
              <sup>{{ timeseries.superscript }}</sup>
            </strong>
            <span>{{
              timeseries.value !== undefined ? valueFormatter(timeseries.value) : 'no data'
            }}</span>
          </div>
        </div>
        <span class="timestamp">{{ timestampFormatter(selectedTimestamp) }} </span>
      </div>
    </div>
    <div class="timeseries-footer">
      <slot name="timeseries-footer-contents" />
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
import * as d3 from 'd3';
import _ from 'lodash';
import renderTimeseries from '@/charts/timeseries-renderer';
import { Timeseries } from '@/types/Timeseries';
import { computed, defineComponent, onMounted, PropType, ref, toRefs, watch } from 'vue';
import { TemporalResolutionOption } from '@/types/Enums';
import formatTimestamp from '@/formatters/timestamp-formatter';
import { chartValueFormatter } from '@/utils/string-util';
import {
  getActionSuperscript,
  getActionTooltip,
  getFootnotes,
  getFootnoteTooltip,
} from '@/utils/incomplete-data-detection';

const RESIZE_DELAY = 15;

export default defineComponent({
  name: 'TimeseriesChart',
  emits: ['select-timestamp'],
  props: {
    timeseriesData: {
      type: Array as PropType<Timeseries[]>,
      required: true,
    },
    selectedTemporalResolution: {
      type: String as PropType<TemporalResolutionOption | null>,
      default: '',
    },
    selectedTimestamp: {
      type: Number,
      default: 0,
    },
    selectedTimestampRange: {
      type: Object as PropType<{ start: number; end: number } | null>,
      default: null,
    },
    breakdownOption: {
      type: String as PropType<string | null>,
      default: null,
    },
    unit: {
      type: String,
      default: '',
    },
  },
  setup(props, { emit }) {
    const {
      timeseriesData,
      breakdownOption,
      selectedTemporalResolution,
      selectedTimestamp,
      selectedTimestampRange,
      unit,
    } = toRefs(props);
    const lineChart = ref<HTMLElement | null>(null);
    function selectTimestamp(newValue: number) {
      emit('select-timestamp', newValue);
    }
    let updateTimestampElements: ((timestamp: number | null) => void) | undefined;
    const timestampFormatter = (timestamp: number) => {
      return formatTimestamp(timestamp, breakdownOption.value, selectedTemporalResolution.value);
    };
    const resize = _.debounce(function ({ width, height }) {
      if (lineChart.value === null || timeseriesData.value.length === 0) return;
      const svg = d3.select<HTMLElement, null>(lineChart.value);
      if (svg === null) return;
      // Set new size
      svg.attr('width', width).attr('height', height);
      // (Re-)render
      svg.selectAll('*').remove();
      updateTimestampElements = renderTimeseries(
        svg,
        timeseriesData.value,
        width,
        height,
        selectedTimestamp.value,
        selectTimestamp,
        breakdownOption.value,
        selectedTimestampRange.value,
        unit.value,
        timestampFormatter,
        selectedTemporalResolution.value ?? TemporalResolutionOption.Year
      );
    }, RESIZE_DELAY);
    watch(
      () => selectedTimestamp.value,
      (selectedTimestamp) => {
        if (updateTimestampElements !== undefined) {
          updateTimestampElements(selectedTimestamp);
        }
      }
    );
    watch(
      () => [timeseriesData.value, breakdownOption.value, selectedTimestampRange.value],
      () => {
        // Underlying data has changed, so rerender chart
        const parentElement = lineChart.value?.parentElement;
        if (parentElement === null || parentElement === undefined) return;
        resize({
          width: parentElement.clientWidth,
          height: parentElement.clientHeight,
        });
      }
    );
    const valueFormatter = computed(() => {
      const allPoints = timeseriesData.value.map((timeseries) => timeseries.points).flat();
      const yExtent = d3.extent(allPoints.map((point) => point.value));
      if (yExtent[0] === undefined) {
        return chartValueFormatter();
      }
      return chartValueFormatter(...yExtent);
    });
    const dataAtSelectedTimestamp = computed(() => {
      return timeseriesData.value
        .map(({ id, name, color, points, correctiveAction }) => ({
          id,
          name,
          color,
          superscript: getActionSuperscript(correctiveAction),
          tooltip: getActionTooltip(correctiveAction),
          value: points.find((point) => point.timestamp === selectedTimestamp.value)?.value,
        }))
        .sort(({ value: a }, { value: b }) => {
          return (b as number) - (a as number);
        });
    });
    const footnotes = computed(() => {
      return getFootnotes(timeseriesData.value.map(({ correctiveAction }) => correctiveAction));
    });
    const footnoteTooltip = computed(() => {
      return getFootnoteTooltip(
        timeseriesData.value.map(({ correctiveAction }) => correctiveAction)
      );
    });
    onMounted(() => {
      const parentElement = lineChart.value?.parentElement;
      if (parentElement === null || parentElement === undefined) return;
      resize({
        width: parentElement.clientWidth,
        height: parentElement.clientHeight,
      });
    });
    return {
      resize,
      lineChart,
      dataAtSelectedTimestamp,
      footnotes,
      footnoteTooltip,
      timestampFormatter,
      valueFormatter,
    };
  },
});
</script>

<style lang="scss" scoped>
@import '@/styles/variables';

.timeseries-chart-container {
  width: 100%;
  height: 130px;
  display: flex;
}

.chart {
  flex: 1;
  min-width: 0;
  position: relative;
}

.selected-data {
  width: 120px;
  display: flex;
  flex-direction: column;
  align-items: flex-end;
}

.selected-data-rows {
  flex: 1;
  min-height: 0;
  overflow-y: auto;
  align-self: stretch;
}

.selected-data-row {
  display: flex;
  justify-content: space-between;
}

.unit {
  color: $text-color-medium;
}

.timestamp {
  color: $text-color-medium;
}

.timeseries-footer {
  justify-content: flex-end;
  display: flex;
}

:deep(.xAxis .domain) {
  stroke: #e3e4e6;
}

:deep(.yAxis .tick line) {
  stroke: #e3e4e6;
}

:deep(.yAxis .domain) {
  opacity: 0;
}

:deep(.segment-line) {
  opacity: 0.5;
  stroke-width: 2;
}
</style>
