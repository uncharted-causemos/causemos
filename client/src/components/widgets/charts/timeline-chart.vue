<template>
  <div class="timeseries-chart-container">
    <div class="chart">
      <svg ref="lineChart" />
      <resize-observer @notify="resize" />
    </div>
    <div class="selected-data-container-and-footer">
      <div class="selected-data-container">
        <div
            class="selected-data-sections"
            v-for="datacubeSection in dataAtSelectedTimestamp"
            :key="datacubeSection.header">
          <div v-if="includeSectionHeaders" class="selected-data-section-header">{{datacubeSection.header}}</div>
          <div
            v-for="timeseries in datacubeSection.items"
            :key="timeseries.id"
            class="selected-data-row"
            :style="{
              color: timeseries.color,
              cursor: includeSectionHeaders ? 'normal' : 'pointer'
            }"
            v-tooltip="datacubeSection.header"
          >
            <strong>{{ timeseries.name.length > MAX_TIMESERIES_LABEL_CHAR_LENGTH ? timeseries.name.substring(0, MAX_TIMESERIES_LABEL_CHAR_LENGTH) + '...' : timeseries.name }}
              <sup>{{timeseries.superscript}}</sup>
            </strong>
            <span>{{ timeseries.value !== undefined ? valueFormatter(timeseries.value) : 'no data' }}</span>
          </div>
        </div>
      </div>
      <div class="timestamp">{{ timestampFormatter(selectedTimestamp) }}</div>
    </div>
  </div>
</template>

<script lang="ts">
import * as d3 from 'd3';
import _ from 'lodash';
import renderTimeline from '@/charts/timeline-renderer';
import { Timeseries } from '@/types/Timeseries';
import { defineComponent, PropType, onMounted, ref, watch, toRefs, computed } from 'vue';
import formatTimestamp from '@/formatters/timestamp-formatter';
import { TemporalResolutionOption, TIMESERIES_HEADER_SEPARATOR } from '@/types/Enums';
import { chartValueFormatter } from '@/utils/string-util';
import { MAX_TIMESERIES_LABEL_CHAR_LENGTH } from '@/utils/timeseries-util';
import { getActionSuperscript } from '@/utils/incomplete-data-detection';

const RESIZE_DELAY = 15;

export default defineComponent({
  name: 'TimelineChart',
  emits: ['select-timestamp', 'select-timestamp-range'],
  props: {
    timeseriesData: {
      type: Array as PropType<Timeseries[]>,
      required: true
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
    },
    selectedTemporalResolution: {
      type: String as PropType<TemporalResolutionOption | null>,
      default: ''
    }
  },
  setup(props, { emit }) {
    const { timeseriesData, breakdownOption, selectedTimestamp, selectedTemporalResolution, timeseriesToDatacubeMap } = toRefs(
      props
    );
    const includeSectionHeaders = ref(false);
    const lineChart = ref<HTMLElement | null>(null);
    function selectTimestamp(newValue: number) {
      emit('select-timestamp', newValue);
    }
    function selectTimestampRange(start: number, end: number) {
      emit('select-timestamp-range', { start, end });
    }
    let updateTimestampElements:
      | ((timestamp: number | null) => void)
      | undefined;
    const timestampFormatter = (timestamp: number) => {
      return formatTimestamp(
        timestamp,
        breakdownOption.value,
        selectedTemporalResolution.value
      );
    };
    const valueFormatter = computed(() => {
      const allPoints = timeseriesData.value.map(timeSeries => timeSeries.points).flat();
      const yExtent = d3.extent(allPoints.map(point => point.value));
      if (yExtent[0] === undefined) { return chartValueFormatter(); }
      return chartValueFormatter(...yExtent);
    });
    const dataAtSelectedTimestamp = computed(() => {
      // array of sections, each for a datacube,
      //  with header representing this unique datacube as well as all the timeseries info
      const legendData: {header: string; items: {id: string; name: string; color: string; value: number|undefined; superscript: string|undefined}[]}[] = [];
      timeseriesData.value.forEach(timeseries => {
        const timeseriesId = timeseries.id;
        const ownerDatacube = timeseriesToDatacubeMap.value[timeseriesId].datacubeName + TIMESERIES_HEADER_SEPARATOR + timeseriesToDatacubeMap.value[timeseriesId].datacubeOutputVariable;
        const existingDatacubeSection = legendData.find(item => item.header === ownerDatacube);
        if (existingDatacubeSection !== undefined) {
          // datacube section already exists
          existingDatacubeSection.items.push({
            id: timeseries.id,
            name: timeseries.name,
            color: timeseries.color,
            superscript: getActionSuperscript(timeseries.correctiveAction),
            value: timeseries.points.find(
              point => point.timestamp === selectedTimestamp.value
            )?.value
          });
        } else {
          const datacubeSection = {
            header: ownerDatacube,
            items: [
              {
                id: timeseries.id,
                name: timeseries.name,
                color: timeseries.color,
                superscript: getActionSuperscript(timeseries.correctiveAction),
                value: timeseries.points.find(
                  point => point.timestamp === selectedTimestamp.value
                )?.value
              }
            ]
          };
          legendData.push(datacubeSection);
        }
      });

      return legendData;
    });
    const resize = _.debounce(function({ width, height }) {
      if (lineChart.value === null || timeseriesData.value.length === 0) return;
      const svg = d3.select<HTMLElement, null>(lineChart.value);
      if (svg === null) return;
      // Set new size
      svg.attr('width', width).attr('height', height);
      // (Re-)render
      svg.selectAll('*').remove();
      updateTimestampElements = renderTimeline(
        svg,
        timeseriesData.value,
        width,
        height,
        selectedTimestamp.value,
        breakdownOption.value,
        timeseriesToDatacubeMap.value,
        selectTimestamp,
        selectTimestampRange
      );
    }, RESIZE_DELAY);
    watch(
      () => selectedTimestamp.value,
      selectedTimestamp => {
        if (updateTimestampElements !== undefined) {
          updateTimestampElements(selectedTimestamp);
        }
      }
    );
    watch(
      () => [timeseriesData.value, breakdownOption.value, timeseriesToDatacubeMap.value],
      () => {
        // Underlying data has changed, so rerender chart
        const parentElement = lineChart.value?.parentElement;
        if (parentElement === null || parentElement === undefined) return;
        resize({
          width: parentElement.clientWidth,
          height: parentElement.clientHeight
        });
      }
    );
    onMounted(() => {
      const parentElement = lineChart.value?.parentElement;
      if (parentElement === null || parentElement === undefined) return;
      resize({
        width: parentElement.clientWidth,
        height: parentElement.clientHeight
      });
    });
    return {
      resize,
      lineChart,
      timestampFormatter,
      dataAtSelectedTimestamp,
      valueFormatter,
      includeSectionHeaders,
      MAX_TIMESERIES_LABEL_CHAR_LENGTH
    };
  }
});
</script>

<style lang="scss" scoped>
@import '@/styles/variables';

.timeseries-chart-container {
  position: relative;
  width: 100%;
  height: 160px;
  display: flex;
}

.chart {
  flex: 1;
  min-width: 0;
  position: relative;
}

.selected-data-container {
  display: flex;
  flex-direction: column;
  overflow-y: auto;
  width: 100%;
}

.selected-data-container-and-footer {
  width: 150px;
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  justify-content: space-between;
}

.selected-data-sections {
  flex: 1;
  align-self: stretch;
  margin-bottom: 6px;
}

.selected-data-row {
  display: flex;
  justify-content: space-between;
  margin-left: 1rem;

  &:hover {
    background-color: rgb(240, 240, 240);
  }
}

.selected-data-section-header {
  text-overflow: ellipsis;
  overflow: hidden;
  white-space: nowrap;
}

.timestamp {
  color: $selected-dark
}

::v-deep(.xAxis .domain) {
  stroke: #e3e4e6;
}

::v-deep(.yAxis .tick line) {
  stroke: #e3e4e6;
}

::v-deep(.yAxis .domain) {
  opacity: 0;
}

::v-deep(.segment-line) {
  opacity: 0.5;
  stroke-width: 2;
}
</style>
