<template>
  <div class="projection-experiment-container">
    <label>Holt Iterations </label><input type="number" v-model="iterationHolt" />
    <label>Holt Winters Iterations </label><input type="number" v-model="iterationHW" />
    <label>Show fit lines</label><input type="checkbox" v-model="showFitting" />
    <br />
    <button @click="runExperiments('auto')">Run Auto (Holt or HW)</button>
    <button @click="runExperiments('holt')">Run Holt</button>
    <button @click="runExperiments('hw')">Run Holt Winters</button>
    <button @click="runExperiments('arima')">Run AutoARIMA</button>
    <span v-if="status">{{ status }}</span>
    <div ref="chartContainer" class="charts-container hide-prediction-lines"></div>
  </div>
</template>

<script setup lang="ts">
import { onMounted, ref, watch } from 'vue';
import * as d3 from 'd3';
// import { forecast } from '@/utils/holt-winters'
import { holtWinters } from '@/utils/forecasting/holt-winters';
import {
  getMonthlyTimestampFromNumberOfMonth,
  getNumberOfMonthsPassedFromTimestamp,
} from '@/utils/date-util';
import { holt } from '@/utils/forecasting/holt';
import ARIMAPromise from 'arima/async';
import { getDatacubeByDataId } from '@/services/new-datacube-service';
import { DataConfig } from '@/types/Datacube';
import { AggregationOption, TemporalResolutionOption } from '@/types/Enums';
import { getTimeseries } from '@/services/outputdata-service';

type ForecastMethodOption = 'auto' | 'holt' | 'hw' | 'arima';

const MAX_DATA_LENGTH = 120; // 10 years with monthly data

const data = [
  ['2000-01-15', 4.3],
  ['2000-02-15', 5],
  ['2000-03-15', 6.5],
  ['2000-04-15', 6.7],
  ['2000-05-15', 10.8],
  ['2000-06-15', 13.1],
  ['2000-07-15', 14.1],
  ['2000-08-15', 15.2],
  ['2000-09-15', 13.4],
  ['2000-10-15', 9.2],
  ['2000-11-15', 5.8],
  ['2000-12-15', 4.6],
  ['2001-01-15', 2.6],
  ['2001-02-15', 3.4],
  ['2001-03-15', 4.1],
  ['2001-04-15', 6.7],
  ['2001-05-15', 11.4],
  ['2001-06-15', 12.6],
  ['2001-07-15', 15.3],
  ['2001-08-15', 15.2],
  ['2001-09-15', 12.3],
  ['2001-10-15', 12.2],
  ['2001-11-15', 6.8],
  ['2001-12-15', 3.1],
  ['2002-01-15', 5],
  ['2002-02-15', 5.5],
  ['2002-03-15', 6.5],
  ['2002-04-15', 8.2],
  ['2002-05-15', 10.8],
  ['2002-06-15', 13.2],
  ['2002-07-15', 14.4],
  ['2002-08-15', 15.6],
  ['2002-09-15', 13.2],
  ['2002-10-15', 8.7],
  ['2002-11-15', 7.5],
  ['2002-12-15', 4.8],
  ['2003-01-15', 3.7],
  ['2003-02-15', 3.4],
  ['2003-03-15', 6.7],
  ['2003-04-15', 8.9],
  ['2003-05-15', 10.7],
  ['2003-06-15', 14.6],
  ['2003-07-15', 16.2],
  ['2003-08-15', 16.5],
  ['2003-09-15', 13.1],
  ['2003-10-15', 8.2],
  ['2003-11-15', 7.4],
  ['2003-12-15', 4.3],
  ['2004-01-15', 4.4],
  ['2004-02-15', 4.4],
  ['2004-03-15', 5.7],
  ['2004-04-15', 8.5],
  ['2004-05-15', 11.1],
  ['2004-06-15', 14],
  ['2004-07-15', 14.4],
  ['2004-08-15', 16.1],
  ['2004-09-15', 13.4],
  ['2004-10-15', 9.4],
  ['2004-11-15', 7.1],
  ['2004-12-15', 5],
  ['2005-01-15', 5.3],
  ['2005-02-15', 3.7],
  ['2005-03-15', 6.4],
  ['2005-04-15', 7.9],
  ['2005-05-15', 10],
  ['2005-06-15', 14.1],
  ['2005-07-15', 15.3],
  ['2005-08-15', 14.9],
  ['2005-09-15', 13.8],
  ['2005-10-15', 11.7],
  ['2005-11-15', 5.6],
  ['2005-12-15', 4.2],
  ['2006-01-15', 3.9],
  ['2006-02-15', 3.5],
  ['2006-03-15', 3.9],
  ['2006-04-15', 7.4],
  ['2006-05-15', 10.7],
  ['2006-06-15', 14.5],
  ['2006-07-15', 17.8],
  ['2006-08-15', 15],
  ['2006-09-15', 15.2],
  ['2006-10-15', 11.7],
  ['2006-11-15', 7.2],
  ['2006-12-15', 5.5],
  ['2007-01-15', 5.9],
  ['2007-02-15', 5.2],
  ['2007-03-15', 6.3],
  ['2007-04-15', 10.2],
  ['2007-05-15', 10.7],
  ['2007-06-15', 13.7],
  ['2007-07-15', 14.3],
  ['2007-08-15', 14.4],
  ['2007-09-15', 12.6],
  ['2007-10-15', 10.3],
  ['2007-11-15', 6.9],
  ['2007-12-15', 4.4],
  ['2008-01-15', 5.3],
  ['2008-02-15', 4.9],
  ['2008-03-15', 5.1],
  ['2008-04-15', 7.1],
  ['2008-05-15', 12.2],
  ['2008-06-15', 12.9],
  ['2008-07-15', 15.3],
  ['2008-08-15', 15.1],
  ['2008-09-15', 12.5],
  ['2008-10-15', 8.7],
  ['2008-11-15', 6.2],
  ['2008-12-15', 3.1],
  ['2009-01-15', 2.8],
  ['2009-02-15', 3.7],
  ['2009-03-15', 6.1],
  ['2009-04-15', 8.9],
  ['2009-05-15', 10.9],
  ['2009-06-15', 13.7],
  ['2009-07-15', 15.2],
  ['2009-08-15', 15.4],
  ['2009-09-15', 13.2],
  ['2009-10-15', 10.4],
  ['2009-11-15', 7.3],
  ['2009-12-15', 2.1],
  ['2010-01-15', 0.9],
  ['2010-02-15', 1.9],
  ['2010-03-15', 5.1],
  ['2010-04-15', 8],
  ['2010-05-15', 9.8],
  ['2010-06-15', 14.2],
  ['2010-07-15', 15.6],
  ['2010-08-15', 14.2],
  ['2010-09-15', 12.8],
  ['2010-10-15', 9.4],
  ['2010-11-15', 4.3],
  ['2010-12-15', -0.9],
  ['2011-01-15', 3.1],
  ['2011-02-15', 5.3],
  ['2011-03-15', 5.8],
  ['2011-04-15', 10.7],
  ['2011-05-15', 11],
  ['2011-06-15', 12.7],
  ['2011-07-15', 14.2],
  ['2011-08-15', 14.1],
  ['2011-09-15', 13.8],
  ['2011-10-15', 11.3],
  ['2011-11-15', 8.7],
  ['2011-12-15', 4.8],
  ['2012-01-15', 4.7],
  ['2012-02-15', 4.2],
  ['2012-03-15', 7.7],
  ['2012-04-15', 6.3],
  ['2012-05-15', 10.5],
  ['2012-06-15', 12.3],
  ['2012-07-15', 14.1],
  ['2012-08-15', 15.3],
  ['2012-09-15', 12],
  ['2012-10-15', 8.2],
  ['2012-11-15', 5.8],
  ['2012-12-15', 3.9],
  ['2013-01-15', 3.3],
  ['2013-02-15', 2.8],
  ['2013-03-15', 2.2],
  ['2013-04-15', 6.3],
  ['2013-05-15', 9.5],
  ['2013-06-15', 12.8],
  ['2013-07-15', 17],
  ['2013-08-15', 15.6],
  ['2013-09-15', 12.8],
  ['2013-10-15', 11.2],
  ['2013-11-15', 5.5],
  ['2013-12-15', 5.7],
  ['2014-01-15', 4.8],
  ['2014-02-15', 5.2],
  ['2014-03-15', 6.7],
  ['2014-04-15', 9.2],
  ['2014-05-15', 11.2],
  ['2014-06-15', 14.2],
  ['2014-07-15', 16.3],
  ['2014-08-15', 13.9],
  ['2014-09-15', 13.9],
  ['2014-10-15', 11.1],
  ['2014-11-15', 7.6],
  ['2014-12-15', 4.4],
  ['2015-01-15', 3.7],
  ['2015-02-15', 3.5],
  ['2015-03-15', 5.5],
  ['2015-04-15', 7.9],
  ['2015-05-15', 9.6],
  ['2015-06-15', 12.6],
  ['2015-07-15', 14.4],
  ['2015-08-15', 14.7],
  ['2015-09-15', 11.9],
  ['2015-10-15', 10],
  ['2015-11-15', 8.2],
  ['2015-12-15', 7.9],
].map((d) => [getNumberOfMonthsPassedFromTimestamp(new Date(d[0]).getTime()), d[1]]);

const margin = { top: 10, right: 30, bottom: 30, left: 60 };
const width = 800 - margin.left - margin.right;
const height = 300 - margin.top - margin.bottom;

const chartContainer = ref();
const forecastOption = ref<ForecastMethodOption>('auto');
const status = ref('');
const iterationHolt = ref(10);
const iterationHW = ref(10);
const showFitting = ref(false);

watch(showFitting, () => {
  chartContainer.value.classList.toggle('hide-prediction-lines', !showFitting.value);
});

type ChartData<T> = {
  data: T[];
  color: string;
  dashed?: boolean;
  className?: string;
};

const renderChart = <T>(chartData: ChartData<T>[], xAccessor: any, yAccessor: any) => {
  const allDataPoints = chartData.reduce((prev, cur) => prev.concat(cur.data), [] as T[]);
  function xScale<T>(data: T[], accessor: (d: T) => number) {
    const extent = d3.extent(data, accessor) as [number, number];
    return d3.scaleTime().domain(extent).range([0, width]);
  }

  function yScale<T>(data: T[], accessor: (d: T) => number) {
    const extent = d3.extent(data, accessor);
    return d3
      .scaleLinear()
      .domain(extent as [number, number])
      .range([height, 0]);
  }

  const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  const chart = d3
    .select(svg)
    .attr('width', width + margin.left + margin.right)
    .attr('height', height + margin.top + margin.bottom)
    .append('g')
    .attr('transform', 'translate(' + margin.left + ',' + margin.top + ')');

  const x = xScale(allDataPoints, xAccessor);
  chart
    .append('g')
    .attr('transform', 'translate(0,' + height + ')')
    .call(d3.axisBottom(x));

  const y = yScale(allDataPoints, yAccessor);
  chart.append('g').call(d3.axisLeft(y));

  const lineFn = d3
    .line<T>()
    .x((d) => x(xAccessor(d)))
    .y((d) => y(yAccessor(d)));

  chartData.forEach(({ data, color, dashed, className }) => {
    // Draw line
    chart
      .append('path')
      .datum(data)
      .attr('fill', 'none')
      .attr('stroke', color)
      .attr('stroke-width', 2)
      .attr('stroke-dasharray', dashed ? 1 : '')
      .attr('d', lineFn)
      .attr('class', className || '');
  });
  return svg;
};

interface hwObject<T> {
  (): hwObject<T>;
  data: (d: T[]) => hwObject<T>;
  x: (v: (d: T) => number) => hwObject<T>;
  y: (v: (d: T) => number) => hwObject<T>;
  level: (alpha: number) => hwObject<T>;
  trend: (beta: number) => hwObject<T>;
  season: (gamma: number) => hwObject<T>;
  period: (period: number) => hwObject<T>;
  output: () => [number, number][];
  forecast: (d: number) => [number, number][];
  sumSquares: () => number;
}

// Residual Sum of Squares (RSS). This method calculates the difference between observed data (actual value) and its vertical distance from the proposed best-fitting line (predicted value). It squares each difference and adds all of them.
// Minimize RSS (residual sum of squares). MSE (Mean squared error) = RSS / # of data points. RMSE (Root mean squared error) = square root of MSE
// Run brute force grid search to find out optimized parameter combination that minimizes the residual sum of squares error.
const optimizeParameters = (hw: any, iterations: number, maxPeriod = 13) => {
  const increment = 1 / iterations;

  let bestPeriod = 3;
  let bestAlpha = 0.0;
  let bestBeta = 0.0;
  let bestGamma = 0.0;
  let bestError = -1;

  let curPeriod = 3;
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
  return { alpha: curAlpha, beta: curBeta, gamma: curGamma, period: curPeriod };
};

const optimizeParametersH = (hw: any, iterations: number) => {
  const increment = 1 / iterations;

  let bestAlpha = 0.0;
  let bestBeta = 0.0;
  let bestError = -1;

  let curAlpha = 0.0;
  let curBeta = 0.0;
  let curError = -1;

  while (curAlpha < 1) {
    while (curBeta < 1) {
      hw.factor(curAlpha).trend(curBeta);
      hw();
      curError = hw.sumSquares();
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
  hw.factor(curAlpha).trend(curBeta);
  return { alpha: curAlpha, beta: curBeta };
};

const runAr = async (data: [number, number][], backcastSteps: number, forecastSteps: number) => {
  // https://github.com/zemlyansky/arima#readme

  const ARIMA = await ARIMAPromise;
  const ts = data.map((d) => d[1]);

  // 0 - Exact Maximum Likelihood Method (Default)
  // 1 - Conditional Method - Sum Of Squares
  // 2 - Box-Jenkins Method
  const ARIMA_METHOD = 0;

  // Optimization Method (optimizer)
  // Method 0 - Nelder-Mead
  // Method 1 - Newton Line Search
  // Method 2 - Newton Trust Region - Hook Step
  // Method 3 - Newton Trust Region - Double Dog-Leg
  // Method 4 - Conjugate Gradient
  // Method 5 - BFGS
  // Method 6 - Limited Memory BFGS (Default)
  // Method 7 - BFGS Using More Thuente Method
  const ARIMA_OPTIMIZER = 2;

  // AutoARIMA
  const arima = new ARIMA({ auto: true, method: ARIMA_METHOD, optimizer: ARIMA_OPTIMIZER }).train(
    ts
  );
  const arimaBack = new ARIMA({
    auto: true,
    method: ARIMA_METHOD,
    optimizer: ARIMA_OPTIMIZER,
  }).train([...ts].reverse());
  const [pred] = arima.predict(forecastSteps);
  const [predBack] = arimaBack.predict(backcastSteps);

  const distance = data[1][0] - data[0][0];
  const lastTimeValue = data[data.length - 1][0];
  const firstTimeValue = data[0][0];

  const forecast = pred.map((v: number, i: number) => [lastTimeValue + (i + 1) * distance, v]);
  const backcast = predBack.map((v: number, i: number) => [firstTimeValue - (i + 1) * distance, v]);

  const prediction: [number, number][] = [];
  const predictionBack: [number, number][] = [];
  const rmse = NaN;

  return {
    name: 'Arima',
    observed: data,
    prediction,
    predictionBack,
    forecast,
    backcast,
    error: rmse,
    forecastParams: {},
    backcastParams: {},
  };
};

const runHoltWinters = (data: [number, number][], backcastSteps: number, forecastSteps: number) => {
  /**
   * number of season in a year. e.g for monthly data PERIOD = 12, and for quarterly data PERIOD = 4
   */
  const xAccessor = (d: [number, number]) => d[0];
  const yAccessor = (d: [number, number]) => d[1];
  const forecastHW = (holtWinters() as hwObject<[number, number]>)
    .period(1)
    .data(data)
    .x(xAccessor)
    .y(yAccessor);

  const backcastHW = (holtWinters() as hwObject<[number, number]>)
    .period(1)
    .data([...data].reverse())
    .x(xAccessor)
    .y(yAccessor);
  const optimizedParameters = optimizeParameters(
    forecastHW,
    iterationHW.value,
    Math.floor(data.length / 2)
  );
  const optimizedParametersBK = optimizeParameters(
    backcastHW,
    iterationHW.value,
    Math.floor(data.length / 2)
  );
  forecastHW();
  backcastHW();

  const prediction = forecastHW.output();
  const predictionBack = backcastHW.output();

  const forecast = forecastHW.forecast(forecastSteps);
  const backcast = backcastHW.forecast(backcastSteps);
  prediction.push(...forecast);
  predictionBack.push(...backcast);
  const rmse = Math.sqrt(forecastHW.sumSquares() / data.length);
  return {
    name: 'Holt Winters',
    observed: data,
    prediction,
    predictionBack,
    forecast,
    backcast,
    error: rmse,
    forecastParams: optimizedParameters,
    backcastParams: optimizedParametersBK,
  };
};

const runHolt = (data: [number, number][], backcastSteps: number, forecastSteps: number) => {
  const xAccessor = (d: [number, number]) => d[0];
  const yAccessor = (d: [number, number]) => d[1];
  // Holt
  const dataReindexed = data.map((d: any, index: number) => [index, d[1]]);
  const forecastH = (holt() as any)
    .data(dataReindexed)
    .x(xAccessor)
    .y(yAccessor)
    .initialTrendCalculation(2);
  const backcastH = (holt() as any)
    .data([...dataReindexed].reverse())
    .x(xAccessor)
    .y(yAccessor)
    .initialTrendCalculation(2);
  const optimizedParameters = optimizeParametersH(forecastH, iterationHolt.value);
  const optimizedParametersBK = optimizeParametersH(backcastH, iterationHolt.value);
  forecastH();
  backcastH();
  const prediction = forecastH.output();
  const predictionBack = backcastH.output();

  const forecast = [...Array(forecastSteps).keys()].map((i) => [
    i + dataReindexed.length,
    forecastH.forecast(i + 1),
  ]);
  const backcast = [...Array(backcastSteps).keys()].map((i) => [-i - 1, backcastH.forecast(i + 1)]);
  prediction.push(...forecast);
  predictionBack.push(...backcast);

  const rmse = Math.sqrt(forecastH.sumSquares() / data.length);
  return {
    name: 'Holt',
    observed: dataReindexed,
    forecast,
    backcast,
    prediction,
    predictionBack,
    error: rmse,
    forecastParams: optimizedParameters,
    backcastParams: optimizedParametersBK,
  };
};

const runProjectionAndRender = async (
  data: [number, number][],
  backcastSteps = 24,
  forecastSteps = 24,
  name: string
) => {
  let method;
  let loser;
  if (forecastOption.value === 'holt') {
    method = runHolt(data, backcastSteps, forecastSteps);
  } else if (forecastOption.value === 'hw') {
    method = runHoltWinters(data, backcastSteps, forecastSteps);
  } else if (forecastOption.value === 'arima') {
    method = await runAr(data, backcastSteps, forecastSteps);
  } else {
    const holt = runHolt(data, backcastSteps, forecastSteps);
    const holtWinters = runHoltWinters(data, backcastSteps, forecastSteps);
    method = holt.error < holtWinters.error ? holt : holtWinters;
    loser = holt.error < holtWinters.error ? holtWinters : holt;
    console.log('holt error', holt.error, 'holt winters error', holtWinters.error);
  }

  const { observed, prediction, predictionBack, forecast, backcast } = method;

  const toDate = (data: [number, number][]) => {
    return data.map(([m, v]) => [getMonthlyTimestampFromNumberOfMonth(m), v]) as [number, number][];
  };

  const predictionLines = [
    {
      data: toDate(prediction),
      color: 'pink',
      dashed: true,
      className: 'prediction-line',
    },
    {
      data: toDate(predictionBack),
      color: 'lightgrey',
      dashed: true,
      className: 'prediction-line',
    },
  ];
  const forecastLines = [
    {
      data: toDate([observed[observed.length - 1], ...forecast] as [number, number][]),
      color: 'red',
    },
    {
      data: toDate([observed[0], ...backcast] as [number, number][]),
      color: 'black',
    },
  ];
  const chartData: ChartData<[number, number]>[] = [
    {
      data: toDate(observed as [number, number][]),
      color: 'steelblue',
    },
    ...predictionLines,
    ...forecastLines,
  ];

  const chart = renderChart<[number, number]>(
    chartData,
    (d: [number, number]) => d[0],
    (d: [number, number]) => d[1]
  );
  const el = document.createElement('div');
  const title = document.createElement('h6');
  const methodNameColor = method.name === 'Holt' ? 'green' : 'blue';
  const loserError = loser
    ? `vs <span style="color: pink">${loser.error}</span> (${loser.name})`
    : '';
  let htmlString = `<span>${name}</span></br>
    <span>Winner: <span style="color: ${methodNameColor}"> ${method.name} -</span></span>`;
  if (method.name !== 'Arima') {
    htmlString += `<span style="color: grey"> Error: <span style="color: red">${method.error.toFixed(
      2
    )}</span> ${loserError}</span></br>
      <span style=>forecast parameters: ${toStringParams(method.forecastParams)}</span></br>
      <span>backcast parameters: ${toStringParams(method.backcastParams)}</span>
      `;
  }
  title.innerHTML = htmlString;
  el.append(title);
  el.append(chart);
  chartContainer.value.append(el);
};

const toStringParams = (params: any) => {
  if (params.period !== undefined) {
    // params for holt winters
    const { alpha, beta, gamma, period } = params;
    return `period: ${period}, alpha(level): ${alpha}, beta(trend): ${beta}, gamma(season): ${gamma}`;
  }
  const { alpha, beta } = params;
  return `alpha(level): ${alpha}, beta(trend): ${beta}}`;
};

// const interpolate = (data: [number, number][]) => {
//   const result = [];

//   for (let index = 0; index < data.length - 1; index++) {
//     const [x1, y1] = data[index];
//     const [x2, y2] = data[index + 1];
//     const slope = (y2 - y1) / (x2 - x1);
//     const xDistance = x2 - x1;
//     result.push([x1, y1]);
//     // push interpolated points
//     for (let j = 1; j < xDistance; j++) {
//       const x = x1 + j
//       result.push([x, (slope * j) + y1])
//     }
//     result.push([x2, y2]);
//   }
//   return result as [number, number][];
// };

const run = async (dataId: string, feature = '') => {
  const datacube = await getDatacubeByDataId(dataId);
  const config: DataConfig = {
    datasetId: dataId,
    runId: 'indicator',
    outputVariable: feature || datacube?.default_feature || '',
    selectedTimestamp: 0,
    spatialAggregation: datacube?.default_view?.spatialAggregation || AggregationOption.Mean,
    temporalAggregation: datacube?.default_view?.temporalAggregation || AggregationOption.Mean,
    temporalResolution:
      datacube?.default_view?.temporalResolution || TemporalResolutionOption.Month,
  };
  // Fetch timeseries to find the true last point we have data for. `period.lte` is unreliable.
  const result = await getTimeseries({
    modelId: config.datasetId,
    outputVariable: config.outputVariable,
    runId: config.runId,
    spatialAggregation: config.spatialAggregation,
    temporalAggregation: config.temporalAggregation,
    temporalResolution: config.temporalResolution,
  });
  const seriesData: [number, number][] = result.data.map(
    ({ timestamp, value }: { timestamp: number; value: number }) => [
      getNumberOfMonthsPassedFromTimestamp(timestamp),
      value,
    ]
  );
  const name = datacube?.name + ': ' + config.outputVariable;
  await runProjectionAndRender(seriesData.slice(-MAX_DATA_LENGTH), 12, 12, name);
};

const runExperiments = async (option: ForecastMethodOption = 'auto') => {
  forecastOption.value = option;
  chartContainer.value.innerHTML = '';
  const start = Date.now();
  status.value = 'Running...';

  await runProjectionAndRender(data as [number, number][], 12, 12, 'Test Data: Monthly Seasonal');
  await run('a318111e-587d-4c89-8993-431d5fb0c973');
  await run('62fcdd55-1459-41c8-b815-e5fd90e06587');
  await run('53004696-8ca3-41a7-957d-d9f73cc10ef4');
  await run('371ca304-a94c-4c67-ae28-6933c7493e9a');
  await run('82e418bd-35e1-46df-86ba-75e33cb423ca');
  await run('828750df-5c0f-4d19-b34b-334ad8b2d0c9');
  await run('15a79a65-9e4d-42b0-a4b6-e2fb0e7ddcf5');

  await run('c9e1e0fe-6a97-4a96-8868-ab074f5bee3a');
  await run('0b1f665b-973e-4be2-a9a0-4abcaa44a1bc');
  await run('0f77f201-5ae2-48b6-9394-53aa103f4794');
  await run('d5571341-30e5-47ef-a07a-3ba902305529');

  await run('ccab44a5-220e-4757-8a0d-0a2362a59e53');
  await run('c0801062-410f-48f0-9f8a-80ca4b2e6ccc');
  await run('cb9a342c-92ad-4d6b-b537-ffb31456b8be');

  await run('a247b4ae-fc5a-46b5-be6e-c7a778ce7c18', 'Duration (minutes)');
  await run('85f744c4-c2a7-4b4a-adad-42b40a378d0b');
  await run('85f744c4-c2a7-4b4a-adad-42b40a378d0b', 'Data_long_term_Average');
  await run('a5126145-51f7-4626-a19a-e9738838a97f', 'fatalities');
  await run('6ce7ff40-9dd2-4b25-9d27-92c2327343d3', 'fatalities');

  const end = Date.now() - start;
  status.value = 'Done in ' + end / 1000 + 's';
};

onMounted(async () => {});
</script>

<style lang="scss" scoped>
.projection-experiment-container {
  .charts-container {
    display: flex;
    flex-wrap: wrap;
  }
  .charts-container.hide-prediction-lines {
    :deep(path.prediction-line) {
      display: none;
    }
  }

  input {
    appearance: auto;
  }

  h5,
  h6 {
    max-width: 400px;
  }
}
</style>
