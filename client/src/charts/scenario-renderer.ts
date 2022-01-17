import _ from 'lodash';
import * as d3 from 'd3';
import moment from 'moment';

import initialize from '@/charts/initialize';
import { timeseriesLine, translate } from '@/utils/svg-util';
import { chartValueFormatter } from '@/utils/string-util';
import { D3GElementSelection, D3Selection, D3ScaleLinear } from '@/types/D3';
import { Chart } from '@/types/Chart';
import { NodeScenarioData } from '@/types/CAG';
import { calculateGenericTicks } from '@/utils/timeseries-util';
import {
  getLastTimeStepIndexFromTimeScale,
  getSliceMonthIndicesFromTimeScale
} from '@/utils/time-scale-util';
import { getTimestampAfterMonths } from '@/utils/date-util';
import {
  convertDistributionTimeseriesToRidgelines,
  RidgelinePoint
} from '@/utils/ridgeline-util';
import {TimeScale} from '@/types/Enums';

const HISTORY_BACKGROUND_COLOR = '#F3F3F3';
const HISTORY_LINE_COLOR = '#999';
const LABEL_COLOR = HISTORY_LINE_COLOR;

// When creating a curve to estimate the density of the distribution, we group
//  points into bins (necessary to convert the one-dimensional data into 2D).
// Raise the bin count to make the curve less smooth.
const RIDGELINE_BIN_COUNT = 20;
const RIDGELINE_STROKE_WIDTH = 1;
const RIDGELINE_STROKE_COLOR = 'none';
const RIDGELINE_FILL_COLOR = 'black';
const RIDGELINE_VERTICAL_AXIS_WIDTH = 1;
const RIDGELINE_VERTICAL_AXIS_COLOR = HISTORY_BACKGROUND_COLOR;

// Depending on how many historical months are visible, we can add the number
//  of projected months to get the total number of visible months and use that
//  as the x range's domain.
// The number of visible historical months will depend on the timescale, e.g.
//  if timescale is months, show last 24 months or so
//  if timescale is years, show last 60 months or so
const VISIBLE_HISTORICAL_MONTH_COUNT = 24;

export default function(
  selection: D3Selection,
  nodeScenarioData: NodeScenarioData,
  renderOptions: any,
  runOptions: { selectedScenarioId: string | null }
) {
  const chart: Chart = initialize(selection, renderOptions);
  render(chart, nodeScenarioData, runOptions);
}

/**
 * Draws the historic and projection graphs from the prepared `nodeScenarioData`.
 */
function render(
  chart: Chart,
  nodeScenarioData: NodeScenarioData,
  runOptions: { selectedScenarioId: string | null }
) {
  const {
    indicator_name,
    indicator_time_series,
    min,
    max,
    projection_start,
    time_scale
  } = nodeScenarioData;

  // Calculate timestamp of the earliest historical time to display
  const historyStart = moment
    .utc(projection_start)
    .subtract(VISIBLE_HISTORICAL_MONTH_COUNT, 'months')
    .valueOf();
  // FIXME: historical data should end 1 month (or year, depending on time
  //  scale) before projection start. "Projection start date" means the date at
  //  which the first projected timestamp will be returned.
  const historyEnd = moment
    .utc(projection_start)
    .subtract(1, 'months')
    .valueOf();

  // Filter out timeseries points that aren't within the range we're displaying
  const filteredTimeSeries = indicator_time_series.filter(
    d => d.timestamp >= historyStart && d.timestamp <= historyEnd
  );

  // Chart dimensions
  const height = chart.y2 - chart.y1;
  const width = chart.x2 - chart.x1;

  const selectedScenarioId = runOptions.selectedScenarioId;
  const isHistoricalDataOnlyMode = selectedScenarioId === null;

  const lastProjectedTimestamp = getTimestampAfterMonths(
    projection_start,
    getLastTimeStepIndexFromTimeScale(nodeScenarioData.time_scale)
  );

  const xScaleEndTimestamp = isHistoricalDataOnlyMode
    ? historyEnd
    : lastProjectedTimestamp;
  const yExtent = [min, max];
  const formatter = chartValueFormatter(...yExtent);
  const xDomain = [historyStart, xScaleEndTimestamp];
  if (!isHistoricalDataOnlyMode) {
    // To avoid the last ridgeline plot overflowing, we need to add enough space
    //  for another timeslice after the last one.
    // Width won't be exactly the same between timeslices since some months/years
    //  are longer than others, but this will serve as a useful estimate of the
    //  maximum width a ridgeline can take up without overlapping the next one.
    const firstSliceMonthIndex = getSliceMonthIndicesFromTimeScale(time_scale)[0];
    const timeBetweenSlices =
      getTimestampAfterMonths(projection_start, firstSliceMonthIndex) -
      projection_start;

    xDomain[1] += timeBetweenSlices;
  }

  const xScale = d3
    .scaleLinear()
    .domain(xDomain)
    .range([0, width]);
  const yScale = d3
    .scaleLinear()
    .domain(yExtent)
    .range([height, 0])
    .clamp(true);

  const svgGroup = chart.g;
  svgGroup.selectAll('*').remove();

  // Backgrounds
  // Show yellow background for uncertaint in historical data (lack of data)
  let background = HISTORY_BACKGROUND_COLOR;

  const gap = projection_start - indicator_time_series[indicator_time_series.length - 1].timestamp;
  const approxMonth = 30 * 24 * 60 * 60 * 1000;
  if (gap > 0) {
    if (time_scale === TimeScale.Months) {
      if (gap / approxMonth > 4) {
        background = '#F4EFDB';
      }
    } else if (time_scale === TimeScale.Years) {
      if (gap / (approxMonth * 12) > 4) {
        background = '#F4EFDB';
      }
    }
  }

  if (indicator_name === 'Abstract') {
    background = '#F7E6AA';
  }

  svgGroup
    .append('rect')
    .classed('historical-rect', true)
    .attr('x', xScale(historyStart))
    .attr('y', 0)
    .attr('height', height)
    .attr('width', xScale(historyEnd))
    .attr('fill', background);

  const historicG = svgGroup.append('g');
  historicG
    .append('path')
    .attr('class', 'historical')
    .attr(
      'd',
      // FIXME: TypeScript shenanigans are necessary because timeseriesLine()
      //  is in a JS file. See svg-util.js for more details.
      timeseriesLine(
        xScale,
        yScale
      )((filteredTimeSeries as any) as [number, number][]) as string
    )
    .style('stroke', HISTORY_LINE_COLOR)
    .style('stroke-width', 1)
    .style('pointer-events', 'none')
    .style('fill', 'none');

  const yAxis = d3
    .axisRight(yScale)
    .tickValues(calculateGenericTicks(yScale.domain()[0], yScale.domain()[1]))
    .tickSize(0)
    // The type of formatter can't be more specific than `any`
    //  because under the hood d3.tickFormat requires d3.NumberType.
    // It correctly converts, but its TypeScript definitions don't
    //  seem to reflect that.
    .tickFormat(formatter as any);
  // Render Y axis and hide domain line
  const yAxisElement = svgGroup
    .append('g')
    .classed('yaxis', true)
    .style('pointer-events', 'none')
    .call(yAxis)
    .style('font-size', '5px')
    .style('color', LABEL_COLOR);
  yAxisElement.select('.domain').attr('stroke-width', 0);
  yAxisElement.selectAll('text').attr('x', 0);

  if (isHistoricalDataOnlyMode) {
    // Don't render projections
    return;
  }

  renderScenarioProjections(
    svgGroup,
    xScale,
    yScale,
    height,
    nodeScenarioData,
    // If we've reached this point, historical data only mode is not active and
    //  it's safe to assert that selectedScenarioId is not null
    { selectedScenarioId: selectedScenarioId as string }
  );
}

function renderScenarioProjections(
  svgGroup: D3GElementSelection,
  xScale: D3ScaleLinear,
  yScale: D3ScaleLinear,
  height: number,
  nodeScenarioData: NodeScenarioData,
  runOptions: { selectedScenarioId: string }
) {
  // Collect/extract all the pieces of data needed to convert projections into
  //  ridgeline plot format.
  const { selectedScenarioId } = runOptions;
  const { scenarios, time_scale, projection_start } = nodeScenarioData;
  const projection = nodeScenarioData.scenarios.find(
    scenario => scenario.id === selectedScenarioId
  );
  if (projection === undefined) {
    console.error(
      'Scenario renderer is unable to find selected scenario with ID',
      selectedScenarioId,
      'in scenarios list',
      scenarios
    );
    return;
  }
  // TODO: We'll have to check if this is an abstract node when trying to use
  //  historical data to add context to projections.
  // const isAbstractNode = indicator_id === null;
  const projectionValues = projection.result?.values ?? [];
  if (projectionValues.length === 0) {
    return;
  }

  // Convert distribution timeseries to line, where each point represents an
  //  inflection point on what will eventually be a ridgeline chart
  const ridgelinePoints = convertDistributionTimeseriesToRidgelines(
    projectionValues,
    time_scale,
    yScale.domain()[0],
    yScale.domain()[1],
    RIDGELINE_BIN_COUNT
  );

  // Calculate how wide a single ridgeline can be
  const firstSliceMonthIndex = getSliceMonthIndicesFromTimeScale(time_scale)[0];
  const firstSliceMonthTimestamp = getTimestampAfterMonths(
    projection_start,
    firstSliceMonthIndex
  );
  const widthBetweenTimeslices =
    xScale(firstSliceMonthTimestamp) - xScale(projection_start);
  const ridgelineXScale = d3
    .scaleLinear()
    .domain([0, 1])
    .range([0, widthBetweenTimeslices]);
  // Create a line generator that will be used to render the ridgeline
  const line = d3
    .line<RidgelinePoint>()
    // Use curveMonotoneY so that curves between points don't overshoot points
    //  in the X direction. This is necessary so that curves don't dip past the
    //  vertical line that acts as the baseline for each smoothed histogram
    // Other curve types are summarized in the d3 docs:
    //  https://github.com/d3/d3-shape/blob/main/README.md#curves
    .curve(d3.curveMonotoneY)
    .x(point => ridgelineXScale(point.value))
    .y(point => yScale(point.coordinate));

  // Render one ridgeline for each timeslice
  // Make a `g` element for each ridgeline
  const ridgeLineElements = svgGroup
    .selectAll('.ridgeline')
    .data(ridgelinePoints)
    .join('g')
    .classed('ridgeline', true)
    .attr('transform', d => translate(xScale(d.timestamp), 0));
  // Draw vertical line to act as a baseline
  ridgeLineElements
    .append('rect')
    .attr('width', RIDGELINE_VERTICAL_AXIS_WIDTH)
    .attr('height', height)
    .attr('fill', RIDGELINE_VERTICAL_AXIS_COLOR)
    .attr('x', 0)
    .attr('y', 0);
  // Draw ridgeline itself
  ridgeLineElements
    .append('path')
    .attr('fill', RIDGELINE_FILL_COLOR)
    .attr('stroke', RIDGELINE_STROKE_COLOR)
    .attr('stroke-width', RIDGELINE_STROKE_WIDTH)
    .attr('d', d => line(d.ridgeline));
  // Draw time slice label
  ridgeLineElements
    .append('text')
    .attr('transform', translate(-widthBetweenTimeslices / 2, height))
    .attr('font-size', widthBetweenTimeslices)
    .style('fill', LABEL_COLOR)
    .text(d => d.label);

  // TODO: Render constraints
  // const constraintSummary = summarizeConstraints(
  //   nodeScenarioData.time_scale,
  //   isAbstractNode ? [] : historicalTimeseries,
  //   projectionValues[0].timestamp,
  //   projection.constraints ?? []
  // );

  // TODO: Calculate and render context range using:
  // isAbstractNode ? [] : historicalTimeseries,
}
