import PolarityUtil from '@/utils/polarity-util';

export default function (value: keyof typeof PolarityUtil.STATEMENT_POLARITY_MAP) {
  return PolarityUtil.STATEMENT_POLARITY_MAP[value] || 'Unknown';
}
