import { D3Selection } from '@/types/D3';
import { ProjectionPointType } from '@/types/Enums';
import { ProjectionTimeseries } from '@/types/Timeseries';
import { splitProjectionsIntoLineSegments } from '@/utils/projection-util';
import {
  renderDashedLine,
  renderLine,
  renderPoint,
  renderSquares,
  renderXAxisLine,
  timeseriesFeatures,
} from '@/utils/timeseries-util';
import * as d3 from 'd3';
import { COLOR_SCHEME } from '@/utils/colors-util';

const DASHED_LINE = {
  length: 2,
  gap: 2,
  width: 0.5,
};

const NORMAL_LIMITS_DASHED_LINE = {
  length: 2,
  gap: 2,
  width: 0.5,
};

const SOLID_LINE_WIDTH = 1;
export const WEIGHTED_SUM_LINE_OPACITY = 0.25;
const CONSTRAINT_SIDE_LENGTH = 3;
const POINT_RADIUS = 2;

export default function render(
  selection: D3Selection,
  timeseriesList: ProjectionTimeseries[],
  totalWidth: number,
  totalHeight: number,
  projectionStartTimestamp: number,
  projectionEndTimestamp: number,
  isWeightedSum: boolean,
  isInverted: boolean,
  showDataOutsideNorm: boolean,
  rangeStart: number
) {
  const { globalMaxY, globalMinY, suggestedPadding } = timeseriesFeatures(timeseriesList);
  // Clear any existing elements
  selection.selectAll('*').remove();
  // Add chart `g` element to the page
  const groupElement = selection.append('g').classed('groupElement', true);
  // Calculate scales
  const xScale = d3
    .scaleLinear()
    .domain([projectionStartTimestamp, projectionEndTimestamp])
    .range([0, totalWidth]);
  const yScale = d3
    .scaleLinear()
    .domain(
      showDataOutsideNorm ? [globalMinY - suggestedPadding, globalMaxY + suggestedPadding] : [0, 1]
    )
    .range(isInverted ? [rangeStart, totalHeight] : [totalHeight, rangeStart]);

  // Render the series
  if (isWeightedSum) {
    timeseriesList.forEach((timeseries) => {
      // Render a lighter line across the whole series
      const lineSelection = renderLine(
        groupElement,
        timeseries.points,
        xScale,
        yScale,
        timeseries.color,
        SOLID_LINE_WIDTH
      );
      lineSelection.attr('opacity', WEIGHTED_SUM_LINE_OPACITY);

      if (showDataOutsideNorm) {
        [0, 1].forEach((y) => {
          renderXAxisLine(
            groupElement,
            0,
            totalWidth,
            yScale(y),
            NORMAL_LIMITS_DASHED_LINE.length,
            NORMAL_LIMITS_DASHED_LINE.gap,
            COLOR_SCHEME.GREYS_7[2],
            NORMAL_LIMITS_DASHED_LINE.width
          );
        });
      }
      // Render a circle at any point where all inputs have historical data
      const fullDataPoints = timeseries.points.filter(
        (point) => point.projectionType === ProjectionPointType.Historical
      );
      renderPoint(groupElement, fullDataPoints, xScale, yScale, timeseries.color, POINT_RADIUS);
      // Render a square at any point where one or more inputs have a constraint
      const constraints = timeseries.points.filter(
        (point) => point.projectionType === ProjectionPointType.Constraint
      );
      renderSquares(
        groupElement,
        constraints,
        xScale,
        yScale,
        timeseries.color,
        CONSTRAINT_SIDE_LENGTH
      );
    });
    return;
  }
  // This node has a dataset attached, so split the timeseries into solid and dashed segments
  timeseriesList.forEach((timeseries) => {
    const segments = splitProjectionsIntoLineSegments(timeseries.points);
    segments.forEach(({ isProjectedData, segment }) => {
      if (isProjectedData) {
        renderDashedLine(
          groupElement,
          segment,
          xScale,
          yScale,
          DASHED_LINE.length,
          DASHED_LINE.gap,
          timeseries.color,
          DASHED_LINE.width
        );
      } else {
        renderLine(groupElement, segment, xScale, yScale, timeseries.color, SOLID_LINE_WIDTH);
      }
    });

    if (showDataOutsideNorm) {
      [0, 1].forEach((y) => {
        renderXAxisLine(
          groupElement,
          0,
          totalWidth,
          yScale(y),
          NORMAL_LIMITS_DASHED_LINE.length,
          NORMAL_LIMITS_DASHED_LINE.gap,
          COLOR_SCHEME.GREYS_7[2],
          NORMAL_LIMITS_DASHED_LINE.width
        );
      });
    }
    // Render a circle at all historical data points
    const fullDataPoints = timeseries.points.filter(
      (point) => point.projectionType === ProjectionPointType.Historical
    );
    renderPoint(groupElement, fullDataPoints, xScale, yScale, timeseries.color, POINT_RADIUS);
    // Render a square at any point with a constraint
    const constraints = timeseries.points.filter(
      (point) => point.projectionType === ProjectionPointType.Constraint
    );
    renderSquares(
      groupElement,
      constraints,
      xScale,
      yScale,
      timeseries.color,
      CONSTRAINT_SIDE_LENGTH
    );
  });
}
