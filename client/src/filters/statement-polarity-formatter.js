import PolarityUtil from '@/utils/polarity-util';

export default function (value) {
  return PolarityUtil.STATEMENT_POLARITY_MAP[value] || 'Unknown';
}
