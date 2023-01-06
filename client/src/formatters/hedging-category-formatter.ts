import { HEDGING_MAP } from '@/utils/code-util';

/**
 * HEDGING_MAP:
 * 0: 'No hedging',
 * 1: 'Some hedged evidences',
 * 2: 'All hedge evidences'
 * @param {integer} value
 */

export default function (value: number) {
  return HEDGING_MAP[value];
}
