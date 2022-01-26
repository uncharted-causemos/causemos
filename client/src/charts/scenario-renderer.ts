import * as d3 from 'd3';

import initialize from '@/charts/initialize';
import { timeseriesLine, translate } from '@/utils/svg-util';
import { chartValueFormatter } from '@/utils/string-util';
import { D3Selection, D3ScaleLinear, D3GElementSelection } from '@/types/D3';
import { Chart } from '@/types/Chart';
import { NodeScenarioData } from '@/types/CAG';
import { calculateGenericTicks } from '@/utils/timeseries-util';
import {
  getLastTimeStepIndexFromTimeScale,
  getMonthsPerTimestepFromTimeScale,
  getTimeScaleOption
} from '@/utils/time-scale-util';
import { getTimestampAfterMonths } from '@/utils/date-util';
import { TimeScale } from '@/types/Enums';
import {
  calculateTypicalChangeBracket,
  convertDistributionTimeseriesToRidgelines
} from '@/utils/ridgeline-util';
import { renderRidgelines } from './ridgeline-renderer';

import { SELECTED_COLOR } from '@/utils/colors-util';

const HISTORY_BACKGROUND_COLOR = '#F3F3F3';
const HISTORY_BACKGROUND_COLOR_HALF_CONFIDENCE = '#F4EFDB';
const HISTORY_BACKGROUND_COLOR_NO_CONFIDENCE = '#F7E6AA';
const HISTORY_LINE_COLOR = '#999';
const LABEL_COLOR = HISTORY_LINE_COLOR;

// Depending on how many historical months are visible, we can add the number
//  of projected months to get the total number of visible months and use that
//  as the x range's domain.
// The number of visible historical months will depend on the timescale, e.g.
//  if timescale is months, show last 48 months or so
//  if timescale is years, show last 36 years (= 432 months) or so
const getVisibleHistoricalMonthCount = (timeScale: TimeScale) => {
  if (timeScale === TimeScale.Years) return 432;
  return 48;
};

//
// Yellow background for uncertaint in historical data (lack of data)
//
// - Do a rough calculation of how far back is the last data point from projection_start
// - Penalize short historical data (e.g default Abstract indicator)
const getBackgroundColor = (nodeScenarioData: NodeScenarioData): string => {
  const timeseries = nodeScenarioData.indicator_time_series;
  const projectionStart = nodeScenarioData.projection_start;
  const timeScale = nodeScenarioData.time_scale;

  let background = HISTORY_BACKGROUND_COLOR;

  const gap = projectionStart - timeseries[timeseries.length - 1].timestamp;
  const approxMonth = 30 * 24 * 60 * 60 * 1000;
  if (gap > 0) {
    if (timeScale === TimeScale.Months) {
      if (gap / approxMonth > 4) {
        background = HISTORY_BACKGROUND_COLOR_HALF_CONFIDENCE;
      }
    } else if (timeScale === TimeScale.Years) {
      if (gap / (approxMonth * 12) > 4) {
        background = HISTORY_BACKGROUND_COLOR_HALF_CONFIDENCE;
      }
    }
  }

  if (timeseries.length < 4) {
    background = HISTORY_BACKGROUND_COLOR_NO_CONFIDENCE;
  }
  return background;
};

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
    indicator_time_series,
    min,
    max,
    projection_start,
    time_scale
  } = nodeScenarioData;

  // Calculate timestamp of the earliest historical time to display
  const visibleHistoricalMonthCount = getVisibleHistoricalMonthCount(
    time_scale
  );
  const historyStart = getTimestampAfterMonths(
    projection_start,
    -visibleHistoricalMonthCount
  );
  const monthsPerTimestep = getMonthsPerTimestepFromTimeScale(time_scale);
  // Historical data should end 1 month (or year, depending on time
  //  scale) before projection start. "Projection start date" means the date at
  //  which the first projected timestamp will be returned.
  const historyEnd = getTimestampAfterMonths(
    projection_start,
    -monthsPerTimestep
  );

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
  const xDomain = [historyStart, xScaleEndTimestamp];
  if (!isHistoricalDataOnlyMode) {
    // To avoid the last ridgeline plot overflowing, we need to add enough space
    //  for another timeslice after the last one.
    // Width won't be exactly the same between timeslices since some months/years
    //  are longer than others, but this will serve as a useful estimate of the
    //  maximum width a ridgeline can take up without overlapping the next one.
    const firstSliceMonths = getTimeScaleOption(time_scale).timeSlices[0]
      .months;
    const timeBetweenSlices =
      getTimestampAfterMonths(historyEnd, firstSliceMonths) - historyEnd;

    xDomain[1] += timeBetweenSlices;
  }

  const xScale = d3
    .scaleLinear()
    .domain(xDomain)
    .range([0, width]);
  const yExtent = [min, max];
  const formatter = chartValueFormatter(...yExtent);
  const yScale = d3
    .scaleLinear()
    .domain(yExtent)
    .range([height, 0])
    .clamp(true);

  const svgGroup = chart.g;
  svgGroup.selectAll('*').remove();

  // Backgrounds

  svgGroup
    .append('rect')
    .classed('historical-rect', true)
    .attr('x', xScale(historyStart))
    .attr('y', 0)
    .attr('height', height)
    .attr('width', xScale(historyEnd))
    .attr('fill', getBackgroundColor(nodeScenarioData));

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
  const {
    scenarios,
    time_scale,
    projection_start,
    indicator_id,
    indicator_time_series
  } = nodeScenarioData;
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
    yScale.domain()[1]
  );

  // Calculate how wide a single ridgeline can be
  const firstSliceMonths = getTimeScaleOption(time_scale).timeSlices[0].months;
  const widthBetweenTimeslices =
    xScale(getTimestampAfterMonths(projection_start, firstSliceMonths)) -
    xScale(projection_start);

  ridgelinePoints.forEach(({ label, ridgeline, timestamp, monthsAfterNow }) => {
    // Calculate context range forr each timeslice
    const isAbstractNode = indicator_id === null;
    const contextRange = calculateTypicalChangeBracket(
      isAbstractNode ? [] : indicator_time_series,
      monthsAfterNow
    );
    // Render one ridgeline for each timeslice
    const containerElementSelection = renderRidgelines(
      // TS error: D3GElementSelection is incompatible with
      //  d3.Selection<SVGElement, any, any, any>
      // According to this StackOverflow response:
      //  https://stackoverflow.com/a/67261032
      //  this is "a known problem with [the] D3 type library", so for now just
      //  cast to `any`
      svgGroup as any,
      ridgeline,
      widthBetweenTimeslices,
      height,
      yScale.domain()[0],
      yScale.domain()[1],
      false,
      true,
      'black',
      label,
      contextRange
    );
    containerElementSelection.attr('transform', () =>
      translate(xScale(timestamp), 0)
    );
  });

  // Apply constraints to the graph
  const constraints = projection.constraints ?? [];
  for (const constraint of constraints) {
    const ts = projectionValues[constraint.step].timestamp;

    svgGroup.append('circle')
      .attr('cx', xScale(ts))
      .attr('cy', yScale(constraint.value))
      .attr('r', 1.75)
      .style('fill', SELECTED_COLOR);
  }

  // TODO: Render constraints
  // const constraintSummary = summarizeConstraints(
  //   nodeScenarioData.time_scale,
  //   isAbstractNode ? [] : historicalTimeseries,
  //   projectionValues[0].timestamp,
  //   projection.constraints ?? []
  // );
}
