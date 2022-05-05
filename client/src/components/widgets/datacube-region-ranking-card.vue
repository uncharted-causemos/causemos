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
      <div class="ranking-weight-label">Ranking Weight: <b>{{rankingWeight}}</b></div>

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
      <div class="chart-and-footer">
        <div v-if="hiddenRegionRank > 0" class="hover-not-visible">
          <div style="display: flex; justify-content: space-between; min-width: 150px">
            <div>{{hiddenRegionName}}</div><div>{{hiddenRegionValue}}</div>
          </div>
          <div style="display: flex; justify-content: space-between; min-width: 150px">
            <div>Rank</div><div>{{hiddenRegionRank}}</div>
          </div>
        </div>
        <bar-chart
          class="bar-chart"
          :bars-data="barsData"
          :hover-id="barChartHoverId"
          @bar-chart-hover="$emit('bar-chart-hover', $event)"
        />
        <div class="row datacube-footer">
          <div>Showing data for {{timestampFormatter(selectedTimestamp)}}</div>
          <!-- legend of selected runs here, with a dropdown that indicates which run is selected -->
          <div style="display: flex; align-items: center">
            <div style="margin-right: 1rem">Total Timeseries: {{regionRunsScenarios.length}}</div>
            <div style="display: flex; align-items: center">
              <div style="margin-right: 4px">Selected:</div>
              <select name="selectedRegionRankingRun" id="selectedRegionRankingRun"
                @change="selectedRegionRankingScenario = $event.target.selectedIndex"
                :disabled="regionRunsScenarios.length === 1"
                :style="{ color: regionRunsScenarios && regionRunsScenarios.length > selectedRegionRankingScenario ? regionRunsScenarios[selectedRegionRankingScenario].color : 'black' }"
              >
                <option
                  v-for="(selectedRun, indx) in regionRunsScenarios"
                  :key="selectedRun.name"
                  :selected="indx === selectedRegionRankingScenario"
                >
                  {{selectedRun.name}}
                </option>
              </select>
            </div>
          </div>
          <div class="checkbox">
            <label
              @click="invertData"
              style="cursor: pointer; color: black;">
              <i
                class="fa fa-lg fa-fw"
                :class="{ 'fa-check-square-o': isDataInverted, 'fa-square-o': !isDataInverted }"
              />
              Invert data
            </label>
          </div>
        </div>
      </div>
      <div class="card-maps-box">
        <region-map
          class="region-map-container"
          :data="barsData"
          :selected-admin-level="selectedAdminLevel"
          :map-bounds="bbox"
          :selected-id="barChartHoverId"
          :disable-pan-zoom="true"
          @click-region="$emit('map-click-region', $event)" />
        <div v-if="mapLegendData.length > 0" class="card-maps-legend-container">
          <map-legend :ramp="mapLegendData[0]" :label-position="{ top: false, right: true }" :isContinuos="false" />
        </div>
      </div>
    </main>
  </div>
</template>

<script lang="ts">
import _ from 'lodash';
import * as d3 from 'd3';
import { mapActions, useStore } from 'vuex';
import router from '@/router';
import useModelMetadata from '@/services/composables/useModelMetadata';
import useTimeseriesData from '@/services/composables/useTimeseriesData';
import useActiveDatacubeFeature from '@/services/composables/useActiveDatacubeFeature';
import { AnalysisItem } from '@/types/Analysis';
import { DatacubeFeature } from '@/types/Datacube';
import { getFilteredScenariosFromIds, getOutputs, getSelectedOutput } from '@/utils/datacube-util';
import { getSelectedRegionIdsDisplay, filterRegionalLevelData, adminLevelToString, getParentSelectedRegions } from '@/utils/admin-level-util';
import { ModelRun } from '@/types/ModelRun';
import {
  AggregationOption,
  BinningOptions,
  DatacubeStatus,
  DatacubeType,
  DataTransform,
  SpatialAggregationLevel,
  SPLIT_BY_VARIABLE,
  TemporalAggregationLevel,
  TemporalResolutionOption
} from '@/types/Enums';
import { computed, defineComponent, PropType, Ref, ref, toRefs, watch, watchEffect } from 'vue';
import OptionsButton from '@/components/widgets/options-button.vue';
import BarChart from '@/components/widgets/charts/bar-chart.vue';
import RegionMap from '@/components/widgets/region-map.vue';
import useScenarioData from '@/services/composables/useScenarioData';
import useMapBounds from '@/services/composables/useMapBounds';
import { DataSpaceDataState, ViewState } from '@/types/Insight';
import useDatacubeDimensions from '@/services/composables/useDatacubeDimensions';
import useDatacubeVersioning from '@/services/composables/useDatacubeVersioning';
import { BarData } from '@/types/BarChart';
import { COLOR_SCHEME, SCALE_FUNCTION, ColorScaleType } from '@/utils/colors-util';
import useRegionalData from '@/services/composables/useRegionalData';
import useSelectedTimeseriesPoints from '@/services/composables/useSelectedTimeseriesPoints';
import useOutputSpecs from '@/services/composables/useOutputSpecs';
import useDatacubeHierarchy from '@/services/composables/useDatacubeHierarchy';
import { computeMapBoundsForCountries, DATA_LAYER, DATA_LAYER_TRANSPARENCY } from '@/utils/map-util-new';
import { OutputVariableSpecs, RegionalAggregations } from '@/types/Outputdata';
import dateFormatter from '@/formatters/date-formatter';
import { duplicateAnalysisItem, openDatacubeDrilldown } from '@/utils/analysis-util';
import { normalize } from '@/utils/value-util';
import { fromStateSelectedRegionsAtAllLevels, validateSelectedRegions } from '@/utils/drilldown-util';
import useAnalysisMapStats from '@/services/composables/useAnalysisMapStats';
import { AnalysisMapColorOptions } from '@/types/Common';
import MapLegend from '@/components/widgets/map-legend.vue';
import { AdminRegionSets } from '@/types/Datacubes';
import useQualifiers from '@/services/composables/useQualifiers';
import { isDataSpaceDataState } from '@/utils/insight-util';
import useMultiTimeseriesData from '@/services/composables/useMultiTimeseriesData';
import { chartValueFormatter } from '@/utils/string-util';

export default defineComponent({
  name: 'DatacubeRegionRankingCard',
  components: {
    OptionsButton,
    BarChart,
    RegionMap,
    MapLegend
  },
  emits: ['updated-bars-data', 'bar-chart-hover', 'map-click-region', 'invert-data-updated'],
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
    selectedAdminLevel: {
      type: Number,
      required: true
    },
    numberOfColorBins: {
      type: Number,
      default: 5
    },
    rankingWeight: {
      type: String,
      default: '0'
    },
    selectedColorScheme: {
      type: Array as PropType<string[]>,
      default: COLOR_SCHEME.PRIORITIZATION
    },
    regionRankingBinningType: {
      type: String,
      default: BinningOptions.Linear
    },
    barChartHoverId: {
      type: String,
      default: ''
    },
    showNormalizedData: {
      type: Boolean,
      default: true
    },
    isDataInverted: {
      type: Boolean,
      default: false
    },
    maxNumberOfChartBars: {
      type: Number,
      default: 20
    },
    limitNumberOfChartBars: {
      type: Boolean,
      default: false
    }
  },
  setup(props, { emit }) {
    const {
      itemId,
      id,
      datacubeId,
      selectedColorScheme,
      numberOfColorBins,
      selectedAdminLevel,
      regionRankingBinningType,
      showNormalizedData,
      barChartHoverId,
      isDataInverted,
      limitNumberOfChartBars,
      maxNumberOfChartBars
    } = toRefs(props);

    const metadata = useModelMetadata(id);

    const mainModelOutput = ref<DatacubeFeature | undefined>(undefined);
    const bbox = ref<number[][] | { value: number[][], options: any } | undefined>(undefined);

    const selectedScenarioIds = ref([] as string[]);
    const selectedScenarios = ref([] as ModelRun[]);
    const selectedRegionRankingScenario = ref(0);
    const regionRunsScenarios = ref([] as {name: string; color: string}[]);

    const outputs = ref([]) as Ref<DatacubeFeature[]>;

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

    const selectedBreakdownOutputVariables = ref(new Set<string>());

    const breakdownOption = ref<string | null>(null);
    const setBreakdownOption = (newValue: string | null) => {
      breakdownOption.value = newValue;
      activeReferenceOptions.value = [];
    };

    watchEffect(async () => {
      if (metadata.value) {
        outputs.value = getOutputs(metadata.value);

        let initialOutputIndex = 0;
        const datacubeKey = props.itemId;
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
    const initialSelectedScenarioIds = ref<string[]>([]);

    const selectedTemporalResolution = ref<TemporalResolutionOption>(TemporalResolutionOption.Month);
    const selectedSpatialAggregation = ref<AggregationOption>(AggregationOption.Mean);
    const selectedTemporalAggregation = ref<AggregationOption>(AggregationOption.Mean);
    const selectedTransform = ref<DataTransform>(DataTransform.None);

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

    const selectedRegionIds = ref<string[]>([]);
    const selectedRegionIdsAtAllLevels = ref<AdminRegionSets>({
      country: new Set(),
      admin1: new Set(),
      admin2: new Set(),
      admin3: new Set()
    });

    const selectedDataLayer = ref(DATA_LAYER.ADMIN);
    const selectedDataLayerTransparency = ref(DATA_LAYER_TRANSPARENCY['100%']);

    const invertData = () => {
      emit('invert-data-updated', {
        id: id.value,
        datacubeId: datacubeId.value,
        itemId: itemId.value
      });
    };

    const { activeFeature } = useActiveDatacubeFeature(metadata, itemId);

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

    // apply the view-config for this datacube
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
              // setSelectedTimestamp(initialDataConfig.value.selectedTimestamp);
            }
          }
          if (initialDataConfig.value.selectedScenarioIds !== undefined) {
            initialSelectedScenarioIds.value = initialDataConfig.value.selectedScenarioIds;
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
      });

    const selectedRegionIdForQualifiers = computed(() => {
      const regionIds = getParentSelectedRegions(selectedRegionIdsAtAllLevels.value, selectedAdminLevel.value);
      // Note: qualfiler breakdown data can only be broken down by singe regionId, so it isn't applicable in 'split by region' mode where multiple region can be selected
      // and also in 'split by year' mode where data is aggregated by year.
      if (regionIds.length !== 1 ||
          breakdownOption.value === TemporalAggregationLevel.Year ||
          breakdownOption.value === SpatialAggregationLevel.Region) return '';
      return regionIds[0];
    });

    const selectedTimestamp = ref<number | null>(null);

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
      relativeTo,
      timeseriesData,
      visibleTimeseriesData,
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
      () => {}, // setSelectedTimestamp
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
      const timeseriesList = timeseriesDataForSelection.value;

      if (timeseriesList.length > 0) {
        regionRunsScenarios.value = timeseriesList.map(timeseries => ({ name: timeseries.name, color: timeseries.color }));

        // flatten the list of timeseries for all selected runs and extract the last timestmap
        let allTimestamps = visibleTimeseriesData.value
          .map(timeseries => timeseries.points)
          .flat()
          .map(point => point.timestamp);

        const timeseriesForSelectedRun = visibleTimeseriesData.value
          .find((timeseries, indx) => indx === selectedRegionRankingScenario.value);
        if (timeseriesForSelectedRun !== undefined) {
          allTimestamps = timeseriesForSelectedRun.points
            .flat()
            .map(point => point.timestamp);
        }

        // select the last timestamp as the initial value
        const lastTimestamp = _.max(allTimestamps);
        if (lastTimestamp !== undefined) {
          // set initial timestamp selection
          selectedTimestamp.value = lastTimestamp;
        }
      }
    });

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
      datacubeHierarchy,
      relativeTo,
      activeReferenceOptions,
      temporalBreakdownData,
      timestampForSelection
    );

    const mapColorOptions = computed(() => {
      const options: AnalysisMapColorOptions = {
        scheme: selectedColorScheme.value,
        relativeToSchemes: [],
        scaleFn: SCALE_FUNCTION[ColorScaleType.LinearDiscrete],
        isContinuous: false,
        isDiverging: false,
        opacity: Number(selectedDataLayerTransparency.value)
      };
      return options;
    });

    const {
      mapLegendData
    } = useAnalysisMapStats(
      outputSpecs,
      regionalData,
      ref(null), // relativeTo
      selectedDataLayer,
      selectedAdminLevel,
      selectedRegionIdsAtAllLevels,
      ref(false), // showPercentChange
      mapColorOptions,
      ref([]), // activeReferenceOptions
      ref(null), // breakdownOption
      ref([]) // rawDataPointsList
    );

    const selectedRegionIdsDisplay = computed(() => {
      return getSelectedRegionIdsDisplay(selectedRegionIdsAtAllLevels.value, selectedAdminLevel.value);
    });

    const { statusColor, statusLabel } = useDatacubeVersioning(metadata);

    const barsData = ref<BarData[]>([]);

    // Calculate bbox
    watchEffect(async () => {
      const countries = barChartHoverId.value
        ? [barChartHoverId.value.split('__')[0]]
        : [...new Set((regionalData.value?.country || []).map(d => d.id))];
      bbox.value = await computeMapBoundsForCountries(countries) || undefined;
    });

    const barDataWithoutTheNumberOfBarsLimit = ref<BarData[]>([]);

    watch(
      () => [
        regionalData.value,
        selectedAdminLevel.value,
        selectedColorScheme.value,
        showNormalizedData.value,
        numberOfColorBins.value,
        regionRankingBinningType.value,
        selectedRegionRankingScenario.value,
        isDataInverted.value,
        selectedRegionIdsAtAllLevels.value,
        limitNumberOfChartBars.value,
        maxNumberOfChartBars.value
      ],
      () => {
        const temp: BarData[] = [];
        // if either color bins, the list of scheme colors, or regional data has changed,
        // then reconstruct the bar chart data
        const colors = selectedColorScheme.value;

        if (regionalData.value) {
          const adminLevelAsString = adminLevelToString(selectedAdminLevel.value) as keyof RegionalAggregations;

          //
          // filter regional data based on any regional selection captured as part of the datacube config
          //
          const filteredRegionLevelData = filterRegionalLevelData(regionalData.value, selectedRegionIdsAtAllLevels.value, true /* apply filtering to country level */);

          const regionLevelData = filteredRegionLevelData[adminLevelAsString];
          if (regionLevelData !== undefined && regionLevelData.length > 0) {
            // special case for split-by-region:
            let indexIntoRegionData = selectedRegionRankingScenario.value;
            if (breakdownOption.value === SpatialAggregationLevel.Region) {
              indexIntoRegionData = 0;
            }

            const data = regionLevelData.map(regionDataItem => ({
              name: regionDataItem.id,
              value: Object.values(regionDataItem.values).length > 0 && Object.values(regionDataItem.values).length > indexIntoRegionData ? Object.values(regionDataItem.values)[indexIntoRegionData] : 0
            }));
            //
            // bin data
            //
            if (data.length > 0) {
              const allValues = data.map(regionDataItem => regionDataItem.value);
              const minBarValue = _.min(allValues) ?? 0;
              if (minBarValue > 0) {
                // ensure that axis start at 0 if necessary
                allValues.push(0);
              }
              const scale = d3
                .scaleLinear()
                .domain(d3.extent(allValues) as [number, number])
                .nice(); // 😃
              const dataExtent = scale.domain(); // after nice() is called
              const binGenerator = d3.bin<{name: string;value: number}, number>()
                .domain(scale.domain() as [number, number]) // omit to use the default domain/extent from data
                // use a custom threshold generator to ensure
                //  bucket count that matches the required number of bins
                .thresholds((data, min, max) =>
                  d3.range(numberOfColorBins.value).map(t => min + (t / numberOfColorBins.value) * (max - min))
                )
                .value(function(d) { return d.value; })
              ;
              const bins = binGenerator(data);
              let regionIndexCounter = 0;

              // @REVIEW
              // Normalization is a transform performed by wm-go: https://gitlab.uncharted.software/WM/wm-go/-/merge_requests/64
              // To receive normalized data, send transform=normalization when fetching regional data
              const numBars = regionLevelData.length;
              // we can have many bars than the available colors, so map indices
              const slope = 1.0 * (colors.length) / (numBars);
              bins.forEach((bin) => {
                _.sortBy(bin, item => item.value).forEach(dataItem => {
                  const normalizedValue = normalize(dataItem.value, dataExtent[0], dataExtent[1]);
                  const finalNormalizedValue = isDataInverted.value ? (1 - normalizedValue) : normalizedValue;
                  const barValue = showNormalizedData.value ? (finalNormalizedValue * numberOfColorBins.value) : dataItem.value;

                  let barColor = 'skyblue';
                  let binIndex = -1;
                  if (regionRankingBinningType.value === BinningOptions.Linear) {
                    binIndex = Math.trunc(finalNormalizedValue * numberOfColorBins.value);
                  }
                  if (regionRankingBinningType.value === BinningOptions.Quantile) {
                    binIndex = Math.trunc(slope * (regionIndexCounter));
                  }
                  if (binIndex !== -1) {
                    const colorIndex = _.clamp(binIndex, 0, colors.length - 1);
                    barColor = colors[colorIndex];
                  }
                  temp.push({
                    name: (regionIndexCounter + 1).toString(),
                    label: dataItem.name,
                    value: barValue,
                    normalizedValue: finalNormalizedValue,
                    color: barColor
                  });
                  regionIndexCounter++;
                });
              });
            }

            // adjust the bar ranking so that the highest bar value will be ranked 1st
            if (!isDataInverted.value) {
              temp.forEach((barItem, indx) => {
                barItem.name = (temp.length - indx).toString();
              });
            } else {
              temp.reverse();
            }

            // update our internal cache of the bar data before applying the limit, if enabled
            barDataWithoutTheNumberOfBarsLimit.value = temp;

            emit('updated-bars-data', {
              id: id.value,
              datacubeId: datacubeId.value,
              itemId: itemId.value,
              name: mainModelOutput.value?.display_name + ' : ' + metadata.value?.name,
              barsData: temp,
              selectedTimestamp: selectedTimestamp.value
            });
          }
          // limit the number of bars to the selected maximum
          barsData.value = limitNumberOfChartBars.value ? temp.slice(-maxNumberOfChartBars.value) : temp;
        }
      });

    const { mapBounds } = useMapBounds(regionalData, selectedAdminLevel, selectedRegionIdsAtAllLevels);
    // Calculate bbox
    watchEffect(async () => {
      const options = {
        padding: 20, // pixels
        duration: 1000, // milliseconds
        essential: true // this animation is considered essential with respect to prefers-reduced-motion
      };
      const bounds = _.isArray(mapBounds.value)
        ? { value: mapBounds.value, options }
        : mapBounds.value;

      if (barChartHoverId.value) {
        const result = await computeMapBoundsForCountries([barChartHoverId.value]);
        bbox.value = result ? { value: result, options } : bounds;
      } else {
        bbox.value = bounds;
      }
    });

    // For displaying selected items that are off screen
    const hiddenRegionRank = ref(-1);
    const hiddenRegionName = ref('');
    const hiddenRegionValue = ref('');
    watch(
      () => [
        barChartHoverId.value,
        barDataWithoutTheNumberOfBarsLimit.value,
        limitNumberOfChartBars.value
      ],
      () => {
        hiddenRegionValue.value = '';
        hiddenRegionRank.value = -1;
        hiddenRegionName.value = '';

        // do we have a selected bar and the max number of bars' limit is enabled?
        if (barChartHoverId.value !== '' && limitNumberOfChartBars.value) {
          // find the rank of the selected bar,
          // and assess if it is outside the current limit enforced for the maximum number of bars
          const targetBarInfo = barDataWithoutTheNumberOfBarsLimit.value.find(regionInfo => regionInfo.label === barChartHoverId.value);
          if (targetBarInfo) {
            const rank = +targetBarInfo.name;
            // if the ranked region/bar is indeed outside the visible bars, then show a temp hover
            if (rank > maxNumberOfChartBars.value) {
              const valueFormatter = chartValueFormatter(...barDataWithoutTheNumberOfBarsLimit.value.map(d => d.value));
              hiddenRegionRank.value = rank;
              hiddenRegionName.value = targetBarInfo.label;
              hiddenRegionValue.value = valueFormatter(targetBarInfo.value);
            }
          }
        }
      }
    );

    return {
      selectedTemporalResolution,
      selectedTemporalAggregation,
      selectedSpatialAggregation,
      selectedScenarioIds,
      selectedRegionIdsDisplay,
      metadata,
      mainModelOutput,
      outputs,
      timeseriesData,
      temporalBreakdownData,
      AggregationOption,
      visibleTimeseriesData,
      timeseriesDataForSelection,
      analysisItems,
      project,
      analysisId,
      props,
      store,
      DatacubeStatus,
      statusColor,
      statusLabel,
      barsData,
      selectedTimestamp,
      timestampFormatter: (value: any) => dateFormatter(value, 'MMM DD, YYYY'),
      selectedRegionRankingScenario,
      regionRunsScenarios,
      bbox,
      mapLegendData,
      invertData,
      hiddenRegionName,
      hiddenRegionValue,
      hiddenRegionRank
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
  border-radius: 3px;
  height: 200px;
  display: flex;
  flex-direction: column;
  border: 1px solid $background-light-3;
  padding: 1rem;
}

.datacube-header {
  display: flex;
  align-items: center;

  .datacube-title-area {
    display: inline-block;
    cursor: pointer;
    flex: 1;
    min-width: 0;
    margin: 0;
    white-space: nowrap;
    text-overflow: ellipsis;
    overflow: hidden;

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
}

.bar-chart {
  flex: 1;
  min-width: 0;
}

.chart-and-footer {
  position: relative;
  display: flex;
  flex-direction: column;
  flex: 1;
  min-width: 0;
}

.hover-not-visible {
  position: absolute;
  left: 50%;
  border: #BBB;
  border-style: solid;
  border-radius: 2px;
  background-color: #F4F4F4;
  color: blue;
  z-index: 1;
  padding: 4px;
}

.country-list {
  flex: 1;
  min-height: 0;
  overflow-y: auto;
}

.datacube-footer {
  margin-left: 2rem;
  font-size: small;
  display: flex;
  justify-content: space-around;
}

.checkbox {
  user-select: none;
  display: inline-block;
  align-self: center;
  margin: 0;

  label {
    font-weight: normal;
    margin: 0;
    padding: 0;
    cursor: auto;
    color: gray;
  }
}

.card-maps-legend-container {
  display: flex;
  flex-direction: column;
  width: 25%;
  .top-padding {
    height: 19px;
  }
}

.card-maps-box {
  display: flex;
  width: 180px;
  height: 100%;
  padding: 5px;
}

.region-map-container {
  width: 75%;
}

.ranking-weight-label {
  margin-left: 1rem;
  margin-right: 1rem;
}

</style>
