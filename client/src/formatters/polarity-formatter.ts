import PolarityUtil from '@/utils/polarity-util';

/**
 * Formats Indra statement polarity
 */
export default function (value: keyof typeof PolarityUtil.POLARITY_MAP) {
  return PolarityUtil.POLARITY_MAP[value] || 'Unknown';
}
