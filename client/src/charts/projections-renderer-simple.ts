import { D3GElementSelection, D3Selection } from '@/types/D3';
import { TimeseriesPoint } from '@/types/Timeseries';
import { renderLine } from '@/utils/timeseries-util';
import * as d3 from 'd3';

const HISTORICAL_DATA_COLOR = '#888';

const renderTimeseries = (
  timeseries: TimeseriesPoint[],
  parentGroupElement: D3GElementSelection,
  xScale: d3.ScaleLinear<number, number>,
  yScale: d3.ScaleLinear<number, number>
) => {
  renderLine(parentGroupElement, timeseries, xScale, yScale, HISTORICAL_DATA_COLOR);
};

export default function render(
  selection: D3Selection,
  timeseries: TimeseriesPoint[],
  totalWidth: number,
  totalHeight: number,
  projectionStartTimestamp: number,
  projectionEndTimestamp: number
) {
  // Clear any existing elements
  selection.selectAll('*').remove();
  // Add chart `g` element to the page
  const groupElement = selection.append('g').classed('groupElement', true);
  // Calculate scales
  const dataValueRange = d3.extent(timeseries.map((point) => point.value));
  if (dataValueRange[0] === undefined) {
    return;
  }
  const xScale = d3
    .scaleLinear()
    .domain([projectionStartTimestamp, projectionEndTimestamp])
    .range([0, totalWidth]);
  const yScale = d3.scaleLinear().domain(dataValueRange).range([totalHeight, 0]);
  // Render the series
  renderTimeseries(timeseries, groupElement, xScale, yScale);
}
