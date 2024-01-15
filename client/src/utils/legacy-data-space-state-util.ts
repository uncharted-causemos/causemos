import _ from 'lodash';
import {
  BreakdownState,
  BreakdownStateNone,
  MapDisplayOptions,
  ModelOrDatasetState,
  ComparisonSettings,
  Indicator,
  Model,
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
import { ModelRun } from '@/types/ModelRun';

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

export const getBreakdownOptionFromBreakdownState = (state: BreakdownState) => {
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

const getBreakdownState = (
  breakdownOption: string | null,
  runIds: string[],
  outputName: string,
  dataState: DataSpaceDataState | null
): BreakdownState => {
  const baselineTimeseriesId = dataState?.relativeTo ?? '';
  const comparisonSettings: ComparisonSettings = {
    shouldDisplayAbsoluteValues: baselineTimeseriesId === '',
    baselineTimeseriesId,
    shouldUseRelativePercentage: true,
  };
  const noBreakdownState: BreakdownStateNone = {
    outputName,
    modelRunIds: runIds,
    comparisonSettings,
  };
  if (!runIds.length) return noBreakdownState;

  if (breakdownOption === 'region')
    return {
      modelRunId: runIds[0],
      outputName,
      regionIds: dataState?.selectedRegionIds ?? [],
      comparisonSettings,
    };

  if (breakdownOption === 'year')
    return {
      modelRunId: runIds[0],
      outputName,
      regionId: dataState?.selectedRegionIds[0] ?? null,
      years: dataState?.selectedYears ?? [],
      isAllYearsReferenceTimeseriesShown: (dataState?.activeReferenceOptions ?? []).includes(
        'allYears'
      ),
      isSelectedYearsReferenceTimeseriesShown: (dataState?.activeReferenceOptions ?? []).includes(
        'selectYears'
      ),
      comparisonSettings,
    };

  if (breakdownOption === 'variable')
    // Note: selectedOutputVariables in DataSpaceDataState are display output names not output names.
    // Re map the display names to output names.
    return {
      modelRunId: runIds[0],
      outputNames: (dataState?.selectedOutputVariables ?? [])
        .map(
          (displayName) =>
            dataState?.activeFeatures.find((f) => f.display_name === displayName)?.name
        )
        .filter((v) => v !== undefined) as string[],
      comparisonSettings,
    };

  // Qualifier
  if (_.isString(breakdownOption) && breakdownOption.length > 0)
    return {
      modelRunId: runIds[0],
      outputName,
      regionId: dataState?.selectedRegionIds[0] ?? null,
      qualifier: breakdownOption,
      qualifierValues: dataState?.selectedQualifierValues || [],
      comparisonSettings,
    };
  return noBreakdownState;
};

export const convertFromLegacyState = (
  dataId: string,
  defaultRunId: string,
  viewState: ViewState,
  dataState: DataSpaceDataState | null,
  defaultFeature: string
) => {
  // Note: For state from analysis items,in some cases dataState isn't populated. In that case fallback to use default feature and states from viewState.
  let modelRunIds = [];
  if (defaultRunId) modelRunIds.push(defaultRunId); // if defaultRunId isn't empty
  if (dataState?.selectedScenarioIds?.length) modelRunIds = dataState.selectedScenarioIds;
  const selectedOutputIndex = viewState.selectedOutputIndex ?? 0;
  const selectedOutput = dataState?.activeFeatures[selectedOutputIndex];
  const outputName = selectedOutput?.name ?? defaultFeature;

  const mapDisplayOptions: MapDisplayOptions = {
    selectedMapBaseLayer: viewState.selectedMapBaseLayer ?? BASE_LAYER.DEFAULT,
    selectedMapDataLayer: viewState.selectedMapDataLayer ?? DATA_LAYER.ADMIN,
    dataLayerTransparency: viewState.dataLayerTransparency ?? DATA_LAYER_TRANSPARENCY['100%'],
    colorSchemeReversed: viewState.colorSchemeReversed ?? false,
    colorSchemeName: viewState.colorSchemeName ?? COLOR.DEFAULT,
    colorScaleType: viewState.colorScaleType ?? ColorScaleType.LinearDiscrete,
    numberOfColorBins: viewState.numberOfColorBins ?? 5,
  };
  const state: ModelOrDatasetState = {
    dataId,
    breakdownState: getBreakdownState(
      viewState?.breakdownOption || null,
      modelRunIds,
      outputName,
      dataState
    ),
    mapDisplayOptions,
    selectedTimestamp: dataState?.selectedTimestamp ?? null,
    selectedTransform: selectedOutput?.transform ?? dataState?.selectedTransform ?? '',
    // Aggregation Options
    spatialAggregationMethod:
      (viewState.spatialAggregation as AggregationOption) ?? AggregationOption.Mean,
    temporalAggregationMethod:
      (viewState.temporalAggregation as AggregationOption) ?? AggregationOption.Mean,
    spatialAggregation: adminLevelToSpatialAggregation(viewState.selectedAdminLevel ?? 0),
    temporalResolution:
      (viewState.temporalResolution as TemporalResolutionOption) ?? TemporalResolutionOption.Month,
  };
  return state;
};

export const fixIncompleteDefaultBreakdownState = (
  breakdownState: BreakdownState,
  metadata: Model | Indicator | null,
  defaultModelRun: ModelRun | 'indicator' | null
) => {
  // Output name can be empty if the state is converted from initial old analysis item state (due to missing data state),
  // in that case, get default output name from the loaded metadata
  if (!isBreakdownStateNone(breakdownState)) return breakdownState;
  if (breakdownState.outputName && breakdownState.modelRunIds.length > 0) return breakdownState;
  if (!metadata) return null;
  if (metadata.type === 'model' && !defaultModelRun) return null;
  const defaultState: BreakdownStateNone = {
    ...breakdownState,
    outputName: breakdownState.outputName || metadata.default_feature,
    modelRunIds: metadata.type === 'model' ? [(defaultModelRun as ModelRun).id] : ['indicator'],
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
