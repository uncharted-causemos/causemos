import _ from 'lodash';
import forecast, { ForecastResult, ForecastMethod } from './forecast';
import {
  getYearFromTimestamp,
  getNumberOfMonthsSinceEpoch,
  getTimestampMillisFromYear,
  getTimestampFromNumberOfMonths,
} from '@/utils/date-util';
import { isConceptNodeWithDatasetAttached } from '@/utils/index-tree-util';

import { ProjectionPointType, TemporalResolutionOption } from '@/types/Enums';
import { TimeseriesPoint, TimeseriesPointProjected } from '@/types/Timeseries';
import { ConceptNode, ConceptNodeWithoutDataset } from '@/types/Index';

type ProjectionPoint = {
  x: number;
  y: number;
  projectionType: ProjectionPointType;
};

type ProjectionResults = {
  [nodeId: string]: TimeseriesPointProjected[];
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
 * Run projection on the data and return new projected timeseries data with backcasted and forecasted data points
 * for the provided time window, targetPeriod.
 * @param timeseries timeseries data
 * @param targetPeriod target period that final project data will cover. targetPeriod.start and targetPeriod.end expects unix timestamp milliseconds
 * @param dataResOption data resolution option
 */
export const runProjection = (
  timeseries: TimeseriesPoint[],
  targetPeriod: { start: number; end: number },
  dataResOption: TemporalResolutionOption.Year | TemporalResolutionOption.Month
) => {
  const { fromTimestamp, toTimestamp } = getTimestampCovertFunctions(dataResOption);

  // convert timeseries data to [x, y][] format
  const inputData = timeseries.map(
    ({ timestamp, value }) => [fromTimestamp(timestamp), value] as [number, number]
  );
  const startX = fromTimestamp(targetPeriod.start);
  const endX = fromTimestamp(targetPeriod.end);

  if (startX >= inputData[inputData.length - 1][0] || endX <= inputData[0][0]) {
    throw new Error('Invalid target period');
  }

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

export const createProjectionRunner = (
  conceptTree: ConceptNodeWithoutDataset,
  historicalData: { [nodeId: string]: TimeseriesPoint[] },
  targetPeriod: { start: number; end: number },
  dataResOption: TemporalResolutionOption.Year | TemporalResolutionOption.Month
) => {
  const tree = conceptTree;
  const data = historicalData;
  const period = targetPeriod;
  const resultForDatasetNode: ProjectionResults = {};
  const resultForNoneDatasetNode: ProjectionResults = {};
  const runInfo: { [nodeId: string]: ForecastResult<ForecastMethod> } = {};

  const _calculateWeightedSum = (node: ConceptNode) => {
    if (isConceptNodeWithDatasetAttached(node)) {
      const projectedSeries = resultForDatasetNode[node.id];
      return invertData(projectedSeries, node.dataset.isInverted);
    }

    // Retrieve the weighted projected timeseries data from children
    const childProjectionSeriesData = node.components
      .map((c) => {
        const timeseries = _calculateWeightedSum(c.componentNode);
        return timeseries !== null
          ? invertData(multiply(timeseries, c.weight / 100), c.isOppositePolarity)
          : null;
      })
      .filter((s): s is TimeseriesPointProjected[] => s !== null);

    if (childProjectionSeriesData.length === 0) {
      return null;
    }

    // Calculate the sum of children's weighted projected timeseries data
    const weightedSumSeries = sum(...childProjectionSeriesData);
    resultForNoneDatasetNode[node.id] = weightedSumSeries;
    return weightedSumSeries;
  };

  const runner = {
    projectAllDatasetNodes() {
      for (const [nodeId, series] of Object.entries(data)) {
        const { method, forecast, backcast, projectionData } = runProjection(
          series,
          period,
          dataResOption
        );
        runInfo[nodeId] = {
          method,
          forecast,
          backcast,
        };
        resultForDatasetNode[nodeId] = projectionData;
      }
      return runner;
    },
    // /**
    //  * Project a single dataset node with an optional configuration
    //  * @param nodeId
    //  * @param options
    //  */
    // projectDatasetNode(nodeId: string, options: string) {}
    // updateHistoricalData(nodeId: string, data: TimeseriesPoint[]) {

    // },
    // updateProjectedData(nodeId: string, data: TimeseriesPointProjected[])
    calculateWeightedSum() {
      _calculateWeightedSum(tree);
      return runner;
    },
    runProjection() {
      runner.projectAllDatasetNodes().calculateWeightedSum();
      return runner;
    },
    getResults() {
      return {
        ...runner.getProjectionResultForNoneDatasetNodes(),
        ...runner.getProjectionResultForDatasetNodes(),
      };
    },
    getRunInfo() {
      return runInfo;
    },
    getProjectionResultForNoneDatasetNodes() {
      return resultForNoneDatasetNode;
    },
    getProjectionResultForDatasetNodes() {
      return resultForDatasetNode;
    },
  };
  return runner;
};
