import { Indicator, Model } from '@/types/Datacube';
import {
  SPLIT_BY_VARIABLE,
  AggregationOption,
  TemporalResolutionOption,
  TemporalAggregationLevel,
  SpatialAggregationLevel,
  DataTransform
} from '@/types/Enums';
import { ModelRun } from '@/types/ModelRun';
import { OutputVariableSpecs } from '@/types/Outputdata';
import { getParentSelectedRegions } from '@/utils/admin-level-util';
import { DATA_LAYER, DATA_LAYER_TRANSPARENCY } from '@/utils/map-util-new';
import _ from 'lodash';
import { computed, ref, Ref, watchEffect } from 'vue';
import useActiveDatacubeFeature from './useActiveDatacubeFeature';
import useDatacubeDimensions from './useDatacubeDimensions';
import useDatacubeHierarchy from './useDatacubeHierarchy';
import useMapBounds from './useMapBounds';
import useMultiTimeseriesData from './useMultiTimeseriesData';
import useOutputSpecs from './useOutputSpecs';
import useQualifiers from './useQualifiers';
import useRawPointsData from './useRawPointsData';
import useRegionalData from './useRegionalData';
import useScenarioData from './useScenarioData';
import useSelectedTimeseriesPoints from './useSelectedTimeseriesPoints';
import useTimeseriesData from './useTimeseriesData';

// FIXME: in datacube-card, itemId is taken from the route, others all take it as a prop
export default function useDatacube(
  metadata: Ref<Model | Indicator | null>,
  itemId: Ref<string>,
  // FIXME
  // in datacube-card we want to suppress fetching data when
  // newRunsMode.value || metadata.value?.type !== DatacubeType.Model
  // In all other cards we never re-fetch
  isRefreshingModelRunsPeriodically: Ref<boolean>
) {
  const { activeFeature, currentOutputIndex } = useActiveDatacubeFeature(
    metadata,
    itemId
  );

  const { dimensions, ordinalDimensionNames } = useDatacubeDimensions(
    metadata,
    itemId
  );

  // FIXME: searchFilters refers to the model run search bar.
  // It's only really used in datacube-card (changes are scattered through the
  //  setup function), but the other components read and write it when saving/
  //  restoring insights.
  // TODO: rename and add a type
  const searchFilters = ref<any>({});

  // FIXME: in datacube-card we do this. In all other cards we just pass id in
  //  directly
  const selectedModelId = computed(() => metadata.value?.id ?? null);
  const { allModelRunData, filteredRunData, fetchModelRuns } = useScenarioData(
    selectedModelId,
    searchFilters,
    dimensions,
    isRefreshingModelRunsPeriodically
  );

  const selectedScenarioIds = ref([] as string[]);

  const selectedAdminLevel = ref(0);
  const setSelectedAdminLevel = (level: number) => {
    selectedAdminLevel.value = level;
  };

  const breakdownOption = ref<string | null>(null);
  const setBreakdownOption = (newValue: string | null) => {
    breakdownOption.value = newValue;
    // FIXME: this should be a watcher near activeReferenceOptions rather than a side effect of this function
    activeReferenceOptions.value = [];
  };

  const {
    datacubeHierarchy,
    selectedRegionIds,
    selectedRegionIdsAtAllLevels,
    referenceRegions,
    toggleIsRegionSelected
  } = useDatacubeHierarchy(
    selectedScenarioIds,
    metadata,
    selectedAdminLevel,
    breakdownOption,
    activeFeature
  );

  // FIXME: this is only used by useTimeseriesData, it's not clear exactly
  //  what it does, might need to be renamed
  const selectedRegionIdsForTimeseries = computed(() =>
    getParentSelectedRegions(
      selectedRegionIdsAtAllLevels.value,
      selectedAdminLevel.value
    )
  );

  const selectedScenarios = ref([] as ModelRun[]);
  const selectedSpatialAggregation = ref<AggregationOption>(
    AggregationOption.Mean
  );
  const selectedTemporalAggregation = ref<AggregationOption>(
    AggregationOption.Mean
  );
  const selectedTemporalResolution = ref<TemporalResolutionOption>(
    TemporalResolutionOption.Month
  );

  const selectedTimestamp = ref(null) as Ref<number | null>;
  // FIXME: Safe to remove? Confirm that vue reactivity isn't triggered if the
  //  new value is the same as the old one
  // if (selectedTimestamp.value === timestamp) return;
  const setSelectedTimestamp = (newValue: number | null) => {
    selectedTimestamp.value = newValue;
  };

  // Populated by initialDataConfig
  // FIXME: rename initialDataConfig to initialDataState
  // FIXME: don't break it down into refs, just pass the whole object around
  const initialSelectedQualifierValues = ref<string[]>([]);
  const initialNonDefaultQualifiers = ref<string[]>([]);
  const initialSelectedYears = ref<string[]>([]);
  const initialSelectedOutputVariables = ref<string[]>([]);
  const initialSelectedGlobalTimestamp = ref<number | null>(null);

  const selectedDataLayerTransparency = ref(DATA_LAYER_TRANSPARENCY['100%']);

  const selectedDataLayer = ref(DATA_LAYER.ADMIN);
  const isRawDataLayerSelected = computed(
    () => selectedDataLayer.value === DATA_LAYER.RAW
  );

  // FIXME: move into useDatacubeHierarchy, it produces selectedRegionIdsAtAllLevels and takes breakdownOption as a prop. Only used by useQualifiers
  // FIXME: the first line is literally `selectedRegionIdForQualifiers`
  const selectedRegionIdForQualifiers = computed(() => {
    const regionIds = getParentSelectedRegions(
      selectedRegionIdsAtAllLevels.value,
      selectedAdminLevel.value
    );
    // Note: qualifier breakdown data can only be broken down by single regionId, so it isn't applicable in 'split by region' mode where multiple region can be selected
    // and also in 'split by year' mode where data is aggregated by year.
    if (
      regionIds.length !== 1 ||
      breakdownOption.value === TemporalAggregationLevel.Year ||
      breakdownOption.value === SpatialAggregationLevel.Region
    ) {
      return '';
    }
    return regionIds[0];
  });

  const {
    qualifierBreakdownData,
    toggleIsQualifierSelected,
    selectedQualifierValues,
    requestAdditionalQualifier,
    nonDefaultQualifiers,
    qualifierFetchInfo
  } = useQualifiers(
    metadata,
    breakdownOption,
    selectedScenarioIds,
    selectedTemporalResolution,
    selectedTemporalAggregation,
    selectedSpatialAggregation,
    selectedTimestamp,
    initialSelectedQualifierValues,
    initialNonDefaultQualifiers,
    activeFeature,
    isRawDataLayerSelected,
    selectedRegionIdForQualifiers
  );

  const selectedTransform = ref<DataTransform>(DataTransform.None);

  // FIXME: not currently used in datacube-comparative-card or datacube-region-ranking-card
  // Used for useAnalysisMapStats in datacube-comparative-overlay-region and datacube-region-ranking-card.
  const showPercentChange = ref<boolean>(true);

  // FIXME: we also have the currentReferenceOptions, not clear why we need both
  //  set by initial data config, reset when some other things change
  const activeReferenceOptions = ref([] as string[]);

  const {
    timeseriesData,
    visibleTimeseriesData,
    relativeTo,
    baselineMetadata,
    setRelativeTo,
    temporalBreakdownData,
    selectedYears,
    toggleIsYearSelected
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
    selectedRegionIdsForTimeseries,
    selectedQualifierValues,
    initialSelectedYears,
    showPercentChange,
    activeFeature,
    selectedScenarios,
    activeReferenceOptions,
    isRawDataLayerSelected
  );

  // FIXME: extract breakdownOutputVariables to its own composable?
  const selectedBreakdownOutputVariables = ref(new Set<string>());
  const toggleIsOutputVariableSelected = (outputVariable: string) => {
    const isOutputVariableSelected =
      selectedBreakdownOutputVariables.value.has(outputVariable);
    const updatedList = _.clone(selectedBreakdownOutputVariables.value);

    if (isOutputVariableSelected) {
      // If an output variable is currently selected, remove it from the list
      updatedList.delete(outputVariable);
    } else {
      // Else add it to the list of selected output variables.
      updatedList.add(outputVariable);
    }

    // Assign new object to selectedBreakdownOutputVariables.value to trigger reactivity updates.
    selectedBreakdownOutputVariables.value = updatedList;
  };
  watchEffect(() => {
    selectedBreakdownOutputVariables.value = new Set(
      initialSelectedOutputVariables.value
    );
  });

  // FIXME: we also have `activeFeature`... should these be combined?
  // FIXME: extract activeFeatures to its own composable? look at
  //  breakdownOutputVariables and see if they should be combined or split up
  const activeFeatures = ref<OutputVariableSpecs[]>([]);
  const filteredActiveFeatures = computed(() => {
    return activeFeatures.value.filter(feature =>
      selectedBreakdownOutputVariables.value.has(feature.display_name)
    );
  });

  // FIXME: can we combine useTimeseriesData and useMultiTimeseriesData?
  // We might not want to, if it doesn't simplify the code. We might just need
  //  to rename useMultiTimeseriesData.
  // Note that globalTimeseries is modified in datacube-card (outside the composable), but not in the others
  const {
    globalTimeseries,
    selectedGlobalTimestamp,
    selectedGlobalTimestampRange,
    setSelectedGlobalTimestamp,
    setSelectedGlobalTimestampRange
  } = useMultiTimeseriesData(
    metadata,
    selectedScenarioIds,
    breakdownOption,
    filteredActiveFeatures,
    initialSelectedGlobalTimestamp
  );

  // FIXME: only used by useSelectedTimeseriesPoints
  const timeseriesDataForSelection = computed(() =>
    breakdownOption.value === SPLIT_BY_VARIABLE
      ? globalTimeseries.value
      : timeseriesData.value
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
    activeFeature,
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

  const { rawDataPointsList } = useRawPointsData(
    outputSpecs,
    selectedRegionIds,
    breakdownOption,
    selectedDataLayer
  );

  const { onSyncMapBounds, mapBounds } = useMapBounds(
    regionalData,
    selectedAdminLevel,
    selectedRegionIdsAtAllLevels
  );

  return {
    currentOutputIndex,
    dimensions,
    ordinalDimensionNames,
    allModelRunData,
    filteredRunData,
    fetchModelRuns,
    selectedModelId,
    searchFilters,
    datacubeHierarchy,
    selectedRegionIds,
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
    selectedTemporalAggregation,
    selectedTemporalResolution,
    selectedTimestamp,
    setSelectedTimestamp,
    initialSelectedQualifierValues,
    initialNonDefaultQualifiers,
    initialSelectedYears,
    initialSelectedGlobalTimestamp,
    initialSelectedOutputVariables,
    selectedDataLayerTransparency,
    selectedDataLayer,
    isRawDataLayerSelected,
    qualifierBreakdownData,
    toggleIsQualifierSelected,
    selectedQualifierValues,
    requestAdditionalQualifier,
    nonDefaultQualifiers,
    qualifierFetchInfo,
    selectedTransform,
    showPercentChange,
    activeReferenceOptions,
    timeseriesData,
    visibleTimeseriesData,
    relativeTo,
    baselineMetadata,
    setRelativeTo,
    temporalBreakdownData,
    selectedYears,
    toggleIsYearSelected,
    selectedBreakdownOutputVariables,
    toggleIsOutputVariableSelected,
    activeFeatures,
    filteredActiveFeatures,
    globalTimeseries,
    selectedGlobalTimestamp,
    selectedGlobalTimestampRange,
    setSelectedGlobalTimestamp,
    setSelectedGlobalTimestampRange,
    timestampForSelection,
    selectedTimeseriesPoints,
    outputSpecs,
    regionalData,
    rawDataPointsList,
    onSyncMapBounds,
    mapBounds
  };
}
