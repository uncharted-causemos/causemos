import { EDGE_COLOR_PALETTE } from '@/utils/colors-util';

export const polarityClass = (polarity: number) => {
  if (polarity === 1) {
    return 'fa fa-arrow-up';
  } else if (polarity === -1) {
    return 'fa fa-arrow-down';
  } else {
    return 'fa fa-question';
  }
};

export const statementPolarityColor = (polarity: number) => {
  if (polarity === 1) {
    return {
      color: EDGE_COLOR_PALETTE[2],
    };
  } else if (polarity === -1) {
    return {
      color: EDGE_COLOR_PALETTE[0],
    };
  } else {
    return {
      color: EDGE_COLOR_PALETTE[1],
    };
  }
};

export const POLARITY = Object.freeze({
  UNKNOWN: 0,
  POSITIVE: 1,
  NEGATIVE: -1,
});

export const POLARITY_MAP = Object.freeze({
  [POLARITY.UNKNOWN]: 'Unknown',
  [POLARITY.POSITIVE]: 'Positive',
  [POLARITY.NEGATIVE]: 'Negative',
});

export const STATEMENT_POLARITY = Object.freeze({
  UNKNOWN: 0,
  SAME: 1,
  OPPOSITE: -1,
});

export const STATEMENT_POLARITY_MAP = Object.freeze({
  [STATEMENT_POLARITY.UNKNOWN]: 'Unknown',
  [STATEMENT_POLARITY.SAME]: 'Same',
  [STATEMENT_POLARITY.OPPOSITE]: 'Opposite',
});

export const COMPACT_POLARITY = Object.freeze({
  '-1': '-',
  '0': '?',
  '1': '+',
});

export default {
  polarityClass,
  statementPolarityColor,
  POLARITY,
  POLARITY_MAP,
  STATEMENT_POLARITY,
  STATEMENT_POLARITY_MAP,
};
