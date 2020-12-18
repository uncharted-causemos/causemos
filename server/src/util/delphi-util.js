const _ = require('lodash');
const moment = require('moment');

const DEFAULT_INITIAL_VALUE = 1.0;

const AGGREGATION_FUNCTIONS = {
  mean: _.mean,
  min: _.min,
  max: _.max,
  median: (values) => {
    const sorted = _.sortBy(values);
    const idx = 0.5 * sorted.length;
    if (sorted.length % 2 === 0) {
      return 0.5 * (sorted[Math.floor(idx) - 1] + sorted[Math.floor(idx)]);
    }
    return sorted[Math.floor(idx)];
  }
};

/**
 * @param {array} timeseries - historical time series array
 */
const calculateInitialPerturbation = (timeseries) => {
  let initialPerturbation = 0;
  if (timeseries.length >= 2) {
    const p1 = _.last(timeseries).value; // last data point
    const p2 = timeseries[timeseries.length - 2].value; // second-last data point

    const min = _.min(timeseries.map(d => d.value));
    const max = _.max(timeseries.map(d => d.value));
    initialPerturbation = max === min ? 0 : (p1 - p2) / Math.abs(max - min);
    initialPerturbation = Math.max(-5.0, Math.min(5.0, initialPerturbation));
    initialPerturbation = +initialPerturbation.toFixed(1);
  }

  return initialPerturbation;
};

// TODO: Replace this when delphi create-model and edit-indicators returns initial value
const calculateInitialValue = (timeSeries, func) => {
  if (_.isEmpty(timeSeries)) return DEFAULT_INITIAL_VALUE;
  const initialValueFunction = AGGREGATION_FUNCTIONS[func];
  return initialValueFunction(timeSeries.map(d => d.value));
};

/**
 * set default perturbations for Delphi
 *
 * @param {array} perturbations - list of current perturbations
 * @param {array} conceptValueList - list of concept to initial value map
 */
const setDefaultPerturbations = (perturbations, conceptValueList) => {
  const result = _.isEmpty(perturbations) ? [] : perturbations.slice();
  conceptValueList.forEach(conceptValue => {
    const perturbationIdx = result.findIndex(c => c.concept === conceptValue.concept);
    if (perturbationIdx === -1) {
      result.push({
        concept: conceptValue.concept,
        value: calculateInitialPerturbation(conceptValue.timeSeries)
      });
    }
  });
  return result;
};

/**
 * Convert year/month in experiment result list to timestamp
 *
 * @param {array} experimentResultList         - list of experiment result for each point in time
 * @param {float} experimentResultList.value   - value of experiment result
 * @param {integer} experimentResultList.year  - year of experiment result
 * @param {integer} experimentResultList.month - month of experiment result
 *
 */
const convertToTimestamp = (experimentResultList) => {
  return experimentResultList.map(d => {
    return {
      value: d.value,
      timestamp: moment.utc({ year: d.year, month: d.month - 1, day: 1 }).valueOf() // moment starts month from 0 and delphi starts month from 1
    };
  });
};

module.exports = {
  DEFAULT_INITIAL_VALUE,
  calculateInitialValue,
  calculateInitialPerturbation,
  setDefaultPerturbations,
  convertToTimestamp
};
