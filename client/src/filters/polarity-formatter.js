import PolarityUtil from '@/utils/polarity-util';

/**
 * Formats Indra statement polarity
 */
export default function (value) {
  return PolarityUtil.POLARITY_MAP[value] || 'Unknown';
}
