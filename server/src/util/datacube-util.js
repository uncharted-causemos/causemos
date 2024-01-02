const getDatacubeDefaultState = (dataId, defaultFeature, isIndicator = false) => {
  return {
    dataId: dataId,
    breakdownState: {
      outputName: defaultFeature || '',
      modelRunIds: isIndicator ? ['indicator'] : [],
      comparisonSettings: {
        shouldDisplayAbsoluteValues: true,
        baselineTimeseriesId: '',
        shouldUseRelativePercentage: true,
      },
    },
    mapDisplayOptions: {
      selectedMapBaseLayer: 'default',
      selectedMapDataLayer: 'admin',
      dataLayerTransparency: '1',
      colorSchemeReversed: false,
      colorSchemeName: 'DEFAULT',
      colorScaleType: 'linear discrete',
      numberOfColorBins: 5,
    },
    selectedTimestamp: null,
    selectedTransform: '',
    spatialAggregationMethod: 'mean',
    temporalAggregationMethod: 'mean',
    spatialAggregation: 'country',
    temporalResolution: 'month',
  };
};

module.exports = {
  getDatacubeDefaultState,
};
