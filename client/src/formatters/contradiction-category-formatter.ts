import { CONTRADICTION_MAP } from '@/utils/code-util';
/**
 * CONTRADICTION_MAP:
 * 0: 'All supporting',
 * 1: 'Some refuting',
 * 2: 'All refuting'
 * @param {integer} value
 */
export default function (value: keyof typeof CONTRADICTION_MAP) {
  return CONTRADICTION_MAP[value];
}
