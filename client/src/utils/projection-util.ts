import _ from 'lodash';
import forecast from './forecast';
import {
  getYearFromTimestamp,
  getNumberOfMonthsSinceEpoch,
  getTimestampMillisFromYear,
  getTimestampFromNumberOfMonths,
} from '@/utils/date-util';
import { isConceptNodeWithDatasetAttached } from '@/utils/index-tree-util';

import { ProjectionPointType, TemporalResolutionOption } from '@/types/Enums';
import { TimeseriesPoint, TimeseriesPointProjected } from '@/types/Timeseries';
import {
  ConceptNode,
  ProjectionConstraint,
  ProjectionResults,
  ProjectionRunInfo,
} from '@/types/Index';

export enum NodeProjectionType {
  /**
   * This projection type is used when data is empty and there's no projection result.
   */
  None = 'None',
  /**
   * This projection type is used when the projection data for the node is calculated from weighed sum of its children node.
   */
  WeightedSum = 'Weighted Sum',
  /**
   * This projection type is used if input data with a single point is interpolated constantly
   */
  ConstantInterpolation = 'Constant Interpolation',
}

type ProjectionPoint = {
  x: number;
  y: number;
  projectionType: ProjectionPointType;
};

const multiply = (data: TimeseriesPointProjected[], factor: number) =>
  data.map((d) => ({ ...d, value: factor * d.value }));

const invert = (data: TimeseriesPointProjected[]) => {
  return data.map((d) => ({ ...d, value: 1 - d.value }));
};

const invertData = (data: TimeseriesPointProjected[], isInvert = true) => {
  return isInvert ? invert(data) : data;
};

const sum = (...data: TimeseriesPointProjected[][]) => {
  const _sum = (dataA: TimeseriesPointProjected[], dataB: TimeseriesPointProjected[]) => {
    const result: TimeseriesPointProjected[] = [];
    const length = Math.max(dataA.length, dataB.length);
    for (let index = 0; index < length; index++) {
      const pointA = dataA[index];
      const pointB = dataB[index];
      const point: TimeseriesPointProjected = {
        projectionType:
          pointA?.projectionType === ProjectionPointType.Historical &&
          pointB?.projectionType === ProjectionPointType.Historical
            ? ProjectionPointType.Historical
            : ProjectionPointType.Interpolated,
        timestamp: pointA?.timestamp || pointB?.timestamp || 0,
        value: (pointA?.value || 0) + (pointB?.value || 0),
      };
      result.push(point);
    }
    return result;
  };
  const [first, ...rest] = data;
  return rest.length === 0 ? first : rest.reduce((prev, cur) => _sum(prev, cur), first);
};

/**
 * Return function that convert timestamp value to yearly or monthly step
 * based on the provided data resolution option
 * @param dataResOption Data temporal resolution option
 */
const getTimestampCovertFunctions = (
  dataResOption: TemporalResolutionOption.Year | TemporalResolutionOption.Month
) => {
  const fromTimestamp =
    dataResOption === TemporalResolutionOption.Year
      ? getYearFromTimestamp
      : getNumberOfMonthsSinceEpoch;
  const toTimestamp =
    dataResOption === TemporalResolutionOption.Year
      ? getTimestampMillisFromYear
      : getTimestampFromNumberOfMonths;
  return {
    fromTimestamp,
    toTimestamp,
  };
};

const calculateNumberOfForecastStepsNeeded = (
  data: [number, number][],
  startX: number,
  endX: number
) => {
  const stride = data[1][0] - data[0][0];
  const firstDpX = data[0][0];
  const lastDpX = data[data.length - 1][0];
  const backcastSteps = startX < firstDpX ? Math.ceil((firstDpX - startX) / stride) : 0;
  const forecastSteps = endX > lastDpX ? Math.ceil((endX - lastDpX) / stride) : 0;
  return {
    forecastSteps,
    backcastSteps,
  };
};

const concatAndInterpolate = (
  backcast: ProjectionPoint[],
  historical: ProjectionPoint[],
  forecast: ProjectionPoint[]
) => {
  const interpolationResult = interpolateLinear([...backcast, ...historical, ...forecast]);
  const isDataPointHistorical = (d: any) =>
    d.dataPoint.projectionType === ProjectionPointType.Historical;
  const firstHistoricalDataPointIndex = _.findIndex(interpolationResult, isDataPointHistorical);
  const lastHistoricalDataPointIndex = _.findLastIndex(interpolationResult, isDataPointHistorical);

  // Assign correct projectionType to each data point
  return interpolationResult.map((v, index) => {
    let projectionType = ProjectionPointType.Historical;
    if (index < firstHistoricalDataPointIndex) {
      projectionType = ProjectionPointType.Backcasted;
    } else if (index > lastHistoricalDataPointIndex) {
      projectionType = ProjectionPointType.Forecasted;
    } else if (v.isInterpolated) {
      projectionType = ProjectionPointType.Interpolated;
    }
    return {
      x: v.dataPoint.x,
      y: v.dataPoint.y,
      projectionType,
    };
  });
};

/**
 * Run linear interpolation on the data so that missing data between two adjacent data points are filled
 * by making sure that the distance between each two points are consistently 1.
 * @param data Data with {x, y} coordinates
 */
export const interpolateLinear = <T extends { x: number; y: number }>(data: T[]) => {
  const result: { dataPoint: T | { x: number; y: number }; isInterpolated: boolean }[] = [];
  const lastPoint = data[data.length - 1];
  for (let index = 0; index < data.length - 1; index++) {
    const curPoint = data[index];
    const { x: x1, y: y1 } = curPoint;
    const { x: x2, y: y2 } = data[index + 1];
    const slope = (y2 - y1) / (x2 - x1);
    const xDistance = x2 - x1;
    result.push({ dataPoint: { ...curPoint, x: x1, y: y1 }, isInterpolated: false });
    // push interpolated points
    for (let j = 1; j < xDistance; j++) {
      const x = x1 + j;
      result.push({ dataPoint: { x: x, y: slope * j + y1 }, isInterpolated: true });
    }
  }
  result.push({ dataPoint: { ...lastPoint }, isInterpolated: false });
  return result;
};

/**
 * Run linear interpolation within the target period window using the value of provided timeseries point
 */
export const runConstantInterpolation = (
  point: TimeseriesPoint,
  targetPeriod: { start: number; end: number },
  dataResOption: TemporalResolutionOption.Month | TemporalResolutionOption.Year
): TimeseriesPointProjected[] => {
  const { fromTimestamp, toTimestamp } = getTimestampCovertFunctions(dataResOption);
  const pointX = fromTimestamp(point.timestamp);
  const startX = fromTimestamp(targetPeriod.start);
  const endX = fromTimestamp(targetPeriod.end);
  const points: ProjectionPoint[] = [
    {
      x: startX,
      y: point.value,
      projectionType:
        pointX === startX ? ProjectionPointType.Historical : ProjectionPointType.Interpolated,
    },
    {
      x: endX,
      y: point.value,
      projectionType:
        pointX === endX ? ProjectionPointType.Historical : ProjectionPointType.Interpolated,
    },
  ];
  // if the point is within the target period window, insert the point between them
  if (startX < pointX && pointX < endX) {
    points.splice(1, 0, {
      x: pointX,
      y: point.value,
      projectionType: ProjectionPointType.Historical,
    });
  }
  return interpolateLinear(points).map(({ dataPoint }) => {
    let projectionType = ProjectionPointType.Interpolated;
    if ('projectionType' in dataPoint) {
      projectionType = dataPoint.projectionType;
    }
    return {
      timestamp: toTimestamp(dataPoint.x),
      value: dataPoint.y,
      projectionType,
    };
  });
};

/**
 * Run projection on the data and return new projected timeseries data with backcasted and forecasted data points
 * for the provided time window, targetPeriod.
 * @param timeseries timeseries data
 * @param targetPeriod target period that final project data will cover. targetPeriod.start and targetPeriod.end expects unix timestamp milliseconds
 * @param dataResOption data resolution option
 */
export const runProjection = (
  timeseries: TimeseriesPoint[],
  targetPeriod: { start: number; end: number },
  dataResOption: TemporalResolutionOption.Month | TemporalResolutionOption.Year
) => {
  const { fromTimestamp, toTimestamp } = getTimestampCovertFunctions(dataResOption);

  // convert timeseries data to [x, y][] format
  const inputData = timeseries.map(
    ({ timestamp, value }) => [fromTimestamp(timestamp), value] as [number, number]
  );
  const startX = fromTimestamp(targetPeriod.start);
  const endX = fromTimestamp(targetPeriod.end);

  const { forecastSteps, backcastSteps } = calculateNumberOfForecastStepsNeeded(
    inputData,
    startX,
    endX
  );

  // Run forecast
  const runner = forecast.initialize(inputData, { forecastSteps, backcastSteps });
  const fResult = runner.runAuto();

  const backcastPoints = fResult.backcast.data.map(([x, y]) => ({
    x,
    y,
    projectionType: ProjectionPointType.Backcasted,
  }));
  const historicalPoints = inputData.map(([x, y]) => ({
    x,
    y,
    projectionType: ProjectionPointType.Historical,
  }));
  const forecastPoints = fResult.forecast.data.map(([x, y]) => ({
    x,
    y,
    projectionType: ProjectionPointType.Forecasted,
  }));

  // Fill missing data between each adjcent data points using linear interpolation and cut data to fit within the given period.
  const timeseriesProjected = concatAndInterpolate(backcastPoints, historicalPoints, forecastPoints)
    // Only consider points within the range provided by the period
    .filter((dp) => dp.x >= startX && dp.x <= endX)
    .map(({ x, y, projectionType }) => {
      const item: TimeseriesPointProjected = {
        timestamp: toTimestamp(x),
        value: y,
        projectionType,
      };
      return item;
    });

  return {
    projectionData: timeseriesProjected,
    ...fResult,
  };
};

/**
 * Apply constraints to the timeseries data and return new timeseries data.
 * It either adds new points to the data or override existing data points with corresponding constraint points at same timestamp.
 * @param timeseries Timeseries or projected timeseries data
 * @param constraints constraints
 */
export const applyConstraints = <T extends TimeseriesPoint | TimeseriesPointProjected>(
  timeseries: T[],
  constraints: ProjectionConstraint[]
): T[] => {
  if (constraints.length === 0) return timeseries;
  // TODO: Make sure constraints are always sorted when adding a constraint to existing list then remove this orderBy function.
  const constraintsSorted: T[] = _.orderBy(constraints, ['timestamp'], ['asc']).map((v) => ({
    ...v,
    projectionType: ProjectionPointType.Constraint,
  })) as T[];

  const result: T[] = [];
  let i = 0;
  let j = 0;
  const tLength = timeseries.length;
  const cLength = constraintsSorted.length;
  while (i < tLength && j < cLength) {
    const tPoint = timeseries[i];
    const cPoint = constraintsSorted[j];
    if (tPoint.timestamp < cPoint.timestamp) {
      // Insert the timeseries point
      result.push(tPoint);
      i++;
    } else if (tPoint.timestamp === cPoint.timestamp) {
      // Override the timeseries point with the constraint point
      result.push(cPoint);
      i++;
      j++;
    } else {
      // Insert the constraint
      result.push(cPoint);
      j++;
    }
  }
  // Insert rest of the timeseries points
  while (i < tLength) {
    result.push(timeseries[i]);
    i++;
  }
  // Insert rest of the constraints points
  while (j < cLength) {
    result.push(constraintsSorted[j]);
    j++;
  }
  return result;
};

/**
 * Set `projectionType` to constraint type for the constraint that are applied to given timeseries data.
 * We are assuming that constraints are already applied to the timeseries data but only constraint type values are not set for each constraint data point.
 * @param timeseries timeseries data with constraints
 * @param constraints constraints used applied to the timeseries data
 */
const setConstraintsType = (
  timeseries: TimeseriesPointProjected[],
  constraints: ProjectionConstraint[]
) => {
  if (constraints.length === 0) return timeseries;
  const constraintMap = new Map<number, number>();
  for (const c of constraints) {
    constraintMap.set(c.timestamp, c.value);
  }
  return timeseries.map((v) => {
    return constraintMap.has(v.timestamp)
      ? { ...v, projectionType: ProjectionPointType.Constraint }
      : v;
  });
};

/**
 * Create a projection runner that runs projection on the dataset nodes and computes weighted sum of children nodes for
 * the provided concept tree
 * @param conceptTree Concept tree
 * @param historicalData An object representing a map that maps historical timeseries data to each node id
 * @param targetPeriod Target projection time period window
 * @param dataResOption Data resolution option
 */
export const createProjectionRunner = (
  conceptTree: ConceptNode,
  historicalData: { [nodeId: string]: TimeseriesPoint[] },
  targetPeriod: { start: number; end: number },
  dataResOption: TemporalResolutionOption
) => {
  // With unsupported temporal resolution option, fall back to month resolution option
  const dataTempResOption = !(
    dataResOption === TemporalResolutionOption.Month ||
    dataResOption === TemporalResolutionOption.Year
  )
    ? TemporalResolutionOption.Month
    : dataResOption;
  const tree = conceptTree;
  const data = historicalData;
  const period = targetPeriod;
  const resultForDatasetNode: ProjectionResults = {};
  const resultForWeightedSumNodes: ProjectionResults = {};
  const runInfo: ProjectionRunInfo = {};

  let _constraints: { [nodeId: string]: ProjectionConstraint[] } | null = null;

  const _calculateWeightedSum = (node: ConceptNode) => {
    if (isConceptNodeWithDatasetAttached(node)) {
      if (!resultForDatasetNode[node.id]) return null;
      const projectedSeries = resultForDatasetNode[node.id];
      return invertData(projectedSeries, node.dataset.isInverted);
    }

    // Retrieve the weighted projected timeseries data from children
    const childProjectionSeriesData = node.components
      .map((c) => {
        const timeseries = _calculateWeightedSum(c.componentNode);
        return timeseries !== null
          ? multiply(invertData(timeseries, c.isOppositePolarity), c.weight / 100)
          : null;
      })
      .filter((s): s is TimeseriesPointProjected[] => s !== null);

    if (childProjectionSeriesData.length === 0) {
      return null;
    }

    // Calculate the sum of children's weighted projected timeseries data
    const weightedSumSeries = sum(...childProjectionSeriesData);
    const constraints = (_constraints && _constraints[node.id]) || [];
    resultForWeightedSumNodes[node.id] = applyConstraints(weightedSumSeries, constraints);
    runInfo[node.id] = { method: NodeProjectionType.WeightedSum };
    return resultForWeightedSumNodes[node.id];
  };

  const runner = {
    /**
     * Set constraints
     */
    setConstraints(constraints: { [nodeId: string]: ProjectionConstraint[] } | null) {
      _constraints = constraints;
      return runner;
    },

    /**
     * Run projection on all dataset nodes
     */
    projectAllDatasetNodes() {
      for (const nodeId of Object.keys(data)) {
        runner.projectDatasetNode(nodeId);
      }
      return runner;
    },

    /**
     * Run projection on a single dataset node with provided options
     * @param nodeId node id
     * @param options options - options e.g forecast method
     */
    projectDatasetNode(nodeId: string) {
      const series = data[nodeId];
      if (!series) return runner;

      const constraints = (_constraints && _constraints[nodeId]) || [];
      const inputData = applyConstraints(series, constraints);
      if (inputData.length > 1) {
        const { method, forecast, backcast, projectionData } = runProjection(
          inputData,
          period,
          dataTempResOption
        );
        runInfo[nodeId] = {
          method,
          forecast,
          backcast,
        };
        resultForDatasetNode[nodeId] = setConstraintsType(projectionData, constraints);
      } else if (inputData.length === 1) {
        // Handle data with single point
        const data = runConstantInterpolation(inputData[0], period, dataTempResOption);
        runInfo[nodeId] = { method: NodeProjectionType.ConstantInterpolation };
        resultForDatasetNode[nodeId] = setConstraintsType(data, constraints);
      } else {
        // Empty input data
        runInfo[nodeId] = { method: NodeProjectionType.None };
        resultForDatasetNode[nodeId] = [];
      }
      return runner;
    },

    /**
     * Update historical data for a node with given node id
     * @param nodeId Dataset node id
     * @param data historical timeseries data
     */
    updateHistoricalData(nodeId: string, data: TimeseriesPoint[]) {
      console.log('Not Yet Implemented', nodeId, data);
      // TODO: Implement this method
      return runner;
    },

    /**
     * Traverse the tree and calculate weighted sum of all children data for each non dataset node
     */
    calculateWeightedSum() {
      _calculateWeightedSum(tree);
      return runner;
    },

    /**
     * This runs projection on all datasets nodes and also calculate the weighted sum for none dataset nodes
     */
    runProjection() {
      runner.projectAllDatasetNodes().calculateWeightedSum();
      return runner;
    },

    /**
     * Get projection results
     */
    getResults() {
      return {
        ...runner.getProjectionResultForWeightedSumNodes(),
        ...runner.getProjectionResultForDatasetNodes(),
      };
    },

    /** Return an object representing run information metadata for each node */
    getRunInfo() {
      return runInfo;
    },

    /**
     * Return the projection result, weighted sum for each none dataset node
     */
    getProjectionResultForWeightedSumNodes() {
      return resultForWeightedSumNodes;
    },

    /**
     * Return the projection result for each dataset node
     */
    getProjectionResultForDatasetNodes() {
      return resultForDatasetNode;
    },
  };
  return runner;
};

/**
 * Splits a timeseries into segments where each segment can be rendered with the same encoding.
 * @param timeseries a mix of projected, interpolated, and historical points.
 * @returns An array of line segments, and whether each is projected or not.
 */
export const splitProjectionsIntoLineSegments = (timeseries: TimeseriesPointProjected[]) => {
  const indexOfFirstHistoricalPoint = timeseries.findIndex(
    (point) => point.projectionType === ProjectionPointType.Historical
  );
  let indexOfLastHistoricalPoint = 0;
  timeseries.forEach((point, i) => {
    if (point.projectionType === ProjectionPointType.Historical) {
      indexOfLastHistoricalPoint = i;
    }
  });
  // If no historical point is found, return one projected segment that includes the whole
  //  timeseries.
  if (indexOfFirstHistoricalPoint === -1) {
    return [{ isProjectedData: true, segment: timeseries }];
  }
  // Add one so that the backcast line is drawn right up to and including the first historical
  //  data point.
  const backcastSegment = {
    isProjectedData: true,
    segment: timeseries.slice(0, indexOfFirstHistoricalPoint + 1),
  };
  const historicalSegment = {
    isProjectedData: false,
    segment: timeseries.slice(indexOfFirstHistoricalPoint, indexOfLastHistoricalPoint + 1),
  };
  const forecastSegment = {
    isProjectedData: true,
    segment: timeseries.slice(indexOfLastHistoricalPoint),
  };
  return [backcastSegment, historicalSegment, forecastSegment].filter(
    ({ segment }) => segment.length !== 0
  );
};
