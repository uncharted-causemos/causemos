
import * as d3 from 'd3';
import svgUtil from '@/utils/svg-util';

import { getRandomNumber } from '@/utils/random';

import { D3Selection, D3Scale, D3ScaleLinear, D3ScalePoint, D3GElementSelection } from '@/types/D3';
import { ScenarioData } from '@/types/Common';
import { DimensionInfo, ModelParameter } from '@/types/Datacube';

import { ParallelCoordinatesOptions } from '@/types/ParallelCoordinates';
import _ from 'lodash';
import { DatacubeGeoAttributeVariableType, DatacubeGenericAttributeVariableType, ModelParameterDataType, ModelRunStatus } from '@/types/Enums';
import { isCategoricalAxis, isGeoParameter } from '@/utils/datacube-util';
import { safeD3StringId } from '@/utils/string-util';
import { colorFromIndex } from '@/utils/colors-util';

//
// custom data types
//
interface BrushType {
  dimName: string;
  start: string | number;
  end: string | number;
  brushLabel?: string | number;
}

type D3ScaleFunc = (name: string) => D3Scale;

type D3LineSelection = d3.Selection<SVGPathElement, ScenarioData, null, undefined>;
type D3AxisSelection = d3.Selection<SVGGElement, DimensionInfo, SVGGElement, any>

interface MarkerInfo {
  value: string | number;
  xPos: number;
  id: string;
}

//
// global properties
//
const margin = { top: 40, right: 30, bottom: 35, left: 35 };

// line styling in normal mode
const lineStrokeWidthNormal = 2;
const lineStrokeWidthSelected = 4;
const lineStrokeWidthDefault = 8;
const lineStrokeWidthSelectedDefault = 10;
const lineStrokeWidthHover = 2.5;
const lineOpacityVisible = 1;
const lineOpacityHidden = 0.25;

// line styling in new-runs mode
const lineOpacityNewRunsModeContext = 0.1;

// hover styling
const highlightDuration = 50; // in milliseconds

const lineColorsDraft = '#296AE9ff';
const lineColorsReady = '#296AE9ff';
const lineColorsSubmitted = '#296AE9ff';
const lineColorsFailed = '#ff2962ff';
const lineColorsUnknown = '#000000ff';

// this is a hack to make the axis data look larger than it actually is
const enlargeAxesScaleToFitData = false;

// tooltips
const tooltipRectPaddingY = 4;
const tooltipRectPaddingX = 6;
const lineHoverTooltipTextBackgroundColor = 'black';
const lineSelectionTooltipTextBackgroundColor = 'white';
const selectionTooltipNormalYOffset = 30;
const tooltipTextFontSize = '14px';

// baseline defaults
const baselineMarkerSize = 3;
const baselineMarkerFill = 'black';
const baselineMarkerStroke = 'white';

// markers tooltip within new-runs mode
const markerTooltipOffsetX = -10;
const markerTooltipOffsetY = -20;

// axis styling
const axisLabelOffsetX = 0;
const axisLabelOffsetY = -15;
const axisLabelFontSize = '12px';
const axisLabelTextAnchor = 'start';
const axisLabelFillColor = 'black';
const axisTickLabelFontSize = '12';
const axisTickLabelOffset = 0; // FIXME: this should be dynamic based on the word size; ignore for now
const axisOutputLabelFontSize = '10px';

// brushing
const brushHeight = 8;

const numberIntegerFormat = (n: number | { valueOf(): number}) => {
  const numDigits = n.toString().length;
  if (numDigits > 4) {
    return d3.format('~s')(n); // The ~ option trims insignificant trailing zeros across all format types
  } else {
    return n.toString();
  }
};
const numberFloatFormat = d3.format(',.2f');

//
// global variables
//
let xScaleMap: {[key: string]: D3Scale} = {};
let yScale: d3.ScalePoint<string>;
let renderedAxes: D3AxisSelection;
let axisRange: Array<number> = [];
let pcTypes: {[key: string]: string} = {};
const axisMarkersMap: {[key: string]: Array<MarkerInfo>} = {};
const selectedLines: Array<ScenarioData> = [];
const brushes: Array<BrushType> = [];
let currentLineSelection: Array<ScenarioData> = [];
let dimensions: Array<DimensionInfo> = [];

function getLineWidth(datum: any) {
  return datum.is_default_run === 0 ? lineStrokeWidthNormal : lineStrokeWidthDefault;
}

function getLineSelectedWidth(datum: any) {
  return datum.is_default_run === 0 ? lineStrokeWidthSelected : lineStrokeWidthSelectedDefault;
}

function renderParallelCoordinates(
  // root svg selection element
  svgElement: D3Selection,
  // options to customize the rendering of the parallel coordinataes
  options: ParallelCoordinatesOptions,
  // input data which will be renderer as lines within the parallel coordinates
  data: Array<ScenarioData>,
  // (selected) dimensions list, which control shown dimensions as well as their order
  dimensionsList: Array<DimensionInfo>,
  // callback function that is called with one or more lines are selected
  onLinesSelection: (selectedLines: Array<ScenarioData>) => void,
  // callback function that is called when one or more markers are added in the new-runs mode
  onNewRuns: (generatedLines: Array<ScenarioData>) => void,
  // callback function to request showing the geo-selection modal
  onGeoSelection: (d: ModelParameter) => void,
  // request re-render of the whole PC
  rerenderChart: () => void
) {
  //
  // set graph configurations
  //
  const rightPaddingForAxesLabels = 0; // options.width / 4; // dedicte 25% of available width for dimension labels which are shown on the right of each axis

  const width = options.width - margin.left - margin.right - rightPaddingForAxesLabels;
  const height = options.height - margin.top - margin.bottom;

  //
  // exclude drilldown/filter and freeform axes from being rendered in the PCs
  //
  dimensions = filterDrilldownDimensionData(dimensionsList as ModelParameter[]);
  dimensions = filterInvisibleDimensionData(dimensions as ModelParameter[]);
  dimensions = filterDateDimensionData(dimensions as ModelParameter[]);

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
  const { x, y } = createScales(data, dimensions, pcTypes, axisRange, height);
  xScaleMap = x;
  yScale = y;

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
  renderBaselineMarkers();

  //
  // axis labels
  //
  renderAxesLabels(svgElement, options, dimensions, rerenderChart, onGeoSelection);

  //
  // hover tooltips
  //
  renderHoverTooltips();

  //
  // selection (i.e., selected line) tooltips
  //
  renderSelectionTooltips();

  //
  // apply initial data selection, if requested
  //
  if (options.initialDataSelection && options.initialDataSelection.length > 0) {
    // cancel any previous selection; turn every line into grey
    cancelPrevLineSelection(svgElement);
    let selectionIndex = 0;

    svgElement.selectAll('.line')
      .data(data)
      .filter(function(d) {
        return options.initialDataSelection?.includes(d.run_id as string) as boolean;
      })
      .each(function(d) {
        const selectedLine = d3.select<SVGPathElement, ScenarioData>(this as SVGPathElement);
        selectedLine.attr('selection-index', selectionIndex++);

        selectLine(selectedLine, undefined /* event */, d, getLineSelectedWidth(d));
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
      let val = d[dimName];
      let xPos = scaleX(val as any) as number;
      if (isCategoricalAxis(dimName, dimensions)) {
        // ordinal axis, so instead of mapping to one position in this segment,
        // lets attempt to distribute the values randomly on the segment
        // with the goal of improving lines visibility and reducing overlap
        //
        // get the corresponding label for this value if suitable
        val = findLabelForValue(p, val);
        // re-evaluate the xPos since the output val may be different from the input val
        xPos = scaleX(val as any) as number;
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
      .attr('stroke-width', (d) => getLineWidth(d))
      .style('stroke', colorFunc)
      .style('opacity', options.newRunsMode ? lineOpacityNewRunsModeContext : lineOpacityHidden)
      .style('stroke-dasharray', function(d) {
        return d.status === ModelRunStatus.Ready ? 0 : ('3, 3');
      })
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
          // @NOTE: Jataware now supports parameter values as string
          dimData.push(dimDefault);
          // dimData.push(getValueInCorrectType(dimName, dimDefault));
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

    // add initial status for all potential model runs as 'draft or not-submitted'
    //  this will ensure proper coloring/rendering
    // However, this param must be explicitly removed before sending model-runs
    //  for execution since the server will create them
    newScenarioData.forEach(newModelRun => {
      newModelRun.status = ModelRunStatus.Draft;
    });

    // some markers were added, so notify external listeners
    const potentialModelRuns = _.map(newScenarioData, function (run) {
      return _.omit(run, ['status']);
    });
    onNewRuns(potentialModelRuns);

    // render all potential model-run lines
    gElement
      .selectAll<SVGPathElement, ScenarioData>('myPath')
      .data(newScenarioData)
      .enter()
      .append('path')
      .attr('class', 'marker-line')
      .attr('d', pathDefinitionFunc)
      .style('fill', 'none')
      .attr('stroke-width', lineStrokeWidthHover)
      .style('stroke', colorFunc)
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
        const potentialModelRuns = _.map(newScenarioData, function (run) {
          return _.omit(run, ['status']);
        });
        onNewRuns(potentialModelRuns);
      })
      .append('title')
      .text('Remove')
    ;
  }

  function brushStart(event: d3.D3BrushEvent<any>) {
    event.sourceEvent.stopPropagation();
  }

  function onDataBrush() {
    // now filter all lines and exclude those the fall outside the range (start, end)
    cancelPrevLineSelection(svgElement);

    // examine all brushes at all axes and cache their range
    svgElement.selectAll<SVGGraphicsElement, DimensionInfo>('.pc-brush')
      .each(function() {
        const b = d3.select(this);
        const dimName = b.attr('id');
        let selection: [number | string, number | string] | undefined;
        if (!isCategoricalAxis(dimName, dimensions)) { // different axes types (e.g., ordinal) have different brushing techniques
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
          let start: string | number;
          let end;
          let brushLabel;
          const skip = false;
          if (!isCategoricalAxis(dimName, dimensions)) {
            start = (xScale as D3ScaleLinear).invert(selection[0] as number).toFixed(2);
            end = (xScale as D3ScaleLinear).invert(selection[1] as number).toFixed(2);
          } else {
            start = selection[0];
            end = selection[1];

            // note for categorical axes with choices labels,
            //  this may refer to a label choice rather than an actual valid value
            const dim = dimensions.find(d => d.name === dimName);
            if ((dim as ModelParameter) !== undefined && (dim as ModelParameter).data_type !== ModelParameterDataType.Freeform) {
              // ensure that any choice label is mapped back to its underlying value
              if (dim?.choices_labels !== undefined && dim.choices_labels.length > 0) {
                const choiceIndex = dim.choices_labels?.findIndex(c => c === start) ?? 0;
                if (dim.choices !== undefined && choiceIndex >= 0 && choiceIndex < dim.choices_labels.length) {
                  start = dim?.choices[choiceIndex];
                  end = start;
                  brushLabel = selection[0];
                }
              }
            }
          }
          if (!skip) {
            brushes.push({
              dimName,
              start,
              end,
              brushLabel
            });
          }
        }
      });
    // do not select all lines if no axis is brushed
    if (brushes.length === 0) {
      return;
    }

    let selectionIndex = 0;

    // check lines against brushes
    svgElement.selectAll('.line')
      .data(data)
      .each(function(lineData) {
        // initially each line is selected
        let isSelected = true;

        for (const b of brushes) {
          // if line falls outside of this brush, then it is de-selected
          if (!isCategoricalAxis(b.dimName, dimensions)) {
            // @FIXME: comparing (floating point) numbers, should use a reasonable tolerance
            //  for now, convert all numbers as 2 fixed floating point and compare
            const lineDataValue = +(+lineData[b.dimName]).toFixed(2);
            if (lineDataValue < +b.start || lineDataValue > +b.end) {
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

          if (lineData.status === ModelRunStatus.Ready) {
            // set an incremental index for this line as part of the selected line collection
            selectedLine.attr('selection-index', selectionIndex++);

            selectLine(selectedLine, undefined /* event */, lineData, getLineWidth(lineData));
            // save selected line
            selectedLines.push(lineData);
          }
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
      deleteFreeformInputs(svgElement);
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
        if (!isCategoricalAxis(dimName, dimensions)) {
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
      if (event && !event.shiftKey) {
        currentLineSelection.length = 0;
        cancelPrevLineSelection(svgElement);
      }

      const selectedLine = d3.select<SVGPathElement, ScenarioData>(this as SVGPathElement);
      const selectedLineData = selectedLine.datum() as ScenarioData;

      if (selectedLineData) {
        if (_.find(currentLineSelection, (data) => data.run_id === selectedLineData.run_id)) {
          currentLineSelection = _.filter(currentLineSelection, (data) => data.run_id !== selectedLineData.run_id);
          deselectLine(selectedLine, event, getLineWidth(selectedLineData));
          const lineDict = currentLineSelection.reduce((acc: Map<string|number, number>, sl, i) => {
            acc.set(sl.run_id, i);
            return acc;
          }, new Map());
          const lines = d3.select(this.parentElement).selectAll('.line');
          lines.data(data).each(function(lineData) {
            const index = lineDict.get(lineData.run_id);
            if (index !== undefined) {
              const selectedLine = d3.select<SVGPathElement, ScenarioData>(this as SVGPathElement);
              if (lineData.status === ModelRunStatus.Ready) {
                // set an incremental index for this line as part of the selected line collection
                selectedLine.attr('selection-index', index);
                selectLine(selectedLine, undefined /* event */, lineData, getLineSelectedWidth(lineData));
              }
            }
          });
        } else {
          currentLineSelection.push(selectedLineData);
          updateSelectionTooltips(svgElement, selectedLine);
          selectLine(selectedLine, event, d, getLineSelectedWidth(selectedLineData));
        }
      } else {
        currentLineSelection.length = 0;
      }

      // notify external listeners
      if (notifyExternalListeners) {
        onLinesSelection(currentLineSelection);
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

    if (selectedLineData.is_default_run === 0) {
      // stroke-width will overwrite for non default runs
      selectedLine
        .filter(function () { return d3.select(this).classed('selected') === false; })
        .attr('stroke-width', lineStrokeWidthHover);
    }

    // Use D3 to highlight the line; change its opacity
    selectedLine
      .filter(function() { return d3.select(this).classed('selected') === false; })
      .transition().duration(highlightDuration)
      .style('stroke', colorFunc)
      .style('opacity', lineOpacityVisible);

    // show tooltips
    // first update their text and position based on selected line data
    // then make them visible
    svgElement.selectAll<SVGTextElement, DimensionInfo>('.pc-hover-tooltip-text')
      .each(function(d) {
        const dimName = d.name;
        const value = selectedLineData[dimName];
        let formattedValue = value;
        if (!isCategoricalAxis(dimName, dimensions)) {
          const numValue = +value as number;
          formattedValue = Number.isInteger(numValue) ? numberIntegerFormat(numValue) : numberFloatFormat(numValue);
        } else {
          formattedValue = findLabelForValue(d, formattedValue);
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
            // get the corresponding label for this value if suitable
            formattedValue = findLabelForValue(d, formattedValue);
            return xScale(formattedValue as any) as number;
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
      .style('stroke', colorFunc)
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

        if (!isCategoricalAxis(dimName, dimensions)) {
          //
          // markers on numerical axes
          //
          const getMarkerValueFromPos = (pos: number) => {
            const xScale = getXScaleFromMap(dimName);
            // Normally we go from data to pixels, but here we're doing pixels to data
            return (xScale as D3ScaleLinear).invert(pos).toFixed(2);
          };
          const getMarkerPosFromValue = (value: number) => {
            const xScale = getXScaleFromMap(dimName);
            // convert data to pixel position
            return (xScale as D3ScaleLinear)(value);
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
            .on('click', function(event: PointerEvent) {
              //
              // user just clicked on the axis overlay to add a new marker
              //

              // do not allow the click event to automatically clear the marker UI which will be created shortly
              event.stopPropagation();

              const xLoc = d3.pointer(event)[0];
              const markerValue = getMarkerValueFromPos(xLoc);

              // make sure to place marker using correct data type
              /// each marker should have a unique id that is not based on pos/value since these can be updated
              /// each marker unique id must be stored in the rendered marker UI so that user events can target the correct marker
              const newMarkerData = {
                value: getValueInCorrectType(dimName, markerValue),
                xPos: xLoc,
                id: Date.now().toString()
              };
              axisMarkersMap[dimName].push(newMarkerData); // Push data to our array

              const dataSelection = gElement.selectAll<SVGSVGElement, MarkerInfo>('rect') // For new markers
                .data<MarkerInfo>(axisMarkersMap[dimName], d => '' + d.value);

              // add marker rect
              const markerRects = dataSelection
                .enter().append('rect')
                .attr('class', 'pc-marker')
                .attr('id', function(d) {
                  // Create an id for the marker for later update/removal
                  return 'marker-' + d.id;
                })
                .style('stroke', baselineMarkerStroke)
                .style('fill', baselineMarkerFill)
                .attr('x', function(d) { return d.xPos; })
                .attr('y', segmentsY)
                .attr('width', baselineMarkerSize)
                .attr('height', segmentsHeight);

              const showMarkerUI = (markerData: MarkerInfo) => {
                deleteFreeformInputs(svgElement); // remove prev marker UI, e.g., input fields

                // add a temporarly input box allowing the user to directly adjust the value of newly added marker, if needed
                const parentElement = this.parentElement as HTMLElement; // g element classed 'pc-marker-g'
                const markerInputTextHeight = 24;
                const markerInputTextWidth = axisRange[1] * 0.5;

                const markerUIContainer = d3.select(parentElement)
                  .append('foreignObject')
                  .attr('class', 'freeform-input')
                  .attr('width', markerInputTextWidth)
                  .attr('height', markerInputTextHeight)
                  .attr('x', markerData.xPos > markerInputTextWidth ? markerInputTextWidth : markerData.xPos) // move with the marker if enough space otherwise, place at the end
                  .attr('y', markerInputTextHeight * 0.25)
                  .append('xhtml:div')
                  .style('display', 'flex')
                ;

                const inputField = markerUIContainer
                  .append('xhtml:input')
                  .attr('value', markerData.value)
                  .attr('type', 'text')
                  .style('font-size', 'small')
                  .style('border-width', 'thin')
                  .style('width', '80%') // leave the remaining space for the button
                  .on('keyup', function(keyEvent) {
                    if (keyEvent.keyCode === 13) {
                      // Enter key pressed
                      const inputElement = this as HTMLInputElement;
                      const newInputValue = inputElement.value;
                      // validate new input value
                      if (newInputValue.length === 0 || isNaN(+newInputValue)) {
                        return;
                      }
                      // clamp new input value
                      const dimExtent = getXScaleFromMap(dimName).domain();
                      const newValidInputVal = _.clamp(+newInputValue, dimExtent[0] as number, dimExtent[1] as number);
                      // update the underlying marker data and re-render
                      const newXPos = getMarkerPosFromValue(newValidInputVal);
                      markerData.value = getValueInCorrectType(dimName, newValidInputVal.toString());
                      markerData.xPos = newXPos;
                      markerRects
                        .attr('x', newXPos);
                      // clear the input box
                      deleteFreeformInputs(svgElement);

                      // re-render all the new scenario lines, once a marker is updated
                      renderNewRunsLines();
                    }
                  })
                  .on('click', function(event: PointerEvent) {
                    event.stopPropagation();
                  });
                (inputField.node() as any).focus();
                (inputField.node() as any).select();

                // remove button
                markerUIContainer
                  .append('xhtml:input')
                  .attr('value', '-')
                  .attr('type', 'button')
                  .style('border-style', 'none')
                  .style('border-radius', '12px')
                  .style('color', 'white')
                  .style('font-size', 'large')
                  .style('line-height', 'normal')
                  .style('font-weight', 'bold')
                  .style('background-color', 'red')
                  .on('click', function() {
                    //
                    // user just clicked on the remove button of a specific marker UI, so the marker should be removed
                    //
                    axisMarkersMap[dimName] = axisMarkersMap[dimName].filter(el => el.value !== getValueInCorrectType(dimName, markerData.value as string));
                    gElement.selectAll<SVGSVGElement, MarkerInfo>('.pc-marker') // For existing markers
                      .data<MarkerInfo>(axisMarkersMap[dimName], d => '' + d.value)
                      .exit().remove()
                    ;
                    // remove all marker tooltips, if any
                    gElement.selectAll('text').remove();
                    // re-render all the new scenario lines
                    renderNewRunsLines();
                  });
              };

              // first time the marker is added, show the UI
              //  markerData is simply the last element added to the markers array
              showMarkerUI(newMarkerData);

              //
              // marker click
              //
              markerRects
                .on('click', (event: PointerEvent) => {
                  // first time the marker is added, show the UI
                  event.stopPropagation();
                  const markerData: MarkerInfo = d3.select(event.target as any).datum() as MarkerInfo;
                  showMarkerUI(markerData);
                });

              //
              // marker drag
              //
              markerRects
                .call(d3.drag<SVGRectElement, MarkerInfo>()
                  .on('drag', function(event) {
                    deleteFreeformInputs(svgElement); // remove current marker UI, e.g., input fields, if any

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
                    const markerData = axisMarkersMap[dimName].find(m => m.value === d.value);
                    if (markerData) {
                      markerData.xPos = newXPos;
                      const mv = getMarkerValueFromPos(newXPos);
                      markerData.value = getValueInCorrectType(dimName, mv);
                    }
                    d3.select(this)
                      .attr('x', newXPos);
                    // remove all marker tooltips, if any
                    gElement.selectAll('text').remove();

                    // after completing the update of the marker value on drag-end, we show the marker UI
                    if (markerData) {
                      showMarkerUI(markerData);
                    }

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
                  xPos: xLoc,
                  id: Date.now().toString()
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
            // @REVIEW: code is repeated to support hover over categorical segments when new-runs-mode is not active
            .on('mouseover', function() {
              const segmentData: any = d3.select(this).datum();
              const hoverValue: string = segmentData.start.toString();

              const scaleX = getXScaleFromMap(dimName);

              const { min, max } = getPositionRangeOnOrdinalAxis(segmentData.x, axisRange, scaleX.domain(), hoverValue);
              const xLoc = segmentData.x + ((max - min) / 2);

              // remove dots/spaces from the string since it will conflict with the d3 selected later on
              const hoverId = safeD3StringId(hoverValue);

              // Specify where to put label of text
              gElement.append('text')
                .attr('x', xLoc + markerTooltipOffsetX)
                .attr('y', segmentsY + markerTooltipOffsetY)
                .attr('id', 'h' + '-' + hoverId) // Create an id for text so we can select it later for removing on mouseout
                .style('fill', 'black')
                .style('font-size', axisLabelFontSize)
                .text(function() {
                  return hoverValue; // Value of the text
                });
            })
            .on('mouseout', function() {
              const segmentData: any = d3.select(this).datum();
              const hoverValue: string = segmentData.start.toString();

              // remove dots/spaces from the string since it will conflict with the d3 selected later on
              const hoverId = safeD3StringId(hoverValue);

              // Select text by id and then remove
              gElement.select('#h' + '-' + hoverId).remove(); // Remove text location
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
        if (!isCategoricalAxis(dimName, dimensions)) {
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
            // @REVIEW: code is repeated to support hover over categorical segments when new-runs-mode is active
            .on('mouseover', function() {
              const rectElement = d3.select(this);
              const hoverValue: string = rectElement.attr('start').toString();
              const x = +rectElement.attr('x');

              const scaleX = getXScaleFromMap(dimName);

              const { min, max } = getPositionRangeOnOrdinalAxis(x, axisRange, scaleX.domain(), hoverValue);
              const xLoc = x + ((max - min) / 2);

              // remove dots/spaces from the string since it will conflict with the d3 selected later on
              const hoverId = safeD3StringId(hoverValue);

              // Specify where to put label of text
              gElement.append('text')
                .attr('x', xLoc + markerTooltipOffsetX)
                .attr('y', segmentsY + markerTooltipOffsetY)
                .attr('id', 'h' + '-' + hoverId) // Create an id for text so we can select it later for removing on mouseout
                .style('fill', 'black')
                .style('font-size', axisLabelFontSize)
                .text(function() {
                  return hoverValue; // Value of the text
                });
            })
            .on('mouseout', function() {
              // const segmentData: any = d3.select(this).datum(); // segmentData.start
              // unfortunately, the click event if executed before this event would cause bound data to be lost
              //  so fetch the data differently
              const hoverValue: string = d3.select(this).attr('start').toString();

              // remove dots/spaces from the string since it will conflict with the d3 selected later on
              const hoverId = safeD3StringId(hoverValue);

              // Select text by id and then remove
              gElement.select('#h' + '-' + hoverId).remove(); // Remove text location
            })
          ;
        }
      });
  }
} // end of renderParallelCoordinates()

//
// Color scale
//
function colorFunc(this: SVGPathElement) {
  const svgElementSelection = d3.select<SVGPathElement, ScenarioData>(this);
  const status = svgElementSelection ? svgElementSelection.datum().status as string : ModelRunStatus.Ready;
  switch (status) {
    case ModelRunStatus.Ready:
      if (svgElementSelection.classed('selected')) {
        const selectionIndexStr: string | null = svgElementSelection.attr('selection-index');
        const selectionIndex = selectionIndexStr ? parseInt(selectionIndexStr) : 0;
        return colorFromIndex(selectionIndex);
      }
      return lineColorsReady; // ready but not selected
    case ModelRunStatus.Submitted:
      return lineColorsSubmitted;
    case ModelRunStatus.ExecutionFailed:
      return lineColorsFailed;
    case ModelRunStatus.Draft:
      return lineColorsDraft;
    default:
      return lineColorsUnknown;
  }
}

function renderBaselineMarkers() {
  if (!renderedAxes) {
    console.warn('Cannot render baseline markers before rendering the actual parallel coordinates!');
    return;
  }
  renderedAxes.selectAll('circle').remove();
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
      if (isCategoricalAxis(dimName, dimensions)) {
        let axisDefaultStr = axisDefault.toString();
        // get the corresponding label for this value if suitable
        axisDefaultStr = findLabelForValue(d, axisDefaultStr) as string;
        const { min, max } = getPositionRangeOnOrdinalAxis(xPos, axisRange, scaleX.domain(), axisDefaultStr);
        xPos = min + (max - min) / 2;
      }
      return xPos;
    })
    .attr('cy', 0);
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
      if (!isCategoricalAxis(dimName, dimensions)) {
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

function renderAxesLabels(svgElement: D3Selection, options: ParallelCoordinatesOptions, dimensions: Array<DimensionInfo>, rerenderChart: () => void, onGeoSelection: (d: ModelParameter) => void) {
  // Add label for each axis name
  const axesLabels = renderedAxes
    .append('text')
    .attr('class', 'pc-axis-name-text')
    .style('text-anchor', axisLabelTextAnchor)
    .attr('x', axisLabelOffsetX)
    .attr('y', axisLabelOffsetY)
    .text(d => (d.display_name ?? d.name))
    .style('fill', axisLabelFillColor)
    .style('font-size', axisLabelFontSize);

  renderedAxes
    .filter(d => isOutputDimension(dimensions, d.name))
    .append('text')
    .style('text-anchor', axisLabelTextAnchor)
    .attr('x', axisLabelOffsetX)
    .attr('y', axisLabelOffsetY * 2)
    .text('OUTPUT')
    .style('fill', axisLabelFillColor)
    .style('font-size', axisOutputLabelFontSize);

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

  // render additional UI for freeform and geo params
  renderedAxes
    .filter(d => (d as ModelParameter).data_type === ModelParameterDataType.Freeform)
    // add a button to allow adding a new freeform value or a validated geo region
    .each(function() {
      const text = d3.select(this).select('.pc-axis-name-text');
      const textNode = text.node() as SVGGraphicsElement;
      const textBBox = textNode.getBBox();

      d3.select(this)
        .append('foreignObject')
        .attr('class', 'freeform-button')
        .attr('width', axisRange[1])
        .attr('height', 25)
        .attr('x', axisLabelOffsetX + textBBox.width + 10)
        .attr('y', axisLabelOffsetY - textBBox.height)
        .attr('visibility', options.newRunsMode ? 'visible' : 'hidden')
        .append('xhtml:input')
        .attr('value', '+')
        .attr('type', 'button')
        .style('border-style', 'none')
        .style('border-radius', '16px')
        .style('color', 'white')
        .style('font-size', 'medium')
        .style('line-height', 'normal')
        .style('font-weight', 'bold')
        .style('background-color', 'deepskyblue')
        .on('click', function(this: any, event: PointerEvent) {
          const d3Input = d3.select(this);
          const d = d3Input.datum() as ModelParameter;
          event.stopPropagation();

          // is this a geo-parameter?
          if (isGeoParameter(d.type)) {
            //
            // show a modal to enable searching for (one or more) valid GADM region name(s)
            //
            onGeoSelection(d);
          } else {
            //
            // this is a normal freeform param, e.g., search-term, so add an input box for the user to enter a new value
            //  note how the input-box is added as foreign object since it is added within the SVG element
            //
            const parentElement = this.parentElement.parentElement; // the axis element
            const inputField = d3.select(parentElement)
              .append('foreignObject')
              .attr('class', 'freeform-input')
              .attr('width', axisRange[1])
              .attr('height', '24')
              .attr('x', axisLabelOffsetX + textBBox.width + 10)
              .attr('y', axisLabelOffsetY - textBBox.height)
              .append('xhtml:input')
              .attr('placeholder', 'type new value')
              .attr('type', 'text')
              .style('font-size', 'small')
              .style('border-width', 'thin')
              .on('keyup', function(keyEvent) {
                if (keyEvent.keyCode === 13) {
                  // Enter key pressed
                  const inputElement = this as HTMLInputElement;
                  const newInputValue = inputElement.value;
                  const currentChoices = d.choices as Array<string | number>;
                  if (!currentChoices.includes(newInputValue)) {
                    // note that by adding the value, we have modified the metadata of the datacube
                    // and that change will be discarded unless a model run is issued with this value
                    currentChoices.push(newInputValue);
                    // re-render (and possible add a marker)
                    rerenderChart();
                  }
                  // clear the input box
                  deleteFreeformInputs(svgElement);
                }
              })
              .on('click', function(event: PointerEvent) {
                event.stopPropagation();
              });
            (inputField.node() as any).focus();
          }
        })
      ;
    });
}

function deleteFreeformInputs(svgElement: D3Selection) {
  svgElement.selectAll('.freeform-input').remove();
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
          value = brushRange.brushLabel !== undefined ? brushRange.brushLabel : brushRange.start + ' : ' + brushRange.end;

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
        // showing labels for lines that were selected by direct click
        value = selectedLineData ? selectedLineData[dimName] : 'undefined';
        // get the corresponding label for this value if suitable
        value = findLabelForValue(d, value);

        formattedValue = value;
        if (!isCategoricalAxis(dimName, dimensions)) {
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
      let xPos = textBBox.x - tooltipRectPaddingX;
      const width = textBBox.width + tooltipRectPaddingX * 2;
      const offset = (xPos + width) - axisRange[1];
      if (offset > 0) {
        xPos -= offset;
        text.attr('x', xPos + tooltipRectPaddingX);
      }
      rect
        .attr('x', xPos)
        .attr('y', textBBox.y - tooltipRectPaddingY)
        .attr('width', width)
        .attr('height', textBBox.height + tooltipRectPaddingY * 2);
      text.raise();
    });
}

function findLabelForValue(dim: DimensionInfo, value: string | number) {
  let labelValue = value;
  if ((dim as ModelParameter) !== undefined && (dim as ModelParameter).data_type !== ModelParameterDataType.Freeform) {
    // check if we have label choices array
    if (dim.choices_labels !== undefined && dim.choices_labels.length > 0) {
      const choiceIndex = dim.choices?.findIndex(c => c === value) ?? 0;
      if (choiceIndex >= 0 && choiceIndex < dim.choices_labels.length) {
        labelValue = dim.choices_labels[choiceIndex];
      }
    }
  }
  // special case for geo parameters: map their defualt-value to the default-label-value
  if (isGeoParameter(dim.type)) {
    const dimAsModelParam = (dim as ModelParameter);
    if (value as string === dimAsModelParam.default && dimAsModelParam.additional_options && dimAsModelParam.additional_options.default_value_label) {
      labelValue = dimAsModelParam.additional_options.default_value_label;
    }
  }
  return labelValue;
}

function selectLine(selectedLine: D3LineSelection, event: PointerEvent | undefined, d: ScenarioData, lineWidth: number) {
  const selectedLineData = selectedLine.datum();
  if (selectedLineData) {
    // Use D3 to select the line, change color and size
    const selectedLineIndex = currentLineSelection.findIndex((sl) => sl.run_id === selectedLineData.run_id);
    if (selectedLineIndex > -1) {
      selectedLine.attr('selection-index', selectedLineIndex);
    }

    selectedLine
      .classed('selected', true)
      .transition().duration(highlightDuration)
      .style('stroke', colorFunc)
      .style('opacity', lineOpacityVisible)
      .attr('stroke-width', lineWidth);

    // since a line is just select, prevent other higher up elements (e.g. svg) from cancelling this selection
    if (event) {
      event.stopPropagation();
    }
  }
}

// function deselectLine(selectedLine: D3LineSelection, event: PointerEvent | undefined, d: ScenarioData, lineWidth: number) {
function deselectLine(selectedLine: D3LineSelection, event: PointerEvent | undefined, lineWidth: number) {
  const selectedLineData = selectedLine.datum();

  if (selectedLineData) {
    // Use D3 to select the line, change color and size
    selectedLine
      .classed('selected', false)
      .transition().duration(highlightDuration)
      .style('stroke', colorFunc)
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
  return dimensions
    .filter(d => { return !d.is_drilldown; });
};

const filterInvisibleDimensionData = (dimensions: Array<ModelParameter>) => {
  // this should only filter input parameters
  return dimensions
    .filter(d => {
      if (isOutputDimension(dimensions, d.name)) return true;
      return d.is_visible;
    });
};

const filterDateDimensionData = (dimensions: Array<ModelParameter>) => {
  // this should only filter input parameters
  return dimensions
    .filter(d => d.type !== DatacubeGenericAttributeVariableType.Date && d.type !== DatacubeGenericAttributeVariableType.DateRange);
};

function isOutputDimension(dimensions: Array<DimensionInfo>, dimName: string) {
  // FIXME: only the last dimension is the output dimension
  return getOutputDimension(dimensions).name === dimName;
}

function getOutputDimension(dimensions: Array<DimensionInfo>) {
  return dimensions[dimensions.length - 1];
}

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
    .attr('stroke-width', (d) => getLineWidth(d))
    .attr('selection-index', 0);

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
      let xPos = textBBox.x - tooltipRectPaddingX;
      const width = textBBox.width + tooltipRectPaddingX * 2;
      const offset = (xPos + width) - axisRange[1];
      if (offset > 0) {
        xPos -= offset;
        text.attr('x', xPos + tooltipRectPaddingX);
      }
      rect
        .attr('x', xPos)
        .attr('y', textBBox.y - tooltipRectPaddingY)
        .attr('width', width)
        .attr('height', textBBox.height + tooltipRectPaddingY * 2);
      text.raise();
    });
};

// utility function to return the pixel positions for the start/end of a specific ordinal segment
//  which is identified by the the segment value
const getPositionRangeOnOrdinalAxis = (xPos: number, axisRange: Array<number>, axisDomain: Array<string | number>, val: string | number) => {
  const totalDashesAndGaps = (axisDomain.length * 2) - 1;
  const dashSize = (axisRange[1] - axisRange[0]) / totalDashesAndGaps;
  let min;
  if (xPos === axisRange[0]) {
    min = axisRange[0];
  } else {
    // need to get the dash offset based on value index
    let valIndx = axisDomain.findIndex((v: string | number) => v === val);
    if (valIndx === -1) {
      // value was not found.
      //  this is a special case where perhaps comparing
      //  numerical values as string (e.g., '1' vs '1.0') caused a not-found situation
      valIndx = axisDomain.findIndex((v: string | number) => parseFloat(v as string) === parseFloat(val as string));
    }
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
  pcTypes: { [key: string]: string },
  axisRange: Array<number>,
  height: number) => {
  //
  const xScaleMap: {[key: string]: D3Scale} = {};

  // each axis will provide min/max values that should be used as the scale domain
  //  alternatively, scan the all the data entries to find the min/max
  const useAxisRangeFromData = true;

  const numberFunc = function(name: string) {
    let dataExtent: [number, number] | [undefined, undefined] = [undefined, undefined];
    const outputVarName = getOutputDimension(dimensions).name;
    const dim = dimensions.find(d => d.name === name);

    if (useAxisRangeFromData && outputVarName !== name) {
      // this is only valid for input variables
      if (isCategoricalAxis(name, dimensions)) {
        // a categorical dimension (i.e., discrete-based axis)
        //  can have a list of choices as numbers or strings
        if (!dim?.type.startsWith('str')) {
          // note that if 'type' is string then the stringFunc would have been used automatically
          return stringFunc(name);
        }
      } else {
        // a numerical continuous dimensions
        const min = dim?.min;
        const max = dim?.max;
        if (_.isFinite(min) && _.isFinite(max)) {
          dataExtent = [min ?? 0, max ?? 0];
        } else {
          // derive from data if min/max are invalid
          dataExtent = d3.extent(data.map(point => +point[name]));
        }
      }
    } else {
      dataExtent = d3.extent(data.map(point => +point[name]));
    }
    if (dataExtent[0] === undefined || dataExtent[1] === undefined) {
      console.warn('Unable to derive extent from data for ' + name + '. A default linear scale will be created!', data);

      // this dimension should have an undefined scale:
      //  e.g., an output dimension where ALL runs have non-ready status
      //  i.e., no line will ever have a value for this dimension axis, but we still want to render its axis

      // ensure we return a default lineaer scale
      dataExtent = [0, 1];
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
    let dataExtent: Array<string | number> = [];
    const dim = dimensions.find(d => d.name === name);

    if (useAxisRangeFromData) {
      // note this is only valid for inherently ordinal dimensions not those explicitly converted to be ordinal
      dataExtent = dim?.choices_labels ? dim?.choices_labels : (dim?.choices ?? dim?.choices ?? []);
    }

    let dataChoices = data.map(function(p) { return p[name]; }); // return an array of values for all runs
    if (dataExtent.length === 0) {
      dataExtent = dataChoices;
    }

    let isFreeformParam = false;

    // ensure that dataExtent and dataChoices are merged as one list (including the default value)
    const outputVarName = getOutputDimension(dimensions).name;
    if (outputVarName !== name) {
      const dimAsModelParam = (dim as ModelParameter);
      // sometimes, a geo param may have a default formatted in a less-human-readable way
      if (isGeoParameter(dimAsModelParam.type) && dimAsModelParam.additional_options && dimAsModelParam.additional_options.default_value_label) {
        // add the default value label
        dataChoices.push(dimAsModelParam.additional_options.default_value_label);
        // remove the default-value from the list of choices
        //  since the default-value-label has been just added
        //  and only do so if the default-value and label are different
        if (dimAsModelParam.default !== dimAsModelParam.additional_options.default_value_label) {
          dataChoices = dataChoices.filter(val => val !== dimAsModelParam.default);
          dataExtent = dataExtent.filter(val => val !== dimAsModelParam.default);
        }
      } else {
        dataChoices.push(dimAsModelParam.default);
      }

      isFreeformParam = dimAsModelParam.data_type === ModelParameterDataType.Freeform;
    }
    if (isFreeformParam) {
      // only freeform params can have combined list of choices.
      // other ordinal params, however, should have a fixed list of choices
      dataExtent = _.uniq(_.union(dataExtent, dataChoices));
    }

    if (dataExtent[0] === undefined || dataExtent[1] === undefined) {
      console.warn('Unable to derive extent from data for ' + name + '. A default point scale will be created!', data);

      // this dimension should have an undefined scale:
      //  e.g., an output dimension where ALL runs have non-ready status
      //        a parameter that is a freeform dimension with no valid list of choices
      //  i.e., no line will ever have a value for this dimension axis, but we still want to render its axis

      // ensure we return a default categorical scale
      if (dataExtent.length > 0) {
        // NOTE: these are mostly string-based axes but not with valid choices, i.e., freeform axes --> should have been annotated as such
        const dim = dimensions.find(d => d.name === name) as ModelParameter;
        const defValue = dim.default;
        if (!isGeoParameter(dim.type) && !dataExtent.includes(defValue)) {
          dataExtent.push(defValue);
        }
      } else {
        dataExtent.push('dummay-last');
        dataExtent.unshift('dummy-first');
      }
    }

    // extend the domain of each axis to ensure a nice scale rendering
    if (enlargeAxesScaleToFitData) {
      dataExtent.push('dummay-last');
      dataExtent.unshift('dummy-first');
    }
    return d3.scalePoint<string | number>()
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
    str: stringFunc,
    boolean: numberFunc,
    geo: stringFunc
  };
  // add support for rendering geo-parameters
  Object.values(DatacubeGeoAttributeVariableType).forEach(v => {
    defaultScales[v] = stringFunc;
  });

  // For each dimension, build a scale and cache its function in the map
  for (const i in dimensions) {
    const name = dimensions[i].name;
    const scaleFuncParameterized = defaultScales[pcTypes[name]];
    if (scaleFuncParameterized === undefined) {
      console.error('unsupported parameter type: ' + dimensions[i].type + ' for ' + name);
    } else {
      xScaleMap[name] = scaleFuncParameterized(name);
    }
  }

  // Build the y scale -> it find the best position (vertically) for each x axis
  const y = d3.scalePoint()
    .range([0, height])
    .domain(dimensions.map(d => d.name));

  return { x: xScaleMap, y };
};

// handy function to return the d3 scale for any given dimension from the map of scale functions
const getXScaleFromMap = (dimName: string) => {
  return xScaleMap[dimName];
};

export {
  renderParallelCoordinates
};
