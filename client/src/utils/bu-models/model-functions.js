import _ from 'lodash';

export const SPATIAL_FUNCTIONS = ['sum', 'mean'];
export const DEFAULT_SPATIAL_FUNCTION = 'sum';
export const TEMPORAL_FUNCTIONS = ['mean', 'min', 'max'];
export const DEFAULT_TEMPORAL_FUNCTION = 'mean';

/**
 * Proxy wrapper to return scalar result of a transform function.
 * The transform function is expected to either return
 * - a scalar
 * - an object that can be pared by iteratee function or a string key
 *
 * @param {function} fn - function to wrap around
 *
 */
const proxy = (fn) => {
  return (array, iteratee) => {
    const r = fn(array, iteratee);

    if (_.isObject(r)) {
      if (typeof iteratee === 'function') {
        return iteratee(r);
      } else if (typeof iteratee === 'string') {
        return r[iteratee];
      } else {
        return r;
      }
    } else {
      return r;
    }
  };
};

export function createModelFunction(aggFnName) {
  switch (aggFnName) {
    case 'sum':
      return proxy(_.sumBy);
    case 'mean':
      return proxy(_.meanBy);
    case 'min':
      return proxy(_.minBy);
    case 'max':
      return proxy(_.maxBy);
    default:
      console.err('unsupported aggregation function');
      throw new Error('unsupported aggregation function');
  }
}
