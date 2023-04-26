import merge from 'lodash/merge';
import { HoltFunctionObject, holt } from './methods/holt';
import { HoltWintersFunctionObject, holtWinters } from './methods/holt-winters';

import { Subset } from '@/types/Common';

export enum ForecastMethod {
  Holt = 'Holt',
  HoltWinters = 'Holt-Winters',
}

export interface ForecastOptions {
  forecastSteps: number;
  backcastSteps: number;
  holt: {
    iterations: number;
    initialTrendCalculationMethod: 1 | 2 | 3;
  };
  holtWinters: {
    iterations: number;
  };
}

export interface HoltWintersParams {
  alpha: number;
  beta: number;
  gamma: number;
  period: number;
}

export interface HoltParams {
  alpha: number;
  beta: number;
}

export interface ForecastOutput<FMethod> {
  data: [number, number][];
  parameters: FMethod extends ForecastMethod.Holt ? HoltParams : HoltWintersParams;
  error: number;
}

export interface ForecastResult<Method> {
  method: Method;
  forecast: ForecastOutput<Method>;
  backcast: ForecastOutput<Method>;
}

const MIN_PERIOD = 3;

const runHoltWithOptimizedParams = (holt: HoltFunctionObject, iterations: number) => {
  const increment = 1 / iterations;

  let bestAlpha = 0.0;
  let bestBeta = 0.0;
  let bestError = -1;

  let curAlpha = 0.0;
  let curBeta = 0.0;
  let curError = -1;

  while (curAlpha < 1) {
    while (curBeta < 1) {
      holt.factor(curAlpha).trend(curBeta);
      holt();
      curError = holt.sumSquares();
      if (curError < bestError || bestError === -1) {
        bestAlpha = curAlpha;
        bestBeta = curBeta;
        bestError = curError;
      }
      curBeta += increment;
    }
    curBeta = 0;
    curAlpha += increment;
  }

  curAlpha = bestAlpha;
  curBeta = bestBeta;
  holt.factor(curAlpha).trend(curBeta);
  holt();
  return { alpha: curAlpha, beta: curBeta };
};

// Get RMSE (Root mean squared error) = square root of MSE. MSE (Mean squared error) = RSS (residual sum of squares) / # of data points.
const getRMSE = (forecastObj: HoltFunctionObject | HoltWintersFunctionObject) => {
  return Math.sqrt(forecastObj.sumSquares() / forecastObj.residuals().length);
};

// Run brute force grid search to find out optimized parameter combination that minimizes RSS error (residual sum of squares error).
const runHWWithOptimizedParams = (
  hw: HoltWintersFunctionObject,
  iterations: number,
  maxPeriod = 13
) => {
  const increment = 1 / iterations;

  let bestPeriod = MIN_PERIOD;
  let bestAlpha = 0.0;
  let bestBeta = 0.0;
  let bestGamma = 0.0;
  let bestError = -1;

  let curPeriod = MIN_PERIOD;
  let curAlpha = 0.0;
  let curBeta = 0.0;
  let curGamma = 0.0;
  let curError = -1;

  while (curPeriod < Math.min(maxPeriod, 13)) {
    while (curAlpha < 1) {
      while (curBeta < 1) {
        while (curGamma < 1) {
          hw.level(curAlpha).trend(curBeta).season(curGamma).period(curPeriod);
          hw();
          curError = hw.sumSquares();
          if (curError < bestError || bestError === -1) {
            bestPeriod = curPeriod;
            bestAlpha = curAlpha;
            bestBeta = curBeta;
            bestGamma = curGamma;
            bestError = curError;
          }
          curGamma += increment;
        }
        curGamma = 0;
        curBeta += increment;
      }
      curBeta = 0;
      curAlpha += increment;
    }
    curAlpha = 0;
    curPeriod += 1;
  }

  curPeriod = bestPeriod;
  curAlpha = bestAlpha;
  curBeta = bestBeta;
  curGamma = bestGamma;
  hw.level(curAlpha).trend(curBeta).season(curGamma).period(curPeriod);
  hw();
  return { alpha: curAlpha, beta: curBeta, gamma: curGamma, period: curPeriod };
};

export const initialize = (data: [number, number][], options: Subset<ForecastOptions> = {}) => {
  const observedData = [...data];
  const dataReversed = [...data].reverse();
  // Default options
  const opt = merge(
    {
      forecastSteps: 12,
      backcastSteps: 12,
      holt: {
        iterations: 10,
        initialTrendCalculationMethod: 2 as 1 | 2 | 3,
      },
      holtWinters: {
        iterations: 10,
      },
    },
    options
  );
  if (data.length < 3 && opt.holt.initialTrendCalculationMethod === 1) {
    // option 1 for initial trend calculation method requires at least 3 data points. Fall back to option 2
    opt.holt.initialTrendCalculationMethod = 2;
  }

  return {
    runAuto() {
      let result: ForecastResult<ForecastMethod>;
      if (observedData.length > MIN_PERIOD * 2) {
        const holt = this.runHolt();
        const hw = this.runHoltWinters();
        result = holt.forecast.error <= hw.forecast.error ? holt : hw;
      } else {
        result = this.runHolt();
      }
      return result;
    },

    runHolt(): ForecastResult<ForecastMethod.Holt> {
      const forecast = holt()
        .data(observedData)
        .initialTrendCalculation(opt.holt.initialTrendCalculationMethod);
      const backcast = holt()
        .data(dataReversed)
        .initialTrendCalculation(opt.holt.initialTrendCalculationMethod);
      const forecastParams = runHoltWithOptimizedParams(forecast, opt.holt.iterations);
      const backcastParams = runHoltWithOptimizedParams(backcast, opt.holt.iterations);
      const distance = observedData[1][0] - observedData[0][0];
      const lastPointXValue = dataReversed[0][0];
      const firstPointXValue = observedData[0][0];
      const forecastData = [...Array(opt.forecastSteps).keys()].map((i) => [
        lastPointXValue + (i + 1) * distance,
        forecast.forecast(i + 1),
      ]);
      const backcastData = [...Array(opt.backcastSteps).keys()].map((i) => [
        firstPointXValue - (i + 1) * distance,
        backcast.forecast(i + 1),
      ]);
      return {
        method: ForecastMethod.Holt,
        forecast: {
          data: forecastData as [number, number][],
          parameters: forecastParams,
          error: getRMSE(forecast),
        },
        backcast: {
          data: backcastData as [number, number][],
          parameters: backcastParams,
          error: getRMSE(backcast),
        },
      };
    },

    runHoltWinters(): ForecastResult<ForecastMethod.HoltWinters> {
      if (observedData.length <= MIN_PERIOD * 2) {
        throw new Error(
          'Not enough data to estimate forecasts - need at least 7 data points ( > 2*MIN_PERIOD)'
        );
      }
      const forecast = holtWinters().period(MIN_PERIOD).data(observedData);
      const backcast = holtWinters().period(MIN_PERIOD).data(dataReversed);
      const maxPeriod = Math.floor(observedData.length / 2);
      const forecastParams = runHWWithOptimizedParams(
        forecast,
        opt.holtWinters.iterations,
        maxPeriod
      );
      const backcastParams = runHWWithOptimizedParams(
        backcast,
        opt.holtWinters.iterations,
        maxPeriod
      );
      const forecastData = forecast.forecast(opt.forecastSteps);
      const backcastData = backcast.forecast(opt.backcastSteps);
      return {
        method: ForecastMethod.HoltWinters,
        forecast: {
          data: forecastData,
          parameters: forecastParams,
          error: getRMSE(forecast),
        },
        backcast: {
          data: backcastData,
          parameters: backcastParams,
          error: getRMSE(backcast),
        },
      };
    },
  };
};

export default {
  ForecastMethod,
  initialize,
};
