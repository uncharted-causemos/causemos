<template>
  <div class="comp-analysis-container">
    <teleport to="#navbar-trailing-teleport-destination">
      <analysis-options-button />
    </teleport>
    <analytical-questions-and-insights-panel class="side-panel">
      <template #below-tabs>
        <analysis-comments-button />
      </template>
    </analytical-questions-and-insights-panel>
    <main class="insight-capture">
      <action-bar />
      <!-- overlay view content -->
      <datacube-comparative-timeline-sync
        v-if="globalTimeseries.length > 0 && comparativeAnalysisViewSelection === ComparativeAnalysisMode.Overlay"
        :timeseriesData="globalTimeseries"
        :timeseriesToDatacubeMap="timeseriesToDatacubeMap"
        :selected-timestamp="selectedTimestamp"
        :selected-timestamp-range="selectedTimestampRange"
        @select-timestamp="setSelectedTimestamp"
        @select-timestamp-range="handleTimestampRangeSelection"
      />
      <!-- region ranking view content -->
      <template v-if="comparativeAnalysisViewSelection === ComparativeAnalysisMode.RegionRanking">
        <div style="display: flex">
          <h5 class="ranking-header-top">Ranking Results</h5>
          <i
            :onClick="() => activeDrilldownTab = (activeDrilldownTab === null ? 'region-settings' : null)"
            class="fa fa-gear region-ranking-settings-button"
            :class="{ 'region-ranking-settings-button-invalid': activeDrilldownTab === null , 'region-ranking-settings-button-valid': activeDrilldownTab !== null }"
          />
        </div>
        <datacube-region-ranking-composite-card
          v-if="globalBarsData.length > 1"
          :bars-data="globalBarsData"
          :selected-admin-level="selectedAdminLevel"
          :selected-timestamp="globalRegionRankingTimestamp"
          :selected-color-scheme="finalColorScheme"
          :bar-chart-hover-id="barChartHoverId"
          :map-bounds="globalBbox"
          @bar-chart-hover="onBarChartHover"
          @map-click-region="onMapClickRegion"
        />
        <div style="display: flex" v-if="globalBarsData.length > 1">
          <h5 class="ranking-header-bottom">Ranking Criteria:</h5>
          <div class="checkbox">
            <label
              @click="showNormalizedData=!showNormalizedData"
              style="cursor: pointer; color: black;">
              <i
                class="fa fa-lg fa-fw"
                :class="{ 'fa-check-square-o': showNormalizedData, 'fa-square-o': !showNormalizedData }"
              />
              Normalized data
            </label>
          </div>
        </div>
      </template>
      <!--
        listing individual datacube cards
      -->
      <div
        v-if="selectedAnalysisItems.length"
        class="column">
        <template v-if="comparativeAnalysisViewSelection === ComparativeAnalysisMode.List">
          <datacube-comparative-card
            v-for="(item, indx) in selectedAnalysisItems"
            :key="item.datacubeId"
            class="datacube-comparative-card"
            :id="item.id"
            :datacube-id="item.datacubeId"
            :datacube-index="indx"
            :selected-timestamp="selectedTimestamp"
            :selected-timestamp-range="selectedTimestampRange"
            @loaded-timeseries="onLoadedTimeseries"
            @select-timestamp="setSelectedTimestamp"
          />
        </template>
        <template v-if="comparativeAnalysisViewSelection === ComparativeAnalysisMode.Overlay">
          <div class="card-maps-container">
            <div
              v-for="(item, indx) in selectedAnalysisItems"
              :key="item.datacubeId"
              class="card-map-container"
              :class="[
                `card-count-${selectedAnalysisItems.length < 5 ? selectedAnalysisItems.length : 'n'}`
              ]"
            >
              <datacube-comparative-overlay-region
                :style="{ borderColor: colorFromIndex(indx) }"
                class="card-map"
                :id="item.id"
                :datacube-id="item.datacubeId"
                :datacube-index="indx"
                :selected-timestamp="selectedTimestamp"
                :selected-timestamp-range="selectedTimestampRange"
                @loaded-timeseries="onLoadedTimeseries"
                @select-timestamp="setSelectedTimestamp"
              />
            </div>
          </div>
        </template>
        <template v-if="comparativeAnalysisViewSelection === ComparativeAnalysisMode.RegionRanking">
          <datacube-region-ranking-card
            v-for="item in selectedAnalysisItems"
            :key="item.datacubeId"
            class="datacube-region-ranking-card"
            :id="item.id"
            :datacube-id="item.datacubeId"
            :selected-admin-level="selectedAdminLevel"
            :number-of-color-bins="numberOfColorBins"
            :selected-color-scheme="finalColorScheme"
            :region-ranking-binning-type="regionRankingBinningType"
            :bar-chart-hover-id="barChartHoverId"
            :show-normalized-data="showNormalizedData"
            @updated-bars-data="onUpdatedBarsData"
            @bar-chart-hover="onBarChartHover"
            @map-click-region="onMapClickRegion"
          />
        </template>
      </div>
      <empty-state-instructions v-else />
    </main>
    <drilldown-panel
      v-if="comparativeAnalysisViewSelection === ComparativeAnalysisMode.RegionRanking"
      :active-tab-id="activeDrilldownTab"
      :has-transition="false"
      :hide-close="true"
      :is-open="activeDrilldownTab !== null"
      :tabs="drilldownTabs"
      @close="() => { activeDrilldownTab = null }"
    >
      <template #content>
        <region-ranking-options-pane
          :aggregation-level-count="availableAdminLevelTitles.length"
          :aggregation-level="selectedAdminLevel"
          :aggregation-level-title="availableAdminLevelTitles[selectedAdminLevel]"
          :number-of-color-bins="numberOfColorBins"
          :selected-color-scheme="finalColorScheme"
          :region-ranking-composition-type="regionRankingCompositionType"
          :region-ranking-binning-type="regionRankingBinningType"
          :max-number-of-chart-bars="maxNumberOfChartBars"
          :limit-number-of-chart-bars="limitNumberOfChartBars"
          :region-ranking-weights="regionRankingWeights"
          @set-number-color-bins="setNumberOfColorBins"
          @set-selected-admin-level="setSelectedAdminLevel"
          @set-region-ranking-composition-type="setRegionRankingCompositionType"
          @set-region-ranking-equal-weight="setRegionRankingEqualWeight"
          @set-max-number-of-chart-bars="setMaxNumberOfChartBars"
          @set-limit-number-of-chart-bars="setLimitNumberOfChartBars"
          @set-region-ranking-binning-type="setRegionRankingBinningType"
          @region-ranking-weights-updated="onRegionRankingWeightsUpdated"
        />
      </template>
    </drilldown-panel>
  </div>
</template>

<script lang="ts">
import { computed, defineComponent, onMounted, Ref, ref, watch, watchEffect } from 'vue';
import { mapActions, mapGetters, useStore } from 'vuex';
import DatacubeComparativeCard from '@/components/widgets/datacube-comparative-card.vue';
import DatacubeComparativeOverlayRegion from '@/components/widgets/datacube-comparative-overlay-region.vue';
import DatacubeRegionRankingCard from '@/components/widgets/datacube-region-ranking-card.vue';
import ActionBar from '@/components/data/action-bar.vue';
import EmptyStateInstructions from '@/components/empty-state-instructions.vue';
import AnalyticalQuestionsAndInsightsPanel from '@/components/analytical-questions/analytical-questions-and-insights-panel.vue';
import { Timeseries } from '@/types/Timeseries';
import DatacubeComparativeTimelineSync from '@/components/widgets/datacube-comparative-timeline-sync.vue';
import DatacubeRegionRankingCompositeCard from '@/components/widgets/datacube-region-ranking-composite-card.vue';
import _ from 'lodash';
import { DataState, Insight, ViewState } from '@/types/Insight';
import AnalysisOptionsButton from '@/components/data/analysis-options-button.vue';
import { getAnalysis } from '@/services/analysis-service';
import AnalysisCommentsButton from '@/components/data/analysis-comments-button.vue';
import DrilldownPanel from '@/components/drilldown-panel.vue';
import RegionRankingOptionsPane from '@/components/drilldown-panel/region-ranking-options-pane.vue';
import { COLOR, getColors, colorFromIndex } from '@/utils/colors-util';
import { ADMIN_LEVEL_TITLES } from '@/utils/admin-level-util';
import { BinningOptions, ComparativeAnalysisMode, DatacubeGeoAttributeVariableType, RegionRankingCompositionType } from '@/types/Enums';
import { BarData } from '@/types/BarChart';
import { getInsightById } from '@/services/insight-service';
import { computeMapBoundsForCountries } from '@/utils/map-util-new';
import router from '@/router';
import { AnalysisItem } from '@/types/Analysis';
import { normalizeTimeseriesList } from '@/utils/timeseries-util';
import { MAX_ANALYSIS_DATACUBES_COUNT } from '@/utils/analysis-util';

const DRILLDOWN_TABS = [
  {
    name: 'Region Ranking Settings',
    id: 'region-settings',
    icon: 'fa-gear'
  }
];

export default defineComponent({
  name: 'CompAnalysis',
  components: {
    DatacubeComparativeCard,
    DatacubeComparativeOverlayRegion,
    DatacubeRegionRankingCard,
    AnalysisCommentsButton,
    ActionBar,
    EmptyStateInstructions,
    AnalyticalQuestionsAndInsightsPanel,
    DatacubeComparativeTimelineSync,
    DatacubeRegionRankingCompositeCard,
    AnalysisOptionsButton,
    DrilldownPanel,
    RegionRankingOptionsPane
  },
  setup() {
    const store = useStore();
    const analysisItems = computed<AnalysisItem[]>(() => store.getters['dataAnalysis/analysisItems']);
    const selectedAnalysisItems = ref<AnalysisItem[]>([]);
    const comparativeAnalysisViewSelection = computed<string>(() => store.getters['dataAnalysis/comparativeAnalysisViewSelection']);
    const quantitativeAnalysisId = computed(
      () => store.getters['dataAnalysis/analysisId']
    );
    const dataState = computed<DataState>(() => store.getters['insightPanel/dataState']);

    const activeDrilldownTab = ref<string|null>('region-settings');
    const selectedAdminLevel = ref(0);

    const showNormalizedData = ref(false);
    const regionRankingWeights = ref<{[key: string]: {name: string; weight: number}}>({});

    const globalBbox = ref<number[][] | undefined>(undefined);

    const allTimeseriesMap = ref<{[key: string]: Timeseries[]}>({});
    const allDatacubesMetadataMap: {[key: string]: {datacubeName: string; datacubeOutputName: string; source: string; region: string[]}} = {};
    const globalTimeseries = ref([]) as Ref<Timeseries[]>;
    const reCalculateGlobalTimeseries = ref(true);
    const timeseriesToDatacubeMap = ref<{[timeseriesId: string]: { datacubeName: string; datacubeOutputVariable: string }}>({});

    const allRegionalRankingMap = ref<{[key: string]: BarData[]}>({});
    const globalBarsData = ref([]) as Ref<BarData[]>;
    const globalRegionRankingTimestamp = ref(0);

    const selectedTimestamp = ref(null) as Ref<number | null>;
    const selectedTimestampRange = ref(null) as Ref<{start: number; end: number} | null>;

    const initialSelectedTimestamp = ref(0);
    const initialSelectedTimestampRange = ref({}) as Ref<{start: number; end: number}>;

    onMounted(async () => {
      store.dispatch('app/setAnalysisName', '');
      const result = await getAnalysis(quantitativeAnalysisId.value);
      store.dispatch('app/setAnalysisName', result.title);
    });

    watch(
      () => analysisItems.value,
      analysisItems => {
        if (analysisItems && analysisItems.length > 0) {
          // set context-ids to fetch insights correctly for all datacubes
          //  (even the non-selected ones) in this analysis
          const contextIDs = analysisItems.map(dc => dc.id); // FIXME/REVIEW is it id or datacubeId
          store.dispatch('insightPanel/setContextId', contextIDs);

          // assign initial selection state if possible (to gracefully handle existing analyses)
          const allAnalysisItems = _.cloneDeep(analysisItems);
          let shouldUpdateServerData = false;
          allAnalysisItems.forEach(item => {
            if (item.selected === undefined) {
              // ensure that some (valid initial) boolean value is added for each item
              const currSelectionCount = allAnalysisItems.filter(i => i.selected).length;
              item.selected = currSelectionCount < MAX_ANALYSIS_DATACUBES_COUNT;
              shouldUpdateServerData = true;
            }
          });
          const selectedItems = allAnalysisItems.filter(item => item.selected);
          if (selectedItems.length > MAX_ANALYSIS_DATACUBES_COUNT) {
            // we need to de-select some of the items
            const deletedItems = selectedItems.splice(MAX_ANALYSIS_DATACUBES_COUNT);
            deletedItems.forEach(item => { item.selected = false; });
            shouldUpdateServerData = true;
          }
          if (shouldUpdateServerData) {
            // update the selection status on the server
            store.dispatch('dataAnalysis/updateAnalysisItems', { currentAnalysisId: quantitativeAnalysisId.value, analysisItems: allAnalysisItems });
          }
          // save selected analysis items in insight to apply later correctly as needed
          const dataStateUpdated = _.cloneDeep(dataState.value);
          dataStateUpdated.selectedAnalysisItems = selectedItems;
          store.dispatch('insightPanel/setDataState', dataStateUpdated);

          // clear overlay global timeseries
          globalTimeseries.value.length = 0;
          allTimeseriesMap.value = {};
          timeseriesToDatacubeMap.value = {};
          reCalculateGlobalTimeseries.value = true;
          // clear region ranking results
          globalBarsData.value.length = 0;
          regionRankingWeights.value = {};

          selectedAnalysisItems.value = selectedItems;
        } else {
          // no datacubes in this analysis, so do not fetch any insights/questions
          store.dispatch('insightPanel/setContextId', undefined);
        }
      },
      { immediate: true }
    );

    watch(
      () => selectedAnalysisItems.value,
      selectedAnalysisItems => {
        if (selectedAnalysisItems && selectedAnalysisItems.length > 0) {
          // set initial equal weights (must be executed only one time on init)
          const regionRankingEqualCompositionWeight = 1 / (selectedAnalysisItems.length) * 100;
          const regionRankingWeightsMap = _.cloneDeep(regionRankingWeights.value);
          Object.keys(regionRankingWeightsMap).forEach(key => {
            regionRankingWeightsMap[key] = {
              name: '', // we don't have datacube names at this point. Upon loading each region-ranking-card, the name will be overriden in onUpdatedBarsData()
              weight: regionRankingEqualCompositionWeight
            };
          });
          regionRankingWeights.value = regionRankingWeightsMap;
        }
      },
      { immediate: true }
    );

    const setSelectedTimestamp = (value: number) => {
      if (selectedTimestamp.value === value) return;
      selectedTimestamp.value = value;
    };

    const handleTimestampRangeSelection = (newTimestampRange: {start: number; end: number} | null) => {
      if (selectedTimestampRange.value?.start === newTimestampRange?.start &&
        selectedTimestampRange.value?.end === newTimestampRange?.end) {
        return;
      }
      selectedTimestampRange.value = newTimestampRange;
    };

    watch(
      () => [
        comparativeAnalysisViewSelection.value,
        initialSelectedTimestamp.value,
        initialSelectedTimestampRange.value
      ],
      () => {
        setSelectedTimestamp(initialSelectedTimestamp.value);
        if (comparativeAnalysisViewSelection.value === ComparativeAnalysisMode.Overlay) {
          handleTimestampRangeSelection(initialSelectedTimestampRange.value);
        } else { // reset the active selected range non-overlay views
          handleTimestampRangeSelection(null);
        }
      }
    );

    const availableAdminLevelTitles = ref(Object.values(DatacubeGeoAttributeVariableType)
      .map(adminLevel => ADMIN_LEVEL_TITLES[adminLevel]));

    const setSelectedAdminLevel = (level: number) => {
      selectedAdminLevel.value = level;
    };

    //
    // color scheme options
    //
    const numberOfColorBins = ref(5); // assume default number of 5 bins on startup

    const setNumberOfColorBins = (numBins: number) => {
      numberOfColorBins.value = numBins;
    };

    const finalColorScheme = computed(() => {
      const scheme = getColors(COLOR.PRIORITIZATION, numberOfColorBins.value);
      return scheme;
    });

    const regionRankingCompositionType = ref(RegionRankingCompositionType.Intersection);
    const setRegionRankingCompositionType = (compositionType: string) => {
      regionRankingCompositionType.value = compositionType as RegionRankingCompositionType;
    };

    const maxNumberOfChartBars = ref(50);
    const setMaxNumberOfChartBars = (numBins: number) => {
      if (isNaN(numBins)) return;
      maxNumberOfChartBars.value = numBins;
    };
    const limitNumberOfChartBars = ref(false);
    const setLimitNumberOfChartBars = () => {
      limitNumberOfChartBars.value = !limitNumberOfChartBars.value;
    };

    const regionRankingBinningType = ref(BinningOptions.Linear);
    const setRegionRankingBinningType = (binningType: string) => {
      regionRankingBinningType.value = binningType as BinningOptions;
    };

    const barChartHoverId = ref('');
    const onBarChartHover = (hoverId: string) => {
      barChartHoverId.value = hoverId;
    };
    const onMapClickRegion = (regionId: string) => {
      barChartHoverId.value = regionId;
    };

    watchEffect(async () => {
      const countries = barChartHoverId.value
        ? [barChartHoverId.value.split('__')[0]]
        : [...new Set(globalBarsData.value.map(d => d.label.split('__')[0]))];
      globalBbox.value = await computeMapBoundsForCountries(countries) || undefined;
    });

    watch(
      () => [
        // also track whether data is shown as normalized or not
        selectedAdminLevel.value,
        comparativeAnalysisViewSelection.value,
        regionRankingCompositionType.value,
        regionRankingBinningType.value,
        limitNumberOfChartBars.value,
        maxNumberOfChartBars.value,
        numberOfColorBins.value,
        barChartHoverId.value,
        showNormalizedData.value
      ],
      () => {
        const viewState: ViewState = {
          regionRankingSelectedAdminLevel: selectedAdminLevel.value,
          regionRankingSelectedComparativeAnalysisMode: comparativeAnalysisViewSelection.value as ComparativeAnalysisMode,
          regionRankingSelectedCompositionType: regionRankingCompositionType.value,
          regionRankingSelectedBinningType: regionRankingBinningType.value,
          regionRankingApplyingBarLimit: limitNumberOfChartBars.value,
          regionRankingSelectedMaxBarLimit: maxNumberOfChartBars.value,
          regionRankingSelectedNumberOfColorBins: numberOfColorBins.value,
          regionRankingHoverId: barChartHoverId.value,
          regionRankingShowNormalizedData: showNormalizedData.value
        };
        store.dispatch('insightPanel/setViewState', viewState);
      }
    );

    watch(
      () => [
        regionRankingWeights.value
      ],
      () => {
        const dataStateUpdated = _.cloneDeep(dataState.value);
        dataStateUpdated.regionRankingWeights = regionRankingWeights.value;
        store.dispatch('insightPanel/setDataState', dataStateUpdated);
      }
    );

    const updateStateFromInsight = async (insight_id: string) => {
      const loadedInsight: Insight = await getInsightById(insight_id);
      // FIXME: before applying the insight, which will overwrite current state,
      //  consider pushing current state to the url to support browser hsitory
      //  in case the user wants to navigate to the original state using back button
      if (loadedInsight) {
        // data state
        if (loadedInsight.data_state?.regionRankingWeights !== undefined) {
          regionRankingWeights.value = loadedInsight.data_state?.regionRankingWeights;
        }
        if (loadedInsight.data_state?.selectedAnalysisItems !== undefined) {
          const allAnalysisItems = _.cloneDeep(analysisItems.value);
          const selectedItems = loadedInsight.data_state?.selectedAnalysisItems;
          allAnalysisItems.forEach(item => {
            item.selected = selectedItems.findIndex(sItem => sItem.id === item.id && sItem.datacubeId === item.datacubeId) >= 0;
          });
          store.dispatch('dataAnalysis/updateAnalysisItems', { currentAnalysisId: quantitativeAnalysisId.value, analysisItems: allAnalysisItems });
        }
        // view state
        if (loadedInsight.view_state?.regionRankingSelectedAdminLevel !== undefined) {
          setSelectedAdminLevel(loadedInsight.view_state?.regionRankingSelectedAdminLevel);
        }
        if (loadedInsight.view_state?.regionRankingSelectedComparativeAnalysisMode !== undefined) {
          store.dispatch('dataAnalysis/setComparativeAnalysisViewSelection', loadedInsight.view_state?.regionRankingSelectedComparativeAnalysisMode);
        }
        if (loadedInsight.view_state?.regionRankingSelectedCompositionType !== undefined) {
          setRegionRankingCompositionType(loadedInsight.view_state?.regionRankingSelectedCompositionType);
        }
        if (loadedInsight.view_state?.regionRankingSelectedBinningType !== undefined) {
          setRegionRankingBinningType(loadedInsight.view_state?.regionRankingSelectedBinningType);
        }
        if (loadedInsight.view_state?.regionRankingApplyingBarLimit !== undefined) {
          limitNumberOfChartBars.value = loadedInsight.view_state?.regionRankingApplyingBarLimit;
        }
        if (loadedInsight.view_state?.regionRankingSelectedMaxBarLimit !== undefined) {
          setMaxNumberOfChartBars(loadedInsight.view_state?.regionRankingSelectedMaxBarLimit);
        }
        if (loadedInsight.view_state?.regionRankingSelectedNumberOfColorBins !== undefined) {
          setNumberOfColorBins(loadedInsight.view_state?.regionRankingSelectedNumberOfColorBins);
        }
        if (loadedInsight.view_state?.regionRankingHoverId !== undefined) {
          onBarChartHover(loadedInsight.view_state?.regionRankingHoverId);
        }
        if (loadedInsight.view_state?.regionRankingShowNormalizedData !== undefined) {
          showNormalizedData.value = loadedInsight.view_state?.regionRankingShowNormalizedData;
        }
      }
    };

    return {
      selectedAnalysisItems,
      allTimeseriesMap,
      allDatacubesMetadataMap,
      globalTimeseries,
      globalBbox,
      selectedTimestamp,
      setSelectedTimestamp,
      handleTimestampRangeSelection,
      selectedTimestampRange,
      reCalculateGlobalTimeseries,
      initialSelectedTimestamp,
      initialSelectedTimestampRange,
      comparativeAnalysisViewSelection,
      activeDrilldownTab,
      drilldownTabs: DRILLDOWN_TABS,
      setNumberOfColorBins,
      numberOfColorBins,
      finalColorScheme,
      selectedAdminLevel,
      setSelectedAdminLevel,
      availableAdminLevelTitles,
      globalBarsData,
      allRegionalRankingMap,
      regionRankingCompositionType,
      setRegionRankingCompositionType,
      globalRegionRankingTimestamp,
      setMaxNumberOfChartBars,
      maxNumberOfChartBars,
      limitNumberOfChartBars,
      setLimitNumberOfChartBars,
      regionRankingBinningType,
      setRegionRankingBinningType,
      onBarChartHover,
      onMapClickRegion,
      barChartHoverId,
      ComparativeAnalysisMode,
      updateStateFromInsight,
      regionRankingWeights,
      showNormalizedData,
      timeseriesToDatacubeMap,
      colorFromIndex,
      dataState
    };
  },
  mounted() {
    // ensure the insight explorer panel is closed in case the user has
    //  previously opened it and clicked the browser back button
    this.hideInsightPanel();
  },
  computed: {
    ...mapGetters({
      project: 'app/project'
    })
  },
  watch: {
    regionRankingCompositionType() {
      this.updateGlobalRegionRankingData();
    },
    limitNumberOfChartBars() {
      this.updateGlobalRegionRankingData();
    },
    maxNumberOfChartBars() {
      this.updateGlobalRegionRankingData();
    },
    $route: {
      handler(/* newValue, oldValue */) {
        // NOTE:  this is only valid when the route is focused on the 'dataComparative' space
        if ((this.$route.name === 'dataComparative') && this.$route.query) {
          const insight_id = this.$route.query.insight_id as any;
          if (insight_id !== undefined) {
            this.updateStateFromInsight(insight_id);
            // remove the insight_id from the url,
            //  so that (1) future insight capture is valid and (2) enable re-applying the same insight
            // FIXME: review to avoid double history later
            router.push({
              query: {
                insight_id: undefined
              }
            }).catch(() => {});
          }
        }
      },
      immediate: true
    }
  },
  methods: {
    ...mapActions({
      hideInsightPanel: 'insightPanel/hideInsightPanel',
      setDataState: 'insightPanel/setDataState'
    }),
    setRegionRankingEqualWeight() {
      // reset to equal weights
      const regionRankingEqualCompositionWeight = 1 / (this.selectedAnalysisItems.length) * 100;
      const regionRankingWeightsMap = _.cloneDeep(this.regionRankingWeights);
      Object.keys(regionRankingWeightsMap).forEach(key => {
        regionRankingWeightsMap[key] = {
          name: regionRankingWeightsMap[key].name, // do not change name
          weight: regionRankingEqualCompositionWeight
        };
      });
      this.regionRankingWeights = regionRankingWeightsMap;

      // re-build the transform computing the region ranking data
      this.updateGlobalRegionRankingData();
    },
    onRegionRankingWeightsUpdated(newDatacubeWeights: {[key: string]: {name: string; weight: number}}) {
      // if new weights are not different from current weights, do nothing
      if (!_.isEqual(this.regionRankingWeights, newDatacubeWeights)) {
        this.regionRankingWeights = _.cloneDeep(newDatacubeWeights);

        // re-build the transform computing the region ranking data
        this.updateGlobalRegionRankingData();
      }
    },
    onUpdatedBarsData(regionRankingInfo: {id: string; datacubeId: string; name: string; barsData: BarData[]; selectedTimestamp: number}) {
      // clone and save the incoming regional-ranking data in the global map object
      const datacubeKey = regionRankingInfo.id + regionRankingInfo.datacubeId;
      this.allRegionalRankingMap[datacubeKey] = _.cloneDeep(regionRankingInfo.barsData);

      // save the most recent timestamp from all datacubes as the global one
      if (regionRankingInfo.selectedTimestamp > this.globalRegionRankingTimestamp) {
        this.globalRegionRankingTimestamp = regionRankingInfo.selectedTimestamp;
      }

      // update the name in weights map
      const regionRankingWeightsMap = _.cloneDeep(this.regionRankingWeights);
      const regionRankingEqualCompositionWeight = 1 / (this.selectedAnalysisItems.length) * 100;
      regionRankingWeightsMap[datacubeKey] = {
        name: regionRankingInfo.name,
        weight: regionRankingWeightsMap[datacubeKey] !== undefined ? regionRankingWeightsMap[datacubeKey].weight : regionRankingEqualCompositionWeight // do not change the weight
      };
      this.regionRankingWeights = _.cloneDeep(regionRankingWeightsMap);

      // re-build the transform computing the region ranking data
      this.updateGlobalRegionRankingData();
    },
    updateGlobalRegionRankingData() {
      type RegionRankingEntry = {datacubeId: string; normalizedValue: number};

      // first: build a map where each key is a unique region name
      //        with a value representing the data of this region from all datacubes
      const globalRegionsMap: {[regionName: string]: RegionRankingEntry[]} = {};
      Object.keys(this.allRegionalRankingMap).forEach(key => {
        const regionData: BarData[] = this.allRegionalRankingMap[key];
        regionData.forEach(regionItem => {
          if (globalRegionsMap[regionItem.label] === undefined) {
            globalRegionsMap[regionItem.label] = [];
          }
          globalRegionsMap[regionItem.label].push({
            datacubeId: key,
            normalizedValue: regionItem.normalizedValue
          });
        });
      });

      //
      // transform/combine data from all datacubes/regions into one composite dataset
      //
      const dotProduct = (a: number[], b: number[]) => a.map((x, i) => a[i] * b[i]).reduce((m, n) => m + n);
      // note that each datacube can have a different list of regions
      const compositeData: BarData[] = [];
      const colors = this.finalColorScheme;
      let regionIndexCounter = 0;
      // we can have many bars than the available colors, so map indices
      let numBars = 0;
      // count the number of bars based on the selected composition type
      Object.keys(globalRegionsMap).forEach(key => {
        // for each region, create a bar
        const regionDatacubesList = globalRegionsMap[key];
        const regionValues = regionDatacubesList.map(item => item.normalizedValue);
        const weights = Object.keys(this.regionRankingWeights).map(key => this.regionRankingWeights[key].weight / 100);
        const equalWeights = Array(regionValues.length).fill(1 / (regionValues.length)); // sometimes not all datacubes are loaded and thus the map size may not match the regions
        const compositeValue = dotProduct(regionValues, weights.length === regionValues.length ? weights : equalWeights);
        const scaledCompositeValue = compositeValue * this.numberOfColorBins;
        const shouldAddRegionBar = this.regionRankingCompositionType === RegionRankingCompositionType.Union || (this.regionRankingCompositionType === RegionRankingCompositionType.Intersection && regionValues.length === this.selectedAnalysisItems.length);
        if (shouldAddRegionBar) {
          numBars++;
          compositeData.push({
            name: (regionIndexCounter + 1).toString(),
            label: key,
            value: scaledCompositeValue,
            normalizedValue: scaledCompositeValue
          });
          regionIndexCounter++;
        }
      });
      const compositeDataSorted = _.sortBy(compositeData, item => item.normalizedValue);
      numBars = Math.max(numBars, 1); // should never be 0 to avoid invalid slope
      const slope = 1.0 * (colors.length) / numBars;
      compositeDataSorted.forEach((key, indx) => {
        let barColor = 'skyblue';
        let binIndex = -1;
        if (this.regionRankingBinningType === BinningOptions.Linear) {
          binIndex = Math.trunc(key.normalizedValue);
        }
        if (this.regionRankingBinningType === BinningOptions.Quantile) {
          binIndex = Math.trunc(slope * indx);
        }
        if (binIndex !== -1) {
          const colorIndex = _.clamp(binIndex, 0, colors.length - 1);
          barColor = colors[colorIndex];
        }
        // update name and color of each bar
        key.name = (indx + 1).toString();
        key.color = barColor;
      });
      // adjust the bar ranking so that the highest bar value will be ranked 1st
      compositeDataSorted.forEach((barItem, indx) => {
        barItem.name = (compositeDataSorted.length - indx).toString();
      });
      // limit the number of bars to the selected maximum
      this.globalBarsData = this.limitNumberOfChartBars ? compositeDataSorted.slice(-this.maxNumberOfChartBars) : compositeDataSorted;
    },
    onLoadedTimeseries(timeseriesInfo: {id: string; datacubeId: string; timeseriesList: Timeseries[]; datacubeName: string; datacubeOutputName: string; source: string; region: string[]}) {
      // we should only set the global timeseries one time
      //  once all individual datacubes' timeseries have been loaded
      if (!this.reCalculateGlobalTimeseries) return;

      // clone and save the incoming timeseries in the map object
      //  where all timeseries lists will be saved
      const datacubeKey = timeseriesInfo.id + timeseriesInfo.datacubeId;
      this.allTimeseriesMap[datacubeKey] = _.cloneDeep(timeseriesInfo.timeseriesList);

      this.allDatacubesMetadataMap[datacubeKey] = {
        datacubeName: timeseriesInfo.datacubeName,
        datacubeOutputName: timeseriesInfo.datacubeOutputName,
        source: timeseriesInfo.source,
        region: timeseriesInfo.region
      };
      //
      // calculate (the global timeseries)
      //
      if (this.selectedAnalysisItems.length === Object.keys(this.allTimeseriesMap).length) {
        this.reCalculateGlobalTimeseries = false;
        //
        // all time series data for all datacubes have been loaded
        //
        const flatMap: Array<Timeseries[]> = [];
        Object.keys(this.allTimeseriesMap).forEach(key => {
          const timeseriesList: Timeseries[] = this.allTimeseriesMap[key];

          // normalize the timeseries values for better y-axis scaling when multiple
          //  timeseries from different datacubes are shown together
          // i.e., re-map all timestamp point values to a range of [0: 1]
          //
          // NOTE: each timeseriesList represents the list of timeseries,
          //  where each timeseries in that list reflects the timeseries of one model run,
          //  and also noting that all the timeseries in that list share
          //  the same scale/range since they all relate to a single datacube (variable)
          normalizeTimeseriesList(timeseriesList);

          // build a map that links each timeseries to its owner datacube
          timeseriesList.forEach(timeseries => {
            timeseries.id = key; // override the timeseries id to match its owner datacube
            const info = this.allDatacubesMetadataMap[key];
            this.timeseriesToDatacubeMap[key] = {
              datacubeName: info.datacubeName,
              datacubeOutputVariable: info.datacubeOutputName
            };
          });

          // add to the global list of timeseries
          flatMap.push(timeseriesList);
        });

        //
        // set timeseries data
        //
        this.globalTimeseries = flatMap.flat();
        //
        // also, set the initial global selectedTimestamp and range
        //
        if (this.globalTimeseries && this.globalTimeseries.length > 0) {
          const allTimestamps = this.globalTimeseries
            .map(timeseries => timeseries.points)
            .flat()
            .map(point => point.timestamp);

          // select the last timestamp as the initial value
          const lastTimestamp = _.max(allTimestamps);
          if (lastTimestamp !== undefined) {
            // set initial timestamp selection
            // this.setSelectedTimestamp(lastTimestamp);
            this.initialSelectedTimestamp = lastTimestamp;
          }
          // select the timestamp range as the full data extend
          const firstTimestamp = _.min(allTimestamps);
          if (lastTimestamp !== undefined && firstTimestamp !== undefined) {
            // set initial timestamp selection range
            const newTimestampRange = { start: firstTimestamp, end: lastTimestamp };
            // this.handleTimestampRangeSelection(newTimestampRange);
            this.initialSelectedTimestampRange = newTimestampRange;
          }
        }

        //
        // use the loaded metadata for all analysis-items
        //  and update the data-state object in the store for future insight capture
        //
        const datacubeTitles: any = [];
        const regions: string[] = [];
        Object.keys(this.allDatacubesMetadataMap).forEach(key => {
          const title = {
            datacubeName: this.allDatacubesMetadataMap[key].datacubeName,
            datacubeOutputName: this.allDatacubesMetadataMap[key].datacubeOutputName,
            source: this.allDatacubesMetadataMap[key].source
          };
          // for each datacube, save its name and output-name
          datacubeTitles.push(title);
          // also, save a list of all regions (into a big list for all datacubes)
          const datacubeRegions = this.allDatacubesMetadataMap[key].region && _.isArray(this.allDatacubesMetadataMap[key].region) ? this.allDatacubesMetadataMap[key].region : [];
          regions.push(...datacubeRegions);
        });
        const dataStateUpdated = _.cloneDeep(this.dataState);
        dataStateUpdated.datacubeTitles = datacubeTitles;
        dataStateUpdated.datacubeRegions = _.unionBy(_.sortBy(regions)); // FIXME: rank repeated countries from all datacubes and show top 5
        this.setDataState(dataStateUpdated);
      }
    }
  }
});
</script>

<style lang="scss" scoped>
@import '~styles/variables';
.comp-analysis-container {
  height: $content-full-height;
  display: flex;
  overflow: hidden;
}

.side-panel {
  isolation: isolate;
  z-index: 1;
}

main {
  display: flex;
  flex-direction: column;
  flex: 1;
  min-width: 0;
  margin-right: 10px;
}

.datacube-region-ranking-card {
  margin-bottom: 10px;
}

.datacube-comparative-card:not(:first-child) {
  margin-top: 10px;
}

.column {
  margin: 10px 0;
  overflow-y: auto;
  height: 100%;
}

.ranking-header-bottom {
  margin-bottom: -1rem;
  flex: 1;
}
.ranking-header-top {
  margin-bottom: -0.25rem;
  flex: 1;
}

.region-ranking-settings-button {
  align-self: center;
  cursor: pointer;
  font-size: large;
}

.region-ranking-settings-button-invalid {
  color: black;
  &:hover {
    color: darkgray;
  }
}

.region-ranking-settings-button-valid {
  color: gray;
  &:hover {
    color: darkgray;
  }
}

.checkbox {
  user-select: none;
  display: inline-block;
  align-self: center;
  margin-bottom: -1rem;

  label {
    font-weight: normal;
    margin: 0;
    padding: 0;
    cursor: auto;
    color: gray;
  }
}

$marginSize: 6px;

.card-maps-container {
  display: flex;
  justify-content: space-between;
  flex-wrap: wrap;
  width: 100%;
  height: 100%;
}

.card-map-container {
  display: flex;
  flex: 1;
  min-width: 0;
  flex-direction: column;
  padding-top: 1rem;

  ::v-deep(.region-map) {
    border-style: solid;
    border-color: inherit;
  }
  &.card-count-1 {
    ::v-deep(.region-map) {
      border: none;
    }
  }
  &.card-count-2,
  &.card-count-3,
  &.card-count-4 {
    min-width: calc(50% - #{$marginSize / 2});
    max-width: calc(50% - #{$marginSize / 2});
  }
  &.card-count-n {
    min-width: calc(calc(100% / 3) - #{$marginSize * 2 / 3});
    max-width: calc(calc(100% / 3) - #{$marginSize * 2 / 3});
  }
}

.card-map {
  flex-grow: 1;
  min-height: 0;
}

</style>
