import * as d3 from 'd3';
import moment from 'moment';

import initialize from '@/charts/initialize';
import { timeseriesLine, translate } from '@/utils/svg-util';
import { chartValueFormatter } from '@/utils/string-util';
import { D3GElementSelection, D3Selection } from '@/types/D3';
import { Chart } from '@/types/Chart';
import { NodeScenarioData } from '@/types/CAG';
import { calculateGenericTicks } from '@/utils/timeseries-util';
import { convertTimeseriesDistributionToHistograms } from '@/utils/histogram-util';

const HISTORY_BACKGROUND_COLOR = '#F3F3F3';
const HISTORY_LINE_COLOR = '#999';
const SPACE_BETWEEN_HISTOGRAMS = 2;
const SPACE_BETWEEN_HISTOGRAM_BARS = 1;
const HISTOGRAM_BACKGROUND_COLOR = HISTORY_BACKGROUND_COLOR;
const HISTOGRAM_FOREGROUND_COLOR = HISTORY_LINE_COLOR;
// How much of the node is taken up by the history chart
// TODO: If all projections are hidden, this will expand to take the full width
const HISTORY_WIDTH_PERCENTAGE = 0.5;

export default function(
  selection: D3Selection,
  nodeScenarioData: NodeScenarioData,
  renderOptions: any,
  runOptions: { selectedScenarioId: string }
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
  runOptions: { selectedScenarioId: string }
) {
  const selectedScenario = nodeScenarioData.scenarios.find(
    s => s.id === runOptions.selectedScenarioId
  );
  if (selectedScenario === undefined) {
    console.error(
      'Unable to find scenario with ID ' + runOptions.selectedScenarioId + '.'
    );
    return;
  }

  // Calculate timestamp of the earliest historical time to display
  const { projection_start } = selectedScenario.parameter;
  // TODO: should this be a constant? based on time_scale? based on how many columns are hidden?
  const historicalMonthsToDisplay = 5 * 12;
  const historyStart = moment
    .utc(projection_start)
    .subtract(historicalMonthsToDisplay, 'months')
    .valueOf();
  const historyEnd = projection_start;

  // Filter out timeseries points that aren't within the range we're displaying
  const filteredTimeSeries = nodeScenarioData.indicator_time_series.filter(
    d => d.timestamp >= historyStart && d.timestamp <= historyEnd
  );

  // TODO: choose yExtent so that "now" value is centered
  const yExtent = [nodeScenarioData.min, nodeScenarioData.max];

  // Chart dimensions
  const height = chart.y2 - chart.y1;
  const width = chart.x2 - chart.x1;

  const formatter = chartValueFormatter(...yExtent);
  const historyChartXScale = d3
    .scaleLinear()
    .domain([historyStart, historyEnd])
    .range([0, width * HISTORY_WIDTH_PERCENTAGE]);
  const historyChartYScale = d3
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
    .attr('x', historyChartXScale(historyStart))
    .attr('y', 0)
    .attr('height', height)
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

  renderScenarioProjections(
    svgGroup,
    width * HISTORY_WIDTH_PERCENTAGE,
    width * (1 - HISTORY_WIDTH_PERCENTAGE),
    height,
    nodeScenarioData,
    runOptions
  );

  // Axes
  const yAxis = d3
    .axisRight(historyChartYScale)
    .tickValues(
      calculateGenericTicks(
        historyChartYScale.domain()[0],
        historyChartYScale.domain()[1]
      )
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
}

function renderScenarioProjections(
  svgGroup: D3GElementSelection,
  xOffset: number,
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
  const clampAtProjectionStart = projection.constraints?.find(
    constraint => constraint.step === 0
  );
  const projectionValues = projection.result?.values ?? [];
  if (projectionValues.length === 0) {
    return;
  }

  // Convert projections into histogram format.
  const histograms = convertTimeseriesDistributionToHistograms(
    nodeScenarioData.time_scale,
    isAbstractNode ? [] : historicalTimeseries,
    clampAtProjectionStart?.value ?? null,
    projectionValues
  );

  // Render one histogram for each selected time slice
  // FIXME: only render some slices depending on which ones are selected
  // FIXME: we should exit much earlier if no slices are selected
  const widthPerHistogram = width / histograms.length;
  const heightPerHistogramBar = height / histograms[0].length;
  const histogramElements = svgGroup
    .selectAll('.histogram')
    .data(histograms)
    .join('g')
    .classed('histogram', true)
    .attr('transform', (d, i) => translate(xOffset + i * widthPerHistogram, 0));
  const histogramBarElements = histogramElements
    .selectAll('.histogram-bar')
    .data(d => d)
    .join('g')
    .classed('histogram-bar', true);
  histogramBarElements
    .append('rect')
    .attr('width', widthPerHistogram - SPACE_BETWEEN_HISTOGRAMS)
    .attr('height', heightPerHistogramBar - SPACE_BETWEEN_HISTOGRAM_BARS)
    .attr('fill', HISTOGRAM_BACKGROUND_COLOR)
    .attr('transform', (d, j) =>
      translate(SPACE_BETWEEN_HISTOGRAMS, j * heightPerHistogramBar)
    );
  histogramBarElements
    .append('rect')
    .attr(
      'width',
      d => (d / 100) * (widthPerHistogram - SPACE_BETWEEN_HISTOGRAMS)
    )
    .attr('height', heightPerHistogramBar - SPACE_BETWEEN_HISTOGRAM_BARS)
    .attr('fill', HISTOGRAM_FOREGROUND_COLOR)
    .attr('transform', (d, j) =>
      translate(SPACE_BETWEEN_HISTOGRAMS, j * heightPerHistogramBar)
    );
  // TODO: render constraints
}
