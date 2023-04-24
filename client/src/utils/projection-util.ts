import { TemporalResolutionOption } from '@/types/Enums';
import { TimeseriesPoint, TimeseriesPointProjected } from '@/types/Timeseries';
import { forecast } from './forecast';
import {
  getYearFromTimestamp,
  getNumberOfMonthsPassedFromTimestamp,
  getTimestampMillisFromYear,
  getMonthlyTimestampFromNumberOfMonth,
} from '@/utils/date-util';

const getTimeStampConvertFunctions = (
  dataResOption: TemporalResolutionOption.Year | TemporalResolutionOption.Month
) => {
  const fromTimestamp =
    dataResOption === TemporalResolutionOption.Year
      ? getYearFromTimestamp
      : getNumberOfMonthsPassedFromTimestamp;
  const toTimestamp =
    dataResOption === TemporalResolutionOption.Year
      ? getTimestampMillisFromYear
      : getMonthlyTimestampFromNumberOfMonth;
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
  const backcastSteps = Math.ceil((firstDpX - startX) / stride);
  const forecastSteps = Math.ceil((endX - lastDpX) / stride);
  return {
    forecastSteps,
    backcastSteps,
  };
};

export const runProjection = (
  timeseries: TimeseriesPoint[],
  period: { start: number; end: number },
  dataResOption: TemporalResolutionOption.Year | TemporalResolutionOption.Month
) => {
  const { fromTimestamp, toTimestamp } = getTimeStampConvertFunctions(dataResOption);

  // convert timeseries data to [x, y][] format
  const inputData = timeseries.map(
    ({ timestamp, value }) => [fromTimestamp(timestamp), value] as [number, number]
  );
  const startX = fromTimestamp(period.start);
  const endX = fromTimestamp(period.end);
  const { forecastSteps, backcastSteps } = calculateNumberOfForecastStepsNeeded(
    inputData,
    startX,
    endX
  );

  // Run forecast
  const runner = forecast(inputData, { forecastSteps, backcastSteps });
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
  ] as { x: number; y: number; extrapolation?: string; isInterpolated: boolean }[];

  // Treat the last point of input data as first data point of forecasted data so that interpolated data points between
  // the last data point of the observed data and the first data point of the forecast data are labeled as forecasted data points.
  const lastObservedPointIndex = fResult.backcast.data.length + inputData.length - 1;
  dataPoints[lastObservedPointIndex].extrapolation = 'forecast';

  // Fill missing data between each adjcent data points using linear interpolation and cut data to fit in the given period.
  const timesriesProjectd = interpolateLinear(dataPoints)
    // Only consider points within the range provided by the period
    .filter((dp) => dp.x >= startX && dp.x <= endX)
    .map(
      ({ x, y, isInterpolated, extrapolation }) =>
        ({
          timestamp: toTimestamp(x),
          value: y,
          isInterpolated,
          extrapolation,
        } as TimeseriesPointProjected)
    );
  delete timesriesProjectd[lastObservedPointIndex].extrapolation;

  return {
    projectionData: timesriesProjectd,
    ...fResult,
  };
};

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
