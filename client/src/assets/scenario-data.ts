// Dummy data to be used in a site visit demo on April 22, 2021
//  and removed afterward.

import { DimensionData, ScenarioData } from '@/types/Datacubes';

export const SCENARIOS_LIST: Array<ScenarioData> = [
  {
    'id': 'abc1',
    'rainfall multiplier': 75,
    'N rate delta': 110,
    'crop': 'teff',
    'production': 55,
    'baseline': 'true'
  },
  {
    'id': 'abc2',
    'rainfall multiplier': 25,
    'N rate delta': 120,
    'crop': 'corn',
    'production': 25,
    'baseline': 'false'
  },
  {
    'id': 'abc3',
    'rainfall multiplier': 15,
    'N rate delta': 140,
    'crop': 'maize',
    'production': 70,
    'baseline': 'false'
  }
];

export const DIMENSIONS_LIST: Array<DimensionData> = [
  {
    name: 'rainfall multiplier',
    type: 'input',
    default: 75,
    description: 'my first input var'
  },
  {
    name: 'N rate delta',
    type: 'input',
    default: 110,
    description: 'my second input var'
  },
  {
    name: 'crop',
    type: 'drilldown',
    default: 'teff',
    description: 'my first drilldown var'
  },
  {
    name: 'production',
    type: 'output',
    default: 55,
    description: 'my first output var'
  }
];
