import * as d3 from 'd3';

import initialize from '@/charts/initialize';
import { timeseriesLine, translate } from '@/utils/svg-util';
import { chartValueFormatter } from '@/utils/string-util';
import { D3Selection, D3ScaleLinear, D3GElementSelection } from '@/types/D3';
import { Chart } from '@/types/Chart';
import { NodeScenarioData } from '@/types/CAG';
import { calculateGenericTicks } from '@/utils/timeseries-util';
import { historicalDataUncertaintyColor } from '@/services/model-service';
import {
  getLastTimeStepIndexFromTimeScale,
  getMonthsPerTimestepFromTimeScale,
  getTimeScaleOption
} from '@/utils/time-scale-util';
import { getTimestampAfterMonths } from '@/utils/date-util';
import {
  calculateTypicalChangeBracket,
  convertDistributionTimeseriesToRidgelines
} from '@/utils/ridgeline-util';
import { renderRidgelines } from './ridgeline-renderer';

import { SELECTED_COLOR } from '@/utils/colors-util';

const HISTORY_LINE_COLOR = '#999';
const LABEL_COLOR = HISTORY_LINE_COLOR;


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
    time_scale
  } = nodeScenarioData;

  let projection_start = nodeScenarioData.projection_start;
  // Let projection override model's projection_start, as it can be in a temporary stale state that can mess up the renderer
  if (nodeScenarioData.scenarios) {
    const scenario1 = nodeScenarioData.scenarios[0];
    if (scenario1.result) {
      projection_start = scenario1.result.values[0].timestamp;
    }
  }

  const visibleHistoricalMonthCount = nodeScenarioData.history_range;
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
    .attr('fill', historicalDataUncertaintyColor(
      nodeScenarioData.indicator_time_series,
      nodeScenarioData.projection_start,
      nodeScenarioData.time_scale)
    );

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
  const ridgelinesWithMetadata = convertDistributionTimeseriesToRidgelines(
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

  ridgelinesWithMetadata.forEach((ridgelineWithMetadata) => {
    const { label, timestamp, monthsAfterNow } = ridgelineWithMetadata;
    // Calculate context range for each timeslice, unless this is an abstract
    //  node where the analyst hasn't filled in the historical data.
    const hideContextRanges = indicator_time_series.length < 4;
    const contextRange = calculateTypicalChangeBracket(
      hideContextRanges ? [] : indicator_time_series,
      monthsAfterNow,
      projection_start
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
      ridgelineWithMetadata,
      null,
      widthBetweenTimeslices,
      height,
      yScale.domain()[0],
      yScale.domain()[1],
      false,
      true,
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
