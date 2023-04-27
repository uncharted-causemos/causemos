import forecast from './forecast';
import {
  getYearFromTimestamp,
  getNumberOfMonthsSinceEpoch,
  getTimestampMillisFromYear,
  getTimestampFromNumberOfMonths,
} from '@/utils/date-util';

import { TemporalResolutionOption } from '@/types/Enums';
import { TimeseriesPoint, TimeseriesPointProjected } from '@/types/Timeseries';

/**
 * Return function that convert timestamp value to yearly or monthly step
 * based on the provided data resolution option
 * @param dataResOption Data temporal resolution option
 */
const getTimeStampConvertFunctions = (
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

/**
 * Run linear interpolation on the data so that missing data between two adjacent data points are filled
 * by making sure that the distance between each two points are consistently 1.
 * @param data Data with {x, y} coordinates
 */
export const interpolateLinear = <T extends { x: number; y: number }>(data: T[]) => {
  const result: (T & { isInterpolated: boolean })[] = [];
  const lastPoint = data[data.length - 1];
  for (let index = 0; index < data.length - 1; index++) {
    const curPoint = data[index];
    const { x: x1, y: y1 } = curPoint;
    const { x: x2, y: y2 } = data[index + 1];
    const slope = (y2 - y1) / (x2 - x1);
    const xDistance = x2 - x1;
    result.push({ ...curPoint, x: x1, y: y1, isInterpolated: false });
    // push interpolated points
    for (let j = 1; j < xDistance; j++) {
      const x = x1 + j;
      result.push({ ...curPoint, x: x, y: slope * j + y1, isInterpolated: true });
    }
  }
  result.push({ ...lastPoint, x: lastPoint.x, y: lastPoint.y, isInterpolated: false });
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
  const { fromTimestamp, toTimestamp } = getTimeStampConvertFunctions(dataResOption);

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

  const dataPoints = [
    ...fResult.backcast.data.map(([x, y]) => ({
      x,
      y,
      extrapolation: 'backcast',
      isInterpolated: false,
    })),

    ...inputData.map(([x, y]) => ({ x, y, isInterpolated: false })),

    ...fResult.forecast.data.map(([x, y]) => ({
      x,
      y,
      extrapolation: 'forecast',
      isInterpolated: false,
    })),
  ] as { x: number; y: number; extrapolation?: 'backcast' | 'forecast'; isInterpolated: boolean }[];

  // Temporally treat the last point of input data as first data point of forecasted data so that interpolated data points between
  // the last data point of the observed data and the first data point of the forecast data are labeled as forecasted data points.
  const lastObservedPoint = dataPoints[fResult.backcast.data.length + inputData.length - 1];
  lastObservedPoint.extrapolation = 'forecast';

  // Fill missing data between each adjcent data points using linear interpolation and cut data to fit within the given period.
  const timesriesProjectd = interpolateLinear(dataPoints)
    // Only consider points within the range provided by the period
    .filter((dp) => dp.x >= startX && dp.x <= endX)
    .map(({ x, y, isInterpolated, extrapolation }) => {
      const item: TimeseriesPointProjected = {
        timestamp: toTimestamp(x),
        value: y,
        isInterpolated,
      };
      if (extrapolation) item.extrapolation = extrapolation;
      return item;
    });

  const lastObservedDp = timesriesProjectd.find(
    (item) => item.timestamp === toTimestamp(lastObservedPoint.x)
  );
  if (lastObservedDp) {
    delete lastObservedDp.extrapolation;
  }

  return {
    projectionData: timesriesProjectd,
    ...fResult,
  };
};
