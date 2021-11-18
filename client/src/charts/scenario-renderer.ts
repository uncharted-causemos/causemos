import _ from 'lodash';
import * as d3 from 'd3';
import moment from 'moment';

import initialize from '@/charts/initialize';
import { timeseriesLine } from '@/utils/svg-util';
import { chartValueFormatter } from '@/utils/string-util';
import { D3GElementSelection, D3ScaleLinear, D3Selection } from '@/types/D3';
import { Chart } from '@/types/Chart';
import { NodeScenarioData } from '@/types/CAG';
import { calculateGenericTicks } from '@/utils/timeseries-util';

const HISTORY_BACKGROUND_COLOR = '#F3F3F3';
const HISTORY_LINE_COLOR = '#AAA';

export default function(
  selection: D3Selection,
  nodeScenarioData: NodeScenarioData,
  renderOptions: any,
  runOptions: any
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
  // TODO: better type for runOptions
  runOptions: any
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

  // Figure out the [start, end] ranges
  let globalStart = Number.POSITIVE_INFINITY;
  let globalEnd = Number.NEGATIVE_INFINITY;
  nodeScenarioData.scenarios.forEach(scenario => {
    const {
      indicator_time_series_range,
      projection_start,
      num_steps
    } = scenario.parameter;
    const start = indicator_time_series_range.start;
    const end = moment
      .utc(projection_start)
      .add(num_steps, 'months')
      .valueOf();
    if (start < globalStart) globalStart = start;
    if (end > globalEnd) globalEnd = end;
  });

  // Portion of time series relating to current scenario
  const historyRange = selectedScenario.parameter.indicator_time_series_range;
  const filteredTimeSeries = nodeScenarioData.indicator_time_series.filter(
    d => d.timestamp >= historyRange.start && d.timestamp <= historyRange.end
  );

  // Chart params
  const height = chart.y2 - chart.y1;
  const width = chart.x2 - chart.x1;
  let xExtent = null;
  let yExtent = null;

  xExtent = [globalStart, globalEnd];
  if (_.isEmpty(filteredTimeSeries)) {
    yExtent = [0, 0];
  } else {
    // Safe to assume yExtent is not [undefined, undefined] since
    //  filteredTimeSeries is not empty
    yExtent = d3.extent(filteredTimeSeries.map(d => d.value)) as [
      number,
      number
    ];
  }
  if (yExtent[1] === yExtent[0] && yExtent[0] === 0) {
    yExtent = [0, 1];
  } else if (yExtent[1] === yExtent[0] && yExtent[0] !== 0) {
    // if flat-line around non-zero, range becomes 0 and twice the value  (ex. 5.5 => [0,11]  -5.5 => [-11,0])
    yExtent = [
      yExtent[0] - Math.abs(yExtent[0]),
      yExtent[0] + Math.abs(yExtent[0])
    ];
  }

  yExtent = [nodeScenarioData.min, nodeScenarioData.max];

  const formatter = chartValueFormatter(...yExtent);
  const xscale = d3
    .scaleLinear()
    .domain(xExtent)
    .range([0, width]);
  const yscale = d3
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
    .attr('y', 0)
    .attr('x', xscale(historyRange.start))
    .attr('height', height)
    .attr('width', xscale(historyRange.end))
    .attr('stroke', 'none')
    .attr('fill', HISTORY_BACKGROUND_COLOR)
    .attr('fill-opacity', 0.6);

  const historicG = svgGroup.append('g');
  historicG
    .append('path')
    .attr('class', 'historical')
    .attr(
      'd',
      // FIXME: TypeScript shenanigans are necessary because timeseriesLine()
      //  is in a JS file. See svg-util.js for more details.
      timeseriesLine(
        xscale,
        yscale
      )((filteredTimeSeries as any) as [number, number][]) as string
    )
    .style('stroke', HISTORY_LINE_COLOR)
    .style('stroke-width', 1)
    .style('pointer-events', 'none')
    .style('fill', 'none');

  renderScenarioProjections(
    svgGroup,
    nodeScenarioData,
    runOptions,
    xscale,
    yscale
  );

  // Axes
  const yaxis = d3
    .axisRight(yscale)
    .tickValues(calculateGenericTicks(yscale.domain()[0], yscale.domain()[1]))
    .tickSize(0)
    // The type of formatter can't be more specific than `any`
    //  because under the hood d3.tickFormat requires d3.NumberType.
    // It correctly converts, but its TypeScript definitions don't
    //  seem to reflect that.
    .tickFormat(formatter as any);

  const yAxisElement = svgGroup
    .append('g')
    .classed('yaxis', true)
    .style('pointer-events', 'none')
    .call(yaxis)
    .style('font-size', '5px');
  yAxisElement.select('.domain').attr('stroke-width', 0);
  yAxisElement.selectAll('text').attr('x', 0);
}

function renderScenarioProjections(
  svgGroup: D3GElementSelection,
  nodeScenarioData: NodeScenarioData,
  runOptions: any,
  xScale: D3ScaleLinear,
  yScale: D3ScaleLinear
  // FIXME: render constraints
  // constraints
) {
  svgGroup.selectAll('.scenario').remove();
  console.log(yScale.range());

  // FIXME: render histograms instead of line charts
  // convertTimeseriesDistributionToHistograms(
  //   this.modelSummary,
  //   isAbstractNode ? [] : this.historicalTimeseries,
  //   null, // TODO: clampedNowValue
  //   projection.values
  // )
}
