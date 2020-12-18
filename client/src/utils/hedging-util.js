const HEDGING = Object.freeze({
  NONE: 0,
  SOME: 1,
  ALL: 2
});

const HEDGING_MAP = Object.freeze({
  [HEDGING.NONE]: 'No hedging',
  [HEDGING.SOME]: 'Some hedged evidence',
  [HEDGING.ALL]: 'All hedged evidence'
});

export default {
  HEDGING,
  HEDGING_MAP
};
