<template>
  <div class="comp-analysis-container">
    <teleport to="#navbar-trailing-teleport-destination">
      <analysis-options-button :analysis-id="analysisId" />
    </teleport>
    <analytical-questions-and-insights-panel
      class="side-panel"
      :analysis-items="analysisItems"
      @remove-analysis-item="removeAnalysisItem"
      @toggle-analysis-item-selected="toggleAnalysisItemSelected"
    >
      <template #below-tabs>
        <analysis-comments-button :analysis-id="analysisId" />
      </template>
    </analytical-questions-and-insights-panel>
    <main class="insight-capture">
      <div class="action-bar-container">
        <action-bar
          :active-tab="activeTab"
          :analysisId="analysisId"
          @set-active-tab="setActiveTab"
          style="flex: 1"
        />
        <div class="shown-datacubes-count">{{shownDatacubesCountLabel}}</div>
      </div>

      <!-- overlay view content -->
      <datacube-comparative-timeline-sync
        v-if="globalTimeseries.length > 0 && activeTab === ComparativeAnalysisMode.Overlay"
        :timeseriesData="globalTimeseries"
        :timeseriesToDatacubeMap="timeseriesToDatacubeMap"
        :selected-timestamp="globalTimestamp"
        :selected-timestamp-range="selectedTimestampRange"
        @select-timestamp="setSelectedGlobalTimestamp"
        @select-timestamp-range="handleTimestampRangeSelection"
      />
      <!-- region ranking view content -->
      <template v-if="activeTab === ComparativeAnalysisMode.RegionRanking">
        <div style="display: flex">
          <h5 class="ranking-header-top">Ranking Results <i style="cursor: pointer" @click="downloadRankingResult" class="fa fa-fw fa-download"></i></h5>
          <i
            :onClick="() => activeDrilldownTab = (activeDrilldownTab === null ? 'region-settings' : null)"
            class="fa fa-gear region-ranking-settings-button"
            :class="{ 'region-ranking-settings-button-invalid': activeDrilldownTab === null , 'region-ranking-settings-button-valid': activeDrilldownTab !== null }"
          />
        </div>
        <datacube-region-ranking-composite-card
          v-if="selectedAnalysisItems.length > 0"
          :bars-data="globalBarsData"
          :max-number-of-chart-bars="barCountLimit"
          :limit-number-of-chart-bars="isBarCountLimitApplied"
          :selected-admin-level="selectedAdminLevel"
          :selected-timestamp="globalRegionRankingTimestamp"
          :selected-color-scheme="finalColorScheme"
          :bar-chart-hover-id="highlightedRegionId"
          :map-bounds="globalBbox"
          @bar-chart-hover="setHighlightedRegionId"
          @map-click-region="setHighlightedRegionId"
        />
        <div class="ranking-header-bottom" v-if="selectedAnalysisItems.length > 0">
          <h5>Ranking Criteria:</h5>
          <div>Composition Type: <b>{{regionRankingCompositionType}}</b></div>
          <div class="checkbox">
            <label
              @click="toggleRegionRankingRowsNormalized"
              style="cursor: pointer; color: black;">
              <i
                class="fa fa-lg fa-fw"
                :class="{
                  'fa-check-square-o': areRegionRankingRowsNormalized,
                  'fa-square-o': !areRegionRankingRowsNormalized
                }"
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
        <template v-if="activeTab === ComparativeAnalysisMode.List">
          <datacube-comparative-card
            v-for="(item, indx) in selectedAnalysisItems"
            :key="item.datacubeId"
            class="datacube-comparative-card"
            :id="item.id"
            :datacube-id="item.datacubeId"
            :item-id="item.itemId"
            :datacube-index="indx"
            :selected-timestamp="selectedTimestamp"
            :selected-timestamp-range="selectedTimestampRange"
            :analysis-item="item"
            :analysis-id="analysisId"
            @loaded-timeseries="onLoadedTimeseries"
            @select-timestamp="setSelectedTimestamp"
            @set-analysis-item-view-config="setAnalysisItemViewConfig"
            @remove-analysis-item="removeAnalysisItem"
            @duplicate-analysis-item="duplicateAnalysisItem"
          />
        </template>
        <template v-if="activeTab === ComparativeAnalysisMode.Overlay">
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
                :item-id="item.itemId"
                :datacube-index="indx"
                :selected-timestamp="globalTimestamp"
                :selected-timestamp-range="selectedTimestampRange"
                :analysis-item="item"
                :analysis-id="analysisId"
                @loaded-timeseries="onLoadedTimeseries"
                @remove-analysis-item="removeAnalysisItem"
                @duplicate-analysis-item="duplicateAnalysisItem"
              />
            </div>
          </div>
        </template>
        <template v-if="activeTab === ComparativeAnalysisMode.RegionRanking">
          <datacube-region-ranking-card
            v-for="item in selectedAnalysisItems"
            :key="item.datacubeId"
            class="datacube-region-ranking-card"
            :id="item.id"
            :datacube-id="item.datacubeId"
            :item-id="item.itemId"
            :selected-admin-level="selectedAdminLevel"
            :number-of-color-bins="colorBinCount"
            :ranking-weight="getDatacubeRankingWeight(item)"
            :selected-color-scheme="finalColorScheme"
            :region-ranking-binning-type="colorBinType"
            :bar-chart-hover-id="highlightedRegionId"
            :show-normalized-data="areRegionRankingRowsNormalized"
            :is-data-inverted="isDatacubeInverted(item)"
            :max-number-of-chart-bars="barCountLimit"
            :limit-number-of-chart-bars="isBarCountLimitApplied"
            :analysis-item="item"
            :analysis-id="analysisId"
            @updated-bars-data="onUpdatedBarsData"
            @bar-chart-hover="setHighlightedRegionId"
            @map-click-region="setHighlightedRegionId"
            @invert-data-updated="toggleIsItemInverted"
            @remove-analysis-item="removeAnalysisItem"
            @duplicate-analysis-item="duplicateAnalysisItem"
          />
        </template>
      </div>
      <empty-state-instructions v-else />
    </main>
    <drilldown-panel
      v-if="activeTab === ComparativeAnalysisMode.RegionRanking"
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
          :number-of-color-bins="colorBinCount"
          :selected-color-scheme="finalColorScheme"
          :region-ranking-composition-type="regionRankingCompositionType"
          :region-ranking-binning-type="colorBinType"
          :max-number-of-chart-bars="barCountLimit"
          :limit-number-of-chart-bars="isBarCountLimitApplied"
          :region-ranking-weights="regionRankingWeights"
          @set-number-color-bins="setColorBinCount"
          @set-selected-admin-level="setSelectedAdminLevel"
          @set-region-ranking-composition-type="setRegionRankingCompositionType"
          @set-region-ranking-equal-weight="setRegionRankingEqualWeight"
          @set-max-number-of-chart-bars="setBarCountLimit"
          @set-limit-number-of-chart-bars="toggleIsBarCountLimitApplied"
          @set-region-ranking-binning-type="setColorBinType"
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
import { DatacubeTitle, Insight } from '@/types/Insight';
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
import { AnalysisItem, DataAnalysisState } from '@/types/Analysis';
import { normalizeTimeseriesList } from '@/utils/timeseries-util';
import { useRoute } from 'vue-router';
import { useDataAnalysis } from '@/services/composables/useDataAnalysis';
import { isDataAnalysisState } from '@/utils/insight-util';

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
    const route = useRoute();
    const analysisId = computed(() => route.params.analysisId as string);
    const {
      analysisState,
      analysisItems,
      selectedAnalysisItems,
      activeTab,
      setActiveTab,
      setAnalysisItemViewConfig,
      removeAnalysisItem,
      duplicateAnalysisItem,
      toggleAnalysisItemSelected,
      selectedAdminLevel,
      setSelectedAdminLevel,
      areRegionRankingRowsNormalized,
      toggleRegionRankingRowsNormalized,
      colorBinCount,
      setColorBinCount,
      colorBinType,
      setColorBinType,
      regionRankingCompositionType,
      setRegionRankingCompositionType,
      barCountLimit,
      setBarCountLimit,
      isBarCountLimitApplied,
      toggleIsBarCountLimitApplied,
      regionRankingItemStates,
      resetRegionRankingWeights,
      toggleIsItemInverted,
      setRegionRankingWeights,
      highlightedRegionId,
      setHighlightedRegionId,
      setAnalysisState
    } = useDataAnalysis(analysisId);

    const activeDrilldownTab = ref<string|null>('region-settings');

    const globalBbox = ref<number[][] | undefined>(undefined);

    const allTimeseriesMap = ref<{[key: string]: Timeseries[]}>({});
    const allDatacubesMetadataMap = ref<{
      [key: string]: {
        datacubeName: string;
        datacubeOutputName: string;
        source: string;
        region: string[];
      }
    }>({});
    const globalTimeseries = ref([]) as Ref<Timeseries[]>;
    const reCalculateGlobalTimeseries = ref(true);
    const timeseriesToDatacubeMap = ref<{[timeseriesId: string]: { datacubeName: string; datacubeOutputVariable: string }}>({});

    const allRegionalRankingMap = ref<{[key: string]: BarData[]}>({});
    const globalBarsData = ref([]) as Ref<BarData[]>;
    const globalRegionRankingTimestamp = ref(0);

    const selectedTimestamp = ref(null) as Ref<number | null>;
    const selectedTimestampRange = ref(null) as Ref<{start: number; end: number} | null>;

    const globalTimestamp = ref(null) as Ref<number | null>;
    const initialSelectedTimestamp = ref(null) as Ref<number | null>;
    const initialSelectedTimestampRange = ref({}) as Ref<{start: number; end: number}>;

    onMounted(async () => {
      store.dispatch('app/setAnalysisName', '');
      const result = await getAnalysis(analysisId.value);
      if (result) {
        store.dispatch('app/setAnalysisName', result.title);
      }
    });

    watch(
      () => analysisItems.value,
      analysisItems => {
        if (analysisItems && analysisItems.length > 0) {
          // set context-ids to fetch insights correctly for all datacubes
          //  (even the non-selected ones) in this analysis
          const contextIDs = analysisItems.map(dc => dc.id); // FIXME is it id or datacubeId or itemId?
          store.dispatch('insightPanel/setContextId', contextIDs);
        } else {
          // no datacubes in this analysis, so do not fetch any insights/questions
          store.dispatch('insightPanel/setContextId', undefined);
        }
        // clear overlay global timeseries
        globalTimeseries.value = [];
        allTimeseriesMap.value = {};
        timeseriesToDatacubeMap.value = {};
        reCalculateGlobalTimeseries.value = true;
        // clear region ranking results
        globalBarsData.value = [];
        allRegionalRankingMap.value = {};
      },
      { immediate: true }
    );

    const shownDatacubesCountLabel = computed(() => {
      return 'Selected ' + selectedAnalysisItems.value.length + ' / ' + analysisItems.value.length + ' datacubes';
    });

    const setSelectedTimestamp = (value: number) => {
      if (selectedTimestamp.value === value) return;
      selectedTimestamp.value = value;
    };

    const setSelectedGlobalTimestamp = (value: number) => {
      if (globalTimestamp.value === value) return;
      globalTimestamp.value = value;
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
        activeTab.value,
        initialSelectedTimestampRange.value
      ],
      () => {
        if (activeTab.value === ComparativeAnalysisMode.Overlay) {
          handleTimestampRangeSelection(initialSelectedTimestampRange.value);
        } else { // reset the active selected range non-overlay views
          handleTimestampRangeSelection(null);
        }
      }
    );

    const availableAdminLevelTitles = ref(Object.values(DatacubeGeoAttributeVariableType)
      .map(adminLevel => ADMIN_LEVEL_TITLES[adminLevel]));

    //
    // color scheme options
    //
    const finalColorScheme = computed(
      () => getColors(COLOR.PRIORITIZATION, colorBinCount.value)
    );

    watchEffect(async () => {
      const countries = highlightedRegionId.value
        ? [highlightedRegionId.value.split('__')[0]]
        : [...new Set(globalBarsData.value.map(d => d.label.split('__')[0]))];
      globalBbox.value = await computeMapBoundsForCountries(countries) || undefined;
    });

    const updateStateFromInsight = async (insight_id: string) => {
      const loadedInsight: Insight = await getInsightById(insight_id);
      // FIXME: before applying the insight, which will overwrite current state,
      //  consider pushing current state to the url to support browser hsitory
      //  in case the user wants to navigate to the original state using back button
      if (!loadedInsight) {
        return;
      }
      const dataState = loadedInsight.data_state;
      if (dataState && isDataAnalysisState(dataState)) {
        setAnalysisState(dataState);

        // Remember the insight's selected timestamp to be applied when the last
        //  timeseries loads.
        if (
          dataState.selectedTimestamp !== null &&
          dataState.activeTab === ComparativeAnalysisMode.Overlay
        ) {
          initialSelectedTimestamp.value = dataState.selectedTimestamp;
        }
      }
    };

    const datacubeTitles = ref<DatacubeTitle[]>([]);

    watchEffect(() => {
      const newDataState: DataAnalysisState = _.cloneDeep(analysisState.value);
      // Only save the selected timestamp when overlap mode is active
      newDataState.selectedTimestamp =
        activeTab.value === ComparativeAnalysisMode.Overlay
          ? globalTimestamp.value
          : null;
      store.dispatch('insightPanel/setDataState', newDataState);
    });

    // A data structure that combines the weight of each datacube with a human-
    //  readable display name for easy consumption by
    //  region-ranking-options-pane.
    const regionRankingWeights = computed(() => {
      const itemStates = regionRankingItemStates.value;
      const result = {} as {
        [itemId: string]: { weight: number, name: string}
      };
      analysisItems.value.forEach(({ itemId, cachedMetadata }) => {
        result[itemId] = {
          weight: itemStates[itemId].weight,
          name: `${cachedMetadata.featureName} - ${cachedMetadata.datacubeName}`
        };
      });
      return result;
    });

    return {
      analysisItems,
      selectedAnalysisItems,
      allTimeseriesMap,
      allDatacubesMetadataMap,
      globalTimeseries,
      globalBbox,
      selectedTimestamp,
      setSelectedTimestamp,
      handleTimestampRangeSelection,
      globalTimestamp,
      setSelectedGlobalTimestamp,
      selectedTimestampRange,
      reCalculateGlobalTimeseries,
      initialSelectedTimestamp,
      initialSelectedTimestampRange,
      activeDrilldownTab,
      drilldownTabs: DRILLDOWN_TABS,
      setColorBinCount,
      colorBinCount,
      finalColorScheme,
      selectedAdminLevel,
      setSelectedAdminLevel,
      availableAdminLevelTitles,
      globalBarsData,
      allRegionalRankingMap,
      regionRankingCompositionType,
      setRegionRankingCompositionType,
      globalRegionRankingTimestamp,
      setBarCountLimit,
      barCountLimit,
      isBarCountLimitApplied,
      toggleIsBarCountLimitApplied,
      colorBinType,
      setColorBinType,
      highlightedRegionId,
      setHighlightedRegionId,
      ComparativeAnalysisMode,
      updateStateFromInsight,
      regionRankingWeights,
      regionRankingItemStates,
      areRegionRankingRowsNormalized,
      toggleRegionRankingRowsNormalized,
      timeseriesToDatacubeMap,
      colorFromIndex,
      shownDatacubesCountLabel,
      datacubeTitles,
      activeTab,
      analysisId,
      setActiveTab,
      setAnalysisItemViewConfig,
      removeAnalysisItem,
      duplicateAnalysisItem,
      toggleAnalysisItemSelected,
      toggleIsItemInverted,
      setRegionRankingWeights,
      resetRegionRankingWeights
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
    barCountLimit() {
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
      hideInsightPanel: 'insightPanel/hideInsightPanel'
    }),
    getDatacubeRankingWeight(analysisItem: AnalysisItem) {
      const datacubeKey = analysisItem.itemId;
      return this.regionRankingItemStates[datacubeKey].weight.toFixed(2);
    },
    isDatacubeInverted(analysisItem: AnalysisItem) {
      const datacubeKey = analysisItem.itemId;
      return this.regionRankingItemStates[datacubeKey].isInverted;
    },
    setRegionRankingEqualWeight() {
      this.resetRegionRankingWeights();
      // re-build the transform computing the region ranking data
      this.updateGlobalRegionRankingData();
    },
    onRegionRankingWeightsUpdated(newWeights: {[key: string]: {name: string; weight: number}}) {
      // if new weights are not different from current weights, do nothing
      if (_.isEqual(this.regionRankingWeights, newWeights)) {
        return;
      }
      this.setRegionRankingWeights(newWeights);

      // re-build the transform computing the region ranking data
      this.updateGlobalRegionRankingData();
    },
    onUpdatedBarsData(regionRankingInfo: {id: string; datacubeId: string; itemId: string; name: string; barsData: BarData[]; selectedTimestamp: number}) {
      // clone and save the incoming regional-ranking data in the global map object
      const datacubeKey = regionRankingInfo.itemId;
      this.allRegionalRankingMap[datacubeKey] = _.cloneDeep(regionRankingInfo.barsData);

      // save the most recent timestamp from all datacubes as the global one
      if (regionRankingInfo.selectedTimestamp > this.globalRegionRankingTimestamp) {
        this.globalRegionRankingTimestamp = regionRankingInfo.selectedTimestamp;
      }
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
        const scaledCompositeValue = compositeValue * this.colorBinCount;
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
        if (this.colorBinType === BinningOptions.Linear) {
          binIndex = Math.trunc(key.normalizedValue);
        }
        if (this.colorBinType === BinningOptions.Quantile) {
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
      this.globalBarsData = compositeDataSorted;
    },
    onLoadedTimeseries(timeseriesInfo: {id: string; datacubeId: string; itemId: string; timeseriesList: Timeseries[]; datacubeName: string; datacubeOutputName: string; source: string; region: string[]}) {
      // we should only set the global timeseries one time
      //  once all individual datacubes' timeseries have been loaded
      if (!this.reCalculateGlobalTimeseries) return;

      // if the incoming timeseries should no longer be considered for the computation of the global timeseries
      //  because, for example, the corresponding datacube is no longer selected, then do not process it
      if (this.selectedAnalysisItems.findIndex((item: any) => item.id === timeseriesInfo.id && item.datacubeId === timeseriesInfo.datacubeId) < 0) {
        return;
      }

      // clone and save the incoming timeseries in the map object
      //  where all timeseries lists will be saved
      const datacubeKey = timeseriesInfo.itemId;
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
            if (this.initialSelectedTimestamp === null) {
              this.globalTimestamp = lastTimestamp;
            } else {
              this.globalTimestamp = this.initialSelectedTimestamp;
              this.initialSelectedTimestamp = null;
            }
          }
          // select the timestamp range as the full data extend
          const firstTimestamp = _.min(allTimestamps);
          if (lastTimestamp !== undefined && firstTimestamp !== undefined) {
            // set initial timestamp selection range
            const newTimestampRange = { start: firstTimestamp, end: lastTimestamp };
            this.initialSelectedTimestampRange = newTimestampRange;
          }
        }

        // use the loaded metadata for all analysis-items
        const datacubeTitles: DatacubeTitle[] = [];
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
          const datacubeRegions =
            this.allDatacubesMetadataMap[key].region &&
            _.isArray(this.allDatacubesMetadataMap[key].region)
              ? this.allDatacubesMetadataMap[key].region
              : [];
          regions.push(...datacubeRegions);
        });
        this.datacubeTitles = datacubeTitles;
      }
    },
    downloadRankingResult() {
      const heading = 'rank,normalized value,region';
      const content = this.globalBarsData.map(d => {
        return `${d.name},${d.normalizedValue},${d.label.replace(/,/g, ' ')}`;
      }).reverse().join('\r\n');

      const weights = Object.values(this.regionRankingWeights);
      const weightContent = weights.map(d => {
        return `${d.name.replace(/,/g, ' ')},${d.weight}`;
      }).join('\r\n');

      const file = new Blob(['Ranking Criteria and Relative Weight (%)' + '\r\n' + weightContent + '\r\n\r\n\r\n' + heading + '\r\n' + content + '\r\n'], {
        type: 'text/plain'
      });
      (window as any).saveAs(file, 'region-ranking-result.csv');
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
  h5 {
    margin-bottom: -1rem;
  }
  display: flex;
  align-items: baseline;
  justify-content: space-between;
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

  :deep(.region-map) {
    border-style: solid;
    border-color: inherit;
  }
  &.card-count-1 {
    :deep(.region-map) {
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

.action-bar-container {
  display: flex;
  align-items: baseline;

  .shown-datacubes-count {
    margin-left: 20px;
    color: darkgray;
    cursor: default;
    font-style: italic;
  }
}

</style>
