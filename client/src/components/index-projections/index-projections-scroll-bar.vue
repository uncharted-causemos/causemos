<script setup lang="ts">
/** @Component IndexProjectionsScrollBar
 *
 *  This component renders a scroll bar that allows the user to zoom and pan the
 *  index projection charts. The bar can optionally render a chart of the timeseries
 *  it is controlling within the scrollbar to provide a frame of reference.
 *
 *  Component Properties:
 *  @property {number} projectionStartTimestamp - The start timestamp for the projection range
 *  @property {number} projectionEndTimestamp - The end timestamp for the projection range
 *  @property {ProjectionTimeseries[]} [timeseries] - Optional array of timeseries data to display in the scrollbar
 *  @property {boolean} [showDataOutsideNorm] - Whether to show data in the timeseries chart that is outside the 0 to 1 range. Optional, defaults to false.
 *  @property {boolean} [isWeightedSumNode] - Whether the node is a weighted sum node. Optional, defaults to false.
 *  @property {boolean} [isInverted] - Whether the timeseries data in the chart should be inverted. Optional, defaults to false.
 *
 *  Events:
 *  @fires {[number, number]} focusedTimeRangeChange - Emitted when the user changes the focused time range
 */

import * as d3 from 'd3';
import { ref, onMounted } from 'vue';
import { D3GElementSelection } from '@/types/D3';
import dateFormatter from '@/formatters/date-formatter';
import { translate } from '@/utils/svg-util';
import { renderTimeseries } from '@/charts/projections-renderer';
import { D3BrushEvent } from 'd3';
import { ProjectionTimeseries } from '@/types/Timeseries';
import { invertTimeseriesList, timeseriesExtrema } from '@/utils/timeseries-util';
import Nullable from '@/types/Nullable';
import _ from 'lodash';

const SCROLL_BAR_HEIGHT = 20;
const SCROLL_BAR_TIMESERIES_OPACITY = 0.2;
const SCROLL_BAR_HANDLE_WIDTH = 9;
const SCROLL_BAR_LABEL_WIDTH = 40;

const DATE_FORMATTER = (value: any) => dateFormatter(value, 'MMM YYYY');

interface Props {
  projectionStartTimestamp: number;
  projectionEndTimestamp: number;
  timeseries?: ProjectionTimeseries[];
  showDataOutsideNorm?: boolean;
  isWeightedSumNode?: boolean;
  isInverted?: boolean;
}

const props = withDefaults(defineProps<Props>(), {
  timeseries: () => [],
  showDataOutsideNorm: false,
  isWeightedSumNode: false,
  isInverted: false,
});

const emit = defineEmits<{
  (e: 'focusedTimeRangeChange', focusedTimeRange: [number, number]): void;
}>();

// Element references we need to work with
const scrollbarSvgRef = ref<Nullable<SVGElement>>(null);
const scrollbarGroupRef = ref<Nullable<SVGGElement>>(null);
let scrollbarGroupSelection: D3GElementSelection | null = null;
let brushElement: d3.Selection<SVGGElement, unknown, null, undefined> | null = null;

let focusedTimeRange: [number, number] = [
  props.projectionStartTimestamp,
  props.projectionEndTimestamp,
];

let totalWidth = 0;
let xScaleScrollbar: Nullable<d3.ScaleLinear<number, number>>;

/**
 * Validates that the new time range values are within the projection range, and that the start
 * is less than or equal to the end. Invalid focus ranges can occur if the page is resized or
 * if the projection ranges change.
 */
const setFocusedTimeRange = (newValues: [number, number]) => {
  const focusEndBeforeProjectionEnd = Math.min(props.projectionEndTimestamp, newValues[1]);
  const focusRangeStartAfterProjectionStart = Math.max(
    props.projectionStartTimestamp,
    newValues[0]
  );
  const focusRangeStartBeforeFocusEnd = Math.min(
    focusRangeStartAfterProjectionStart,
    focusEndBeforeProjectionEnd
  );
  focusedTimeRange = [focusRangeStartBeforeFocusEnd, focusEndBeforeProjectionEnd];
};

const renderScrollBarLabels = (scrollBarWidth: number) => {
  if (scrollbarGroupSelection == null) {
    return;
  }

  const scrollbarLabelYOffset = 14;
  scrollbarGroupSelection.select('.scrollbar-range-start').remove();
  scrollbarGroupSelection.select('.scrollbar-range-end').remove();
  scrollbarGroupSelection
    .append('text')
    .classed('scrollbar-range-start', true)
    .attr('x', 0)
    .attr('y', scrollbarLabelYOffset)
    .style('text-anchor', 'start')
    .text(DATE_FORMATTER(props.projectionStartTimestamp));
  scrollbarGroupSelection
    .append('text')
    .classed('scrollbar-range-end', true)
    .attr('x', scrollBarWidth)
    .attr('y', scrollbarLabelYOffset)
    .style('text-anchor', 'end')
    .text(DATE_FORMATTER(props.projectionEndTimestamp));
};

const renderBrushHandles = (g: D3GElementSelection, handlePositions: [number, number]) => {
  g.selectAll('.custom-handle')
    .data(handlePositions)
    .join((enter) => {
      const handleWidth = 9;
      const handleWidthGap = -2;
      const container = enter.append('g').attr('class', 'custom-handle');
      container
        .append('rect')
        .attr('y', 0)
        .attr('x', (_, i) => (i === 0 ? -(handleWidth + handleWidthGap) : handleWidthGap))
        .attr('rx', 4)
        .attr('ry', 4)
        .attr('width', handleWidth)
        .attr('height', SCROLL_BAR_HEIGHT);
      // Vertical dots
      [0.3, 0.5, 0.7].forEach((value) => {
        container
          .append('circle')
          .attr('cx', (_, i) =>
            i === 0 ? -(0.5 * handleWidth + handleWidthGap) : 0.5 * handleWidth + handleWidthGap
          )
          .attr('cy', SCROLL_BAR_HEIGHT * value)
          .attr('r', 1.25);
      });
      return container;
    })
    .attr('transform', (d) => translate(d, 0));
};

/** Renders the time series graph within the scroll bar to provide a frame of reference. */
function renderBarTimeseries(): void {
  if (_.isEmpty(props.timeseries)) {
    return;
  }
  if (xScaleScrollbar == null || scrollbarGroupSelection == null) {
    return;
  }

  // cause linter won't recognize below these can't be null anymore
  const sbGroupSel = scrollbarGroupSelection as D3GElementSelection;
  const xScaleSB = xScaleScrollbar as d3.ScaleLinear<number, number>;

  const tsList = props.isInverted
    ? invertTimeseriesList(_.cloneDeep(props.timeseries))
    : props.timeseries;

  const { globalMaxY, globalMinY } = timeseriesExtrema(tsList);
  const yScaleDomain = props.showDataOutsideNorm ? [globalMinY, Math.min(1, globalMaxY)] : [0, 1];
  const yScaleScrollbar = d3.scaleLinear().domain(yScaleDomain).range([SCROLL_BAR_HEIGHT, 0]);

  tsList.forEach((timeseries) => {
    const timeseriesGroup = sbGroupSel.append('g').classed('timeseries', true);
    renderTimeseries(
      timeseries.points,
      timeseriesGroup,
      xScaleSB,
      yScaleScrollbar,
      props.isWeightedSumNode,
      timeseries.color
    );
  });
  scrollbarGroupSelection
    .selectAll('.segment-line, .circle, .square')
    .attr('opacity', SCROLL_BAR_TIMESERIES_OPACITY);
}

const handleScrollBarChange = (brushEvent: D3BrushEvent<any>) => {
  if (brushEvent?.selection == null || xScaleScrollbar == null || brushElement == null) {
    return;
  }

  const selection = brushEvent.selection as [number, number];
  // Convert positions to timestamps and store the new values
  setFocusedTimeRange([xScaleScrollbar.invert(selection[0]), xScaleScrollbar.invert(selection[1])]);
  // Update brush handle positions
  brushElement.call(renderBrushHandles, focusedTimeRange.map(xScaleScrollbar));

  emit('focusedTimeRangeChange', focusedTimeRange);
};

function render(): void {
  if (scrollbarGroupSelection == null || xScaleScrollbar == null) {
    return;
  }
  // const scrollbarGroupSelection = d3.select(scrollbarGroupRef.value) as D3GElementSelection;
  scrollbarGroupSelection.selectAll('*').remove();
  const scrollBarBackground = scrollbarGroupSelection
    .append('rect')
    .attr('class', 'scrollbar-background')
    .attr('y', 0)
    .attr('x', SCROLL_BAR_LABEL_WIDTH + SCROLL_BAR_HANDLE_WIDTH)
    .attr('height', SCROLL_BAR_HEIGHT);

  scrollBarBackground.attr(
    'width',
    totalWidth - 2 * (SCROLL_BAR_LABEL_WIDTH + SCROLL_BAR_HANDLE_WIDTH)
  );

  renderBarTimeseries();
  renderScrollBarLabels(totalWidth);
  scrollbarGroupSelection.select('.brush').remove();
  brushElement = scrollbarGroupSelection.append('g').classed('brush', true);

  const d3BrushBehaviour = d3
    .brushX()
    .extent([
      [xScaleScrollbar.range()[0], 0],
      [xScaleScrollbar.range()[1], SCROLL_BAR_HEIGHT],
    ])
    .on('start brush end', handleScrollBarChange);
  // Connect behaviour to element
  brushElement.call(d3BrushBehaviour);
  brushElement.call(renderBrushHandles, focusedTimeRange.map(xScaleScrollbar));

  // ensure selection is set to the focused range
  brushElement.call(d3BrushBehaviour.move, focusedTimeRange.map(xScaleScrollbar));
}

onMounted(() => {
  scrollbarGroupSelection = scrollbarGroupRef.value ? d3.select(scrollbarGroupRef.value) : null;
  if (scrollbarGroupSelection == null) {
    return;
  }

  totalWidth = scrollbarSvgRef.value?.clientWidth ?? 0;

  xScaleScrollbar = d3
    .scaleLinear()
    .domain([props.projectionStartTimestamp, props.projectionEndTimestamp])
    .range([
      SCROLL_BAR_LABEL_WIDTH + SCROLL_BAR_HANDLE_WIDTH,
      totalWidth - SCROLL_BAR_LABEL_WIDTH - SCROLL_BAR_HANDLE_WIDTH,
    ]);

  render();
});
</script>

<template>
  <div class="scrollbar-container">
    <svg ref="scrollbarSvgRef">
      <g class="scrollBarGroupElement" ref="scrollbarGroupRef"></g>
    </svg>
  </div>
</template>

<style scoped lang="scss">
.scrollbar-container {
  width: 100%;
}

svg {
  width: 100%;
  height: 20px;
  fill: none;
}

:deep(.scrollbar-background) {
  //fill: #f3f4f6;
  //fill-opacity: 1;
  stroke: none;
}

:deep(.scrollbar-range-start),
:deep(.scrollbar-range-end) {
  font-size: x-small;
  fill: gray;
  pointer-events: none;
  user-select: none;
}

:deep(.brush .selection) {
  fill: #777;
  fill-opacity: 0.2;
  //fill: #f3f4f6;
  //fill-opacity: 0.8;
  stroke: none;
}

:deep(.custom-handle) {
  cursor: ew-resize;
  pointer-events: none;
}

:deep(.custom-handle rect) {
  fill: #f8f8f8;
  stroke: #888888;
}

:deep(.custom-handle circle) {
  fill: #888888;
}
</style>
