import { Indicator, Model } from '@/types/Datacube';
import {
  SPLIT_BY_VARIABLE,
  AggregationOption,
  TemporalResolutionOption,
  DataTransform,
  DatacubeType,
} from '@/types/Enums';
import { getParentSelectedRegions } from '@/utils/admin-level-util';
import { DATA_LAYER } from '@/utils/map-util-new';
import _ from 'lodash';
import { computed, ref, Ref, watch, watchEffect } from 'vue';
import useDatacubeFeatures from './useDatacubeFeatures';
import useDatacubeDimensions from './useDatacubeDimensions';
import useDatacubeHierarchy from './useDatacubeHierarchy';
import useMapBounds from './useMapBounds';
import useMultiTimeseriesData from './useMultiTimeseriesData';
import useOutputSpecs from './useOutputSpecs';
import useQualifiers from './useQualifiers';
import useRawPointsData from './useRawPointsData';
import useReferenceSeries from './useReferenceSeries';
import useRegionalData from './useRegionalData';
import useScenarioData from './useScenarioData';
import useSelectedTimeseriesPoints from './useSelectedTimeseriesPoints';
import useTimeseriesData from './useTimeseriesData';
import useAnalysisMapStats from './useAnalysisMapStats';
import useDatacubeColorScheme from './useDatacubeColorScheme';
import { getFilteredScenariosFromIds, isIndicator } from '@/utils/datacube-util';
import { Filters } from '@/types/Filters';
import { FeatureConfig } from '@/types/Outputdata';
import useActiveDatacubeFeature from './useActiveDatacubeFeature';

export default function useDatacube(
  metadata: Ref<Model | Indicator | null>,
  itemId: Ref<string>,
  // FIXME: this doesn't need to be passed in as a prop if we can unify the
  //  logic to calculate activeFeature. See the FIXME in
  //  comparative-card for more details.
  activeFeatureName: Ref<string>,
  isRefreshingModelRunsPeriodically: Ref<boolean>
) {
  // Populated by initialDataConfig
  // FIXME: rename initialDataConfig to initialDataState
  // FIXME: don't break it down into refs, just pass the whole object around
  const initialSelectedQualifierValues = ref<string[]>([]);
  const initialNonDefaultQualifiers = ref<string[]>([]);
  const initialSelectedYears = ref<string[]>([]);
  const initialSelectedOutputVariables = ref<string[]>([]);
  const initialSelectedGlobalTimestamp = ref<number | null>(null);
  const initialActiveFeatures = ref<FeatureConfig[]>([]);
  const initialActiveReferenceOptions = ref<string[]>([]);

  const selectedSpatialAggregation = ref<AggregationOption>(AggregationOption.Mean);
  const setSpatialAggregationSelection = (aggOption: AggregationOption) => {
    selectedSpatialAggregation.value = aggOption;
  };

  const selectedTemporalAggregation = ref<AggregationOption>(AggregationOption.Mean);
  const setTemporalAggregationSelection = (aggOption: AggregationOption) => {
    selectedTemporalAggregation.value = aggOption;
  };

  const selectedTemporalResolution = ref<TemporalResolutionOption>(TemporalResolutionOption.Month);
  const setTemporalResolutionSelection = (temporalRes: TemporalResolutionOption) => {
    selectedTemporalResolution.value = temporalRes;
  };

  const selectedTransform = ref<DataTransform>(DataTransform.None);
  const setTransformSelection = (transform: DataTransform) => {
    selectedTransform.value = transform;
  };

  // Whenever the selected variable changes, set the aggregations, resolution,
  //  and transform that were previously stored in the activeFeatures list.
  watch(
    () => [activeFeatureName.value],
    () => {
      if (activeFeatureName.value && activeFeatures.value.length > 0) {
        const feature =
          activeFeatures.value.find((feature) => feature.name === activeFeatureName.value) ??
          activeFeatures.value[0];
        selectedTemporalAggregation.value = feature.temporalAggregation;
        selectedTemporalResolution.value = feature.temporalResolution;
        selectedSpatialAggregation.value = feature.spatialAggregation;
        selectedTransform.value = feature.transform;
      }
    }
  );

  const {
    outputs,
    activeFeatures,
    selectedFeatures,
    selectedFeatureNames,
    toggleIsFeatureSelected,
  } = useDatacubeFeatures(
    metadata,
    initialSelectedOutputVariables,
    initialActiveFeatures,
    activeFeatureName,
    selectedTemporalResolution,
    selectedTemporalAggregation,
    selectedSpatialAggregation,
    selectedTransform
  );

  const { currentOutputIndex } = useActiveDatacubeFeature(metadata, itemId);
  const { dimensions } = useDatacubeDimensions(metadata, currentOutputIndex);

  const modelRunSearchFilters = ref<Filters>({ clauses: [] });

  const selectedModelId = computed(() => metadata.value?.id ?? null);
  const { allModelRunData, filteredRunData, fetchModelRuns } = useScenarioData(
    selectedModelId,
    modelRunSearchFilters,
    dimensions,
    isRefreshingModelRunsPeriodically
  );

  const selectedScenarioIds = ref([] as string[]);
  watchEffect(() => {
    if (isIndicator(metadata.value)) {
      selectedScenarioIds.value = [DatacubeType.Indicator.toString()];
    }
  });

  const selectedScenarios = computed(() => {
    return getFilteredScenariosFromIds(selectedScenarioIds.value, filteredRunData.value);
  });

  const selectedAdminLevel = ref(0);
  const setSelectedAdminLevel = (level: number) => {
    selectedAdminLevel.value = level;
  };

  const breakdownOption = ref<string | null>(null);
  const setBreakdownOption = (newValue: string | null) => {
    breakdownOption.value = newValue;
  };

  const {
    datacubeHierarchy,
    selectedRegionIds,
    selectedRegionsString,
    selectedRegionIdsAtAllLevels,
    referenceRegions,
    toggleIsRegionSelected,
  } = useDatacubeHierarchy(
    selectedScenarioIds,
    metadata,
    selectedAdminLevel,
    breakdownOption,
    activeFeatureName
  );

  const selectedRegionIdsAtSelectedLevel = computed(() =>
    getParentSelectedRegions(selectedRegionIdsAtAllLevels.value, selectedAdminLevel.value)
  );

  const selectedTimestamp = ref<number | null>(null);
  const setSelectedTimestamp = (newValue: number | null) => {
    selectedTimestamp.value = newValue;
  };

  const selectedDataLayer = ref(DATA_LAYER.ADMIN);
  const setDataLayer = (val: DATA_LAYER) => {
    selectedDataLayer.value = val;
  };
  const isRawDataLayerSelected = computed(() => selectedDataLayer.value === DATA_LAYER.RAW);

  const {
    qualifierBreakdownData,
    toggleIsQualifierSelected,
    selectedQualifierValues,
    requestAdditionalQualifier,
    nonDefaultQualifiers,
    qualifierFetchInfo,
  } = useQualifiers(
    metadata,
    selectedRegionIdsAtSelectedLevel,
    breakdownOption,
    selectedScenarioIds,
    selectedTemporalResolution,
    selectedTemporalAggregation,
    selectedSpatialAggregation,
    selectedTimestamp,
    initialSelectedQualifierValues,
    initialNonDefaultQualifiers,
    activeFeatureName,
    isRawDataLayerSelected
  );

  const showPercentChange = ref<boolean>(true);

  // FIXME: set by initial data config, reset when some other things change.
  // This would be in the useReferenceSeries composable, but there is a circular
  //  dependency chain where useRegionalData and useTimeseriesData require
  //  activeReferenceOptions, and useReferenceSeries depends on them.
  const activeReferenceOptions = ref([] as string[]);
  watchEffect(() => {
    if (initialActiveReferenceOptions.value && initialActiveReferenceOptions.value.length > 0) {
      activeReferenceOptions.value = initialActiveReferenceOptions.value;
    }
  });

  const {
    timeseriesData,
    visibleTimeseriesData,
    relativeTo,
    baselineMetadata,
    setRelativeTo,
    temporalBreakdownData,
    selectedYears,
    toggleIsYearSelected,
  } = useTimeseriesData(
    metadata,
    selectedScenarioIds,
    selectedTemporalResolution,
    selectedTemporalAggregation,
    selectedSpatialAggregation,
    breakdownOption,
    selectedTimestamp,
    selectedTransform,
    setSelectedTimestamp,
    selectedRegionIdsAtSelectedLevel,
    selectedQualifierValues,
    initialSelectedYears,
    showPercentChange,
    activeFeatureName,
    selectedScenarios,
    activeReferenceOptions,
    isRawDataLayerSelected
  );

  // FIXME: can we combine useTimeseriesData and useMultiTimeseriesData?
  // We might not want to, if it doesn't simplify the code. We might just need
  //  to rename useMultiTimeseriesData.
  // Note that globalTimeseries is modified in datacube-card (outside the composable), but not in the others. It's also constructed/modified in CompAnalysis.
  const {
    globalTimeseries,
    selectedGlobalTimestamp,
    selectedGlobalTimestampRange,
    setSelectedGlobalTimestamp,
    setSelectedGlobalTimestampRange,
  } = useMultiTimeseriesData(
    metadata,
    selectedScenarioIds,
    breakdownOption,
    selectedFeatures,
    initialSelectedGlobalTimestamp
  );

  // In datacube-card: only used by useSelectedTimeseriesPoints
  // In all other cards:
  //  - Color gets overridden
  //  - used to create regionRunsScenarios
  const timeseriesDataForSelection = computed(() =>
    breakdownOption.value === SPLIT_BY_VARIABLE ? globalTimeseries.value : timeseriesData.value
  );
  const timestampForSelection = computed(() =>
    breakdownOption.value === SPLIT_BY_VARIABLE
      ? selectedGlobalTimestamp.value
      : selectedTimestamp.value
  );

  const { selectedTimeseriesPoints } = useSelectedTimeseriesPoints(
    breakdownOption,
    timeseriesDataForSelection,
    timestampForSelection,
    selectedScenarioIds
  );

  const { outputSpecs } = useOutputSpecs(
    selectedModelId,
    metadata,
    selectedTimeseriesPoints,
    activeFeatures,
    activeFeatureName,
    filteredRunData,
    breakdownOption
  );

  const { regionalData } = useRegionalData(
    outputSpecs,
    breakdownOption,
    datacubeHierarchy,
    relativeTo,
    activeReferenceOptions,
    temporalBreakdownData,
    timestampForSelection
  );

  const { availableReferenceOptions, toggleReferenceOptions } = useReferenceSeries(
    activeReferenceOptions,
    breakdownOption,
    selectedAdminLevel,
    regionalData
  );

  const { rawDataPointsList } = useRawPointsData(
    outputSpecs,
    selectedRegionIds,
    breakdownOption,
    selectedDataLayer
  );

  const { onSyncMapBounds, mapBounds } = useMapBounds(
    regionalData,
    selectedRegionIdsAtSelectedLevel
  );

  const {
    selectedDataLayerTransparency,
    setDataLayerTransparency,
    colorSchemeReversed,
    setColorSchemeReversed,
    selectedColorSchemeName,
    setColorSchemeName,
    selectedColorScaleType,
    setColorScaleType,
    numberOfColorBins,
    setNumberOfColorBins,
    finalColorScheme,
    isContinuousScale,
    isDivergingScale,
    mapColorOptions,
  } = useDatacubeColorScheme();

  const {
    updateMapCurSyncedZoom,
    recalculateGridMapDiffStats,
    adminLayerStats,
    gridLayerStats,
    pointsLayerStats,
    mapLegendData,
  } = useAnalysisMapStats(
    outputSpecs,
    regionalData,
    relativeTo,
    selectedDataLayer,
    selectedAdminLevel,
    selectedRegionIdsAtAllLevels,
    showPercentChange,
    mapColorOptions,
    activeReferenceOptions,
    breakdownOption,
    rawDataPointsList
  );

  return {
    dimensions,
    allModelRunData,
    filteredRunData,
    fetchModelRuns,
    selectedModelId,
    modelRunSearchFilters,
    datacubeHierarchy,
    selectedRegionIds,
    selectedRegionsString,
    selectedRegionIdsAtAllLevels,
    referenceRegions,
    toggleIsRegionSelected,
    selectedScenarioIds,
    selectedAdminLevel,
    setSelectedAdminLevel,
    breakdownOption,
    setBreakdownOption,
    selectedScenarios,
    selectedSpatialAggregation,
    setSpatialAggregationSelection,
    selectedTemporalAggregation,
    setTemporalAggregationSelection,
    selectedTemporalResolution,
    setTemporalResolutionSelection,
    selectedTimestamp,
    setSelectedTimestamp,
    initialSelectedQualifierValues,
    initialNonDefaultQualifiers,
    initialSelectedYears,
    initialSelectedGlobalTimestamp,
    initialSelectedOutputVariables,
    initialActiveFeatures,
    initialActiveReferenceOptions,
    selectedDataLayerTransparency,
    setDataLayerTransparency,
    selectedDataLayer,
    setDataLayer,
    isRawDataLayerSelected,
    qualifierBreakdownData,
    toggleIsQualifierSelected,
    selectedQualifierValues,
    requestAdditionalQualifier,
    nonDefaultQualifiers,
    qualifierFetchInfo,
    selectedTransform,
    setTransformSelection,
    showPercentChange,
    activeReferenceOptions,
    availableReferenceOptions,
    toggleReferenceOptions,
    timeseriesData,
    visibleTimeseriesData,
    relativeTo,
    baselineMetadata,
    setRelativeTo,
    temporalBreakdownData,
    selectedYears,
    toggleIsYearSelected,
    outputs,
    activeFeatures,
    selectedFeatures,
    selectedFeatureNames,
    toggleIsFeatureSelected,
    globalTimeseries,
    selectedGlobalTimestamp,
    selectedGlobalTimestampRange,
    setSelectedGlobalTimestamp,
    setSelectedGlobalTimestampRange,
    timestampForSelection,
    selectedTimeseriesPoints,
    timeseriesDataForSelection,
    outputSpecs,
    regionalData,
    rawDataPointsList,
    onSyncMapBounds,
    mapBounds,
    colorSchemeReversed,
    setColorSchemeReversed,
    selectedColorSchemeName,
    setColorSchemeName,
    selectedColorScaleType,
    setColorScaleType,
    numberOfColorBins,
    setNumberOfColorBins,
    finalColorScheme,
    isContinuousScale,
    isDivergingScale,
    mapColorOptions,
    updateMapCurSyncedZoom,
    recalculateGridMapDiffStats,
    adminLayerStats,
    gridLayerStats,
    pointsLayerStats,
    mapLegendData,
  };
}
