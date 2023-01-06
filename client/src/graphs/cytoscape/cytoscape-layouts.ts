export const LAYOUTS = Object.freeze({
  // COSE: 'cose',
  // COSE_BILKENT_AGGREGATED: 'cose-bilkent-aggregated',
  COSE_BILKENT: 'cose-bilkent',
  COLA: 'cola',
  // SPREAD: 'spread'
});

export const LAYOUT_LABELS = Object.freeze({
  // [LAYOUTS.COSE_BILKENT_AGGREGATED]: 'Overview',
  [LAYOUTS.COLA]: 'Causality Flow',
  [LAYOUTS.COSE_BILKENT]: 'Ontology Clarity',
  // [LAYOUTS.SPREAD]: 'Spread'
});

export const COLA_FLOWS = [
  { id: 'cola-x', value: 'x', name: 'Horizontal' },
  { id: 'cola-y', value: 'y', name: 'Vertical' },
];
