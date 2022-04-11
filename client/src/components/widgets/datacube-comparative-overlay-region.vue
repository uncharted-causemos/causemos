<template>
  <div class="datacube-card-container">
    <header class="datacube-header" >
      <h5
        v-if="metadata && mainModelOutput"
        class="datacube-title-area"
        @click="openDrilldown"
      >
        <span>{{mainModelOutput.display_name !== '' ? mainModelOutput.display_name : mainModelOutput.name}} - {{ selectedRegionIdsDisplay }}</span>
        <span class="datacube-name">{{metadata.name}}</span>
        <span v-if="metadata.status === DatacubeStatus.Deprecated" style="margin-left: 1rem" :style="{ backgroundColor: statusColor }">{{ statusLabel }}</span>
        <i class="fa fa-fw fa-expand drilldown-btn" />
      </h5>

      <options-button :dropdown-below="true">
        <template #content>
          <div
            class="dropdown-option"
            @click="clickRemove"
          >
            Remove
          </div>
          <div
            class="dropdown-option"
            @click="clickDuplicate"
          >
            Duplicate
          </div>
        </template>
      </options-button>
    </header>
    <main>
      <div class="card-maps-box">
        <region-map
          :data="regionMapData"
          :map-bounds="mapBounds"
          :popup-Formatter="popupFormatter"
          :region-filter="selectedRegionIdsAtAllLevels"
          :selected-admin-level="selectedAdminLevel"
          :disable-pan-zoom="true"
        />
        <div v-if="mapLegendData.length > 0" class="card-maps-legend-container">
          <map-legend :ramp="mapLegendData[0]" :label-position="{ top: true, right: false }" :isContinuos="isContinuousScale" />
        </div>
      </div>
      <!-- legend of selected runs here, with a dropdown that indicates which run is selected -->
      <div style="display: flex; align-items: center; align-self: center">
        <div style="margin-right: 1rem">Total Timeseries: {{regionRunsScenarios.length}}</div>
        <div style="display: flex; align-items: center">
          <div style="margin-right: 4px">Selected:</div>
          <select name="selectedRegionRankingRun" id="selectedRegionRankingRun"
            @change="selectedScenarioIndex = $event.target.selectedIndex"
            :disabled="regionRunsScenarios.length === 1"
            :style="{ color: regionRunsScenarios && regionRunsScenarios.length > selectedScenarioIndex ? regionRunsScenarios[selectedScenarioIndex].color : 'black' }"
          >
            <option
              v-for="(selectedRun, indx) in regionRunsScenarios"
              :key="selectedRun.name"
              :selected="indx === selectedScenarioIndex"
            >
              {{selectedRun.name}}
            </option>
          </select>
        </div>
      </div>
    </main>
  </div>
</template>

<script lang="ts">
import * as d3 from 'd3';
import useModelMetadata from '@/services/composables/useModelMetadata';
import useTimeseriesData from '@/services/composables/useTimeseriesData';
import { AnalysisItem } from '@/types/Analysis';
import { DatacubeFeature } from '@/types/Datacube';
import { getFilteredScenariosFromIds, getOutputs, getSelectedOutput, hasRegionLevelData } from '@/utils/datacube-util';
import { ModelRun } from '@/types/ModelRun';
import { AggregationOption, TemporalResolutionOption, DatacubeType, DatacubeStatus, DataTransform, TemporalAggregationLevel, SpatialAggregationLevel, SPLIT_BY_VARIABLE } from '@/types/Enums';
import { computed, defineComponent, Ref, ref, toRefs, watch, watchEffect } from 'vue';
import OptionsButton from '@/components/widgets/options-button.vue';
import useScenarioData from '@/services/composables/useScenarioData';
import { mapActions, useStore } from 'vuex';
import router from '@/router';
import _ from 'lodash';
import { DataSpaceDataState, ViewState } from '@/types/Insight';
import useMapBounds from '@/services/composables/useMapBounds';
import useDatacubeDimensions from '@/services/composables/useDatacubeDimensions';
import useDatacubeVersioning from '@/services/composables/useDatacubeVersioning';
import { fromStateSelectedRegionsAtAllLevels, validateSelectedRegions } from '@/utils/drilldown-util';
import { COLOR, colorFromIndex, ColorScaleType, getColors, COLOR_SCHEME, isDiscreteScale, validateColorScaleType, SCALE_FUNCTION, isDivergingScheme } from '@/utils/colors-util';
import RegionMap from '@/components/widgets/region-map.vue';
import { BarData } from '@/types/BarChart';
import useRegionalData from '@/services/composables/useRegionalData';
import { DATA_LAYER, DATA_LAYER_TRANSPARENCY } from '@/utils/map-util-new';
import useOutputSpecs from '@/services/composables/useOutputSpecs';
import useDatacubeHierarchy from '@/services/composables/useDatacubeHierarchy';
import useSelectedTimeseriesPoints from '@/services/composables/useSelectedTimeseriesPoints';
import { OutputVariableSpecs, RawOutputDataPoint, RegionalAggregations } from '@/types/Outputdata';
import { getSelectedRegionIdsDisplay, adminLevelToString, getParentSelectedRegions } from '@/utils/admin-level-util';
import { duplicateAnalysisItem, openDatacubeDrilldown } from '@/utils/analysis-util';
import useActiveDatacubeFeature from '@/services/composables/useActiveDatacubeFeature';
import { normalize } from '@/utils/value-util';
import useAnalysisMapStats from '@/services/composables/useAnalysisMapStats';
import { AnalysisMapColorOptions } from '@/types/Common';
import { AdminRegionSets } from '@/types/Datacubes';
import MapLegend from '@/components/widgets/map-legend.vue';
import { isDataSpaceDataState } from '@/utils/insight-util';
import useQualifiers from '@/services/composables/useQualifiers';
import useMultiTimeseriesData from '@/services/composables/useMultiTimeseriesData';

export default defineComponent({
  name: 'DatacubeComparativeOverlayRegion',
  components: {
    OptionsButton,
    RegionMap,
    MapLegend
  },
  props: {
    id: {
      type: String,
      required: true
    },
    datacubeId: {
      type: String,
      required: true
    },
    itemId: {
      type: String,
      required: true
    },
    selectedTimestamp: {
      type: Number,
      default: 0
    },
    datacubeIndex: {
      type: Number,
      default: 0
    }
  },
  emits: ['loaded-timeseries'],
  setup(props, { emit }) {
    const {
      itemId,
      id,
      datacubeId,
      selectedTimestamp,
      datacubeIndex
    } = toRefs(props);

    const metadata = useModelMetadata(id);

    const mainModelOutput = ref<DatacubeFeature | undefined>(undefined);
    const { activeFeature } = useActiveDatacubeFeature(metadata, itemId);

    const selectedScenarioIds = ref([] as string[]);
    const selectedScenarios = ref([] as ModelRun[]);

    const outputs = ref([]) as Ref<DatacubeFeature[]>;

    const regionMapData = ref<BarData[]>([]);

    const store = useStore();

    const analysisId = computed(() => store.getters['dataAnalysis/analysisId']);
    const project = computed(() => store.getters['app/project']);
    const analysisItems = computed<AnalysisItem[]>(() => store.getters['dataAnalysis/analysisItems']);
    const datacubeCurrentOutputsMap = computed(() => store.getters['app/datacubeCurrentOutputsMap']);

    const initialViewConfig = ref<ViewState | null>(null);
    const initialDataConfig = ref<DataSpaceDataState | null>(null);
    const datacubeAnalysisItem = analysisItems.value.find(item => item.itemId === itemId.value);
    if (datacubeAnalysisItem) {
      initialViewConfig.value = datacubeAnalysisItem.viewConfig;
      initialDataConfig.value = datacubeAnalysisItem.dataConfig;
    }

    const searchFilters = ref<any>({});

    const activeReferenceOptions = ref([] as string[]);
    const showPercentChange = ref<boolean>(true);
    const isRawDataLayerSelected = ref<boolean>(false);

    const initialSelectedRegionIds = ref<string[]>([]);
    const initialActiveFeatures = ref<OutputVariableSpecs[]>([]);
    const initialNonDefaultQualifiers = ref<string[]>([]);
    const initialSelectedQualifierValues = ref<string[]>([]);
    const initialSelectedYears = ref<string[]>([]);
    const initialActiveReferenceOptions = ref<string[]>([]);
    const initialSelectedGlobalTimestamp = ref<number | null>(null);

    const breakdownOption = ref<string | null>(null);
    const setBreakdownOption = (newValue: string | null) => {
      breakdownOption.value = newValue;
      activeReferenceOptions.value = [];
    };

    watchEffect(() => {
      if (metadata.value) {
        outputs.value = getOutputs(metadata.value);

        let initialOutputIndex = 0;
        const datacubeKey = itemId.value;
        const currentOutputEntry = datacubeCurrentOutputsMap.value[datacubeKey];
        if (currentOutputEntry !== undefined && currentOutputEntry >= 0) {
          // we have a store entry for the default output of the current model
          initialOutputIndex = currentOutputEntry;
        } else {
          initialOutputIndex = metadata.value.validatedOutputs?.findIndex(o => o.name === metadata.value?.default_feature) ?? 0;

          // update the store
          const defaultOutputMap = _.cloneDeep(datacubeCurrentOutputsMap.value);
          defaultOutputMap[datacubeKey] = initialOutputIndex;
          store.dispatch('app/setDatacubeCurrentOutputsMap', defaultOutputMap);
        }
        // override (to correctly fetch the output selection for each datacube duplication)
        if (initialViewConfig.value && !_.isEmpty(initialViewConfig.value) && initialViewConfig.value.selectedOutputIndex !== undefined) {
          initialOutputIndex = initialViewConfig.value.selectedOutputIndex;
        }
        mainModelOutput.value = getSelectedOutput(metadata.value, initialOutputIndex);
      }
    });

    const {
      dimensions
    } = useDatacubeDimensions(metadata, itemId);

    const modelRunsFetchedAt = ref(0);
    const { allModelRunData, filteredRunData } = useScenarioData(id, modelRunsFetchedAt, searchFilters, dimensions);

    const selectedRegionIds = ref<string[]>([]);
    const selectedRegionIdsAtAllLevels = ref<AdminRegionSets>({
      country: new Set(),
      admin1: new Set(),
      admin2: new Set(),
      admin3: new Set()
    });
    const initialSelectedScenarioIds = ref<string[]>([]);

    watchEffect(() => {
      if (metadata.value?.type === DatacubeType.Model && allModelRunData.value && allModelRunData.value.length > 0) {
        const baselineRuns = allModelRunData.value.filter(run => run.is_default_run).map(run => run.id);
        if (baselineRuns.length > 0 || initialSelectedScenarioIds.value.length) {
          // do not pick the first run by default in case a run was previously selected
          selectedScenarioIds.value = initialSelectedScenarioIds.value.length > 0 ? initialSelectedScenarioIds.value : [baselineRuns[0]];

          selectedScenarios.value = getFilteredScenariosFromIds(selectedScenarioIds.value, allModelRunData.value);
        }
      }
    });

    watchEffect(() => {
      if (metadata.value?.type === DatacubeType.Indicator) {
        selectedScenarioIds.value = [DatacubeType.Indicator.toString()];
      }
    });

    const selectedTemporalResolution = ref<TemporalResolutionOption>(TemporalResolutionOption.Month);
    const selectedSpatialAggregation = ref<AggregationOption>(AggregationOption.Mean);
    const selectedTemporalAggregation = ref<AggregationOption>(AggregationOption.Mean);
    const selectedTransform = ref<DataTransform>(DataTransform.None);

    const selectedBreakdownOutputVariables = ref(new Set<string>());

    const selectedAdminLevel = ref(0); // country by default
    const selectedDataLayer = ref(DATA_LAYER.ADMIN);
    const selectedDataLayerTransparency = ref(DATA_LAYER_TRANSPARENCY['100%']);

    const colorSchemeReversed = ref(false);
    const selectedColorSchemeName = ref<COLOR>(COLOR.DEFAULT); // DEFAULT
    const selectedColorScaleType = ref(ColorScaleType.LinearDiscrete);
    const numberOfColorBins = ref(5); // assume default number of 5 bins on startup

    const {
      datacubeHierarchy
      // NOTE: selectedRegionIds is already calculated above so no need to receive as a return object
    } = useDatacubeHierarchy(
      selectedScenarioIds,
      metadata,
      selectedAdminLevel,
      breakdownOption,
      activeFeature
    );

    watchEffect(() => {
      if (initialActiveReferenceOptions.value && initialActiveReferenceOptions.value.length > 0) {
        activeReferenceOptions.value = initialActiveReferenceOptions.value;
      }
    });

    // grab and track the view-config for this datacube
    watch(
      () => [
        initialViewConfig.value,
        initialDataConfig.value
      ],
      () => {
        if (initialViewConfig.value && !_.isEmpty(initialViewConfig.value)) {
          if (initialViewConfig.value?.breakdownOption !== undefined) {
            setBreakdownOption(initialViewConfig.value?.breakdownOption);
          }
          if (initialViewConfig.value.temporalResolution !== undefined) {
            selectedTemporalResolution.value = initialViewConfig.value.temporalResolution as TemporalResolutionOption;
          }
          if (initialViewConfig.value.temporalAggregation !== undefined) {
            selectedTemporalAggregation.value = initialViewConfig.value.temporalAggregation as AggregationOption;
          }
          if (initialViewConfig.value.spatialAggregation !== undefined) {
            selectedSpatialAggregation.value = initialViewConfig.value.spatialAggregation as AggregationOption;
          }
          if (initialViewConfig.value.selectedOutputIndex !== undefined) {
            const defaultOutputMap = _.cloneDeep(datacubeCurrentOutputsMap.value);
            const datacubeKey = itemId.value;
            defaultOutputMap[datacubeKey] = initialViewConfig.value.selectedOutputIndex;
            store.dispatch('app/setDatacubeCurrentOutputsMap', defaultOutputMap);
          }
          if (initialViewConfig.value.colorSchemeReversed !== undefined) {
            colorSchemeReversed.value = initialViewConfig.value.colorSchemeReversed;
          }
          if (initialViewConfig.value.colorSchemeName !== undefined) {
            selectedColorSchemeName.value = initialViewConfig.value.colorSchemeName;
          }
          if (validateColorScaleType(String(initialViewConfig.value.colorScaleType))) {
            selectedColorScaleType.value = initialViewConfig.value.colorScaleType as ColorScaleType;
          }
          if (initialViewConfig.value.numberOfColorBins !== undefined) {
            numberOfColorBins.value = initialViewConfig.value.numberOfColorBins;
          }
          if (initialViewConfig.value.selectedAdminLevel !== undefined) {
            selectedAdminLevel.value = initialViewConfig.value.selectedAdminLevel;
          }
          if (initialViewConfig.value.selectedMapDataLayer !== undefined) {
            selectedDataLayer.value = initialViewConfig.value.selectedMapDataLayer;
          }
          if (initialViewConfig.value.dataLayerTransparency !== undefined) {
            selectedDataLayerTransparency.value = initialViewConfig.value.dataLayerTransparency;
          }
        }

        // apply initial data config for this datacube
        if (initialDataConfig.value && !_.isEmpty(initialDataConfig.value)) {
          if (initialDataConfig.value.selectedTimestamp !== undefined) {
            if (initialViewConfig.value?.breakdownOption && initialViewConfig.value?.breakdownOption === SPLIT_BY_VARIABLE) {
              initialSelectedGlobalTimestamp.value = initialDataConfig.value.selectedTimestamp;
            } else {
              // setSelectedTimestamp(initialDataConfig.value?.selectedTimestamp as number);
            }
          }
          if (initialDataConfig.value.selectedRegionIds !== undefined) {
            initialDataConfig.value.selectedRegionIds.forEach(regionId => {
              selectedRegionIds.value.push(regionId);
            });
          }
          if (initialDataConfig.value.selectedRegionIdsAtAllLevels !== undefined) {
            const regions = fromStateSelectedRegionsAtAllLevels(initialDataConfig.value.selectedRegionIdsAtAllLevels);
            const { validRegions } = validateSelectedRegions(regions, datacubeHierarchy.value);
            selectedRegionIdsAtAllLevels.value = validRegions;
          }
          if (initialDataConfig.value.selectedScenarioIds !== undefined) {
            initialSelectedScenarioIds.value = initialDataConfig.value.selectedScenarioIds;
          }
          if (initialDataConfig.value.selectedTransform !== undefined) {
            selectedTransform.value = initialDataConfig.value.selectedTransform;
          }
          if (initialDataConfig.value.selectedQualifierValues !== undefined) {
            initialSelectedQualifierValues.value = _.clone(initialDataConfig.value.selectedQualifierValues);
          }
          // do we have a search filter that was saved before!?
          if (initialDataConfig.value.searchFilters !== undefined) {
            // restoring a state where some searchFilters were defined
            if (!_.isEmpty(initialDataConfig.value.searchFilters) && initialDataConfig.value.searchFilters.clauses.length > 0) {
              searchFilters.value = _.clone(initialDataConfig.value.searchFilters);
            }
          } else {
            // we may be applying an insight that was captured before introducing the searchFilters capability
            //  so we need to clear any existing filters that may affect the available model runs
            searchFilters.value = {};
          }

          const dataState = initialDataConfig.value;
          if (dataState && isDataSpaceDataState(dataState)) {
            initialNonDefaultQualifiers.value = _.clone(dataState.nonDefaultQualifiers);
            // @NOTE: 'initialSelectedRegionIds' must be set after 'selectedAdminLevel'
            initialSelectedRegionIds.value = _.clone(dataState.selectedRegionIds);

            selectedBreakdownOutputVariables.value = new Set(_.clone(dataState.selectedOutputVariables));
            initialActiveFeatures.value = _.clone(dataState.activeFeatures);
            // @NOTE: 'initialSelectedQualifierValues' must be set after 'breakdownOption'
            initialSelectedQualifierValues.value = _.clone(dataState.selectedQualifierValues);
            // @NOTE: 'initialSelectedYears' must be set after 'breakdownOption'
            initialSelectedYears.value = _.clone(dataState.selectedYears);
            // @NOTE: 'initialActiveReferenceOptions' must be set after 'breakdownOption'
            initialActiveReferenceOptions.value = _.clone(dataState.activeReferenceOptions);
          }
        }
      },
      {
        immediate: true
      }
    );

    const selectedRegionIdForQualifiers = computed(() => {
      const regionIds = getParentSelectedRegions(selectedRegionIdsAtAllLevels.value, selectedAdminLevel.value);
      // Note: qualfiler breakdown data can only be broken down by singe regionId, so it isn't applicable in 'split by region' mode where multiple region can be selected
      // and also in 'split by year' mode where data is aggregated by year.
      if (regionIds.length !== 1 ||
          breakdownOption.value === TemporalAggregationLevel.Year ||
          breakdownOption.value === SpatialAggregationLevel.Region) return '';
      return regionIds[0];
    });

    const {
      // qualifierBreakdownData,
      // toggleIsQualifierSelected,
      // requestAdditionalQualifier,
      // nonDefaultQualifiers,
      // qualifierFetchInfo,
      selectedQualifierValues
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

    const selectedRegionIdsForTimeseries = computed(() => getParentSelectedRegions(selectedRegionIdsAtAllLevels.value, selectedAdminLevel.value));

    const {
      timeseriesData,
      visibleTimeseriesData,
      relativeTo,
      baselineMetadata,
      setRelativeTo,
      temporalBreakdownData
    } = useTimeseriesData(
      metadata,
      selectedScenarioIds,
      selectedTemporalResolution,
      selectedTemporalAggregation,
      selectedSpatialAggregation,
      breakdownOption,
      selectedTimestamp,
      selectedTransform,
      () => {},
      selectedRegionIdsForTimeseries,
      selectedQualifierValues,
      initialSelectedYears,
      showPercentChange,
      activeFeature,
      selectedScenarios,
      activeReferenceOptions,
      isRawDataLayerSelected
    );

    const activeFeatures = ref<OutputVariableSpecs[]>([]);
    watch(
      () => [initialActiveFeatures.value, outputs.value],
      () => {
        // are we restoring state post init or after an insight has been loaded?
        if (initialActiveFeatures.value.length > 0) {
          activeFeatures.value = _.cloneDeep(initialActiveFeatures.value);
        } else {
          // create the initial list of activeFeatures if datacube outputs have been loaded
          if (outputs.value !== null) {
            activeFeatures.value = outputs.value.map(output => ({
              name: output.name,
              display_name: output.display_name,
              temporalResolution: selectedTemporalResolution.value,
              temporalAggregation: selectedTemporalAggregation.value,
              spatialAggregation: selectedSpatialAggregation.value,
              transform: selectedTransform.value
            }));
          }
        }
      }
    );

    const filteredActiveFeatures = computed(() => {
      return activeFeatures.value
        .filter(feature => selectedBreakdownOutputVariables.value.has(feature.display_name));
    });

    const {
      globalTimeseries
    } = useMultiTimeseriesData(
      metadata,
      selectedScenarioIds,
      breakdownOption,
      filteredActiveFeatures,
      initialSelectedGlobalTimestamp
    );

    const timeseriesDataForSelection = computed(() => breakdownOption.value === SPLIT_BY_VARIABLE ? globalTimeseries.value : timeseriesData.value);
    const timestampForSelection = computed(() => breakdownOption.value === SPLIT_BY_VARIABLE ? initialSelectedGlobalTimestamp.value : selectedTimestamp.value);

    const { selectedTimeseriesPoints } = useSelectedTimeseriesPoints(
      breakdownOption,
      timeseriesDataForSelection,
      timestampForSelection,
      selectedScenarioIds
    );

    watchEffect(() => {
      if (metadata.value) {
        const timeseriesList = timeseriesDataForSelection.value;

        if (timeseriesList.length > 0) {
          // override the color of all loaded timeseries
          timeseriesList.forEach(timeseries => {
            timeseries.color = colorFromIndex(datacubeIndex.value);
          });

          regionRunsScenarios.value = timeseriesList.map(timeseries => ({ name: timeseries.name, color: timeseries.color }));

          emit('loaded-timeseries', {
            id: id.value,
            datacubeId: datacubeId.value,
            itemId: itemId.value,
            timeseriesList,
            //
            datacubeName: metadata.value.name,
            datacubeOutputName: mainModelOutput.value?.display_name,
            source: metadata.value.maintainer.organization,
            //
            region: metadata.value.geography.country // FIXME: later this could be the selected region for each datacube
          });
        }
      }
    });

    const selectedRegionIdsDisplay = computed(() => {
      return getSelectedRegionIdsDisplay(selectedRegionIdsAtAllLevels.value, selectedAdminLevel.value);
    });

    const { statusColor, statusLabel } = useDatacubeVersioning(metadata);

    const {
      outputSpecs
    } = useOutputSpecs(
      id,
      metadata,
      selectedTimeseriesPoints,
      activeFeatures,
      activeFeature,
      filteredRunData,
      breakdownOption
    );

    const {
      regionalData
    } = useRegionalData(
      outputSpecs,
      breakdownOption,
      datacubeHierarchy
    );

    const rawDataPointsList = ref<RawOutputDataPoint[][]>([]);

    const isContinuousScale = computed(() => {
      return !isDiscreteScale(selectedColorScaleType.value);
    });
    const isDivergingScale = computed(() => {
      return isDivergingScheme(selectedColorSchemeName.value);
    });

    const mapColorOptions = computed(() => {
      const options: AnalysisMapColorOptions = {
        scheme: finalColorScheme.value,
        relativeToSchemes: [COLOR_SCHEME.GREYS_7, COLOR_SCHEME.PIYG_7],
        scaleFn: SCALE_FUNCTION[selectedColorScaleType.value],
        isContinuous: isContinuousScale.value,
        isDiverging: isDivergingScale.value,
        opacity: Number(selectedDataLayerTransparency.value)
      };
      return options;
    });

    const {
      mapLegendData
    } = useAnalysisMapStats(
      outputSpecs,
      regionalData,
      relativeTo,
      selectedDataLayer,
      selectedAdminLevel,
      selectedRegionIdsAtAllLevels,
      showPercentChange,
      mapColorOptions,
      ref([]), // activeReferenceOptions
      breakdownOption,
      rawDataPointsList
    );

    const { mapBounds } = useMapBounds(regionalData, selectedAdminLevel, selectedRegionIdsAtAllLevels);

    // note that final color scheme represents the list of final colors that should be used, for example, in the map and its legend
    const finalColorScheme = computed(() => {
      const scheme = isDiscreteScale(selectedColorScaleType.value)
        ? getColors(selectedColorSchemeName.value, numberOfColorBins.value)
        : _.clone(COLOR_SCHEME[selectedColorSchemeName.value]);
      return colorSchemeReversed.value ? scheme.reverse() : scheme;
    });

    const popupFormatter = (feature: any) => {
      const { label, value, normalizedValue } = feature.state || {};
      if (!label || value === null || value === undefined) return null;
      return `${label.split('__').pop()}<br> Normalized: ${+normalizedValue.toFixed(2)}<br> Value: ${+value.toFixed(2)}`;
    };

    const selectedScenarioIndex = ref(0);
    const regionRunsScenarios = ref([] as {name: string; color: string}[]);

    watch(
      () => [
        regionalData.value,
        selectedAdminLevel.value,
        finalColorScheme.value,
        selectedScenarioIndex.value,
        selectedDataLayerTransparency.value
      ],
      () => {
        const temp: BarData[] = [];

        if (regionalData.value !== null) {
          const adminLevelAsString = adminLevelToString(selectedAdminLevel.value) as keyof RegionalAggregations;
          const regionLevelData = regionalData.value[adminLevelAsString];
          const hasValues = hasRegionLevelData(regionLevelData);

          if (regionLevelData !== undefined && regionLevelData.length > 0 && hasValues) {
            // special case for split-by-region:
            let indexIntoRegionData = selectedScenarioIndex.value;
            if (breakdownOption.value === SpatialAggregationLevel.Region) {
              indexIntoRegionData = 0;
            }

            const data = regionLevelData.map(regionDataItem => ({
              name: regionDataItem.id,
              value: Object.values(regionDataItem.values).length > 0 && Object.values(regionDataItem.values).length > indexIntoRegionData ? Object.values(regionDataItem.values)[indexIntoRegionData] : 0
            }));

            if (data.length > 0) {
              let regionIndexCounter = 0;

              const allValues = data.map(regionDataItem => regionDataItem.value);
              const scale = d3
                .scaleLinear()
                .domain(d3.extent(allValues) as [number, number])
                .nice(); // 😃
              const dataExtent = scale.domain(); // after nice() is called

              const colors = finalColorScheme.value;

              // @REVIEW
              // Normalization is a transform performed by wm-go: https://gitlab.uncharted.software/WM/wm-go/-/merge_requests/64
              // To receive normalized data, send transform=normalization when fetching regional data
              data.forEach(dataItem => {
                const normalizedValue = normalize(dataItem.value, dataExtent[0], dataExtent[1]);
                const itemValue = dataItem.value;
                const colorIndex = Math.trunc(normalizedValue * numberOfColorBins.value); // i.e., linear binning
                // REVIEW: is the calculation of map colors consistent with how the datacube-card map is calculating colors?
                const clampedColorIndex = _.clamp(colorIndex, 0, colors.length - 1);
                const regionColor = colors[clampedColorIndex];
                temp.push({
                  name: (regionIndexCounter + 1).toString(),
                  label: dataItem.name,
                  value: itemValue,
                  normalizedValue: normalizedValue,
                  color: regionColor,
                  opacity: Number(selectedDataLayerTransparency.value)
                });
                regionIndexCounter++;
              });
            }

            // adjust the ranking so that the highest value will be ranked 1st
            // REVIEW: do we need this in the Overlay mode?
            temp.forEach((item, indx) => {
              item.name = (temp.length - indx).toString();
            });
          }
          regionMapData.value = temp;
        }
      });

    return {
      activeDrilldownTab: 'breakdown',
      selectedTemporalResolution,
      selectedTemporalAggregation,
      selectedSpatialAggregation,
      selectedScenarioIds,
      selectedRegionIds,
      selectedRegionIdsAtAllLevels,
      selectedRegionIdsDisplay,
      mapBounds,
      metadata,
      mainModelOutput,
      outputs,
      timeseriesData,
      baselineMetadata,
      relativeTo,
      setRelativeTo,
      breakdownOption,
      setBreakdownOption,
      temporalBreakdownData,
      AggregationOption,
      visibleTimeseriesData,
      analysisItems,
      project,
      analysisId,
      props,
      store,
      DatacubeStatus,
      statusColor,
      statusLabel,
      regionMapData,
      popupFormatter,
      selectedScenarioIndex,
      regionRunsScenarios,
      selectedAdminLevel,
      mapLegendData,
      isContinuousScale
    };
  },
  methods: {
    ...mapActions({
      removeAnalysisItems: 'dataAnalysis/removeAnalysisItems'
    }),
    openDrilldown() {
      openDatacubeDrilldown(this.props.id, this.itemId, router, this.store);
    },
    clickRemove() {
      // when removing, it is not enough to only send the datacube id to be removed
      //  since the datacube may have been duplicated multiple times
      //  and we need to suport removing one at a time
      this.removeAnalysisItems([this.itemId]);
    },
    clickDuplicate() {
      if (this.metadata !== null) {
        duplicateAnalysisItem(this.metadata, this.id, this.analysisId, this.store);
      }
    }
  }
});
</script>

<style lang="scss" scoped>
@import '~styles/variables';

.datacube-card-container {
  background: $background-light-1;
  border-radius: 2px;
  border-width: 3px;
  border-style: solid;
  border-color: inherit;
  height: 100%;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  text-overflow: hidden;
  white-space: nowrap;
}

.datacube-header {
  display: flex;
  align-items: center;

  .datacube-title-area {
    display: flex;
    cursor: pointer;
    flex: 1;
    min-width: 0;
    margin: 0;

    &:hover {
      color: $selected-dark;

      .datacube-name {
        color: $selected-dark;
      }

      .drilldown-btn {
        color: $selected-dark;
      }
    }
  }
}

.datacube-name {
  font-weight: normal;
  color: $label-color;
  margin-left: 10px;

  white-space: nowrap;
  text-overflow: ellipsis;
  overflow: hidden;
}

.drilldown-btn {
  padding: 5px;
  color: $text-color-light;
  margin-left: 10px;
}

main {
  display: flex;
  flex: 1;
  min-height: 0;
  flex-direction: column;
}

.card-maps-legend-container {
  display: flex;
  flex-direction: column;
  .top-padding {
    height: 19px;
  }
}

.card-maps-box {
  flex: 3;
  min-width: 0;
  display: flex;
  flex-direction: row;
}

</style>
