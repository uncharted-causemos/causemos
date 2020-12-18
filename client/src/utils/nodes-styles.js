export const THRESHOLD_SCORE = 0.3;

export const EMPTY_INDICATOR_OUTLINE = Object.freeze({
  strokeWidth: 1,
  strokeDashArray: '8,8'
});

// For nodes with scores lower than 0.3
export const LOW_SCORE_OUTLINE = Object.freeze({
  strokeWidth: 3
});

export default {
  THRESHOLD_SCORE,
  EMPTY_INDICATOR_OUTLINE,
  LOW_SCORE_OUTLINE
};
