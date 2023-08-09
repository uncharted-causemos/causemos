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
  watch,
  watchEffect,
} from 'vue';
import { useStore } from 'vuex';
import renderChart from '@/charts/td-node-renderer';
import { CAGModelSummary, ProjectionConstraint, ScenarioProjection } from '@/types/CAG';
import { D3Selection } from '@/types/D3';

const RESIZE_DELAY = 15;

export default defineComponent({
  name: 'TDNodeChart',
  emits: ['set-historical-timeseries', 'set-constraints'],
  props: {
    historicalTimeseries: {
      type: Array as PropType<TimeseriesPoint[]>,
      default: [],
    },
    projections: {
      type: Array as PropType<ScenarioProjection[]>,
      default: [],
    },
    minValue: {
      type: Number,
      required: true,
    },
    maxValue: {
      type: Number,
      required: true,
    },
    viewingExtent: {
      type: Array as PropType<number[] | null>,
      default: null,
    },
    constraints: {
      type: Array as PropType<ProjectionConstraint[]>,
      required: true,
    },
    unit: {
      type: String,
      default: '',
    },
    modelSummary: {
      type: Object as PropType<CAGModelSummary>,
      required: true,
    },
    isClampAreaHidden: {
      type: Boolean,
      default: false,
    },
  },
  setup(props, { emit }) {
    const store = useStore();
    const selectedScenarioId = computed(() => store.getters['model/selectedScenarioId']);

    const {
      historicalTimeseries,
      projections,
      minValue,
      maxValue,
      viewingExtent,
      constraints,
      unit,
      modelSummary,
      isClampAreaHidden,
    } = toRefs(props);
    const historicalTimeseriesBeforeStart = computed(() => {
      const projectionStartTimestamp = modelSummary.value.parameter.projection_start;
      return historicalTimeseries.value.filter(
        (point) => point.timestamp < projectionStartTimestamp
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

    // FIXME: Hack watch for viewingExtent changes and reset existing brush state
    // In ensure it doesn't conflcit with watchEffect below and this happens first,
    // the watchEffect render action is slated to the nextTick.
    watch(
      () => [viewingExtent.value],
      () => {
        const svg = chartRef.value ? d3.select<HTMLElement, null>(chartRef.value) : null;
        if (!svg) return;
        svg.select('.scrollBarGroupElement').remove();
      },
      { immediate: true }
    );

    watchEffect(() => {
      // Rerender whenever dependencies change
      const parentElement = chartRef.value?.parentElement;
      const svg = chartRef.value ? d3.select<HTMLElement, null>(chartRef.value) : null;
      const _projections = projections.value;
      const { width, height } = chartSize.value;
      const _constraints = constraints.value;
      const min = minValue.value;
      const max = maxValue.value;
      if (
        svg === null ||
        _projections.length === 0 ||
        parentElement === undefined ||
        parentElement === null ||
        !historicalTimeseries.value
      ) {
        return;
      }
      nextTick(() => {
        render(
          svg,
          width === 0 ? parentElement.clientWidth : width,
          height === 0 ? parentElement.clientHeight : height,
          _projections,
          selectedScenarioId.value,
          _constraints,
          min,
          max,
          unit.value,
          modelSummary.value,
          isClampAreaHidden.value
        );
      });
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
          height: parentElement.clientHeight,
        };
      });
    });

    const resize = _.debounce(function ({ width, height }) {
      if (chartRef.value === null) return;
      chartSize.value = { width, height };
    }, RESIZE_DELAY);

    const render = (
      svg: D3Selection,
      width: number,
      height: number,
      projections: ScenarioProjection[],
      selectedScenarioId: string | null,
      constraints: ProjectionConstraint[],
      min: number,
      max: number,
      unit: string,
      modelSummary: CAGModelSummary,
      isClampAreaHidden: boolean
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
        selectedScenarioId,
        constraints,
        min,
        max,
        unit,
        modelSummary,
        viewingExtent.value,
        isClampAreaHidden,
        setConstraints,
        setHistoricalTimeseries
      );
    };

    return { resize, chartRef };
  },
});
</script>

<style lang="scss" scoped>
.td-node-chart-container {
  position: relative;
  width: 100%;
  height: 100%;
}
</style>
