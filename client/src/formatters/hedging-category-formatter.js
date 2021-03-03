import HedgingUtil from '@/utils/hedging-util';

/**
 * HEDGING_MAP:
 * 0: 'No hedging',
 * 1: 'Some hedged evidences',
 * 2: 'All hedge evidences'
 * @param {integer} value
 */

export default function(value) {
  return HedgingUtil.HEDGING_MAP[value];
}
