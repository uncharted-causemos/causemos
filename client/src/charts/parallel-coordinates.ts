
import * as d3 from 'd3';
import svgUtil from '@/utils/svg-util';

import { D3Selection, D3Scale, D3ScaleLinear, D3ScalePoint } from '@/types/D3';
import { DimensionData, ScenarioData } from '@/types/Datacubes';
import { ParallelCoordinatesOptions } from '@/types/ParallelCoordinates';

//
// custom data types
//
interface BrushType {
  dimName: string;
  start: string | number;
  end: string | number;
}

type D3ScaleFunc = (name: string) => D3Scale | undefined;

type D3LineSelection = d3.Selection<SVGPathElement, ScenarioData, null, undefined>;
type D3AxisSelection = d3.Selection<SVGGElement, DimensionData, SVGGElement, any>

//
// global properties
//
const margin = { top: 30, right: 25, bottom: 35, left: 35 };

const lineStrokeWidthNormal = 2;
const lineStrokeWidthSelected = 4;
const lineStrokeWidthHover = 3;

const lineOpacityVisible = 1;
const lineOpacityHidden = 0.1;

const lineColor = '#296AE9ff';

const highlightDuration = 100; // in milliseconds

// this is a hack to make the axis data look larger than it actually is
const enlargeAxesScaleToFitData = false;

const tooltipRectPadding = 4;
const lineHoverTooltipTextBackgroundColor = 'green';
const lineSelectionTooltipTextBackgroundColor = 'yellow';
// when brush selection on an axis is added, such range is shown on a tooltip that
//  alwats placed at the far right of the axis with some specific offset
const selectionTooltipXOffset = 30; // FIXME: this should be centered in the axis
const selectionTooltipNormalYOffset = 30;

const baselineMarkerSize = 5;
const baselineMarkerFill = 'brown';
const baselineMarkerStroke = 'white';

const axisLabelOffsetX = 10;
const axisLabelOffsetY = 5;
const axisLabelFontSize = '12px';
const axisLabelFontWeight = 'bold';
const axisLabelTextAnchor = 'start';
const axisInputLabelFillColor = 'black';
const axisOutputLabelFillColor = 'green';

const axisTickLabelFontSize = '12';
const axisTickLabelOffset = '20'; // FIXME: this should be dynamic based on the word size

const brushHeight = 8;

const numberFormat = d3.format(',.2f');


//
// utility functions
//

// exclude drilldown parameters from the input dimensions
// @REVIEW this may better be done external to the PC component
const filterDrilldownDimensionData = (dimensions: Array<DimensionData>) => {
  return dimensions.filter(function(d) { return d.type !== 'drilldown'; });
};

// attempt to determine types of each dimension based on first row of data
const toType = (v: string | number) => {
  // @ts-ignore
  return ({}).toString.call(v).match(/\s([a-zA-Z]+)/)[1].toLowerCase();
};
const toTypeCoerceNumbers = (v: string | number) => {
  // if the following condition is === instead of == then all numeric dimensions will be detected as ordinal
  // eslint-disable-next-line eqeqeq
  if ((parseFloat(v as string) == v) && (v !== null)) {
    return 'number';
  }
  return toType(v);
};
const detectDimensionTypes = (data: ScenarioData) => {
  // populate a map where keys are the dimension names and values are the corresponding data type (e.g., 'string', 'number')
  const types: {[key: string]: string} = {};
  Object.keys(data)
    .forEach(function(col) {
      types[col] = toTypeCoerceNumbers(data[col]);
    });
  return types;
};

const cancelPrevLineSelection = (svgElement: D3Selection) => {
  svgElement.selectAll('.line')
    .classed('selected', false)
    .transition().duration(highlightDuration)
    .style('opacity', lineOpacityHidden)
    .attr('stroke-width', lineStrokeWidthNormal);

  // hide tooltips
  d3.selectAll('.pc-selection-tooltip-text')
    .attr('visibility', 'hidden');
  d3.selectAll('.pc-selection-tooltip-text-bkgnd-rect')
    .attr('visibility', 'hidden');
};

// utility func to check for any existing brushes that filter any of the dimensions
const getNumberOfBrushes = (pcTypes: { [key: string]: string }) => {
  let brushesCount = 0;
  d3.selectAll<SVGGraphicsElement, DimensionData>('.pc-brush')
    .each(function() {
      const b = d3.select(this);
      const dimName = b.attr('id');
      let validBrushSelection;
      if (pcTypes[dimName] !== 'string') {
        validBrushSelection = d3.brushSelection(this) !== null;
      } else {
        const selectedBrush = b.select('.selected');
        validBrushSelection = !selectedBrush.empty();
      }
      if (validBrushSelection) {
        brushesCount++;
      }
    });
  return brushesCount;
};

// utility function to re-calculate the bbox for each axis tooltip and update the rect
const updateHoverToolTipsRect = (renderedAxes: D3AxisSelection) => {
  renderedAxes
    .each(function() {
      const rect = d3.select(this).select('.pc-hover-tooltip-text-bkgnd-rect');
      const text = d3.select(this).select('.pc-hover-tooltip-text');
      const textNode = text.node() as SVGGraphicsElement;
      const textBBox = textNode.getBBox();
      rect
        .attr('x', textBBox.x - tooltipRectPadding)
        .attr('y', textBBox.y - tooltipRectPadding)
        .attr('width', textBBox.width + tooltipRectPadding * 2)
        .attr('height', textBBox.height + tooltipRectPadding * 2);
      text.raise();
    });
};

const getRandom = (min: number, max: number) => {
  return Math.random() * (max - min) + min;
};

const getPositionRangeOnOrdinalAxis = (xPos: number, axisRange: Array<number>, axisDomain: number[] | string[], val: string | number) => {
  const totalDashesAndGaps = (axisDomain.length * 2) - 1;
  const dashSize = (axisRange[1] - axisRange[0]) / totalDashesAndGaps;
  let min;
  if (xPos === axisRange[0]) {
    min = axisRange[0];
  } else {
    // need to get the dash offset based on value index
    const valIndx = axisDomain.findIndex((v: string | number) => v === val);
    min = axisRange[0] + valIndx * dashSize * 2;
  }
  const max = min + dashSize;
  return { min, max };
};

const createScales = (
  data: Array<ScenarioData>,
  dimensions: Array<DimensionData>,
  ordinalDimensions: Array<string>,
  pcTypes: { [key: string]: string },
  axisRange: Array<number>,
  height: number) => {
  //
  const x: {[key: string]: D3ScaleFunc} = {};

  const defaultScales: {[key: string]: D3ScaleFunc} = {
    /*
    // we may need to suppprt additional data types such as date/time later
    date: function(name: string) {
      return d3.scaleTime()
        .domain(d3.extent(data, function(d) {
          return d[name] ? d[name].getTime() : null;
        }))
        .range(axisRange);
    },
    */
    number: function(name: string) {
      const dataExtent = d3.extent(data.map(point => +point[name]));
      if (dataExtent[0] === undefined || dataExtent[0] === undefined) {
        console.error('Unable to derive extent from data', data);
        return undefined;
      }
      // extend the domain of each axis to ensure a nice scale rendering
      if (enlargeAxesScaleToFitData) {
        const scaleDomainDiff = dataExtent[1] - dataExtent[0];
        const scaleDomainUnit = scaleDomainDiff / 10;
        const leftValue = dataExtent[0] - scaleDomainUnit;
        const rightValue = dataExtent[1] + scaleDomainUnit;
        dataExtent[0] = leftValue;
        dataExtent[1] = rightValue;
      }
      return d3.scaleLinear()
        .domain(dataExtent)
        .range(axisRange);
    },
    string: function(name: string) {
      let dataExtent = data.map(function(p) { return p[name]; }) as Array<string>; // note this will return an array of values for all runs
      // this is only needed because of transforming specific dimensions to be ordinal
      //  TEMP: the goal here is to re-order the items in the list,
      //        and this is specific for rainfall_multiplier
      if (name === 'rainfall_multiplier') {
        if (ordinalDimensions && Array.isArray(ordinalDimensions) && ordinalDimensions.includes(name)) {
          dataExtent = dataExtent.filter(function(item, pos) {
            return dataExtent.indexOf(item) === pos;
          });
          dataExtent = dataExtent.reverse();
        }
      }

      // extend the domain of each axis to ensure a nice scale rendering
      if (enlargeAxesScaleToFitData) {
        dataExtent.push('dummay-last');
        dataExtent.unshift('dummy-first');
      }
      return d3.scalePoint()
        .domain(dataExtent)
        .range(axisRange)
        // .padding(0.25) // a percet of the axis step() (i.e., segment)
      ;
    }
  };

  // force some dimensions to be ordinal, if requested
  if (ordinalDimensions && Array.isArray(ordinalDimensions)) {
    ordinalDimensions.forEach(dimName => {
      pcTypes[dimName] = 'string';
    });
  }

  // For each dimension, I build a linear scale. I store all in a x object
  for (const i in dimensions) {
    const name = dimensions[i].name;
    x[name] = defaultScales[pcTypes[name]];
  }

  // Build the y scale -> it find the best position (vertically) for each x axis
  const y = d3.scalePoint()
    .range([0, height])
    .domain(dimensions.map(d => d.name));

  return { x, y };
};

export default function(
  svgElement: D3Selection,
  options: ParallelCoordinatesOptions,
  data: Array<ScenarioData>,
  dimensions: Array<DimensionData>, // dimensions list, which may be used to control axis order
  ordinalDimensions: Array<string>, // list of dimensions that should be presented as ordinal axis regardless of their actual data type
  onLinesSelection: (selectedLines: Array<ScenarioData>) => void
) {
  // set graph configurations
  const rightPaddingForAxesLabels = options.width / 4; // dedicte 25% of available width for dimension labels

  const width = options.width - margin.left - margin.right - rightPaddingForAxesLabels;
  const height = options.height - margin.top - margin.bottom;

  const selectedLines: Array<ScenarioData> = [];
  const brushes: Array<BrushType> = [];

  //
  // exclude drilldown/filter axes from being rendered in the PCs
  //
  dimensions = filterDrilldownDimensionData(dimensions);

  // process data and detect data type for each dimension
  const pcTypes = detectDimensionTypes(data[0]);

  //
  // scales
  /// map of x axes by dimension name
  //
  const axisRange = [0, width];
  const { x, y } = createScales(data, dimensions, ordinalDimensions, pcTypes, axisRange, height);

  //
  // Color scale
  //
  /// currently support single color
  const color = () => { return lineColor; };
  /// later: support a color scale
  // const color = d3.scaleOrdinal() // scaleLinear
  // .domain(axisDomain)
  // .range([lineColor])
  // .interpolate(d3.interpolateLab)
  // ;

  //
  // append the svg object to the body of the page
  //
  const gElement = svgElement
    .attr('width', options.width)
    .attr('height', options.height)
    .on('click', handleLineSelection)
    .append('g')
    .attr('transform', svgUtil.translate(margin.left, margin.top))
    ;

  // The path function take a row of the csv as input,
  //  and return x and y coordinates of the line to draw for this raw.
  // NOTE: for ordinal axes, lines would map to any part of the line segment based on the input value
  const path = function(d: ScenarioData) {
    const line = d3.line()
      // curveMonotone curveCatmullRom curveLinear curveCardinal
      .curve(d3.curveCatmullRom /* .tension(0.01) */);
    const fn = dimensions.map(function(p: DimensionData) {
      const dimName = p.name;
      const scaleX = x[dimName](dimName) as D3Scale;
      const val = d[dimName];
      let xPos = scaleX(val as any) as number;
      if (pcTypes[dimName] === 'string') {
        // ordinal axis, so instead of mapping to one position in this segment,
        // lets attempt to distribute the values randomly on the segment
        // first, get the segment range
        const { min, max } = getPositionRangeOnOrdinalAxis(xPos, axisRange, scaleX.domain(), val);
        xPos = getRandom(min, max);
      }
      const yPos = y(dimName);
      return [xPos, yPos];
    }) as Array<[number, number]>;
    return line(fn);
  };

  //
  // Draw the lines
  //
  gElement
    .selectAll<SVGPathElement, ScenarioData>('myPath')
    .data(data)
    .enter()
    .append('path')
    .attr('class', function () { return 'line '; })
    .attr('d', path)
    .style('fill', 'none')
    .attr('stroke-width', lineStrokeWidthNormal)
    .style('stroke', function() { return (color(/* d.dimName */)); })
    .style('opacity', lineOpacityHidden)
    .on('mouseover', highlight)
    .on('mouseleave', doNotHighlight)
    .on('click', handleLineSelection);

  //
  // Draw the axes
  //
  const renderedAxes = gElement.selectAll('axis')
  // For each dimension of the dataset I add a 'g' element:
    .data(dimensions)
    .enter()
    .append('g')
    .attr('class', 'axis')
    .attr('transform', function(d) {
      // I translate this element to its correct position on the y axis
      return svgUtil.translate(0, y(d.name));
    })
    .each(function(d) {
      // And I build the axis with the call function
      const dimName = d.name;
      const scale = x[dimName](dimName) as D3Scale;
      let xAxis;
      if (pcTypes[dimName] === 'number') {
        //
        // numeric axes are built automatically utilizing d3 .call() function
        //
        const linearScale = scale as D3ScaleLinear;
        const axisGenerator = d3.axisBottom(linearScale).tickValues(linearScale.ticks(0).concat(linearScale.domain()));
        xAxis = d3.select(this).call(axisGenerator);
      } else {
        //
        // ordinal axes are built in a custom way by injecting gaps between the ordinal values
        //
        const pointScale = scale as D3ScalePoint;
        const allTickValues = scale.domain() as string[];
        // only consider first and last ticks
        const tickValues = [allTickValues[0], allTickValues[allTickValues.length - 1]];
        const axisGenerator = d3.axisBottom(pointScale).tickValues(tickValues);
        // start by generating a standard axis (which will automatically add many things)
        xAxis = d3.select(this).call(axisGenerator);
        // remove the rendered line and replace by a custom axis with gaps
        xAxis.selectAll('path.domain').remove();
        xAxis.selectAll('.tick line').remove();

        // Figure out how big each dash should be
        const axisDomain = scale.domain();
        // const gapFraction = 0.5; // The portion of the line that should be a gap
        const totalDashesAndGaps = (axisDomain.length * 2) - 1; // each step (value) consists of a dash and a gap
        const total = (axisRange[1] - axisRange[0]) / totalDashesAndGaps;// scale.step(); // scale(axisDomain[1]) - scale(axisDomain[0]);
        const dash = total; //  * (1 - gapFraction);
        const gap = total; // * gapFraction - (dash / 2);

        xAxis.append('line')
          .classed('domain', true)
          .attr('x1', axisRange[0])
          .attr('x2', axisRange[1])
          .attr('y1', 0)
          .attr('y2', 0)
          .attr('stroke', 'black') // standard axis color
          .attr('stroke-dasharray', dash + ',' + gap)
        ;
      }
      // shift the tick labels for the min/max values to be outside the axis line
      xAxis.selectAll('.tick:first-of-type text')
        .attr('transform', svgUtil.translate(-axisTickLabelOffset, 0))
        .attr('font-size', axisTickLabelFontSize);
      xAxis.selectAll('.tick:last-of-type text')
        .attr('transform', svgUtil.translate(axisTickLabelOffset, 0))
        .attr('font-size', axisTickLabelFontSize);
      return xAxis;
    });

  //
  // brushing
  //
  // Add and store a brush for each axis.
  renderedAxes
    .append('g')
    .attr('class', 'pc-brush')
    .attr('id', function(d) { return d.name; })
    .each(function(d) {
      const dimName = d.name;
      if (pcTypes[dimName] !== 'string') {
        // a standard continuous brush
        d3.select(this).call(
          d3.brushX()
            .extent([[0, -brushHeight], [axisRange[1], brushHeight]])
            .on('start', brushstart)
            .on('brush', onDataBrush)
            .on('end', brushEnd)
        );
      } else {
        // special brushes for ordinal axes
        const xScale = x[dimName](dimName) as D3Scale;
        const xScaleDomain = xScale.domain();
        const totalDashesAndGaps = (xScaleDomain.length * 2) - 1;
        const dashSize = (axisRange[1] - axisRange[0]) / totalDashesAndGaps;
        const segmentsData = [];
        const segmentsY = -brushHeight;
        const segmentsHeight = brushHeight * 2;
        for (let segmentIndx = 0; segmentIndx < totalDashesAndGaps; segmentIndx++) {
          if (segmentIndx % 2 === 0) { // only consider the solid segments
            const min = segmentIndx * dashSize; // do not want sub-pixel to avoid floating point issues with d3.bisect
            segmentsData.push({
              x: min,
              start: xScaleDomain[segmentIndx - (segmentIndx / 2)],
              end: xScaleDomain[segmentIndx - (segmentIndx / 2)]
            });
          }
        }
        const gElement = d3.select(this);
        gElement
          .selectAll('rect')
          .data(segmentsData)
          .enter()
          .append('rect')
          .attr('class', 'overlay')
          .attr('id', dimName)
          .attr('start', function(d) { return d.start; })
          .attr('end', function(d) { return d.end; })
          .attr('pointer-events', 'all')
          .attr('cursor', 'pointer')
          .attr('x', function(d) { return d.x; })
          .attr('y', segmentsY)
          .attr('width', dashSize)
          .attr('height', segmentsHeight)
          .on('click', brushEnd)
        ;
      }
    });

  //
  // baseline defaults
  //
  if (options.showBaselineDefaults) {
    renderedAxes
      .filter(function(d) { return d.default !== undefined; })
      .append('circle')
      .style('stroke', baselineMarkerStroke)
      .style('fill', baselineMarkerFill)
      .attr('r', baselineMarkerSize)
      .attr('cx', function(d) {
        const axisDefault = d.default;
        const dimName = d.name;
        const scaleX = x[dimName](dimName) as D3Scale;
        let xPos: number = scaleX(axisDefault as any) as number;
        if (pcTypes[dimName] === 'string') {
          const { min, max } = getPositionRangeOnOrdinalAxis(xPos, axisRange, scaleX.domain(), axisDefault);
          xPos = min + (max - min) / 2;
        }
        return xPos;
      })
      .attr('cy', 0);
  }

  //
  // axis labels
  //

  // Add label for each axis name
  const axesLabels = renderedAxes
    .append('text')
    .attr('class', 'pc-axis-name-text')
    .style('text-anchor', axisLabelTextAnchor)
    .attr('x', width + axisLabelOffsetX)
    .attr('y', axisLabelOffsetY)
    .text(function(d) { return d.name; })
    .style('fill', function(d) { return d.type === 'output' ? axisOutputLabelFillColor : axisInputLabelFillColor; })
    .style('font-size', axisLabelFontSize)
    .style('font-weight', axisLabelFontWeight);

  // add descriptive title (i.e., embedded tooltip) for each axis name
  // first start with dimension names as the desc, then update in a later step
  const titles = axesLabels
    .append('title')
    .text((d) => d.name);
  titles
    .data(dimensions.map(d => d.description))
    .text((d) => d);

  // add background rect for each axis name
  renderedAxes
    .append('rect')
    .attr('class', 'pc-axis-name-text-bkgnd-rect')
    .style('fill', 'white')
    .attr('x', 0)
    .attr('y', 0)
    .attr('width', 10)
    .attr('height', 10);

  // calculate the bbox for each axis name and update the rect
  renderedAxes
    .each(function() {
      const rect = d3.select(this).select('.pc-axis-name-text-bkgnd-rect');
      const text = d3.select(this).select('.pc-axis-name-text');
      const textNode = text.node() as SVGGraphicsElement;
      const textBBox = textNode.getBBox();
      rect
        .attr('x', textBBox.x)
        .attr('y', textBBox.y)
        .attr('width', textBBox.width)
        .attr('height', textBBox.height);
      text.raise();
    });

  //
  // hover tooltips
  //

  // Add label for each axis tooltip
  renderedAxes
    .append('text')
    .attr('class', 'pc-hover-tooltip-text')
    .attr('id', function(d) { return d.name; }) // name of the dimension
    .style('text-anchor', 'start')
    .attr('x', 0)
    .attr('y', -10)
    .text('000')
    .style('fill', 'white')
    .attr('visibility', 'hidden')
    .style('font-size', '16px');


  // add background rect for each axis tooltip
  renderedAxes
    .append('rect')
    .attr('class', 'pc-hover-tooltip-text-bkgnd-rect')
    .attr('id', function(d) { return d.name; }) // name of the dimension
    .style('fill', lineHoverTooltipTextBackgroundColor)
    .attr('rx', 8)
    .attr('ry', 8)
    .attr('x', 0)
    .attr('y', 0)
    .attr('width', 10)
    .attr('height', 20)
    .attr('visibility', 'hidden');

  //
  // selection (i.e., selected line) tooltips
  //

  // Add label for each axis tooltip
  renderedAxes
    .append('text')
    .attr('class', 'pc-selection-tooltip-text')
    .attr('id', function(d) { return d.name; }) // name of the dimension
    .style('text-anchor', 'start')
    .attr('x', 0)
    .attr('y', selectionTooltipNormalYOffset)
    .text('000')
    .style('fill', 'black')
    .attr('visibility', 'hidden')
    .style('font-size', '16px');

  // add background rect for each axis tooltip
  renderedAxes
    .append('rect')
    .attr('class', 'pc-selection-tooltip-text-bkgnd-rect')
    .attr('id', function(d) { return d.name; }) // name of the dimension
    .style('fill', lineSelectionTooltipTextBackgroundColor)
    .attr('rx', 8)
    .attr('ry', 8)
    .attr('x', 0)
    .attr('y', 0)
    .attr('width', 10)
    .attr('height', 20)
    .attr('visibility', 'hidden');

  //
  // select default run, if requested
  //
  if (options.applyDefaultSelection) {
    const initialSelectedRunData = data[0];
    svgElement.selectAll('.line')
      .data(data)
      .filter(function(d) { return d.id === initialSelectedRunData.id; })
      .each(function(d) {
        const lineElement = this as SVGPathElement;
        handleLineSelection.bind(lineElement)(undefined /* event */, d);
      });
  }

  // ////////////////////////////////////////////////
  // additional context-sensitive utility functions
  // ////////////////////////////////////////////////

  function brushstart(event: d3.D3BrushEvent<any>) {
    event.sourceEvent.stopPropagation();
  }

  function onDataBrush(this: SVGElement) {
    // now filter all lines and exclude those the fall outside the range (start, end)
    cancelPrevLineSelection(svgElement);

    // examine all brushes at all axes and cache their range
    d3.selectAll<SVGGraphicsElement, DimensionData>('.pc-brush')
      .each(function() {
        const b = d3.select(this);
        const dimName = b.attr('id');
        let selection: [number | string, number | string] | undefined;
        if (pcTypes[dimName] !== 'string') { // different axes types (e.g., ordinal) have different brushing techniques
          selection = d3.brushSelection(this) as [number, number];
        } else {
          // find any selection on this ordinal axis
          const selectedBrush = b.select('.selected');
          if (!selectedBrush.empty()) {
            const s = selectedBrush.attr('start');
            const e = selectedBrush.attr('end');
            selection = [s, e];
          }
        }
        if (selection) {
          const xScale = x[dimName](dimName) as D3Scale;
          let start;
          let end;
          const skip = false;
          if (pcTypes[dimName] === 'number') {
            start = (xScale as D3ScaleLinear).invert(selection[0] as number);
            end = (xScale as D3ScaleLinear).invert(selection[1] as number);
          } else {
            start = selection[0];
            end = selection[1];
          }
          if (!skip) {
            brushes.push({
              dimName,
              start,
              end
            });
          }
        }
      });
    // do not select all lines if no axis is brushed
    if (brushes.length === 0) {
      return;
    }

    // check lines against brushes
    const lineSelectionMap: { [key: string]: {selected: boolean; data: ScenarioData} } = {};
    svgElement.selectAll('.line')
      .data(data)
      .each(function(lineData) {
        // initially each line is selected
        lineSelectionMap[lineData.id] = { selected: true, data: lineData };

        for (const b of brushes) {
          // if line falls outside of this brush, then it is de-selected
          if (pcTypes[b.dimName] === 'number') {
            if (lineData[b.dimName] < b.start || lineData[b.dimName] > b.end) {
              lineSelectionMap[lineData.id].selected = false;
            }
          } else if (pcTypes[b.dimName] === 'string') {
            if (lineData[b.dimName] !== b.start && lineData[b.dimName] !== b.end) {
              lineSelectionMap[lineData.id].selected = false;
            }
          }
          if (!lineSelectionMap[lineData.id].selected) {
            break; // do not check remaining brushes
          }
        }

        if (lineSelectionMap[lineData.id].selected) {
          const selectedLine = d3.select<SVGPathElement, ScenarioData>(this as SVGPathElement);

          selectLine(selectedLine, undefined /* event */, lineData, lineStrokeWidthNormal);
          // save selected line
          selectedLines.push(lineData);
        }
      });

    // reset the cached brush ranges
    const selectedLine = d3.select<SVGPathElement, ScenarioData>(this as SVGPathElement);
    updateSelectionTooltips(selectedLine);
    brushes.length = 0;
  }

  function brushEnd(this: SVGGraphicsElement, event: PointerEvent | d3.D3BrushEvent<any>) {
    // this may be coming because of a click on an ordinal axis,
    //  so prevent the global svg click from deselecting lines
    // eslint-disable-next-line no-prototype-builtins
    const evt = event.hasOwnProperty('sourceEvent') ? (event as d3.D3BrushEvent<any>).sourceEvent : event;
    evt.stopPropagation();

    const brushParentElement = d3.select(this.parentElement);
    const dimName = brushParentElement.attr('id');
    if (pcTypes[dimName] === 'string') {
      const rect = d3.select(this);

      // if currently selected? then toggle
      const selected = !rect.classed('selected');

      brushParentElement.selectAll('*')
        .classed('selected', false)
        .classed('selection', false)
      ;
      rect.classed('selected', selected); // to track that something is selected
      rect.classed('selection', selected); // for visual styling
    }

    selectedLines.length = 0; // reset before identifying selected lines
    onDataBrush.bind(this, event)();

    // notify external listeners
    onLinesSelection(selectedLines);
  }

  // utility function to re-calculate the bbox for each axis tooltip and update the rect
  function updateSelectionToolTipsRect(svgElement: D3Selection) {
    svgElement.selectAll('.axis')
      .each(function() {
        const rect = d3.select(this).select('.pc-selection-tooltip-text-bkgnd-rect');
        const text = d3.select(this).select('.pc-selection-tooltip-text');
        const textNode = text.node() as SVGGraphicsElement;
        const textBBox = textNode.getBBox();
        rect
          .attr('x', textBBox.x - tooltipRectPadding)
          .attr('y', textBBox.y - tooltipRectPadding)
          .attr('width', textBBox.width + tooltipRectPadding * 2)
          .attr('height', textBBox.height + tooltipRectPadding * 2);
        text.raise();
      });
  }

  // update the tooltip text labels for the selected line
  function updateSelectionTooltips(selectedLine: D3LineSelection) {
    const selectedLineData = selectedLine.datum();
    // show tooltips
    // first update their text and position based on selected line data
    // then make them visible
    d3.selectAll<SVGTextElement, DimensionData>('.pc-selection-tooltip-text')
      .each(function(d) {
        const dimName = d.name;
        let isTooltipVisible = 'visible';
        let value: string | number = '';
        let xPos: number;
        // override the tooltip content if there is a brush applied to this dimension
        if (brushes.length > 0) {
          isTooltipVisible = 'hidden';
          const brushRange = brushes.find(b => b.dimName === dimName);
          if (brushRange) {
            if (pcTypes[dimName] === 'number') {
              value = numberFormat(brushRange.start as number) + ' : ' + numberFormat(brushRange.end as number);
            } else {
              value = brushRange.start + ' : ' + brushRange.end;
            }
            isTooltipVisible = 'visible';
          }
          xPos = selectionTooltipXOffset; // + axisRange[1]; // always at the far right
        } else {
          value = selectedLineData[dimName];
          if (pcTypes[dimName] === 'number') {
            value = numberFormat(value as number);
          }
          const xScaleDim = x[dimName];
          const xScale = xScaleDim(dimName) as D3Scale;
          xPos = xScale(value as any) as number;
        }

        const yPos = selectionTooltipNormalYOffset;
        const renderedText = d3.select(this);
        renderedText
          .text(value)
          .attr('visibility', isTooltipVisible)
          .attr('x', xPos)
          .attr('y', yPos)
        ;
      });

    d3.selectAll<SVGRectElement, DimensionData>('.pc-selection-tooltip-text-bkgnd-rect')
      .each(function(d) {
        const dimName = d.name;
        let isTooltipVisible = 'visible';
        const value = selectedLineData[dimName];
        if (brushes.length > 0) {
          isTooltipVisible = 'hidden';
        }
        const brushRange = brushes.find(b => b.dimName === dimName);
        if (brushRange) {
          isTooltipVisible = 'visible';
        }
        const renderedTextRect = d3.select<SVGRectElement, ScenarioData>(this);
        renderedTextRect
          .attr('visibility', isTooltipVisible)
          .attr('x', function() {
            const xScaleDim = x[dimName];
            const xScale = xScaleDim(dimName) as D3Scale;
            return xScale(value as any) as number;
          });
      });

    updateSelectionToolTipsRect(svgElement);
  }

  function selectLine(selectedLine: D3LineSelection, event: PointerEvent | undefined, d: ScenarioData, lineWidth: number) {
    const selectedLineData = selectedLine.datum();

    if (selectedLineData) {
      // Use D3 to select the line, change color and size
      selectedLine
        .classed('selected', true)
        .transition().duration(highlightDuration)
        .style('stroke', color(/* selectedLineData.dimName */))
        .style('opacity', lineOpacityVisible)
        .attr('stroke-width', lineWidth);

      // since a line is just select, prevent other higher up elements (e.g. svg) from cancelling this selection
      if (event) {
        event.stopPropagation();
      }
    }
  }

  // select the line clicked by the user
  // or deselect all lines when the svg element is clicked
  function handleLineSelection(this: SVGPathElement | HTMLElement, event: PointerEvent | undefined, d: ScenarioData) {
    // when the user have an active brush,
    //  selecting a line outside that brush range will not remove the existing brush
    //  and the newly clicked line will be ignored because it is outside the brush
    //  i.e., prevent selection outside of the brushes
    if (getNumberOfBrushes(pcTypes) === 0) {
      // cancel any previous selection; turn every line into grey
      cancelPrevLineSelection(svgElement);

      const selectedLine = d3.select<SVGPathElement, ScenarioData>(this as SVGPathElement);
      selectLine(selectedLine, event, d, lineStrokeWidthSelected);

      const selectedLineData = selectedLine.datum() as ScenarioData;

      // if we have valid selection (either by direct click on a line or through brushing)
      //  then update the tooltips
      if (selectedLineData) {
        updateSelectionTooltips(selectedLine);
      }

      // notify external listeners
      onLinesSelection([selectedLineData]);
    }
  }

  // Highlight the line that is hovered
  function highlight(this: SVGPathElement) {
    const selectedLine = d3.select(this);
    const selectedLineData = selectedLine.datum() as ScenarioData;
    // first every line turns grey (except any current selection)
    svgElement.selectAll('.line')
      .filter(function() { return d3.select(this).classed('selected') === false; })
      .transition().duration(highlightDuration)
      .style('opacity', lineOpacityHidden);

    // Use D3 to select the line, change color and size
    selectedLine
      .filter(function() { return d3.select(this).classed('selected') === false; })
      .transition().duration(highlightDuration)
      .style('stroke', color(/* selectedLineData.dimName */))
      .attr('stroke-width', lineStrokeWidthHover)
      .style('opacity', lineOpacityVisible);

    // show tooltips
    // first update their text and position based on selected line data
    // then make them visible
    d3.selectAll<SVGTextElement, DimensionData>('.pc-hover-tooltip-text')
      .each(function(d) {
        const dimName = d.name;
        let value = selectedLineData[dimName];
        if (pcTypes[dimName] === 'number') {
          value = numberFormat(value as number);
        }
        const renderedText = d3.select(this);
        renderedText
          .text(value)
          .attr('visibility', 'visible')
          .attr('x', function() {
            const xScaleDim = x[dimName];
            const xScale = xScaleDim(dimName) as D3Scale;
            return xScale(value as any) as number;
          });
      });

    d3.selectAll<SVGRectElement, DimensionData>('.pc-hover-tooltip-text-bkgnd-rect')
      .each(function(d) {
        const dimName = d.name;
        const value = selectedLineData[dimName];
        const renderedTextRect = d3.select(this);
        renderedTextRect
          .attr('visibility', 'visible')
          .attr('x', function() {
            const xScaleDim = x[dimName];
            const xScale = xScaleDim(dimName) as D3Scale;
            return xScale(value as any) as number;
          });
      });

    updateHoverToolTipsRect(renderedAxes);
  }

  // Unhighlight
  function doNotHighlight() {
    // reset all lines to full opacity except
    svgElement.selectAll('.line')
      .filter(function() { return d3.select(this).classed('selected') === false; })
      .transition().duration(highlightDuration)
      .style('stroke', function () { return (color()); })
      .style('opacity', lineOpacityHidden);

    // hide tooltips
    d3.selectAll('.pc-hover-tooltip-text')
      .attr('visibility', 'hidden');
    d3.selectAll('.pc-hover-tooltip-text-bkgnd-rect')
      .attr('visibility', 'hidden');
  }
}
