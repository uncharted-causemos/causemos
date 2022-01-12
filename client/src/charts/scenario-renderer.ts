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
  getLastTimeStepFromTimeScale,
  getSliceMonthsFromTimeScale
} from '@/utils/time-scale-util';
import { getTimestampAfterMonths } from '@/utils/date-util';

const HISTORY_BACKGROUND_COLOR = '#F3F3F3';
const HISTORY_LINE_COLOR = '#999';

// When creating a curve to estimate the density of the distribution, we group
//  points into bins (necessary to convert the one-dimensional data into 2D).
// The number of bins impacts how smooth the resulting curve is, raise the
//  bin count to make the curve less smooth.
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
    indicator_time_series,
    min,
    max,
    projection_start
  } = nodeScenarioData;

  // Calculate timestamp of the earliest historical time to display
  const historyStart = moment
    .utc(projection_start)
    .subtract(VISIBLE_HISTORICAL_MONTH_COUNT, 'months')
    .valueOf();
  // FIXME: historical data should end 1 month (or year, depending on time
  //  scale) before projection start. "Projection start date" means the date at
  //  which the first projected timestamp will be returned.
  const historyEnd = projection_start;

  // Filter out timeseries points that aren't within the range we're displaying
  const filteredTimeSeries = indicator_time_series.filter(
    d => d.timestamp >= historyStart && d.timestamp <= historyEnd
  );

  // Chart dimensions
  const height = chart.y2 - chart.y1;
  const width = chart.x2 - chart.x1;

  const selectedScenarioId = runOptions.selectedScenarioId;
  const isHistoricalDataOnlyMode = selectedScenarioId === null;

  // TODO: check for off-by-1 error
  const lastProjectedTimestamp = getTimestampAfterMonths(
    projection_start,
    getLastTimeStepFromTimeScale(nodeScenarioData.time_scale) - 1
  );

  // const historicalDataWidth = isHistoricalDataOnlyMode
  //   ? width
  //   : HISTORY_WIDTH_PERCENTAGE * width;
  const xScaleEndTimestamp = isHistoricalDataOnlyMode
    ? historyEnd
    : lastProjectedTimestamp;

  const yExtent = [min, max];
  const formatter = chartValueFormatter(...yExtent);
  const xScale = d3
    .scaleLinear()
    .domain([historyStart, xScaleEndTimestamp])
    // FIXME: this will cause the last ridgeline plot to overflow. The range
    //  should be [0, width - ridgelinePlotWidth].
    .range([0, width]);
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
    .style('color', HISTORY_LINE_COLOR);
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
  // TODO:
  // const isAbstractNode = indicator_id === null;
  const projectionValues = projection.result?.values ?? [];
  if (projectionValues.length === 0) {
    return;
  }

  function convertDistributionToRidgeline(
    distribution: number[],
    min: number,
    max: number
  ) {
    // Convert distribution to a histogram
    const binWidth = (max - min) / RIDGELINE_BIN_COUNT;
    const thresholds = [
      ...Array.from(
        { length: RIDGELINE_BIN_COUNT },
        (d, i) => min + i * binWidth
      ),
      max
    ];
    const bins = d3
      .bin()
      .domain([min, max])
      .thresholds(thresholds);
    const histogram = bins(distribution).map(bin => {
      const lower = bin.x0 ?? 0;
      const upper = bin.x1 ?? 1;
      return {
        lower,
        upper,
        mid: lower + (upper - lower) / 2,
        count: bin.length
      };
    });
    // TODO: rename these properties?
    // TODO: extract line point type?
    // Add point to min and max of line so that line continues to edge of range
    //  instead of stopping at the midpoint of the last bin
    const smoothedLine: {
      binMidpoint: number;
      fractionOfTotalPoints: number;
    }[] = [
      { binMidpoint: min, fractionOfTotalPoints: 0 },
      ...histogram.map(bin => ({
        binMidpoint: bin.mid,
        fractionOfTotalPoints: bin.count / distribution.length
      })),
      { binMidpoint: max, fractionOfTotalPoints: 0 }
    ];
    return smoothedLine;
  }

  // Extract relevant timeslices //TODO: this should probably be a util function
  // 1. Use selected timescale to get relevant month offsets from TIME_SCALE_OPTIONS constant
  // This represents how many months from "now" each displayed time slice will be
  const relevantMonthOffsets = getSliceMonthsFromTimeScale(time_scale);
  // TODO: 2.
  const smoothedLines = relevantMonthOffsets
    .map(monthOffset => ({
      timestamp: getTimestampAfterMonths(projection_start, monthOffset - 1),
      // FIXME: is there a neater way to do this? monthOffsets are 1 indexed, projection values are 0 indexed
      distribution: projectionValues[monthOffset - 1].values
    }))
    .map(({ timestamp, distribution }) => ({
      timestamp,
      smoothedLine: convertDistributionToRidgeline(
        distribution,
        yScale.domain()[0], // min
        yScale.domain()[1] // max
      )
    }));

  // TODO: 3.
  // Render one ridgeline plot for each timeslice
  // const firstSliceTimestamp = smoothedLines[0].timestamp;
  // Width won't be exactly the same between timeslices since some months/years
  //  are longer than others, but this will serve as a useful estimate of the
  //  maximum width a ridgeline can take up without overlapping the next one.
  // FIXME: we should be able to use smoothedLines[0].timestamp and projection_start
  //  here so that we don't have the dependency of having more than 1 relevant timeslice
  const widthBetweenTimeslices =
    xScale(smoothedLines[1].timestamp) - xScale(smoothedLines[0].timestamp);

  const ridgelineXScale = d3
    .scaleLinear()
    .domain([0, 1])
    .range([0, widthBetweenTimeslices]);

  const line = d3
    .line<{ binMidpoint: number; fractionOfTotalPoints: number }>()
    // Use curveMonotoneY so that curves between points don't overshoot points
    //  in the X direction. This is necessary so that curves don't dip past the
    //  vertical line that acts as the baseline for each smoothed histogram
    .curve(d3.curveMonotoneY)
    .x(d => ridgelineXScale(d.fractionOfTotalPoints))
    .y(d => yScale(d.binMidpoint));

  const ridgeLineElements = svgGroup
    .selectAll('.ridgeline')
    .data(smoothedLines)
    .join('g')
    .classed('ridgeline', true)
    .attr('transform', d => translate(xScale(d.timestamp), 0));

  // Draw vertical line to act as a baseline
  ridgeLineElements
    .append('rect')
    .attr('width', RIDGELINE_VERTICAL_AXIS_WIDTH) // TODO
    .attr('height', height)
    .attr('fill', RIDGELINE_VERTICAL_AXIS_COLOR)
    .attr('x', 0)
    .attr('y', 0);

  // Draw ridgeline itslef
  ridgeLineElements
    .append('path')
    .attr('width', widthBetweenTimeslices)
    .attr('height', height)
    .attr('fill', RIDGELINE_FILL_COLOR)
    .attr('stroke', RIDGELINE_STROKE_COLOR)
    .attr('stroke-width', RIDGELINE_STROKE_WIDTH)
    .attr('d', d => line(d.smoothedLine));

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
