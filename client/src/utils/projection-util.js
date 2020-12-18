import _ from 'lodash';

export const ENGINE_OPTIONS = [
  { key: 'dyse', value: 'DySE', maxSteps: 72 },
  { key: 'delphi', value: 'Delphi', maxSteps: 36 }
];

export const calculateScenarioPercentageChange = (experiment, initValue) => {
  // We just calculate the percent change when: 1) when initial and last value are the same sign; and 2) initial value is not 0
  // We will be asking users about utility of this percent change

  // When dealing with dyse, we can calculate the percentage using:
  // 1. the intial value, which is in turn based on time series data
  // 2. the clamp that the user set at t0, which is by default the initial value if the user hasn't set a clamp at t0
  // We've opted to use option 2
  const lastValue = _.last(experiment.values).value;
  if ((initValue * lastValue > 0)) {
    return ((lastValue - initValue) / Math.abs(initValue)) * 100; // %Delta = (C-P)/|P
  } else {
    return 0.0;
  }
};


// Dyse projections previously could not exlend above/below historic min/max, this code fixs that by placing the historic data into the middle third of the levels, adding space
// above and below historic min/max so that Dyse CAN project above/below the historic min/max.
// the padding above and below is equal to the range between min and max.  There's some tweaking to make it work with numLevels.

export const expandExtentForDyseProjections = (yExtent, numLevels) => {
  const scalingFactor = ((yExtent[1] - yExtent[0]) / ((1 / 3.0) * (numLevels - 1)));
  const averageExtent = 0.5 * (yExtent[0] + yExtent[1]);
  const dyseOffset = 0.25 * ((numLevels + 1) % 2);

  return [
    -scalingFactor * Math.floor(0.5 * numLevels) + averageExtent + dyseOffset,
    scalingFactor * (Math.ceil(0.5 * numLevels) - 1) + averageExtent + dyseOffset
  ];
};

