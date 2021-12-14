import * as d3 from 'd3';
import moment from 'moment';

import initialize from '@/charts/initialize';
import { timeseriesLine, translate } from '@/utils/svg-util';
import { chartValueFormatter } from '@/utils/string-util';
import { D3GElementSelection, D3Selection } from '@/types/D3';
import { Chart } from '@/types/Chart';
import { NodeScenarioData } from '@/types/CAG';
import { calculateGenericTicks } from '@/utils/timeseries-util';
import {
  convertTimeseriesDistributionToHistograms,
  summarizeConstraints
} from '@/utils/histogram-util';
import { SELECTED_COLOR } from '@/utils/colors-util';

const HISTORY_BACKGROUND_COLOR = '#F3F3F3';
const HISTORY_LINE_COLOR = '#999';
const SPACE_BETWEEN_HISTOGRAMS = 8;
const SPACE_BETWEEN_HISTOGRAM_BARS = 1;
const HISTOGRAM_BACKGROUND_COLOR = HISTORY_BACKGROUND_COLOR;
const HISTOGRAM_FOREGROUND_COLOR = HISTORY_LINE_COLOR;
// How much of the node is taken up by the history chart
// If all projections are hidden, this will expand to take the full height
const HISTORY_HEIGHT_PERCENTAGE = 0.4;

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
  const { indicator_time_series, min, max, projection_start } = nodeScenarioData;

  // Calculate timestamp of the earliest historical time to display
  // TODO: should this be a constant? based on time_scale? based on how many columns are hidden?
  const historicalMonthsToDisplay = 5 * 12;
  const historyStart = moment
    .utc(projection_start)
    .subtract(historicalMonthsToDisplay, 'months')
    .valueOf();
  const historyEnd = projection_start;

  // Filter out timeseries points that aren't within the range we're displaying
  const filteredTimeSeries = indicator_time_series.filter(
    d => d.timestamp >= historyStart && d.timestamp <= historyEnd
  );

  // Choose yExtent so that mostRecentHistoricalValue value is centered
  let yExtentMin = min;
  let yExtentMax = max;
  const mostRecentHistoricalValue =
    indicator_time_series[indicator_time_series.length - 1].value;
  const currentCenterOfRange = (yExtentMin + yExtentMax) / 2;
  const diffToCenterOfRange = mostRecentHistoricalValue - currentCenterOfRange;
  if (mostRecentHistoricalValue > currentCenterOfRange) {
    // Raise max so that mostRecentHistoricalValue is centered
    yExtentMax += 2 * diffToCenterOfRange;
  } else {
    // Lower min so that mostRecentHistoricalValue is centered
    yExtentMin += 2 * diffToCenterOfRange;
  }
  const yExtent = [yExtentMin, yExtentMax];

  // Chart dimensions
  const height = chart.y2 - chart.y1;
  const width = chart.x2 - chart.x1;

  const selectedScenarioId = runOptions.selectedScenarioId;
  const isHistoricalDataOnlyMode = selectedScenarioId === null;
  const historicalDataHeight = isHistoricalDataOnlyMode
    ? height
    : HISTORY_HEIGHT_PERCENTAGE * height;

  const formatter = chartValueFormatter(...yExtent);
  const historyChartXScale = d3
    .scaleLinear()
    .domain([historyStart, historyEnd])
    .range([0, width]);
  const historyChartYScale = d3
    .scaleLinear()
    .domain(yExtent)
    .range([historicalDataHeight, 0])
    .clamp(true);

  const svgGroup = chart.g;
  svgGroup.selectAll('*').remove();

  // Backgrounds
  svgGroup
    .append('rect')
    .classed('historical-rect', true)
    .attr('x', historyChartXScale(historyStart))
    .attr('y', 0)
    .attr('height', historicalDataHeight)
    .attr('width', historyChartXScale(historyEnd))
    .attr('fill', HISTORY_BACKGROUND_COLOR);

  const historicG = svgGroup.append('g');
  historicG
    .append('path')
    .attr('class', 'historical')
    .attr(
      'd',
      // FIXME: TypeScript shenanigans are necessary because timeseriesLine()
      //  is in a JS file. See svg-util.js for more details.
      timeseriesLine(
        historyChartXScale,
        historyChartYScale
      )((filteredTimeSeries as any) as [number, number][]) as string
    )
    .style('stroke', HISTORY_LINE_COLOR)
    .style('stroke-width', 1)
    .style('pointer-events', 'none')
    .style('fill', 'none');

  // Only render yAxis ticks if isHistoricalDataMode
  const yAxis = d3
    .axisRight(historyChartYScale)
    .tickValues(
      isHistoricalDataOnlyMode
        ? calculateGenericTicks(
          historyChartYScale.domain()[0],
          historyChartYScale.domain()[1]
        )
        : []
    )
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
    .style('color', HISTORY_LINE_COLOR);
  yAxisElement.select('.domain').attr('stroke-width', 0);
  yAxisElement.selectAll('text').attr('x', 0);

  if (isHistoricalDataOnlyMode) {
    // Don't render projections
    return;
  }

  renderScenarioProjections(
    svgGroup,
    historicalDataHeight + 2 * SPACE_BETWEEN_HISTOGRAM_BARS,
    width,
    height - historicalDataHeight,
    nodeScenarioData,
    // If we've reached this point, historical data only mode is not active and
    //  it's safe to assert that selectedScenarioId is not null
    { selectedScenarioId: selectedScenarioId as string }
  );
}

function renderScenarioProjections(
  svgGroup: D3GElementSelection,
  yOffset: number,
  width: number,
  height: number,
  nodeScenarioData: NodeScenarioData,
  runOptions: { selectedScenarioId: string }
) {
  // Collect/extract all the pieces of data needed to convert projections into
  //  histogram format.
  const { selectedScenarioId } = runOptions;
  const projection = nodeScenarioData.scenarios.find(
    scenario => scenario.id === selectedScenarioId
  );
  if (projection === undefined) {
    console.error(
      'Scenario renderer is unable to find selected scenario with ID',
      selectedScenarioId,
      'in scenarios list',
      nodeScenarioData.scenarios
    );
    return;
  }
  const historicalTimeseries = nodeScenarioData.indicator_time_series;
  const isAbstractNode = nodeScenarioData.indicator_id === null;
  const projectionValues = projection.result?.values ?? [];
  if (projectionValues.length === 0) {
    return;
  }

  // Convert projections into histogram format.
  const histograms = convertTimeseriesDistributionToHistograms(
    nodeScenarioData.time_scale,
    isAbstractNode ? [] : historicalTimeseries,
    projectionValues
  );

  const constraintSummary = summarizeConstraints(
    nodeScenarioData.time_scale,
    isAbstractNode ? [] : historicalTimeseries,
    projectionValues[0].timestamp,
    projection.constraints ?? []
  );

  // Render one histogram for each selected time slice
  // FIXME: only render some slices depending on which ones are selected
  // FIXME: we should exit much earlier if no slices are selected
  const widthPerHistogram = width / histograms.length;
  const heightPerHistogramRow = height / histograms[0].binCounts.length;
  const histogramBarHeight =
    heightPerHistogramRow - SPACE_BETWEEN_HISTOGRAM_BARS;
  const constraintRadius = histogramBarHeight / 2;

  const histogramElements = svgGroup
    .selectAll('.histogram')
    .data(histograms)
    .join('g')
    .classed('histogram', true)
    .attr('transform', (d, i) => translate(i * widthPerHistogram, yOffset));
  const histogramBarElements = histogramElements
    .selectAll('.histogram-bar')
    .data(histogramData => histogramData.binCounts)
    .join('g')
    .classed('histogram-bar', true);
  // Render background of each bar
  histogramBarElements
    .append('rect')
    .attr('width', widthPerHistogram - SPACE_BETWEEN_HISTOGRAMS)
    .attr('height', histogramBarHeight)
    .attr('fill', HISTOGRAM_BACKGROUND_COLOR)
    .attr('transform', (d, rowIndex) =>
      translate(SPACE_BETWEEN_HISTOGRAMS, rowIndex * heightPerHistogramRow)
    );
  // Render bar itself
  histogramBarElements
    .append('rect')
    .attr(
      'width',
      // FIXME: implicit requirement that run count adds up to 100
      barValue =>
        (barValue / 100) * (widthPerHistogram - SPACE_BETWEEN_HISTOGRAMS)
    )
    .attr('height', histogramBarHeight)
    .attr('fill', HISTOGRAM_FOREGROUND_COLOR)
    .attr('transform', (d, rowIndex) =>
      translate(SPACE_BETWEEN_HISTOGRAMS, rowIndex * heightPerHistogramRow)
    );
  // Render constraints
  histogramElements
    .selectAll('.constraint')
    // Map from histogram index to the constraint summary for this time slice
    .data((histogramData, histogramIndex) => constraintSummary[histogramIndex].binCounts)
    .join('circle')
    .classed('constraint', true)
    .attr('r', constraintRadius)
    .attr('cx', -constraintRadius)
    .attr('cy', constraintRadius)
    .attr('fill', constraintCount => {
      const hasConstraints = constraintCount > 0;
      return hasConstraints ? SELECTED_COLOR : 'none';
    })
    .attr('transform', (d, rowIndex) =>
      translate(SPACE_BETWEEN_HISTOGRAMS, rowIndex * heightPerHistogramRow)
    );
}
