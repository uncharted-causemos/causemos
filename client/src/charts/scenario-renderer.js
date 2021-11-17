import _ from 'lodash';
import * as d3 from 'd3';
import moment from 'moment';

import initialize from '@/charts/initialize';
import { timeseriesLine } from '@/utils/svg-util';
import { chartValueFormatter } from '@/utils/string-util';

const HISTORY_BACKGROUND_COLOR = '#F3F3F3';

export default function(selection, data, renderOptions, runOptions) {
  const chart = initialize(selection, renderOptions);
  render(chart, data, runOptions);
}

/**
 * Draws the historic and projection graphs from the prepared 'data'.
 *
 * @param {object} svgGroup - svg element that all graph objects will been appended to
 * @param {object} data - historic and projection data - layout set by modelService.buildNodeChartData()
 * @param {string} selectedScenarioId
 * @param {object} options - width, height, padY
 * @param {function} updateCallback - when constraints are changed, this function is called
 */
function render(chart, data, runOptions) {
  // const selectedScenarioId = runOptions.selectedScenarioId;
  const selectedScenario = data.scenarios.find(
    s => s.id === runOptions.selectedScenarioId
  );
  const constraints = _.cloneDeep(selectedScenario.constraints);

  // Figure out the [start, end] ranges
  let globalStart = Number.POSITIVE_INFINITY;
  let globalEnd = Number.NEGATIVE_INFINITY;
  data.scenarios.forEach(scenario => {
    const param = scenario.parameter;
    const start = param.indicator_time_series_range.start;
    const end = moment
      .utc(param.projection_start)
      .add(param.num_steps, 'months')
      .valueOf();
    if (start < globalStart) globalStart = start;
    if (end > globalEnd) globalEnd = end;
  });

  // Portion of time series relating to current scenario
  const historyRange = selectedScenario.parameter.indicator_time_series_range;
  const filteredTimeSeries = data.indicator_time_series.filter(
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
    yExtent = d3.extent(filteredTimeSeries.map(d => d.value));
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

  yExtent = [data.min, data.max];

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
    .attr('d', timeseriesLine(xscale, yscale)(filteredTimeSeries))
    .style('stroke', '#AAA')
    .style('stroke-width', 1)
    .style('pointer-events', 'none')
    .style('fill', 'none');

  // Render scenario projections - stale scenarios may appear weird due to different time ranges
  renderScenarioProjections(
    svgGroup,
    data.scenarios,
    runOptions,
    xscale,
    yscale,
    formatter,
    constraints
  );

  // Axes
  const yaxis = d3
    .axisRight()
    .scale(yscale)
    .ticks(2)
    .tickSize(0)
    .tickFormat(formatter);

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
  svgGroup,
  scenarios,
  runOptions,
  xscale,
  yscale,
  constraints
) {
  // FIXME: we'll use the constraints parameter again, but for now just log it
  //  to prevent "defined but never used" errors
  console.log(constraints.length);
  svgGroup.selectAll('.scenario').remove();

  // Selected goes last so it is not occluded
  const sortedScenarios = scenarios;
  const selectedScenario = _.remove(
    sortedScenarios,
    s => s.id === runOptions.selectedScenarioId
  )[0];
  sortedScenarios.push(selectedScenario);

  // FIXME: render histograms instead of line charts
}
