import * as d3 from 'd3';
import { chartValueFormatter } from '@/utils/string-util';
import { D3GElementSelection, D3Selection } from '@/types/D3';
import { BarData } from '@/types/BarChart';
import { translate } from '@/utils/svg-util';
import { SELECTED_COLOR } from '@/utils/colors-util';
import { getHoverIdFromValue } from '@/utils/chart-util';

const X_AXIS_HEIGHT = 20;
const Y_AXIS_WIDTH = 40;
const PADDING_TOP = 10;
const PADDING_RIGHT = 5;
const BAR_GAP = 0.4;
const Y_AXIS_MAX_TICK_COUNT = 5;
const MAX_BAR_COUNT_BEFORE_TICK_ROTATION = 40;

const TOOLTIP_BG_COLOUR = 'white';
const TOOLTIP_BORDER_COLOUR = 'grey';
const TOOLTIP_WIDTH = 200;
const TOOLTIP_BORDER_WIDTH = 1.5;
const TOOLTIP_FONT_SIZE = 10;
const TOOLTIP_PADDING = TOOLTIP_FONT_SIZE / 2;
const TOOLTIP_LINE_HEIGHT = TOOLTIP_FONT_SIZE + TOOLTIP_PADDING;

let lastSelectedBar = '';
let lastSelectedBarElement: D3GElementSelection | null = null;

function renderBarChart(
  selection: D3Selection,
  barsData: BarData[], // mostly a two-column data format (since each bar would have a value)
  width: number,
  height: number,
  onHover: (barLabel: string) => void
) {
  selection.on('click', () => {
    lastSelectedBar = '';
    lastSelectedBarElement = null;
    onHover(''); // special case: hide everything
  });

  const groupElement = selection.append('g');

  //
  // create scales
  //
  const allBars = barsData.map(bar => bar.name);
  const allBarsValues = barsData.map(bar => bar.value);
  const xExtent = allBars;
  const yExtent = [0, Math.ceil(d3.max(allBarsValues) ?? 0)];
  if (xExtent[0] === undefined || yExtent[0] === undefined) {
    console.error('Unable to derive extent from data', barsData);
    return;
  }
  const xScale = d3.scaleBand()
    .domain(xExtent)
    .range([Y_AXIS_WIDTH, width - PADDING_RIGHT])
    .padding(BAR_GAP);
  const yScale = d3
    .scaleLinear()
    .domain(yExtent)
    .range([height - X_AXIS_HEIGHT, PADDING_TOP]);

  const valueFormatter = chartValueFormatter(...yExtent);
  renderAxes(
    groupElement,
    xScale,
    yScale,
    valueFormatter,
    width,
    height,
    Y_AXIS_WIDTH,
    PADDING_RIGHT,
    X_AXIS_HEIGHT
  );

  //
  // render bars
  //
  groupElement.selectAll<SVGSVGElement, BarData>('.bar')
    .data(barsData)
    .enter().append('rect')
    .attr('class', 'bar')
    .attr('x', function(d) { return xScale(d.name) ?? 0; })
    .attr('y', function(d) { return yScale(d.value); })
    .attr('width', xScale.bandwidth())
    .attr('height', function(d) { return height - yScale(d.value) - X_AXIS_HEIGHT; })
    .style('fill', function(d) { return d.color ?? 'skyblue'; })
  ;

  renderHoverTooltips(
    barsData,
    groupElement,
    xScale,
    yScale,
    valueFormatter,
    width,
    height,
    onHover);
}

function renderHoverTooltips(
  barsData: BarData[],
  selection: D3GElementSelection,
  xScale: d3.ScaleBand<string>,
  yScale: d3.ScaleLinear<number, number>,
  // The type of value can't be more specific than `any`
  //  because under the hood d3.tickFormat requires d3.NumberType.
  // It correctly converts, but its TypeScript definitions don't
  //  seem to reflect that.
  valueFormatter: (value: any) => string,
  width: number,
  height: number,
  onHover: (barLabel: string) => void
) {
  const SELECTED_BAR_WIDTH = xScale.bandwidth();
  const maxX = xScale(barsData[barsData.length - 1].name) ?? 0;
  const minX = xScale(barsData[0].name) ?? 0;
  const hitboxWidth = SELECTED_BAR_WIDTH;
  const markerHeight = (height - PADDING_TOP - X_AXIS_HEIGHT);
  const tooltipRectHeight = TOOLTIP_LINE_HEIGHT + PADDING_TOP * 2;
  barsData.forEach(bar => {
    const barX = xScale(bar.name) ?? 0;
    let barY = yScale(bar.value) ?? 0;
    // ensure that tooltip rect is always within the chart area
    if ((barY + tooltipRectHeight) > markerHeight) {
      barY -= tooltipRectHeight;
    }
    const isRightOfCenter = barX > ((maxX - minX) / 2);

    const markerAndTooltip = selection
      .append('g')
      .attr(
        'transform',
        translate(barX, PADDING_TOP)
      )
      .attr('visibility', 'hidden')
      .classed('markerAndTooltip', true)
      .style('pointer-events', 'none')
      .attr('id', getHoverIdFromValue(bar.label)) // assign id to control hover state externally
    ;
    //
    // draw rectangle highlight on top of the hovered bar
    //
    markerAndTooltip
      .append('rect')
      .attr('width', SELECTED_BAR_WIDTH)
      .attr('height', markerHeight)
      .attr('fill', SELECTED_COLOR)
      .attr('fill-opacity', 0.5);
    // How far the tooltip is shifted horizontally from the hovered bar
    //  also the "radius" of the notch diamond
    const offset = 6;
    const notchSideLength = Math.sqrt(offset * offset + offset * offset);
    let tooltipX = -1;
    if (isRightOfCenter) {
      tooltipX = -offset - TOOLTIP_WIDTH;
      // ensure that tooltip does not go before chart left bound
      if ((tooltipX + barX) < 0) {
        tooltipX += Math.abs(tooltipX + barX);
      }
    } else {
      tooltipX = offset + SELECTED_BAR_WIDTH;
      // ensure that tooltip does not go before chart right bound
      if ((tooltipX + TOOLTIP_WIDTH) > width) {
        tooltipX = width - TOOLTIP_WIDTH;
      }
    }
    const tooltip = markerAndTooltip.append('g')
      .attr('transform', translate(tooltipX, 0));
    //
    // draw the tooltip rectangle
    //
    const tooltipContentY = barY + PADDING_TOP;
    tooltip
      .append('rect')
      .attr('width', TOOLTIP_WIDTH)
      .attr('height', tooltipRectHeight)
      .attr('y', barY - PADDING_TOP)
      .attr('fill', TOOLTIP_BG_COLOUR)
      .attr('stroke', TOOLTIP_BORDER_COLOUR);
    // Notch border
    tooltip
      .append('rect')
      .attr('width', notchSideLength + TOOLTIP_BORDER_WIDTH)
      .attr('height', notchSideLength + TOOLTIP_BORDER_WIDTH)
      .attr(
        'transform',
        isRightOfCenter
          ? translate(TOOLTIP_WIDTH - offset - TOOLTIP_BORDER_WIDTH, tooltipContentY) + 'rotate(-45)'
          : translate(-TOOLTIP_BORDER_WIDTH - offset, tooltipContentY) + 'rotate(-45)'
      )
      .attr('fill', TOOLTIP_BORDER_COLOUR);
    // Notch background
    // Extend side length of notch background to make sure it covers the right
    //  half of the border rect
    tooltip
      .append('rect')
      .attr('width', notchSideLength * 2)
      .attr('height', notchSideLength * 2)
      .attr(
        'transform',
        isRightOfCenter
          ? translate(TOOLTIP_WIDTH - 3 * offset, tooltipContentY) + 'rotate(-45)'
          : translate(-offset, tooltipContentY) + 'rotate(-45)'
      )
      .attr('fill', TOOLTIP_BG_COLOUR);
    //
    // Render the bar name/value in the tooltip
    //
    const yPosition = tooltipContentY;
    // max number of chars before truncating the text of each bar name
    const maxNameLen = 20;
    const barName = bar.label.length > maxNameLen ? bar.label.substring(0, maxNameLen) + '...' : bar.label;
    tooltip
      .append('text')
      .attr('transform', translate(TOOLTIP_PADDING, yPosition))
      .style('fill', 'blue')
      .style('font-weight', 'bold')
      .text(barName);
    tooltip
      .append('text')
      .attr('transform', translate(TOOLTIP_WIDTH - TOOLTIP_PADDING, yPosition))
      .style('text-anchor', 'end')
      .style('fill', 'blue')
      .text(valueFormatter(bar.value));
    // Hover hitbox
    selection
      .append('rect')
      .attr('width', hitboxWidth)
      .attr('height', markerHeight)
      .attr(
        'transform',
        translate(barX, PADDING_TOP)
      )
      .attr('fill-opacity', 0)
      .style('cursor', 'pointer')
      // only enable hover if no bar is selected
      .on('mouseenter', () => {
        if (lastSelectedBar === '') {
          markerAndTooltip
            .style('opacity', '1')
            .attr('visibility', 'visible');
        }
        /*
        // allow hover while there is a selection
        markerAndTooltip
          .style('opacity', '1')
          .attr('visibility', 'visible');
        if (lastSelectedBarElement !== null) {
          lastSelectedBarElement.style('opacity', lastSelectedBar === bar.label ? '1' : '0.25');
        }
        */
      })
      .on('mouseleave', () => {
        if (lastSelectedBar === '' || lastSelectedBarElement === null) {
          markerAndTooltip
            .attr('visibility', 'hidden');
        }
        /*
        // allow hover while there is a selection
        if (lastSelectedBar !== bar.label) {
          markerAndTooltip.attr('visibility', 'hidden');
        }
        if (lastSelectedBarElement !== null) {
          lastSelectedBarElement
            .style('opacity', '1')
            .attr('visibility', 'visible');
        }
        */
      })
      .on('click', function(event: PointerEvent) {
        // prevent the parent svg from hiding this bar
        event.stopPropagation();

        // some bar is being selected, so stop further tooltip hover
        lastSelectedBar = bar.label;
        lastSelectedBarElement = markerAndTooltip;

        onHover(bar.label);
      })
    ;
  });
}

function renderAxes(
  selection: D3GElementSelection,
  xScale: d3.ScaleBand<string>,
  yScale: d3.ScaleLinear<number, number>,
  // The type of value can't be more specific than `any`
  //  because under the hood d3.tickFormat requires d3.NumberType.
  // It correctly converts, but its TypeScript definitions don't
  //  seem to reflect that.
  valueFormatter: (value: any) => string,
  width: number,
  height: number,
  yAxisWidth: number,
  paddingRight: number,
  xAxisHeight: number
) {
  const xAxis = d3.axisBottom(xScale);
  const numBars = xScale.domain().length;

  // const yAxisTicks = _.range(0, yScale.domain()[1] + 1);
  // alternatively to using a specific number of ticks,
  //  we can control exactly what ticks to be visible by utilizing the tickValues
  const yAxis = d3
    .axisLeft(yScale)
    .tickSize(width - yAxisWidth - paddingRight)
    .tickFormat(valueFormatter)
    // .tickValues(yAxisTicks)
    .ticks(Y_AXIS_MAX_TICK_COUNT)
  ;
  const renderedXAxis = selection
    .append('g')
    .classed('xAxis', true)
    .style('pointer-events', 'none')
    .call(xAxis)
    .attr('transform', translate(0, height - xAxisHeight))
  ;

  // rotate axis ticks if number bars are too many
  // alternatively, should bar label on hover
  if (numBars > MAX_BAR_COUNT_BEFORE_TICK_ROTATION) {
    renderedXAxis.selectAll('text')
      .style('text-anchor', 'end')
      .attr('dx', '-.8em')
      .attr('dy', (-40 / numBars) + 'em')
      .attr('transform', function () {
        return 'rotate(-90)';
      });
  }

  selection
    .append('g')
    .classed('yAxis', true)
    .style('pointer-events', 'none')
    .call(yAxis)
    .attr('transform', translate(width - paddingRight, 0))
  ;
}

function updateHover(selection: D3Selection, barLabel: string) {
  // search for the target tooltip within this chart selection
  //  to find a bar given its label/id and update its visibility
  // special case: if empty barLabel is provided, then hide all bars
  selection.selectAll('.markerAndTooltip').attr('visibility', 'hidden');
  if (barLabel !== '') {
    selection.select('#' + getHoverIdFromValue(barLabel))
      .attr('visibility', 'visible')
      .style('opacity', '1');
  }
}

export {
  renderBarChart,
  updateHover
};
