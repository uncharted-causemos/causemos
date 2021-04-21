
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

interface MarkerInfo {
  value: string | number;
  xPos: number;
}

//
// global properties
//
const margin = { top: 40, right: 30, bottom: 35, left: 35 };

const lineStrokeWidthNormal = 2;
const lineStrokeWidthSelected = 4;
const lineStrokeWidthHover = 3;
const lineStrokeWidthMarker = 1.5;

const lineOpacityVisible = 1;
const lineOpacityHidden = 0.1;
const lineMarkerOpacityVisible = 0.5;

const lineColor = '#296AE9ff';

const highlightDuration = 50; // in milliseconds

// this is a hack to make the axis data look larger than it actually is
const enlargeAxesScaleToFitData = false;

const tooltipRectPadding = 4;
const lineHoverTooltipTextBackgroundColor = 'green';
const lineSelectionTooltipTextBackgroundColor = 'yellow';
const selectionTooltipNormalYOffset = 30;

const baselineMarkerSize = 5;
const baselineMarkerFill = 'brown';
const baselineMarkerStroke = 'white';

const axisLabelOffsetX = 0;
const axisLabelOffsetY = -15;
const axisLabelFontSize = '12px';
const axisLabelFontWeight = 'bold';
const axisLabelTextAnchor = 'start';
const axisInputLabelFillColor = 'black';
const axisOutputLabelFillColor = 'green';

const tooltipTextFontSize = '14px';

const axisTickLabelFontSize = '12';
const axisTickLabelOffset = 0; // FIXME: this should be dynamic based on the word size; ignore for now

const brushHeight = 8;

const markerTooltipOffsetX = -10;
const markerTooltipOffsetY = -20;

const numberIntegerFormat = d3.format('~s');
const numberFloatFormat = d3.format(',.2f');

//
// global variables
//
let xScaleMap: {[key: string]: D3ScaleFunc} = {};
let renderedAxes: D3AxisSelection;
let axisRange: Array<number> = [];
let pcTypes: {[key: string]: string} = {};
const axisMarkersMap: {[key: string]: Array<MarkerInfo>} = {};


//
// utility functions
//

// exclude drilldown parameters from the input dimensions
// @REVIEW this may better be done external to the PC component
const filterDrilldownDimensionData = (dimensions: Array<DimensionData>) => {
  return dimensions.filter(function(d) {
    if (d.is_drilldown !== undefined) {
      return !d.is_drilldown;
    }
    return d.type !== 'drilldown';
  });
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
  svgElement.selectAll('.pc-selection-tooltip-text')
    .attr('visibility', 'hidden');
  svgElement.selectAll('.pc-selection-tooltip-text-bkgnd-rect')
    .attr('visibility', 'hidden');
};

// utility function to re-calculate the bbox for each axis tooltip and update the rect
const updateHoverToolTipsRect = (renderedAxes: D3AxisSelection) => {
  renderedAxes
    .each(function() {
      const rect = d3.select(this).select('.pc-hover-tooltip-text-bkgnd-rect');
      const text = d3.select(this).select('.pc-hover-tooltip-text');
      const textNode = text.node() as SVGGraphicsElement;
      const textBBox = textNode.getBBox();
      // if xPos + text-rect-width is beyond the svg width, then adjust
      let xPos = textBBox.x - tooltipRectPadding;
      const width = textBBox.width + tooltipRectPadding * 2;
      const offset = (xPos + width) - axisRange[1];
      if (offset > 0) {
        xPos -= offset;
        text.attr('x', xPos + tooltipRectPadding);
      }
      rect
        .attr('x', xPos)
        .attr('y', textBBox.y - tooltipRectPadding)
        .attr('width', width)
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
  const xScaleMap: {[key: string]: D3ScaleFunc} = {};

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
    xScaleMap[name] = defaultScales[pcTypes[name]];
  }

  // Build the y scale -> it find the best position (vertically) for each x axis
  const y = d3.scalePoint()
    .range([0, height])
    .domain(dimensions.map(d => d.name));

  return { x: xScaleMap, y };
};

const getXScaleFromMap = (dimName: string) => {
  const xScaleDim = xScaleMap[dimName];
  return xScaleDim(dimName) as D3Scale;
};

function renderParallelCoordinates(
  svgElement: D3Selection,
  options: ParallelCoordinatesOptions,
  data: Array<ScenarioData>,
  dimensions: Array<DimensionData>, // dimensions list, which may be used to control axis order
  ordinalDimensions: Array<string>, // list of dimensions that should be presented as ordinal axis regardless of their actual data type
  onLinesSelection: (selectedLines: Array<ScenarioData>) => void,
  onNewRuns: (selectedLines: Array<ScenarioData>) => void
) {
  // set graph configurations
  const rightPaddingForAxesLabels = 0; // options.width / 4; // dedicte 25% of available width for dimension labels

  const width = options.width - margin.left - margin.right - rightPaddingForAxesLabels;
  const height = options.height - margin.top - margin.bottom;

  const selectedLines: Array<ScenarioData> = [];
  const brushes: Array<BrushType> = [];

  //
  // exclude drilldown/filter axes from being rendered in the PCs
  //
  dimensions = filterDrilldownDimensionData(dimensions);

  // process data and detect data type for each dimension
  pcTypes = detectDimensionTypes(data[0]);

  //
  // scales
  /// map of x axes by dimension name
  //
  axisRange = [0, width];
  const { x, y } = createScales(data, dimensions, ordinalDimensions, pcTypes, axisRange, height);
  xScaleMap = x;

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

    // when drawing lines, exclude the last segment to the output variable
    //  if the drawn lines are for potentially new scenarios
    const dimensionSet = options.newRunsMode ? dimensions.filter(function(d) { return d.is_output !== undefined ? !d.is_output : d.type !== 'output'; }) : dimensions;

    const fn = dimensionSet.map(function(p: DimensionData) {
      const dimName = p.name;
      const scaleX = getXScaleFromMap(dimName);
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
  if (!options.newRunsMode) {
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
  }

  //
  // Draw the axes
  //
  renderedAxes = gElement.selectAll('axis')
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
      const scale = getXScaleFromMap(dimName);
      let xAxis;
      if (pcTypes[dimName] === 'number') {
        //
        // numeric axes are built automatically utilizing d3 .call() function
        //
        const linearScale = scale as D3ScaleLinear;
        const ticks = linearScale.ticks(0).concat(linearScale.domain()); // no intermediate ticks; only the min/max
        let d3FormatFunc = numberFloatFormat;
        if (Number.isInteger(ticks[0]) && Number.isInteger(ticks[1])) {
          d3FormatFunc = numberIntegerFormat;
        }
        const axisGenerator = d3.axisBottom(linearScale).tickValues(ticks).tickFormat(d3FormatFunc);
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
  // brushing (normal mode) or markers (new-runs mode)
  //

  // Add and store a brush for each axis.
  if (options.newRunsMode) {
    //
    // special interaction to specify values of interest to generate new runs
    //
    renderedAxes
      .filter(function(d) {
        // exclude the output variable from the ability to add markers to it
        return d.is_output !== undefined ? !d.is_output : d.type !== 'output';
      })
      .append('g')
      .attr('class', 'pc-marker-g')
      .attr('id', function(d) { return d.name; })
      .each(function(d) {
        const gElement = d3.select(this);
        const dimName = d.name;
        axisMarkersMap[dimName] = []; // each axis starts with an empty markers array
        // append a marker overlay (as hidden rect)
        const segmentsY = -brushHeight;
        const segmentsHeight = brushHeight * 2;

        gElement
          .append('rect')
          .attr('class', 'overlay')
          .attr('id', dimName)
          .attr('pointer-events', 'all')
          .attr('x', 0)
          .attr('y', segmentsY)
          .attr('width', axisRange[1])
          .attr('height', segmentsHeight)
          .on('click', function(event) {
            //
            // user just clicked on the axis overlay to add a marker
            //
            const xLoc = d3.pointer(event)[0];
            const xScale = getXScaleFromMap(dimName);
            // Normally we go from data to pixels, but here we're doing pixels to data
            const markerValue = numberFloatFormat((xScale as D3ScaleLinear).invert(xLoc));

            axisMarkersMap[dimName].push({
              value: markerValue,
              xPos: xLoc
            }); // Push data to our array

            const dataSelection = gElement.selectAll<SVGSVGElement, MarkerInfo>('rect') // For new markers
              .data<MarkerInfo>(axisMarkersMap[dimName], d => '' + d.value);

            // add marker rect
            dataSelection
              .enter().append('rect')
              .attr('class', 'pc-marker')
              .attr('id', function() {
                // Create an id for the marker for later removal
                return 'marker-' + markerValue;
              })
              .style('stroke', baselineMarkerStroke)
              .style('fill', baselineMarkerFill)
              .attr('x', function(d) { return d.xPos; })
              .attr('y', segmentsY)
              .attr('width', baselineMarkerSize)
              .attr('height', segmentsHeight)
              .on('click', function(d, i) {
                //
                // user just clicked on a specific marker, so for now it should be deleted
                //
                const markerValue = i.value as number;
                axisMarkersMap[dimName] = axisMarkersMap[dimName].filter(el => el.value !== markerValue);
                gElement.selectAll<SVGSVGElement, MarkerInfo>('.pc-marker') // For existing markers
                  .data<MarkerInfo>(axisMarkersMap[dimName], d => '' + d.value)
                  .exit().remove()
                ;
                // remove all marker tooltips, if any
                gElement.selectAll('text').remove();
                // re-render all the new scenario lines
                renderNewRunsLines();
              })
              .call(d3.drag<SVGRectElement, MarkerInfo>()
                .on('drag', function(event) {
                  let newXPos = d3.pointer(event, this)[0];
                  // limit the movement within the axis range
                  newXPos = newXPos < axisRange[0] ? axisRange[0] : newXPos;
                  newXPos = newXPos > axisRange[1] ? axisRange[1] : newXPos;
                  d3.select(this)
                    .attr('x', newXPos);
                  const mv = numberFloatFormat((xScale as D3ScaleLinear).invert(newXPos));
                  gElement.selectAll('text')
                    .text(mv)
                    .attr('x', newXPos + markerTooltipOffsetX)
                  ;
                })
                .on('end', function(event, d) {
                  let newXPos = d3.pointer(event, this)[0];
                  // limit the movement within the axis range
                  newXPos = newXPos < axisRange[0] ? axisRange[0] : newXPos;
                  newXPos = newXPos > axisRange[1] ? axisRange[1] : newXPos;
                  // update the underlying data
                  const md = axisMarkersMap[dimName].find(m => m.value === d.value);
                  if (md) {
                    md.xPos = newXPos;
                    const mv = numberFloatFormat((xScale as D3ScaleLinear).invert(newXPos));
                    md.value = mv;
                  }
                  d3.select(this)
                    .attr('x', newXPos);
                  // remove all marker tooltips, if any
                  gElement.selectAll('text').remove();
                  // re-render all the new scenario lines
                  renderNewRunsLines();
                }))
              .on('mouseover', function(d, i) {
                // Use D3 to select element, change color and size
                d3.select(this)
                  .style('fill', 'orange');

                const markerValue = numberFloatFormat(i.value as number);

                // Specify where to put label of text
                gElement.append('text')
                  .attr('x', i.xPos + markerTooltipOffsetX)
                  .attr('y', segmentsY + markerTooltipOffsetY)
                  .attr('id', 't' + '-' + Math.floor(+markerValue)) // Create an id for text so we can select it later for removing on mouseout)
                  .style('fill', 'black')
                  .style('font-size', axisLabelFontSize)
                  .text(function() {
                    return markerValue; // Value of the text
                  })
                ;
              })
              .on('mouseout', function(d, i) {
                // Use D3 to select element, change color back to normal
                d3.select(this)
                  .style('fill', baselineMarkerFill);

                const markerValue = Math.floor(i.value as number);

                // Select text by id and then remove
                gElement.select('#t' + '-' + markerValue).remove(); // Remove text location
              })
            ;

            // re-render all the new scenario lines, once a marker is added
            renderNewRunsLines();
          })
        ;
      });
  } else {
    //
    // normal brushing to focus on subset of the data
    //
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
          const xScale = getXScaleFromMap(dimName);
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
            .on('click', onOrdinalAxisClick)
          ;
        }
      });
  }

  //
  // baseline defaults
  //
  renderBaselineMarkers(!!options.showBaselineDefaults);

  //
  // axis labels
  //

  // Add label for each axis name
  const axesLabels = renderedAxes
    .append('text')
    .attr('class', 'pc-axis-name-text')
    .style('text-anchor', axisLabelTextAnchor)
    .attr('x', axisLabelOffsetX)
    .attr('y', axisLabelOffsetY)
    .text(function(d) { return d.display_name; })
    .style('fill', function(d) {
      if (d.is_output !== undefined) {
        return d.is_output ? axisOutputLabelFillColor : axisInputLabelFillColor;
      }
      return d.type === 'output' ? axisOutputLabelFillColor : axisInputLabelFillColor;
    })
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
    .style('font-size', tooltipTextFontSize);


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
    .style('font-size', tooltipTextFontSize);

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
  if (options.initialDataSelection && options.initialDataSelection.length > 0) {
    svgElement.selectAll('.line')
      .data(data)
      .filter(function(d) {
        if (d.run_id) {
          return options.initialDataSelection?.includes(d.run_id as string) as boolean;
        }
        return options.initialDataSelection?.includes(d.id as string) as boolean;
      })
      .each(function(d) {
        const lineElement = this as SVGPathElement;
        handleLineSelection.bind(lineElement)(undefined /* event */, d);
      });
  }

  // ////////////////////////////////////////////////
  // additional context-sensitive utility functions
  // ////////////////////////////////////////////////

  function renderNewRunsLines() {
    //
    // consider dimensions one by one
    //
    const allBrushesMap: {[key: string]: Array<string | number>} = {};
    let someMarkersAdded = false;

    // prepare a map of all markers where a baseline marker is added when no user-marker exists
    dimensions.forEach(dim => {
      const dimName = dim.name;
      const dimDefault = dim.default;
      const dimData = [];
      // exclude output markers
      if (dim.type !== 'output') {
        const markers = axisMarkersMap[dimName];
        // do we have actual user-markers added on this dimension?
        if (markers && markers.length > 0) {
          markers.forEach(marker => {
            dimData.push(marker.value);
          });
          someMarkersAdded = true;
        } else {
          // no markers were added for this dim,
          //  so use the (baseline) default as the marker value
          dimData.push(dimDefault);
        }
        allBrushesMap[dimName] = dimData;
      }
    });

    // utility function that takes a map of markers per dimension and split them
    function spreadKeys(master: {[key: string]: (string | number)[]}, objects: Array<any>): Array<ScenarioData> {
      const masterKeys = Object.keys(master);
      const nextKey = masterKeys.pop();
      const nextValue = master[nextKey as string];
      const newObjects = [];
      for (const value of nextValue) {
        for (const ob of objects) {
          const newObject = Object.assign({ [nextKey as any]: value }, ob);
          newObjects.push(newObject);
        }
      }

      if (masterKeys.length === 0) {
        return newObjects;
      }

      const masterClone = Object.assign({}, master);
      delete masterClone[nextKey as string];
      return spreadKeys(masterClone, newObjects);
    }

    // start a recursive call to split all markers and generate combinations using dimension names as keys
    const newScenarioData: Array<ScenarioData> = spreadKeys(allBrushesMap, [{}]);

    // remove existing lines
    gElement.selectAll('.marker-line').remove();

    if (!someMarkersAdded) {
      // no markers are added, so notify external listeners and return
      onNewRuns([]);
      return;
    }

    // some markers were added, so notify external listeners and draw potential lines
    onNewRuns(newScenarioData);

    gElement
      .selectAll<SVGPathElement, ScenarioData>('myPath')
      .data(newScenarioData)
      .enter()
      .append('path')
      .attr('class', 'marker-line')
      .attr('d', path)
      .style('fill', 'none')
      .attr('stroke-width', lineStrokeWidthMarker)
      .style('stroke', function() { return (color()); })
      .style('opacity', lineMarkerOpacityVisible)
      .style('stroke-dasharray', ('3, 3'))
    ;
  }

  function brushstart(event: d3.D3BrushEvent<any>) {
    event.sourceEvent.stopPropagation();
  }

  function onDataBrush(this: SVGElement) {
    // now filter all lines and exclude those the fall outside the range (start, end)
    cancelPrevLineSelection(svgElement);

    // unfortunately, the use of numberFloatFormat adds comma which makes conversion of the resulted string back to number invalid
    const numberFloatFormatNoComma = d3.format('.2f');

    // examine all brushes at all axes and cache their range
    svgElement.selectAll<SVGGraphicsElement, DimensionData>('.pc-brush')
      .each(function() {
        const b = d3.select(this);
        const dimName = b.attr('id');
        let selection: [number | string, number | string] | undefined;
        if (pcTypes[dimName] !== 'string') { // different axes types (e.g., ordinal) have different brushing techniques
          selection = d3.brushSelection(this) as [number, number];
        } else {
          // find any selection on this ordinal axis
          const selectedBrush = b.select('.selection');
          if (!selectedBrush.empty()) {
            const s = selectedBrush.attr('start');
            const e = selectedBrush.attr('end');
            selection = [s, e];
          }
        }
        if (selection) {
          const xScale = getXScaleFromMap(dimName);
          let start;
          let end;
          const skip = false;
          if (pcTypes[dimName] === 'number') {
            start = numberFloatFormatNoComma((xScale as D3ScaleLinear).invert(selection[0] as number));
            end = numberFloatFormatNoComma((xScale as D3ScaleLinear).invert(selection[1] as number));
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
    svgElement.selectAll('.line')
      .data(data)
      .each(function(lineData) {
        // initially each line is selected
        let isSelected = true;

        for (const b of brushes) {
          // if line falls outside of this brush, then it is de-selected
          if (pcTypes[b.dimName] === 'number') {
            if (+lineData[b.dimName] < +b.start || +lineData[b.dimName] > +b.end) {
              isSelected = false;
            }
          } else if (pcTypes[b.dimName] === 'string') {
            if (lineData[b.dimName] !== b.start && lineData[b.dimName] !== b.end) {
              isSelected = false;
            }
          }
          if (!isSelected) {
            break; // do not check remaining brushes
          }
        }

        if (isSelected) {
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

  function onOrdinalAxisClick(this: SVGGraphicsElement, event: PointerEvent) {
    // this is coming from a click on an ordinal axis,
    //  so prevent the global svg click from deselecting lines
    event.stopPropagation();

    const brushParentElement = d3.select(this.parentElement);
    const rect = d3.select(this);

    // if currently selected? then toggle
    const selected = !rect.classed('selection');

    brushParentElement.selectAll('*')
      .classed('selection', false)
    ;
    rect.classed('selection', selected);

    selectedLines.length = 0; // reset before identifying selected lines
    onDataBrush.bind(this)();

    // notify external listeners
    onLinesSelection(selectedLines);
  }

  function brushEnd(this: SVGGraphicsElement, event: d3.D3BrushEvent<any>) {
    // prevent the global svg click event from deselecting lines
    event.sourceEvent.stopPropagation();

    selectedLines.length = 0; // reset before identifying selected lines
    onDataBrush.bind(this)();

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
        // if xPos + text-rect-width is beyond the svg width, then adjust
        let xPos = textBBox.x - tooltipRectPadding;
        const width = textBBox.width + tooltipRectPadding * 2;
        const offset = (xPos + width) - axisRange[1];
        if (offset > 0) {
          xPos -= offset;
          text.attr('x', xPos + tooltipRectPadding);
        }
        rect
          .attr('x', xPos)
          .attr('y', textBBox.y - tooltipRectPadding)
          .attr('width', width)
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
    svgElement.selectAll<SVGTextElement, DimensionData>('.pc-selection-tooltip-text')
      .each(function(d) {
        const dimName = d.name;
        let isTooltipVisible = 'visible';
        let value: string | number = '';
        let formattedValue: string | number = value;
        let xPos: number;
        const xScale = getXScaleFromMap(dimName);
        // override the tooltip content if there is a brush applied to this dimension
        if (brushes.length > 0) {
          isTooltipVisible = 'hidden';
          const brushRange = brushes.find(b => b.dimName === dimName);
          if (brushRange) {
            if (pcTypes[dimName] === 'number') {
              // note that since brush is a (moving) range then it will mostly have float range
              // but we could check the axis domain to figure out a more accurate data type
              const xScaleDomain = xScale.domain();
              let d3FormatFunc = numberFloatFormat;
              if (Number.isInteger(+xScaleDomain[0]) && Number.isInteger(+xScaleDomain[1])) {
                d3FormatFunc = numberIntegerFormat;
              }
              value = d3FormatFunc(brushRange.start as number) + ' : ' + d3FormatFunc(brushRange.end as number);
            } else {
              value = brushRange.start + ' : ' + brushRange.end;
            }
            isTooltipVisible = 'visible';
            formattedValue = value;
          }
          // always show the brush tooltip centered on the axis
          const centerAxisXPos = (axisRange[1] - axisRange[0]) / 2;
          // adjust center based on the brush width
          const brushTooltipRectWidth = 100; // FIXME: this should be calculated based on the actual content
          xPos = centerAxisXPos - brushTooltipRectWidth / 2;
        } else {
          value = selectedLineData[dimName];
          formattedValue = selectedLineData[dimName];
          if (pcTypes[dimName] === 'number') {
            const numValue = +value as number;
            formattedValue = Number.isInteger(numValue) ? numberIntegerFormat(numValue) : numberFloatFormat(numValue);
          }
          xPos = xScale(value as any) as number;
        }

        const yPos = selectionTooltipNormalYOffset;
        const renderedText = d3.select(this);
        renderedText
          .text(formattedValue)
          .attr('visibility', isTooltipVisible)
          .attr('x', xPos)
          .attr('y', yPos)
        ;
      });

    svgElement.selectAll<SVGRectElement, DimensionData>('.pc-selection-tooltip-text-bkgnd-rect')
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
            const xScale = getXScaleFromMap(dimName);
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
    let brushesCount = 0;
    svgElement.selectAll<SVGGraphicsElement, DimensionData>('.pc-brush')
      .each(function() {
        const b = d3.select(this);
        const dimName = b.attr('id');
        let validBrushSelection;
        if (pcTypes[dimName] !== 'string') {
          validBrushSelection = d3.brushSelection(this) !== null;
        } else {
          const selectedBrush = b.select('.selection');
          validBrushSelection = !selectedBrush.empty();
        }
        if (validBrushSelection) {
          brushesCount++;
        }
      });
    if (brushesCount === 0) {
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
      if (!options.newRunsMode) {
        onLinesSelection([selectedLineData]);
      }
    }
  }

  // Highlight the line that is hovered
  function highlight(this: SVGPathElement) {
    const selectedLine = d3.select(this);
    const selectedLineData = selectedLine.datum() as ScenarioData;
    // first every line turns transparent (except any current selection)
    svgElement.selectAll('.line')
      .filter(function() { return d3.select(this).classed('selected') === false; })
      .transition().duration(highlightDuration)
      .style('opacity', lineOpacityHidden);

    // Use D3 to highlight the line; change its opacity
    selectedLine
      .filter(function() { return d3.select(this).classed('selected') === false; })
      .transition().duration(highlightDuration)
      .style('stroke', color(/* selectedLineData.dimName */))
      .attr('stroke-width', lineStrokeWidthHover)
      .style('opacity', lineOpacityVisible);

    // show tooltips
    // first update their text and position based on selected line data
    // then make them visible
    svgElement.selectAll<SVGTextElement, DimensionData>('.pc-hover-tooltip-text')
      .each(function(d) {
        const dimName = d.name;
        const value = selectedLineData[dimName];
        let formattedValue = value;
        if (pcTypes[dimName] === 'number') {
          const numValue = +value as number;
          formattedValue = Number.isInteger(numValue) ? numberIntegerFormat(numValue) : numberFloatFormat(numValue);
        }
        const renderedText = d3.select(this);
        renderedText
          .text(formattedValue)
          .attr('visibility', 'visible')
          .attr('x', function() {
            const xScale = getXScaleFromMap(dimName);
            return xScale(value as any) as number;
          });
      });

    svgElement.selectAll<SVGRectElement, DimensionData>('.pc-hover-tooltip-text-bkgnd-rect')
      .each(function(d) {
        const dimName = d.name;
        const value = selectedLineData[dimName];
        const renderedTextRect = d3.select(this);
        renderedTextRect
          .attr('visibility', 'visible')
          .attr('x', function() {
            const xScale = getXScaleFromMap(dimName);
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
    svgElement.selectAll('.pc-hover-tooltip-text')
      .attr('visibility', 'hidden');
    svgElement.selectAll('.pc-hover-tooltip-text-bkgnd-rect')
      .attr('visibility', 'hidden');
  }
}

function renderBaselineMarkers(showBaselineDefaults: boolean) {
  if (!renderedAxes) {
    console.warn('Cannot render baseline markers before rendering the actual parallle coordinates!');
    return;
  }

  renderedAxes.selectAll('circle').remove();

  if (showBaselineDefaults) {
    renderedAxes
      .filter(function(d) { return d.default !== undefined; })
      .append('circle')
      .style('stroke', baselineMarkerStroke)
      .style('fill', baselineMarkerFill)
      .attr('pointer-events', 'none')
      .attr('r', baselineMarkerSize)
      .attr('cx', function(d) {
        const axisDefault = d.default;
        const dimName = d.name;
        const scaleX = getXScaleFromMap(dimName);
        let xPos: number = scaleX(axisDefault as any) as number;
        if (pcTypes[dimName] === 'string') {
          const { min, max } = getPositionRangeOnOrdinalAxis(xPos, axisRange, scaleX.domain(), axisDefault);
          xPos = min + (max - min) / 2;
        }
        return xPos;
      })
      .attr('cy', 0);
  }
}

export {
  renderParallelCoordinates,
  renderBaselineMarkers
};
