import { D3Selection } from '@/types/D3';
import { ProjectionPointType } from '@/types/Enums';
import { TimeseriesPointProjected } from '@/types/Timeseries';
import { splitProjectionsIntoLineSegments } from '@/utils/projection-util';
import { renderDashedLine, renderLine, renderPoint } from '@/utils/timeseries-util';
import * as d3 from 'd3';

const DASHED_LINE = {
  length: 2,
  gap: 2,
  width: 0.5,
};
const SOLID_LINE_WIDTH = 1;
const WEIGHTED_SUM_LINE_OPACITY = 0.25;

export default function render(
  selection: D3Selection,
  timeseries: TimeseriesPointProjected[],
  totalWidth: number,
  totalHeight: number,
  projectionStartTimestamp: number,
  projectionEndTimestamp: number,
  isWeightedSum: boolean,
  color = 'black'
) {
  // Clear any existing elements
  selection.selectAll('*').remove();
  // Add chart `g` element to the page
  const groupElement = selection.append('g').classed('groupElement', true);
  // Calculate scales
  const dataValueRange = d3.extent(timeseries.map((point) => point.value));
  if (dataValueRange[0] === undefined) {
    return;
  }
  const xScale = d3
    .scaleLinear()
    .domain([projectionStartTimestamp, projectionEndTimestamp])
    .range([0, totalWidth]);
  const yScale = d3.scaleLinear().domain(dataValueRange).range([totalHeight, 0]);

  // Render the series
  if (isWeightedSum) {
    // Render a lighter line across the whole series
    const lineSelection = renderLine(
      groupElement,
      timeseries,
      xScale,
      yScale,
      color,
      SOLID_LINE_WIDTH
    );
    lineSelection.attr('opacity', WEIGHTED_SUM_LINE_OPACITY);
    // Render a circle at any point where all inputs have historical data
    const fullDataPoints = timeseries.filter(
      (point) => point.projectionType === ProjectionPointType.Historical
    );
    renderPoint(groupElement, fullDataPoints, xScale, yScale, color, 2);
    return;
  }
  // This node has a dataset attached, so split the timeseries into solid and dashed segments
  const segments = splitProjectionsIntoLineSegments(timeseries);
  segments.forEach(({ isProjectedData, segment }) => {
    if (isProjectedData) {
      renderDashedLine(
        groupElement,
        segment,
        xScale,
        yScale,
        DASHED_LINE.length,
        DASHED_LINE.gap,
        color,
        DASHED_LINE.width
      );
    } else {
      renderLine(groupElement, segment, xScale, yScale, color, SOLID_LINE_WIDTH);
    }
  });
}
