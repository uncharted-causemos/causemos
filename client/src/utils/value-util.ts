import _ from 'lodash';

export function calculateDiff(oldVal: number, newVal: number, showPercentChange = false) {
  if (!_.isFinite(oldVal) || !_.isFinite(newVal)) return NaN;
  if (newVal === 0 && oldVal === 0) return 0;
  if (showPercentChange) {
    if (oldVal === 0) return NaN;
    const diff = ((newVal - oldVal) / Math.abs(oldVal)) * 100;
    return diff;
  }
  return newVal - oldVal;
}

export function normalize(value: number, minValue: number, maxValue: number) {
  if (minValue === maxValue) {
    // only one value, so the assumption is to normalize it as the full range
    return 1;
  } else {
    return (value - minValue) / (maxValue - minValue);
  }
}
