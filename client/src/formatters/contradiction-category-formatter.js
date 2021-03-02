import ContradictionUtil from '@/utils/contradiction-util';
/**
 * CONTADICTION_MAP:
 * 0: 'All supporting',
 * 1: 'Some refuting',
 * 2: 'All refuting'
 * @param {integer} value
 */
export default function (value) {
  return ContradictionUtil.CONTRADICTION_MAP[value];
}
