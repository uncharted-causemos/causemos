import _ from 'lodash';

export function calculateDiff(oldVal: number, newVal: number, showPercentChange = false) {
  if (!_.isFinite(oldVal) || !_.isFinite(newVal)) return NaN;
  if (newVal === 0 && oldVal === 0) return 0;
  if (showPercentChange) {
    if (oldVal === 0) return NaN;
    const diff = (newVal - oldVal) / Math.abs(oldVal) * 100;
    return diff;
  }
  return newVal - oldVal;
}
