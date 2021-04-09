// Dummy data to be used in a site visit demo on April 22, 2021
//  and removed afterward.

const timeseries1 = [
  { value: 1, timestamp: 100 },
  { value: 2, timestamp: 200 },
  { value: 3, timestamp: 300 },
  { value: 2, timestamp: 400 },
  { value: 4, timestamp: 500 },
  { value: 7, timestamp: 600 },
  { value: 3, timestamp: 700 },
  { value: 4, timestamp: 800 },
  { value: 2, timestamp: 900 },
  { value: 5, timestamp: 1000 },
  { value: 3, timestamp: 1100 },
  { value: 6, timestamp: 1200 },
  { value: 4, timestamp: 1300 },
  { value: 3, timestamp: 1400 },
  { value: 2, timestamp: 1500 },
  { value: 3, timestamp: 1600 }
];
const timeseries2 = [
  { value: 3, timestamp: 100 },
  { value: 4, timestamp: 200 },
  { value: 3, timestamp: 300 },
  { value: 4, timestamp: 400 },
  { value: 4, timestamp: 500 },
  { value: 5, timestamp: 600 },
  { value: 6, timestamp: 700 },
  { value: 5, timestamp: 800 },
  { value: 6, timestamp: 900 },
  { value: 7, timestamp: 1000 },
  { value: 5, timestamp: 1100 },
  { value: 4, timestamp: 1200 },
  { value: 5, timestamp: 1300 },
  { value: 6, timestamp: 1400 },
  { value: 7, timestamp: 1500 },
  { value: 8, timestamp: 1600 }
];
const timeseries3 = [
  { value: 5, timestamp: 100 },
  { value: 6, timestamp: 200 },
  { value: 3, timestamp: 300 },
  { value: 1, timestamp: 400 },
  { value: 8, timestamp: 500 },
  { value: 5, timestamp: 600 },
  { value: 6, timestamp: 700 },
  { value: 6, timestamp: 800 },
  { value: 4, timestamp: 900 },
  { value: 2, timestamp: 1000 },
  { value: 3, timestamp: 1100 },
  { value: 4, timestamp: 1200 },
  { value: 4, timestamp: 1300 },
  { value: 6, timestamp: 1400 },
  { value: 9, timestamp: 1500 },
  { value: 8, timestamp: 1600 }
];

export const TIMESERIES_DATA = [
  {
    _SCENARIO_ID: 'abc1',
    points: timeseries1
  },
  {
    _SCENARIO_ID: 'abc2',
    points: timeseries2
  },
  {
    _SCENARIO_ID: 'abc3',
    points: timeseries3
  }
];

export const SCENARIOS_LIST = [
  {
    '_SCENARIO_ID': 'abc1',
    'rainfall multiplier': 75,
    'N rate delta': 110,
    'crop': 'teff'
  },
  {
    '_SCENARIO_ID': 'abc2',
    'rainfall multiplier': 25,
    'N rate delta': 120,
    'crop': 'corn'
  },
  {
    '_SCENARIO_ID': 'abc3',
    'rainfall multiplier': 15,
    'N rate delta': 140,
    'crop': 'maize'
  }
];
