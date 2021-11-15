import _ from 'lodash';
import * as d3 from 'd3';
import moment from 'moment';

import initialize from '@/charts/initialize';
import { timeseriesLine, translate } from '@/utils/svg-util';
import { DEFAULT_COLOR } from '@/utils/colors-util';
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
 * @param {object} options - width, height, padY, miniGraph
 * @param {function} updateCallback - when constraints are changed, this function is called
 */
function render(chart, data, runOptions) {
  // const selectedScenarioId = runOptions.selectedScenarioId;
  const miniGraph = runOptions.miniGraph;
  const selectedScenario = data.scenarios.find(s => s.id === runOptions.selectedScenarioId);
  const constraints = _.cloneDeep(selectedScenario.constraints);


  // Figure out the [start, end] ranges
  let globalStart = Number.POSITIVE_INFINITY;
  let globalEnd = Number.NEGATIVE_INFINITY;
  data.scenarios.forEach(scenario => {
    const param = scenario.parameter;
    const start = param.indicator_time_series_range.start;
    const end = moment.utc(param.projection_start).add(param.num_steps, 'months').valueOf();
    if (start < globalStart) globalStart = start;
    if (end > globalEnd) globalEnd = end;
  });

  // Portion of time series relating to current scenario
  const historyRange = selectedScenario.parameter.indicator_time_series_range;
  const filteredTimeSeries = data.indicator_time_series.filter(d =>
    d.timestamp >= historyRange.start &&
    d.timestamp <= historyRange.end
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
    yExtent = [yExtent[0] - Math.abs(yExtent[0]), yExtent[0] + Math.abs(yExtent[0])];
  }

  yExtent = [data.min, data.max];

  const formatter = chartValueFormatter(...yExtent);
  const xscale = d3.scaleLinear().domain(xExtent).range([0, width]);
  const yscale = d3.scaleLinear().domain(yExtent).range([height, 0]).clamp(true);

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

  /*
  const projectionStart = selectedScenario.parameter.projection_start;
  const projectionEnd = _.last(selectedScenario.result.values.map(d => d.timestamp));
  */

  const historicG = svgGroup.append('g');
  historicG.append('path')
    .attr('class', 'historical')
    .attr('d', timeseriesLine(xscale, yscale)(filteredTimeSeries))
    .style('stroke', DEFAULT_COLOR)
    .style('stroke-width', 1)
    .style('pointer-events', 'none')
    .style('fill', 'none');


  if (!miniGraph) {
    historicG.selectAll('circle')
      .data(filteredTimeSeries)
      .enter()
      .append('circle')
      .attr('class', 'historical')
      .attr('cx', d => xscale(d.timestamp))
      .attr('cy', d => yscale(d.value))
      .attr('r', 2.5)
      .style('stroke', HISTORY_BACKGROUND_COLOR)
      .style('stroke-width', 1.5)
      .style('fill', DEFAULT_COLOR);
  }

  // Render scenario projections - stale scenarios may appear weird due to different time ranges
  renderScenarioProjections(svgGroup, data.scenarios, runOptions, xscale, yscale, formatter, constraints);

  // Axes
  // const xValues = monthRange(globalStart, globalEnd);
  // const importantXValues = [historyRange.start, historyRange.end, projectionStart, projectionEnd];
  const importantXValues = [historyRange.start, historyRange.end];

  let xaxis = null;
  if (miniGraph) {
    xaxis = d3.axisBottom()
      .scale(xscale)
      .tickValues(importantXValues)
      .tickSize(0)
      .tickFormat('');
  }
  const yaxis = d3.axisLeft().scale(yscale).ticks(2).tickSize(miniGraph ? 1 : 2).tickFormat(formatter);

  svgGroup.append('g')
    .classed('xaxis', true)
    .style('pointer-events', 'none')
    .call(xaxis)
    .style('font-size', miniGraph ? '5px' : '12px')
    .attr('transform', translate(0, yscale(0)))
    .attr('stroke-opacity', 0.5)
    .select('.domain').attr('stroke-width', miniGraph ? 0 : 1);

  svgGroup.append('g')
    .classed('yaxis', true)
    .style('pointer-events', 'none')
    .call(yaxis)
    .attr('stroke-opacity', 0.5)
    .style('font-size', miniGraph ? '5px' : '12px')
    .style('opacity', miniGraph ? 0.5 : null)
    .selectAll('text')
    .attr('transform', miniGraph ? translate(2, 0) : null);
}

function renderScenarioProjections(svgGroup, scenarios, runOptions, xscale, yscale, constraints) {
  // FIXME: we'll use the constraints parameter again, but for now just log it
  //  to prevent "defined but never used" errors
  console.log(constraints.length);
  svgGroup.selectAll('.scenario').remove();

  // Selected goes last so it is not occluded
  const sortedScenarios = scenarios;
  const selectedScenario = _.remove(sortedScenarios, s => s.id === runOptions.selectedScenarioId)[0];
  sortedScenarios.push(selectedScenario);

  // FIXME: render histograms instead of line charts
}
