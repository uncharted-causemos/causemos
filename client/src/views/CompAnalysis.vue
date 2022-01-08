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
      <template v-if="comparativeAnalysisViewSelection === ComparativeAnalysisMode.RegionRanking">
        <h5 class="ranking-header-top">Ranking Results</h5>
        <datacube-region-ranking-composite-card
          :bars-data="globalBarsData"
          :selected-admin-level="selectedAdminLevel"
          :selected-timestamp="globalRegionRankingTimestamp"
          :bar-chart-hover-id="barChartHoverId"
          :map-bounds="globalBbox"
          @bar-chart-hover="onBarChartHover"
        />
        <h5 class="ranking-header-bottom">Ranking Criteria:</h5>
      </template>
      <div
        v-if="analysisItems.length"
        class="column"
        :class="{ 'sync-time-view': comparativeAnalysisViewSelection === ComparativeAnalysisMode.SyncTime, 'region-ranking-view': comparativeAnalysisViewSelection === ComparativeAnalysisMode.RegionRanking }">
        <template v-if="comparativeAnalysisViewSelection === ComparativeAnalysisMode.List || comparativeAnalysisViewSelection === ComparativeAnalysisMode.SyncTime">
          <datacube-comparative-card
            v-for="item in analysisItems"
            :key="item.id"
            class="datacube-comparative-card"
            :id="item.id"
            :selected-timestamp="selectedTimestamp"
            :selected-timestamp-range="selectedTimestampRange"
            @loaded-timeseries="onLoadedTimeseries"
          />
        </template>
        <template v-if="comparativeAnalysisViewSelection === ComparativeAnalysisMode.RegionRanking">
          <datacube-region-ranking-card
            v-for="item in analysisItems"
            :key="item.id"
            class="datacube-region-ranking-card"
            :id="item.id"
            :selected-admin-level="selectedAdminLevel"
            :number-of-color-bins="numberOfColorBins"
            :selected-color-scheme="finalColorScheme"
            :max-number-of-chart-bars="maxNumberOfChartBars"
            :limit-number-of-chart-bars="limitNumberOfChartBars"
            :region-ranking-binning-type="regionRankingBinningType"
            :bar-chart-hover-id="barChartHoverId"
            @updated-bars-data="onUpdatedBarsData"
            @bar-chart-hover="onBarChartHover"
          />
        </template>
      </div>
      <empty-state-instructions v-else />
      <datacube-comparative-timeline-sync
        v-if="globalTimeseries.length > 0 && comparativeAnalysisViewSelection === ComparativeAnalysisMode.SyncTime"
        :timeseriesData="globalTimeseries"
        :selected-timestamp="selectedTimestamp"
        @select-timestamp="setSelectedTimestamp"
        @select-timestamp-range="handleTimestampRangeSelection"
      />
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
          @set-number-color-bins="setNumberOfColorBins"
          @set-selected-admin-level="setSelectedAdminLevel"
          @set-region-ranking-composition-type="setRegionRankingCompositionType"
          @set-region-ranking-equal-weight="setRegionRankingEqualWeight"
          @set-max-number-of-chart-bars="setMaxNumberOfChartBars"
          @set-limit-number-of-chart-bars="setLimitNumberOfChartBars"
          @set-region-ranking-binning-type="setRegionRankingBinningType"
        />
      </template>
    </drilldown-panel>
  </div>
</template>

<script lang="ts">
import { computed, defineComponent, onMounted, Ref, ref, watch, watchEffect } from 'vue';
import { mapActions, mapGetters, useStore } from 'vuex';
import DatacubeComparativeCard from '@/components/widgets/datacube-comparative-card.vue';
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
import { COLOR, getColors } from '@/utils/colors-util';
import { ADMIN_LEVEL_TITLES } from '@/utils/admin-level-util';
import { BinningOptions, ComparativeAnalysisMode, DatacubeGeoAttributeVariableType, RegionRankingCompositionType } from '@/types/Enums';
import { BarData } from '@/types/BarChart';
import { getInsightById } from '@/services/insight-service';
import { computeMapBoundsForCountries } from '@/utils/map-util-new';
import router from '@/router';

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
    const analysisItems = computed(() => store.getters['dataAnalysis/analysisItems']);
    const comparativeAnalysisViewSelection = computed<string>(() => store.getters['dataAnalysis/comparativeAnalysisViewSelection']);
    const quantitativeAnalysisId = computed(
      () => store.getters['dataAnalysis/analysisId']
    );

    const activeDrilldownTab = ref<string|null>('region-settings');
    const selectedAdminLevel = ref(0);

    const globalBbox = ref<number[][] | undefined>(undefined);

    onMounted(async () => {
      store.dispatch('app/setAnalysisName', '');
      const result = await getAnalysis(quantitativeAnalysisId.value);
      store.dispatch('app/setAnalysisName', result.title);
    });

    watchEffect(async () => {
      const countries = store.getters['insightPanel/dataState']?.datacubeRegions || [];
      globalBbox.value = await computeMapBoundsForCountries(countries) || undefined;
    });

    watchEffect(() => {
      if (analysisItems.value && analysisItems.value.length > 0) {
        // set context-ids to fetch insights correctly for all datacubes in this analysis
        const contextIDs = analysisItems.value.map((dc: any) => dc.id);
        store.dispatch('insightPanel/setContextId', contextIDs);
      } else {
        // no datacubes in this analysis, so do not fetch any insights/questions
        store.dispatch('insightPanel/setContextId', undefined);
      }
    });

    const allTimeseriesMap: {[key: string]: Timeseries[]} = {};
    const allDatacubesMetadataMap: {[key: string]: {datacubeName: string; datacubeOutputName: string; region: string[]}} = {};
    const globalTimeseries = ref([]) as Ref<Timeseries[]>;
    const reCalculateGlobalTimeseries = ref(true);

    const allRegionalRankingMap = ref<{[key: string]: BarData[]}>({});
    const globalBarsData = ref([]) as Ref<BarData[]>;
    const globalRegionRankingTimestamp = ref(0);

    const selectedTimestamp = ref(null) as Ref<number | null>;
    const selectedTimestampRange = ref(null) as Ref<{start: number; end: number} | null>;

    const initialSelectedTimestamp = ref(0);
    const initialSelectedTimestampRange = ref({}) as Ref<{start: number; end: number}>;

    const setSelectedTimestamp = (value: number) => {
      if (selectedTimestamp.value === value || comparativeAnalysisViewSelection.value === ComparativeAnalysisMode.List) return;
      selectedTimestamp.value = value;
    };

    const handleTimestampRangeSelection = (newTimestampRange: {start: number; end: number}) => {
      // we should pass the incoming (global) range to all datacube-comparative-card components
      //  so that they may zoom accordingly
      if (comparativeAnalysisViewSelection.value !== ComparativeAnalysisMode.SyncTime) {
        // if time-sync is disabled do nothing
        return;
      }
      if (selectedTimestampRange.value?.start === newTimestampRange.start &&
        selectedTimestampRange.value?.end === newTimestampRange.end) {
        return;
      }
      selectedTimestampRange.value = newTimestampRange;
    };

    watch(
      () => comparativeAnalysisViewSelection.value,
      comparativeAnalysisViewSelection => {
        if (comparativeAnalysisViewSelection === ComparativeAnalysisMode.List) {
          selectedTimestampRange.value = null;
          selectedTimestamp.value = null;
        } else {
          setSelectedTimestamp(initialSelectedTimestamp.value);
          handleTimestampRangeSelection(initialSelectedTimestampRange.value);
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

    const isRegionRankingEqualWeights = ref(true);
    const setRegionRankingEqualWeight = (equalWeights: boolean) => {
      isRegionRankingEqualWeights.value = equalWeights;
    };

    const maxNumberOfChartBars = ref(50);
    const setMaxNumberOfChartBars = (numBins: number) => {
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
        barChartHoverId.value
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
          regionRankingHoverId: barChartHoverId.value
        };
        store.dispatch('insightPanel/setViewState', viewState);
      }
    );

    const updateStateFromInsight = async (insight_id: string) => {
      const loadedInsight: Insight = await getInsightById(insight_id);
      // FIXME: before applying the insight, which will overwrite current state,
      //  consider pushing current state to the url to support browser hsitory
      //  in case the user wants to navigate to the original state using back button
      if (loadedInsight) {
        //
        // insight was found and loaded
        //
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
      }
    };

    return {
      analysisItems,
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
      setRegionRankingEqualWeight,
      isRegionRankingEqualWeights,
      globalRegionRankingTimestamp,
      setMaxNumberOfChartBars,
      maxNumberOfChartBars,
      limitNumberOfChartBars,
      setLimitNumberOfChartBars,
      regionRankingBinningType,
      setRegionRankingBinningType,
      onBarChartHover,
      barChartHoverId,
      ComparativeAnalysisMode,
      updateStateFromInsight
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
    onUpdatedBarsData(regionRankingInfo: {id: string; barsData: BarData[]; selectedTimestamp: number}) {
      // clone and save the incoming regional-ranking data in the global map object
      this.allRegionalRankingMap[regionRankingInfo.id] = _.cloneDeep(regionRankingInfo.barsData);

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
        const regionRankingEqualCompositionWeight = 1 / (regionValues.length);
        const weights = this.isRegionRankingEqualWeights ? Array(regionValues.length).fill(regionRankingEqualCompositionWeight) : Array(regionValues.length).fill(regionRankingEqualCompositionWeight);
        const compositeValue = dotProduct(regionValues, weights);
        const scaledCompositeValue = compositeValue * this.numberOfColorBins;
        const shouldAddRegionBar = this.regionRankingCompositionType === RegionRankingCompositionType.Union || (this.regionRankingCompositionType === RegionRankingCompositionType.Intersection && regionValues.length === this.analysisItems.length);
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
        if (this.regionRankingBinningType === BinningOptions.Linear) {
          const binIndex = Math.trunc(key.normalizedValue);
          barColor = colors[binIndex];
        }
        if (this.regionRankingBinningType === BinningOptions.Quantile) {
          const colorIndex = Math.trunc(slope * indx);
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
    onLoadedTimeseries(timeseriesInfo: {id: string; timeseriesList: Timeseries[]; datacubeName: string; datacubeOutputName: string; region: string[]}) {
      // we should only set the global timeseries one time
      //  once all individual datacubes' timeseries have been loaded
      if (!this.reCalculateGlobalTimeseries) return;

      // clone and save the incoming timeseries in the map object
      //  where all timeseries lists will be saved
      this.allTimeseriesMap[timeseriesInfo.id] = _.cloneDeep(timeseriesInfo.timeseriesList);

      this.allDatacubesMetadataMap[timeseriesInfo.id] = {
        datacubeName: timeseriesInfo.datacubeName,
        datacubeOutputName: timeseriesInfo.datacubeOutputName,
        region: timeseriesInfo.region
      };
      //
      // calculate (the global timeseries)
      //
      if (this.analysisItems.length === Object.keys(this.allTimeseriesMap).length) {
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
          const allTimestampsPoints = timeseriesList
            .map(timeseries => timeseries.points)
            .flat();
          const allTimestampsValues = allTimestampsPoints
            .map(point => point.value);
          const minValue = _.min(allTimestampsValues) as number;
          const maxValue = _.max(allTimestampsValues) as number;
          if (minValue === maxValue) {
            // minValue === maxValue, so vertically align its value in the center
            allTimestampsPoints.forEach(p => {
              p.value = 0.5;
            });
          } else {
            allTimestampsPoints.forEach(p => {
              p.value = (p.value - minValue) / (maxValue - minValue);
            });
          }

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
            datacubeOutputName: this.allDatacubesMetadataMap[key].datacubeOutputName
          };
          // for each datacube, save its name and output-name
          datacubeTitles.push(title);
          // also, save a list of all regions (into a big list for all datacubes)
          const datacubeRegions = this.allDatacubesMetadataMap[key].region && _.isArray(this.allDatacubesMetadataMap[key].region) ? this.allDatacubesMetadataMap[key].region : [];
          regions.push(...datacubeRegions);
        });
        const dataState: DataState = {
          datacubeTitles: datacubeTitles,
          datacubeRegions: _.unionBy(_.sortBy(regions)) // FIXME: rank repeated countries from all datacubes and show top 5
        };
        this.setDataState(dataState);
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

.datacube-comparative-card:not(:first-child) {
  margin-top: 10px;
}

.datacube-region-ranking-card {
  margin-bottom: 10px;
}

.column {
  margin: 10px 0;
}

.sync-time-view {
  padding-bottom: 80px;
  overflow-y: auto;
}

.region-ranking-view {
  overflow-y: auto;
}

.ranking-header-bottom {
  margin-bottom: -1rem;
}
.ranking-header-top {
  margin-bottom: -0.25rem;
}

</style>
