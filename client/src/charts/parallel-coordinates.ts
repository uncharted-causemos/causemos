
import * as d3 from 'd3';
import svgUtil from '@/utils/svg-util';

import { getRandomNumber } from '../../tests/utils/random';

import { D3Selection, D3Scale, D3ScaleLinear, D3ScalePoint, D3GElementSelection } from '@/types/D3';
import { ScenarioData } from '@/types/Common';
import { DimensionInfo, ModelParameter } from '@/types/Datacube';

import { ParallelCoordinatesOptions } from '@/types/ParallelCoordinates';
import _ from 'lodash';
import { ModelRunStatus } from '@/types/Enums';

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
type D3AxisSelection = d3.Selection<SVGGElement, DimensionInfo, SVGGElement, any>

interface MarkerInfo {
  value: string | number;
  xPos: number;
}

//
// global properties
//
const margin = { top: 40, right: 30, bottom: 35, left: 35 };

// line styling in normal mode
const lineStrokeWidthNormal = 2;
const lineStrokeWidthSelected = 4;
const lineStrokeWidthHover = 2.5;
const lineOpacityVisible = 1;
const lineOpacityHidden = 0.25;

// line styling in new-runs mode
const lineOpacityNewRunsModeContext = 0.1;

// hover styling
const highlightDuration = 50; // in milliseconds

const lineColorsReady = '#296AE9ff';
const lineColorsSubmitted = '#296AE9ff';
const lineColorsFailed = '#ff2962ff';
const lineColorsUnknown = '#000000ff';
let colorFunc: (status?: string) => string = () => lineColorsUnknown;

// this is a hack to make the axis data look larger than it actually is
const enlargeAxesScaleToFitData = false;

// tooltips
const tooltipRectPadding = 4;
const lineHoverTooltipTextBackgroundColor = 'green';
const lineSelectionTooltipTextBackgroundColor = 'yellow';
const selectionTooltipNormalYOffset = 30;
const tooltipTextFontSize = '14px';

// baseline defaults
const baselineMarkerSize = 5;
const baselineMarkerFill = 'brown';
const baselineMarkerStroke = 'white';

// markers tooltip within new-runs mode
const markerTooltipOffsetX = -10;
const markerTooltipOffsetY = -20;

// axis styling
const axisLabelOffsetX = 0;
const axisLabelOffsetY = -15;
const axisLabelFontSize = '12px';
const axisLabelFontWeight = 'bold';
const axisLabelTextAnchor = 'start';
const axisInputLabelFillColor = 'black';
const axisOutputLabelFillColor = 'green';
const axisTickLabelFontSize = '12';
const axisTickLabelOffset = 0; // FIXME: this should be dynamic based on the word size; ignore for now

// brushing
const brushHeight = 8;

const numberIntegerFormat = d3.format('~s');
const numberFloatFormat = d3.format(',.2f');

//
// global variables
//
let xScaleMap: {[key: string]: D3ScaleFunc} = {};
let yScale: d3.ScalePoint<string>;
let renderedAxes: D3AxisSelection;
let axisRange: Array<number> = [];
let pcTypes: {[key: string]: string} = {};
const axisMarkersMap: {[key: string]: Array<MarkerInfo>} = {};
const selectedLines: Array<ScenarioData> = [];
const brushes: Array<BrushType> = [];

const isOrdinalAxis = (name: string) => {
  return pcTypes[name].startsWith('str');
};


function renderParallelCoordinates(
  // root svg selection element
  svgElement: D3Selection,
  // options to customize the rendering of the parallel coordinataes
  options: ParallelCoordinatesOptions,
  // input data which will be renderer as lines within the parallel coordinates
  data: Array<ScenarioData>,
  // (selected) dimensions list, which control shown dimensions as well as their order
  dimensions: Array<DimensionInfo>,
  // list of dimensions (by name) that should be presented as ordinal axes regardless of their actual data type
  ordinalDimensions: Array<string>,
  // callback function that is called with one or more lines are selected
  onLinesSelection: (selectedLines: Array<ScenarioData>) => void,
  // callback function that is called when one or more markers are added in the new-runs mode
  onNewRuns: (generatedLines: Array<ScenarioData>) => void
) {
  //
  // set graph configurations
  //
  const rightPaddingForAxesLabels = 0; // options.width / 4; // dedicte 25% of available width for dimension labels which are shown on the right of each axis

  const width = options.width - margin.left - margin.right - rightPaddingForAxesLabels;
  const height = options.height - margin.top - margin.bottom;

  //
  // exclude drilldown/filter axes from being rendered in the PCs
  //
  dimensions = filterDrilldownDimensionData(dimensions as ModelParameter[]);

  const detectTypeFromData = false;
  // process data and detect data type for each dimension
  //  some input rows may have more columns that others,
  //  so pick a row with the max number of columns
  //  in order to correctly build the data type map
  if (detectTypeFromData) {
    const idealRow = _.maxBy(data, (d) => Object.keys(d).length);
    pcTypes = detectDimensionTypes(idealRow ?? data[0]);
  } else {
    pcTypes = dimensions.reduce(
      (obj, item) => Object.assign(obj, { [item.name]: item.type }), {});
  }

  //
  // scales
  /// map of x axes by dimension name
  //
  axisRange = [0, width];
  const { x, y } = createScales(data, dimensions, ordinalDimensions, pcTypes, axisRange, height);
  xScaleMap = x;
  yScale = y;

  //
  // Color scale
  //
  colorFunc = (status = ModelRunStatus.Ready) => {
    switch (status) {
      case ModelRunStatus.Ready:
        return lineColorsReady;
      case ModelRunStatus.Submitted:
        return lineColorsSubmitted;
      case ModelRunStatus.ExecutionFailed:
        return lineColorsFailed;
      default:
        return lineColorsUnknown;
    }
  };
  /// later: support a color scale
  // const color = d3.scaleOrdinal() // scaleLinear
  // .domain(axisDomain)
  // .range([lineColor])
  // .interpolate(d3.interpolateLab)
  // ;

  //
  // create the initial graphics element under the root svg selection
  //
  const gElement = svgElement
    .attr('width', options.width)
    .attr('height', options.height)
    // register a function to cancel line selection when clicking anywhere on the svg
    .on('click', handleLineSelection)
    .append('g')
    .attr('transform', svgUtil.translate(margin.left, margin.top))
    ;

  //
  // Draw the lines
  //
  renderLines();

  //
  // Draw the axes
  //
  renderedAxes = renderAxes(gElement, dimensions);

  //
  // brushing (normal mode) or markers (new-runs mode)
  //
  // Add and store a brush/marker (container) for each axis.
  if (options.newRunsMode) {
    setupAndRenderNewRunsMarkers();
  } else {
    setupAndRenderDataFilteringBrushes();
  }

  //
  // baseline defaults
  //
  renderBaselineMarkers(!!options.showBaselineDefaults);

  //
  // axis labels
  //
  renderAxesLabels(dimensions);

  //
  // hover tooltips
  //
  renderHoverTooltips();

  //
  // selection (i.e., selected line) tooltips
  //
  renderSelectionTooltips();

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
        handleLineSelection.bind(lineElement)(undefined /* event */, d, false /* do not notify external listeners */);
      });
  }

  // ////////////////////////////////////////////////
  // additional context-sensitive utility functions
  // ////////////////////////////////////////////////


  function getValueInCorrectType(dimName: string, value: string) {
    if (pcTypes[dimName] === 'int') {
      return parseInt(value);
    } else if (pcTypes[dimName] === 'float') {
      return parseFloat(value);
    } else {
      return value;
    }
  }

  // The path function take a row of input (e.g., csv values),
  //  and return x and y coordinates of the line to draw for this raw.
  // NOTE: for ordinal axes, lines would map to any part of the line segment based on the input value
  function pathDefinitionFunc(d: ScenarioData) {
    const line = d3.line()
      // curveMonotone curveCatmullRom curveLinear curveCardinal
      .curve(d3.curveCatmullRom /* .tension(0.01) */);

    // when drawing lines, exclude the last segment to the output variable
    //  if the drawn lines are for potentially new scenarios (i.e., within the new-runs mode)
    const dimensionSet: Array<DimensionInfo> = options.newRunsMode ? dimensions.filter(function(d) { return !isOutputDimension(dimensions, d.name); }) : dimensions;

    // some data lines are missing certain dimensions, e.g., in-progress lines would not have output value yet!
    const dataDrivenDimensionSet = dimensionSet.filter(dim => d[dim.name] !== undefined);

    const fn = dataDrivenDimensionSet.map(function(p: DimensionInfo) {
      const dimName = p.name;
      const scaleX = getXScaleFromMap(dimName);
      const val = d[dimName];
      let xPos = scaleX(val as any) as number;
      if (isOrdinalAxis(dimName)) {
        // ordinal axis, so instead of mapping to one position in this segment,
        // lets attempt to distribute the values randomly on the segment
        // with the goal of improving lines visibility and reducing overlap
        const { min, max } = getPositionRangeOnOrdinalAxis(xPos, axisRange, scaleX.domain(), val.toString());
        if (options.newRunsMode) {
          // special case when rendering potential scenario lines in the new-runs mode
          //  instead of distributing the lines over the segment for ordinal axes, use the segment center
          xPos = min + (max - min) / 2;
        } else {
          xPos = getRandomNumber(min, max);
        }
      }
      const yPos = yScale(dimName);
      return [xPos, yPos];
    }) as Array<[number, number]>;
    return line(fn);
  }

  function renderLines() {
    const lines = gElement
      .selectAll<SVGPathElement, ScenarioData>('myPath')
      .data(data)
      .enter()
      .append('path')
      .attr('class', function () { return 'line'; }) // @REVIEW: this could be used to style lines externally
      .attr('d', pathDefinitionFunc)
      .style('fill', 'none')
      .attr('stroke-width', lineStrokeWidthNormal)
      .style('stroke', function(d) { return colorFunc(d.status as string); })
      .style('opacity', options.newRunsMode ? lineOpacityNewRunsModeContext : lineOpacityHidden)
      .style('stroke-dasharray', function(d) { return d.status === ModelRunStatus.Ready ? 0 : ('3, 3'); })
    ;

    // scenario lines are only interactive in the normal mode
    if (!options.newRunsMode) {
      lines
        .on('mouseover', highlight)
        .on('mouseleave', doNotHighlight);

      // also, in the normal mode, only lines with status READY are clickable
      lines
        .filter(function(d) { return d.status === ModelRunStatus.Ready; })
        .on('click', handleLineSelection);
    }
  }

  function renderNewRunsLines() {
    //
    // consider dimensions one by one
    //
    const allBrushesMap: {[key: string]: Array<string | number>} = {};
    let someMarkersAdded = false;

    // prepare a map of all markers where a baseline marker is added when no user-marker exists
    dimensions.forEach(dim => {
      const dimName = dim.name;
      const dimDefault: string = (dim as ModelParameter).default;
      const dimData = [];
      // exclude markers on the output axes
      const notOutputAxis = !isOutputDimension(dimensions, dim.name);
      if (notOutputAxis) {
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
          dimData.push(getValueInCorrectType(dimName, dimDefault));
        }
        allBrushesMap[dimName] = dimData;
      }
    });

    // utility function that takes a map of markers per dimension and split them
    /**
     Get all combinations of the keys of an object and split into multiple objects.

     For example, convert the following;
      { key1: [value1, value2], key2: [value3, value4] }

      into the following 4 objects

      { key1: value1, key2: value3 }
      { key1: value1, key2: value4 }
      { key1: value2, key2: value3 }
      { key1: value2, key2: value4 }
     */
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

    // render all potential scenario-run lines
    gElement
      .selectAll<SVGPathElement, ScenarioData>('myPath')
      .data(newScenarioData)
      .enter()
      .append('path')
      .attr('class', 'marker-line')
      .attr('d', pathDefinitionFunc)
      .style('fill', 'none')
      .attr('stroke-width', lineStrokeWidthHover)
      .style('stroke', function() { return (colorFunc()); })
      .style('opacity', lineOpacityVisible)
      .style('stroke-dasharray', ('3, 3'))
      .on('mouseover', highlight)
      .on('mouseleave', doNotHighlight)
      .on('click', function() {
        const currLineData = d3.select(this).datum();
        _.remove(newScenarioData, (lineData) => _.isEqual(lineData, currLineData));
        gElement
          .selectAll<SVGPathElement, ScenarioData>('.marker-line')
          .data<ScenarioData>(newScenarioData, d => {
            // this key func is needed to ensure proper matching between each datum and the selected DOM element
            let id = '';
            Object.keys(d).forEach(key => {
              id += key + d[key];
            });
            return id;
          })
          .exit().remove()
        ;
        // hide tooltips
        doNotHighlight();
        // some marker-line is removed, so notify external listeners
        onNewRuns(newScenarioData);
      })
      .append('title')
      .text('Remove')
    ;
  }

  function brushStart(event: d3.D3BrushEvent<any>) {
    event.sourceEvent.stopPropagation();
  }

  function onDataBrush(this: any) {
    // now filter all lines and exclude those the fall outside the range (start, end)
    cancelPrevLineSelection(svgElement);

    // examine all brushes at all axes and cache their range
    svgElement.selectAll<SVGGraphicsElement, DimensionInfo>('.pc-brush')
      .each(function() {
        const b = d3.select(this);
        const dimName = b.attr('id');
        let selection: [number | string, number | string] | undefined;
        if (!isOrdinalAxis(dimName)) { // different axes types (e.g., ordinal) have different brushing techniques
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
          if (!isOrdinalAxis(dimName)) {
            start = (xScale as D3ScaleLinear).invert(selection[0] as number).toFixed(2);
            end = (xScale as D3ScaleLinear).invert(selection[1] as number).toFixed(2);
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
          if (!isOrdinalAxis(b.dimName)) {
            if (+lineData[b.dimName] < +b.start || +lineData[b.dimName] > +b.end) {
              isSelected = false;
            }
          } else {
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

    // update and show tooltips for the selected brush range
    if (brushes.length > 0) {
      updateSelectionTooltips(svgElement);
    }

    // reset the cached brush ranges
    brushes.length = 0;
  }

  function brushEnd(this: SVGGraphicsElement, event: d3.D3BrushEvent<any>) {
    // prevent the global svg click event from deselecting lines
    event.sourceEvent.stopPropagation();

    selectedLines.length = 0; // reset before identifying selected lines
    onDataBrush();

    // notify external listeners
    onLinesSelection(selectedLines);
  }

  // select the line clicked by the user
  // or deselect all lines when the svg element is clicked
  function handleLineSelection(this: SVGPathElement | HTMLElement, event: PointerEvent | undefined, d: ScenarioData, notifyExternalListeners = true) {
    if (options.newRunsMode) {
      return;
    }
    // when the user have an active brush,
    //  selecting a line outside that brush range will not remove the existing brush
    //  and the newly clicked line will be ignored because it is outside the brush
    //  i.e., prevent selection outside of the brushes
    let brushesCount = 0;
    svgElement.selectAll<SVGGraphicsElement, DimensionInfo>('.pc-brush')
      .each(function() {
        const b = d3.select(this);
        const dimName = b.attr('id');
        let validBrushSelection;
        if (!isOrdinalAxis(dimName)) {
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
        updateSelectionTooltips(svgElement, selectedLine);
      }

      // notify external listeners
      if (notifyExternalListeners) {
        onLinesSelection(selectedLineData ? [selectedLineData] : []);
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
      .style('opacity', options.newRunsMode ? lineOpacityNewRunsModeContext : lineOpacityHidden);

    // Use D3 to highlight the line; change its opacity
    selectedLine
      .filter(function() { return d3.select(this).classed('selected') === false; })
      .transition().duration(highlightDuration)
      .style('stroke', colorFunc(selectedLineData.status as string))
      .attr('stroke-width', lineStrokeWidthHover)
      .style('opacity', lineOpacityVisible);

    // show tooltips
    // first update their text and position based on selected line data
    // then make them visible
    svgElement.selectAll<SVGTextElement, DimensionInfo>('.pc-hover-tooltip-text')
      .each(function(d) {
        const dimName = d.name;
        const value = selectedLineData[dimName];
        let formattedValue = value;
        if (!isOrdinalAxis(dimName)) {
          const numValue = +value as number;
          formattedValue = Number.isInteger(numValue) ? numberIntegerFormat(numValue) : numberFloatFormat(numValue);
        }
        // ignore tooltip for non-existing values (e.g., output value for active model runs that are not completed yet)
        if (formattedValue === 'NaN') {
          formattedValue = '';
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

    svgElement.selectAll<SVGRectElement, DimensionInfo>('.pc-hover-tooltip-text-bkgnd-rect')
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
    // reset all lines to full opacity except for selected lines
    svgElement.selectAll<SVGPathElement, ScenarioData>('.line')
      .filter(function() { return d3.select(this).classed('selected') === false; })
      .transition().duration(highlightDuration)
      .style('stroke', function (d: ScenarioData) {
        return (colorFunc(d.status as string));
      })
      .style('opacity', options.newRunsMode ? lineOpacityNewRunsModeContext : lineOpacityHidden);

    // hide tooltips
    svgElement.selectAll('.pc-hover-tooltip-text')
      .attr('visibility', 'hidden');
    svgElement.selectAll('.pc-hover-tooltip-text-bkgnd-rect')
      .attr('visibility', 'hidden');
  }

  function setupAndRenderNewRunsMarkers() {
    //
    // special interaction to specify values of interest to generate new runs
    //
    renderedAxes
      .filter(function(d) {
        // exclude the output variable from the ability to add markers to it
        return !isOutputDimension(dimensions, d.name);
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

        if (!isOrdinalAxis(dimName)) {
          //
          // markers on numerical axes
          //
          const getMarkerValueFromPos = (pos: number) => {
            const xScale = getXScaleFromMap(dimName);
            // Normally we go from data to pixels, but here we're doing pixels to data
            return (xScale as D3ScaleLinear).invert(pos).toFixed(2);
          };
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
              const markerValue = getMarkerValueFromPos(xLoc);

              // make sure to place marker using correct data type
              axisMarkersMap[dimName].push({
                value: getValueInCorrectType(dimName, markerValue),
                xPos: xLoc
              }); // Push data to our array

              const dataSelection = gElement.selectAll<SVGSVGElement, MarkerInfo>('rect') // For new markers
                .data<MarkerInfo>(axisMarkersMap[dimName], d => '' + d.value);

              // add marker rect
              const markerRects = dataSelection
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
                .attr('height', segmentsHeight);

              //
              // marker click (i.e., deletion)
              //
              markerRects
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
                });

              //
              // marker drag
              //
              markerRects
                .call(d3.drag<SVGRectElement, MarkerInfo>()
                  .on('drag', function(event) {
                    let newXPos = d3.pointer(event, this)[0];
                    // limit the movement within the axis range
                    newXPos = newXPos < axisRange[0] ? axisRange[0] : newXPos;
                    newXPos = newXPos > axisRange[1] ? axisRange[1] : newXPos;
                    d3.select(this)
                      .attr('x', newXPos);
                    const mv = getMarkerValueFromPos(newXPos);
                    gElement.selectAll('text')
                      .text(getValueInCorrectType(dimName, mv))
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
                      const mv = getMarkerValueFromPos(newXPos);
                      md.value = getValueInCorrectType(dimName, mv);
                    }
                    d3.select(this)
                      .attr('x', newXPos);
                    // remove all marker tooltips, if any
                    gElement.selectAll('text').remove();
                    // re-render all the new scenario lines
                    renderNewRunsLines();
                  }));

              //
              // marker hover
              //
              markerRects
                .on('mouseover', function(d, i) {
                  // Use D3 to select element, change color and size
                  d3.select(this)
                    .style('fill', 'orange');

                  // const markerValue = numberFloatFormat(i.value as number);
                  const markerValue = i.value;

                  // Specify where to put label of text
                  gElement.append('text')
                    .attr('x', i.xPos + markerTooltipOffsetX)
                    .attr('y', segmentsY + markerTooltipOffsetY)
                    .attr('id', 't' + '-' + Math.floor(+markerValue)) // Create an id for text so we can select it later for removing on mouseout)
                    .style('fill', 'black')
                    .style('font-size', axisLabelFontSize)
                    .text(function() {
                      return markerValue; // Value of the text
                    });
                })
                .on('mouseout', function(d, i) {
                  // Use D3 to select element, change color back to normal
                  d3.select(this)
                    .style('fill', baselineMarkerFill);

                  const markerValue = Math.floor(i.value as number);

                  // Select text by id and then remove
                  gElement.select('#t' + '-' + markerValue).remove(); // Remove text location
                });

              // re-render all the new scenario lines, once a marker is added
              renderNewRunsLines();
            })
          ;
        } else {
          //
          // markers on ordinal axes
          //
          // special brushes for ordinal axes
          const { segmentsData, dashSize, segmentsY, segmentsHeight } = getSegmentsInfo(dimName);

          const gElement = d3.select(this);

          const tickSize = 5;
          const ticksData = [
            { x1: 0, y1: 0, x2: 0, y2: tickSize }, // left tick
            { x1: dashSize, y1: 0, x2: dashSize, y2: tickSize } // right tick
          ];

          // add two tick lines for each segment
          gElement
            .selectAll('g')
            .data(segmentsData)
            .enter()
            .append('g')
            .attr('transform', function(d) { return svgUtil.translate(d.x, 0); })
            .selectAll('line')
            .data(ticksData)
            .enter()
            .append('line')
            .attr('pointer-events', 'none')
            .attr('x1', function(d) { return d.x1; })
            .attr('y1', function(d) { return d.y1; })
            .attr('x2', function(d) { return d.x2; })
            .attr('y2', function(d) { return d.y2; })
            .attr('stroke', 'black')
          ;

          // add one rect for each segment to act as the marker container
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
            .on('click', function(event: PointerEvent) {
              // this is coming from a click on an ordinal axis segment,
              //  so prevent the global svg click
              event.stopPropagation();

              const segmentData: any = d3.select(this).datum();
              const markerValue: string = segmentData.start.toString();

              // check if a marker already exists
              const marker = axisMarkersMap[dimName].find(el => el.value === markerValue);

              if (!marker) {
                const scaleX = getXScaleFromMap(dimName);

                const { min, max } = getPositionRangeOnOrdinalAxis(segmentData.x, axisRange, scaleX.domain(), markerValue);
                const xLoc = segmentData.x + ((max - min) / 2);

                // Push data to our array
                axisMarkersMap[dimName].push({
                  value: markerValue,
                  xPos: xLoc
                });

                const dataSelection = gElement.selectAll<SVGSVGElement, MarkerInfo>('rect') // For new markers
                  .data<MarkerInfo>(axisMarkersMap[dimName], d => '' + d.value);

                // add marker rect
                const markerWidth = baselineMarkerSize * 2;
                dataSelection
                  .enter().append('rect')
                  .attr('class', 'pc-marker')
                  .attr('id', function(d) { return 'marker_' + d.value; })
                  .style('stroke', baselineMarkerStroke)
                  .style('fill', baselineMarkerFill)
                  .attr('pointer-events', 'none')
                  .attr('x', function(d) { return d.xPos - (markerWidth / 2); })
                  .attr('y', segmentsY)
                  .attr('width', markerWidth)
                  .attr('height', segmentsHeight);
              } else {
                gElement.selectAll<SVGRectElement, MarkerInfo>('.pc-marker')
                  .filter(function(d) { return d.value === markerValue; })
                  .remove();
                axisMarkersMap[dimName] = axisMarkersMap[dimName].filter(el => el.value !== markerValue);
              }

              // re-render all the new scenario lines
              renderNewRunsLines();
            })
          ;
        }
      });
  }

  function setupAndRenderDataFilteringBrushes() {
    //
    // normal brushing to focus on subset of the data
    //
    renderedAxes
      .append('g')
      .attr('class', 'pc-brush')
      .attr('id', function(d) { return d.name; })
      .each(function(d) {
        const dimName = d.name;
        if (!isOrdinalAxis(dimName)) {
          // a standard continuous brush
          d3.select(this).call(
            d3.brushX()
              .extent([[0, -brushHeight], [axisRange[1], brushHeight]])
              .on('start', brushStart)
              .on('brush', onDataBrush)
              .on('end', brushEnd)
          );
        } else {
          // special brushes for ordinal axes
          const { segmentsData, dashSize, segmentsY, segmentsHeight } = getSegmentsInfo(dimName);

          const gElement = d3.select(this);

          const tickSize = 5;
          const ticksData = [
            { x1: 0, y1: 0, x2: 0, y2: tickSize }, // left tick
            { x1: dashSize, y1: 0, x2: dashSize, y2: tickSize } // right tick
          ];

          // add two tick lines for each segment
          gElement
            .selectAll('g')
            .data(segmentsData)
            .enter()
            .append('g')
            .attr('transform', function(d) { return svgUtil.translate(d.x, 0); })
            .selectAll('line')
            .data(ticksData)
            .enter()
            .append('line')
            .attr('pointer-events', 'none')
            .attr('x1', function(d) { return d.x1; })
            .attr('y1', function(d) { return d.y1; })
            .attr('x2', function(d) { return d.x2; })
            .attr('y2', function(d) { return d.y2; })
            .attr('stroke', 'black')
          ;

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
            .on('click', function(event) {
              // this is coming from a click on an ordinal axis's segment rect,
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
              onDataBrush();

              // notify external listeners
              onLinesSelection(selectedLines);
            })
          ;
        }
      });
  }
} // end of renderParallelCoordinates()

function isOutputDimension(dimensions: Array<DimensionInfo>, dimName: string) {
  // FIXME: only the last dimension is the output dimension
  return dimensions[dimensions.length - 1].name === dimName;
}

function renderBaselineMarkers(showBaselineDefaults: boolean) {
  if (!renderedAxes) {
    console.warn('Cannot render baseline markers before rendering the actual parallle coordinates!');
    return;
  }

  renderedAxes.selectAll('circle').remove();

  if (showBaselineDefaults) {
    renderedAxes
      .filter(function(d) { return (d as ModelParameter).default !== undefined; })
      .append('circle')
      .style('stroke', baselineMarkerStroke)
      .style('fill', baselineMarkerFill)
      .attr('pointer-events', 'none')
      .attr('r', baselineMarkerSize)
      .attr('cx', function(d) {
        const axisDefault = (d as ModelParameter).default;
        const dimName = d.name;
        const scaleX = getXScaleFromMap(dimName);
        let xPos: number = scaleX(axisDefault as any) as number;
        if (isOrdinalAxis(dimName)) {
          const axisDefaultStr = axisDefault.toString();
          const { min, max } = getPositionRangeOnOrdinalAxis(xPos, axisRange, scaleX.domain(), axisDefaultStr);
          xPos = min + (max - min) / 2;
        }
        return xPos;
      })
      .attr('cy', 0);
  }
}

function renderAxes(gElement: D3GElementSelection, dimensions: Array<DimensionInfo>) {
  const axes = gElement.selectAll('axis')
  // For each dimension of the dataset I add a 'g' element:
    .data(dimensions)
    .enter()
    .append('g')
    .attr('class', 'axis')
    .attr('transform', function(d) {
      // I translate this element to its correct position on the y axis
      return svgUtil.translate(0, yScale(d.name));
    })
    .each(function(d) {
      // And I build the axis with the call function
      const dimName = d.name;
      const scale = getXScaleFromMap(dimName);
      let xAxis;
      if (!isOrdinalAxis(dimName)) {
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
  return axes;
}

function renderAxesLabels(dimensions: Array<DimensionInfo>) {
  // Add label for each axis name
  const axesLabels = renderedAxes
    .append('text')
    .attr('class', 'pc-axis-name-text')
    .style('text-anchor', axisLabelTextAnchor)
    .attr('x', axisLabelOffsetX)
    .attr('y', axisLabelOffsetY)
    .text(function(d) {
      if (d.display_name !== undefined) {
        return d.display_name;
      }
      return d.name;
    })
    .style('fill', function(d) {
      return isOutputDimension(dimensions, d.name) ? axisOutputLabelFillColor : axisInputLabelFillColor;
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
}

function renderHoverTooltips() {
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
}

function renderSelectionTooltips() {
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
}

// update the tooltip text labels for the selected line (or existing brushes)
function updateSelectionTooltips(svgElement: D3Selection, selectedLine?: D3LineSelection) {
  const selectedLineData = selectedLine?.datum();
  // show tooltips
  // first update their text and position based on selected line data
  // then make them visible
  svgElement.selectAll<SVGTextElement, DimensionInfo>('.pc-selection-tooltip-text')
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
          /*
          if (!isOrdinalAxis(dimName)) {
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
          */
          value = brushRange.start + ' : ' + brushRange.end;

          isTooltipVisible = 'visible';
          formattedValue = value;
        }
        // always show the brush tooltip centered on the axis
        const centerAxisXPos = (axisRange[1] - axisRange[0]) / 2;
        // adjust center based on the brush width
        // FIXME: this should be calculated based on the actual content
        //         Note that the function updateSelectionToolTipsRect() called at the end
        //         will adjust the position to not go beyond the svg area
        const brushTooltipRectWidth = 100;
        xPos = centerAxisXPos - brushTooltipRectWidth / 2;
      } else {
        value = selectedLineData ? selectedLineData[dimName] : 'undefined';
        formattedValue = value;
        if (!isOrdinalAxis(dimName)) {
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

  svgElement.selectAll<SVGRectElement, DimensionInfo>('.pc-selection-tooltip-text-bkgnd-rect')
    .each(function(d) {
      const dimName = d.name;
      let isTooltipVisible = 'visible';
      const value = selectedLineData ? selectedLineData[dimName] : 'undefined';
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

function selectLine(selectedLine: D3LineSelection, event: PointerEvent | undefined, d: ScenarioData, lineWidth: number) {
  const selectedLineData = selectedLine.datum();

  if (selectedLineData) {
    // Use D3 to select the line, change color and size
    selectedLine
      .classed('selected', true)
      .transition().duration(highlightDuration)
      .style('stroke', colorFunc(/* selectedLineData.dimName */))
      .style('opacity', lineOpacityVisible)
      .attr('stroke-width', lineWidth);

    // since a line is just select, prevent other higher up elements (e.g. svg) from cancelling this selection
    if (event) {
      event.stopPropagation();
    }
  }
}


//
// utility functions
//

// exclude drilldown parameters from the input dimensions
// @REVIEW this may better be done external to the PC component
const filterDrilldownDimensionData = (dimensions: Array<ModelParameter>) => {
  return dimensions.filter(function(d) {
    return !d.is_drilldown;
  });
};

// attempt to determine types of each dimension based on first row of data
const toType = (v: string | number) => {
  return (({}).toString.call(v).match(/\s([a-zA-Z]+)/) ?? [])[1].toLowerCase();
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

// utility function to return the pixel positions for the start/end of a specific ordinal segment
//  which is identified by the the segment value
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

// utility function to calculate info about segments of a specific ordinal axis
function getSegmentsInfo(dimName: string) {
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
  return { segmentsData, dashSize, segmentsY, segmentsHeight };
}

const createScales = (
  data: Array<ScenarioData>,
  dimensions: Array<DimensionInfo>,
  ordinalDimensions: Array<string>,
  pcTypes: { [key: string]: string },
  axisRange: Array<number>,
  height: number) => {
  //
  const xScaleMap: {[key: string]: D3ScaleFunc} = {};

  // each axis will provide min/max values that should be used as the scale domain
  //  alternatively, scan the all the data entries to find the min/max
  const useAxisRangeFromData = true;

  const numberFunc = function(name: string) {
    let dataExtent: [number, number] | [undefined, undefined] = [undefined, undefined];
    const outputVarName = dimensions[dimensions.length - 1].name;
    if (useAxisRangeFromData && outputVarName !== name) {
      // this is only valid for input variables
      const min = dimensions.find(d => d.name === name)?.min;
      const max = dimensions.find(d => d.name === name)?.max;
      dataExtent = [min ?? 0, max ?? 0];
    } else {
      dataExtent = d3.extent(data.map(point => +point[name]));
    }
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
  };

  const stringFunc = function(name: string) {
    let dataExtent: string[] = [];
    if (useAxisRangeFromData) {
      // note this is only valid for inherently ordinal dimensions not those explicitly converted to be ordinal
      dataExtent = dimensions.find(d => d.name === name)?.choices ?? [''];
    } else {
      dataExtent = data.map(function(p) { return p[name]; }) as Array<string>; // note this will return an array of values for all runs
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
  };

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
    number: numberFunc,
    int: numberFunc,
    float: numberFunc,
    string: stringFunc,
    str: stringFunc
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

// handy function to return the d3 scale for any given dimension from the map of scale functions
const getXScaleFromMap = (dimName: string) => {
  const xScaleDim = xScaleMap[dimName];
  return xScaleDim(dimName) as D3Scale;
};

export {
  renderParallelCoordinates,
  renderBaselineMarkers
};
