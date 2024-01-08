import {
  BreakdownState,
  BreakdownStateNone,
  MapDisplayOptions,
  ModelOrDatasetState,
} from '@/types/Datacube';
import {
  getRegionIdsFromBreakdownState,
  isBreakdownStateNone,
  isBreakdownStateOutputs,
  isBreakdownStateQualifiers,
  isBreakdownStateRegions,
  isBreakdownStateYears,
} from './datacube-util';
import {
  AggregationOption,
  DataTransform,
  DatacubeGeoAttributeVariableType,
  DatacubeViewMode,
  SPLIT_BY_VARIABLE,
  SpatialAggregation,
  SpatialAggregationLevel,
  TemporalAggregationLevel,
  TemporalResolutionOption,
} from '@/types/Enums';
import { DataSpaceDataState, ViewState } from '@/types/Insight';
import { stringToAdminLevel } from './admin-level-util';
import { BASE_LAYER, DATA_LAYER, DATA_LAYER_TRANSPARENCY } from './map-util-new';
import { COLOR, ColorScaleType } from './colors-util';

export const convertToLegacyDataSpaceDataState = (id: string, state: ModelOrDatasetState) => {
  const bdState = state.breakdownState;
  const selectedOutputVariables = isBreakdownStateOutputs(bdState)
    ? bdState.outputNames
    : [bdState.outputName];
  const activeFeatures = selectedOutputVariables.map((outputName) => ({
    name: outputName,
    display_name: outputName,
    temporalResolution: state.temporalResolution,
    temporalAggregation: state.temporalAggregationMethod,
    spatialAggregation: state.spatialAggregationMethod,
    transform: DataTransform.None,
  }));
  const selectedRegionIds = getRegionIdsFromBreakdownState(bdState);
  const selectedRegionIdsAtAllLevels = {
    country: [] as string[],
    admin1: [] as string[],
    admin2: [] as string[],
    admin3: [] as string[],
  };
  if (state.spatialAggregation !== 'tiles') {
    selectedRegionIdsAtAllLevels[state.spatialAggregation] = selectedRegionIds;
  }
  const dataState: DataSpaceDataState = {
    selectedModelId: id,
    selectedScenarioIds: isBreakdownStateNone(bdState) ? bdState.modelRunIds : [bdState.modelRunId],
    selectedTimestamp: state.selectedTimestamp,
    selectedRegionIds,
    selectedRegionIdsAtAllLevels,
    selectedOutputVariables,
    activeFeatures,
    nonDefaultQualifiers: [],
    selectedQualifierValues: isBreakdownStateQualifiers(bdState) ? bdState.qualifierValues : [],
    selectedYears: isBreakdownStateYears(bdState) ? bdState.years : [],
    selectedTransform: DataTransform.None, // TODO: add support
    activeReferenceOptions: [], // TODO: add support
    selectedPreGenDataId: '',
    relativeTo: bdState.comparisonSettings.shouldDisplayAbsoluteValues
      ? null
      : bdState.comparisonSettings.baselineTimeseriesId,
    searchFilters: { clauses: [] },
  };
  return dataState;
};

const getBreakdownOptionFromBreakdownState = (state: BreakdownState) => {
  if (isBreakdownStateOutputs(state)) return SPLIT_BY_VARIABLE;
  if (isBreakdownStateQualifiers(state)) return state.qualifier;
  if (isBreakdownStateRegions(state)) return SpatialAggregationLevel.Region;
  if (isBreakdownStateYears(state)) return TemporalAggregationLevel.Year;
  return null;
};

export const convertToLegacyViewState = (state: ModelOrDatasetState) => {
  const viewState: ViewState = {
    spatialAggregation: state.spatialAggregationMethod,
    temporalAggregation: state.temporalAggregationMethod,
    temporalResolution: state.temporalResolution,
    selectedAdminLevel: stringToAdminLevel(state.spatialAggregation),
    selectedViewTab: DatacubeViewMode.Data,
    selectedOutputIndex: 0,
    selectedMapBaseLayer: state.mapDisplayOptions.selectedMapBaseLayer,
    selectedMapDataLayer: state.mapDisplayOptions.selectedMapDataLayer,
    breakdownOption: getBreakdownOptionFromBreakdownState(state.breakdownState),
    dataLayerTransparency: state.mapDisplayOptions.dataLayerTransparency,
    colorSchemeReversed: state.mapDisplayOptions.colorSchemeReversed,
    colorSchemeName: state.mapDisplayOptions.colorSchemeName,
    colorScaleType: state.mapDisplayOptions.colorScaleType,
    numberOfColorBins: state.mapDisplayOptions.numberOfColorBins,
  };
  return viewState;
};

export const convertFromLegacyState = (
  outputName: string,
  dataId: string,
  defaultRunId: string,
  viewState: ViewState,
  dataState: DataSpaceDataState
) => {
  const defaultBreakdownState: BreakdownStateNone = {
    // outputName: metadata.default_feature,
    outputName,
    modelRunIds: defaultRunId ? [defaultRunId] : [],
    comparisonSettings: {
      baselineTimeseriesId: defaultRunId,
      shouldDisplayAbsoluteValues: true,
      shouldUseRelativePercentage: false,
    },
  };
  const mapDisplayOptions: MapDisplayOptions = {
    selectedMapBaseLayer: viewState.selectedMapBaseLayer ?? BASE_LAYER.DEFAULT,
    selectedMapDataLayer: viewState.selectedMapDataLayer ?? DATA_LAYER.ADMIN,
    dataLayerTransparency: viewState.dataLayerTransparency ?? DATA_LAYER_TRANSPARENCY['100%'],
    colorSchemeReversed: viewState.colorSchemeReversed ?? false,
    colorSchemeName: viewState.colorSchemeName ?? COLOR.DEFAULT,
    colorScaleType: viewState.colorScaleType ?? ColorScaleType.LinearDiscrete,
    numberOfColorBins: viewState.numberOfColorBins ?? 5,
  };
  const defaultState: ModelOrDatasetState = {
    // dataId: metadata.data_id,
    dataId,
    breakdownState: defaultBreakdownState,
    mapDisplayOptions,
    selectedTimestamp: dataState.selectedTimestamp ?? null,
    selectedTransform: dataState.selectedTransform ?? DataTransform.None,
    // Aggregation Options
    spatialAggregationMethod: viewState.spatialAggregation as AggregationOption,
    temporalAggregationMethod: viewState.temporalAggregation as AggregationOption,
    spatialAggregation: adminLevelToSpatialAggregation(viewState.selectedAdminLevel ?? 0),
    temporalResolution: viewState.temporalResolution as TemporalResolutionOption,
  };
  return defaultState;
};

export function adminLevelToSpatialAggregation(level: number): SpatialAggregation {
  switch (level) {
    case 1:
      return DatacubeGeoAttributeVariableType.Admin1;
    case 2:
      return DatacubeGeoAttributeVariableType.Admin2;
    case 3:
      return DatacubeGeoAttributeVariableType.Admin3;
    default:
      return DatacubeGeoAttributeVariableType.Country;
  }
}
