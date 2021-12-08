<template>
  <div class="td-node-chart-container">
    <svg ref="chartRef" />
    <resize-observer @notify="resize" />
  </div>
</template>

<script lang="ts">
import * as d3 from 'd3';
import _ from 'lodash';
import { TimeseriesPoint } from '@/types/Timeseries';
import {
  computed,
  defineComponent,
  nextTick,
  onMounted,
  PropType,
  ref,
  toRefs,
  watchEffect
} from 'vue';
import renderChart from '@/charts/td-node-renderer';
import { ProjectionConstraint, ScenarioProjection } from '@/types/CAG';
import { D3Selection } from '@/types/D3';

const RESIZE_DELAY = 15;

export default defineComponent({
  name: 'TDNodeChart',
  emits: ['set-historical-timeseries', 'set-constraints'],
  props: {
    historicalTimeseries: {
      type: Array as PropType<TimeseriesPoint[]>,
      default: []
    },
    projections: {
      type: Array as PropType<ScenarioProjection[]>,
      default: []
    },
    minValue: {
      type: Number,
      required: true
    },
    maxValue: {
      type: Number,
      required: true
    },
    viewingExtent: {
      type: Array as PropType<number[]>,
      default: null
    },
    constraints: {
      type: Array as PropType<ProjectionConstraint[]>,
      required: true
    },
    isExpanded: {
      type: Boolean,
      default: false
    }
  },
  setup(props, { emit }) {
    const {
      historicalTimeseries,
      projections,
      minValue,
      maxValue,
      viewingExtent,
      constraints
    } = toRefs(props);
    const historicalTimeseriesBeforeStart = computed(() => {
      let projectionStartTimestamp = 0;
      if (projections.value.length > 0) {
        // Get the first timestamp from the first projection.
        // FIXME: can we make this selection a little smarter to use the
        //  selected scenario, or at least a non-empty, non-stale scenario?
        // CAUTION: new scenarios have no projection points but can be
        //  selected. When trying to make this logic smarter, watch for that
        //  case.
        const selectedScenario = projections.value[0];
        if (selectedScenario.values.length === 0) {
          console.error(
            `When deriving the projection start timestamp, scenario with ID ${selectedScenario.scenarioId} had no points.`
          );
        } else {
          projectionStartTimestamp = selectedScenario.values[0].timestamp;
        }
      }
      return historicalTimeseries.value.filter(
        point => point.timestamp < projectionStartTimestamp
      );
    });
    const chartRef = ref<HTMLElement | null>(null);
    const chartSize = ref({ width: 0, height: 0 });
    const setConstraints = (newConstraints: ProjectionConstraint[]) => {
      emit('set-constraints', newConstraints);
    };
    const setHistoricalTimeseries = (newPoints: TimeseriesPoint[]) => {
      emit('set-historical-timeseries', newPoints);
    };
    watchEffect(() => {
      // Rerender whenever dependencies change
      const parentElement = chartRef.value?.parentElement;
      const svg = chartRef.value
        ? d3.select<HTMLElement, null>(chartRef.value)
        : null;
      const _projections = projections.value;
      const { width, height } = chartSize.value;
      const _constraints = constraints.value;
      const min = minValue.value;
      const max = maxValue.value;
      if (
        svg === null ||
        _projections.length === 0 ||
        parentElement === undefined ||
        parentElement === null
      ) {
        return;
      }
      render(
        svg,
        width === 0 ? parentElement.clientWidth : width,
        height === 0 ? parentElement.clientHeight : height,
        _projections,
        _constraints,
        min,
        max
      );
    });
    onMounted(() => {
      // Set initial chart size
      const parentElement = chartRef.value?.parentElement;
      if (parentElement === null || parentElement === undefined) {
        return;
      }
      // Seems to be a Vue reactivity bug: effect doesn't trigger
      //  unless chartSize is set next frame, likely because it has
      //  already run this frame before onMounted.
      nextTick(() => {
        chartSize.value = {
          width: parentElement.clientWidth,
          height: parentElement.clientHeight
        };
      });
    });

    const resize = _.debounce(function({ width, height }) {
      if (chartRef.value === null) return;
      chartSize.value = { width, height };
    }, RESIZE_DELAY);

    const render = (
      svg: D3Selection,
      width: number,
      height: number,
      projections: ScenarioProjection[],
      constraints: ProjectionConstraint[],
      min: number,
      max: number
    ) => {
      // Set new size
      svg.attr('width', width).attr('height', height);
      // (Re-)render
      // svg.selectAll('*').remove();

      renderChart(
        svg,
        width,
        height,
        historicalTimeseriesBeforeStart.value,
        projections,
        constraints,
        min,
        max,
        viewingExtent.value,
        setConstraints,
        setHistoricalTimeseries
      );
    };

    return { resize, chartRef };
  }
});
</script>

<style lang="scss" scoped>
.td-node-chart-container {
  position: relative;
  width: 100%;
  height: 100%;
}
</style>
