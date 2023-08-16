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
        <div class="shown-datacubes-count">{{ shownDatacubesCountLabel }}</div>
      </div>

      <!-- overlay view content -->
      <datacube-comparative-timeline-sync
        v-if="globalTimeseries.length > 0 && activeTab === ComparativeAnalysisMode.Overlay"
        :timeseriesData="globalTimeseries"
        :timeseriesToDatacubeMap="timeseriesToDatacubeMap"
        :selected-timestamp="globalTimestamp ?? undefined"
        @select-timestamp="setSelectedGlobalTimestamp"
        @select-timestamp-range="handleTimestampRangeSelection"
      />
      <!--
        listing individual datacube cards
      -->
      <div v-if="selectedAnalysisItems.length" class="column">
        <template v-if="activeTab === ComparativeAnalysisMode.List">
          <datacube-comparative-card
            v-for="(item, indx) in selectedAnalysisItems"
            :key="item.itemId"
            class="datacube-comparative-card"
            :id="item.id"
            :item-id="item.itemId"
            :datacube-index="indx"
            :selected-timestamp="selectedTimestamp ?? undefined"
            :selected-timestamp-range="selectedTimestampRange"
            :analysis-item="item"
            :analysis-id="analysisId"
            @loaded-timeseries="onLoadedTimeseries"
            @loaded-metadata="cacheUpdatedMetadata"
            @updated-feature-display-name="cacheUpdatedFeatureName"
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
              :key="item.itemId"
              class="card-map-container"
              :class="[
                `card-count-${
                  selectedAnalysisItems.length < 5 ? selectedAnalysisItems.length : 'n'
                }`,
              ]"
            >
              <datacube-comparative-overlay-region
                :style="{ borderColor: colorFromIndex(indx) }"
                class="card-map"
                :id="item.id"
                :item-id="item.itemId"
                :datacube-index="indx"
                :global-timestamp="globalTimestamp ?? undefined"
                :analysis-item="item"
                :analysis-id="analysisId"
                @loaded-timeseries="onLoadedTimeseries"
                @loaded-metadata="cacheUpdatedMetadata"
                @remove-analysis-item="removeAnalysisItem"
                @duplicate-analysis-item="duplicateAnalysisItem"
              />
            </div>
          </div>
        </template>
      </div>
      <empty-state-instructions v-else />
    </main>
  </div>
</template>

<script lang="ts">
import { computed, defineComponent, onMounted, Ref, ref, watch, watchEffect } from 'vue';
import { mapActions, mapGetters, useStore } from 'vuex';
import DatacubeComparativeCard from '@/components/comp-analysis/datacube-comparative-card.vue';
import DatacubeComparativeOverlayRegion from '@/components/comp-analysis/datacube-comparative-overlay-region.vue';
import ActionBar from '@/components/data/action-bar.vue';
import EmptyStateInstructions from '@/components/empty-state-instructions.vue';
import AnalyticalQuestionsAndInsightsPanel from '@/components/analytical-questions/analytical-questions-and-insights-panel.vue';
import { Timeseries } from '@/types/Timeseries';
import DatacubeComparativeTimelineSync from '@/components/widgets/datacube-comparative-timeline-sync.vue';
import _ from 'lodash';
import { Insight } from '@/types/Insight';
import AnalysisOptionsButton from '@/components/analysis-options-button.vue';
import { getAnalysis } from '@/services/analysis-service';
import AnalysisCommentsButton from '@/components/data/analysis-comments-button.vue';
import { COLOR, getColors, colorFromIndex } from '@/utils/colors-util';
import { ADMIN_LEVEL_TITLES } from '@/utils/admin-level-util';
import { ComparativeAnalysisMode, DatacubeGeoAttributeVariableType } from '@/types/Enums';
import { BarData } from '@/types/BarChart';
import { getInsightById } from '@/services/insight-service';
import { computeMapBoundsForCountries } from '@/utils/map-util-new';
import router from '@/router';
import { DataAnalysisState } from '@/types/Analysis';
import { normalizeTimeseriesList } from '@/utils/timeseries-util';
import { useRoute } from 'vue-router';
import { useDataAnalysis } from '@/services/composables/useDataAnalysis';
import { isDataAnalysisState } from '@/utils/insight-util';
import { Indicator, Model } from '@/types/Datacube';

export default defineComponent({
  name: 'CompAnalysis',
  components: {
    DatacubeComparativeCard,
    DatacubeComparativeOverlayRegion,
    AnalysisCommentsButton,
    ActionBar,
    EmptyStateInstructions,
    AnalyticalQuestionsAndInsightsPanel,
    DatacubeComparativeTimelineSync,
    AnalysisOptionsButton,
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
      updateAnalysisItemCachedMetadata,
      removeAnalysisItem,
      duplicateAnalysisItem,
      toggleAnalysisItemSelected,
      selectedAdminLevel,
      setSelectedAdminLevel,
      colorBinCount,
      setColorBinCount,
      colorBinType,
      setColorBinType,
      barCountLimit,
      setBarCountLimit,
      isBarCountLimitApplied,
      toggleIsBarCountLimitApplied,
      toggleIsItemInverted,
      highlightedRegionId,
      setHighlightedRegionId,
      setAnalysisState,
    } = useDataAnalysis(analysisId);

    const activeDrilldownTab = ref<string | null>('region-settings');

    const globalBbox = ref<number[][] | undefined>(undefined);

    const allTimeseriesMap = ref<{ [key: string]: Timeseries[] }>({});
    const globalTimeseries = ref([]) as Ref<Timeseries[]>;
    const reCalculateGlobalTimeseries = ref(true);
    const timeseriesToDatacubeMap = ref<{
      [timeseriesId: string]: { datacubeName: string; datacubeOutputVariable: string };
    }>({});

    const allRegionalRankingMap = ref<{ [key: string]: BarData[] }>({});
    const globalBarsData = ref([]) as Ref<BarData[]>;

    const selectedTimestamp = ref(null) as Ref<number | null>;
    // FIXME: seems like selectedTimestampRange is always set to the full range
    //  and never affects any behaviour. Investigate and remove.
    const selectedTimestampRange = ref(null) as Ref<{ start: number; end: number } | null>;

    const globalTimestamp = ref(null) as Ref<number | null>;
    const initialSelectedTimestamp = ref(null) as Ref<number | null>;
    const initialSelectedTimestampRange = ref({}) as Ref<{ start: number; end: number }>;

    onMounted(async () => {
      store.dispatch('app/setAnalysisName', '');
      const result = await getAnalysis(analysisId.value);
      if (result) {
        store.dispatch('app/setAnalysisName', result.title);
      }
    });

    watch(
      () => analysisItems.value,
      (analysisItems) => {
        if (analysisItems && analysisItems.length > 0) {
          // set context-ids to fetch insights correctly for all datacubes
          //  (even the non-selected ones) in this analysis
          const contextIDs = analysisItems.map((dc) => dc.id); // FIXME is it id or datacubeId or itemId?
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
      return (
        'Selected ' +
        selectedAnalysisItems.value.length +
        ' / ' +
        analysisItems.value.length +
        ' datacubes'
      );
    });

    const setSelectedTimestamp = (value: number) => {
      if (selectedTimestamp.value === value) return;
      selectedTimestamp.value = value;
    };

    const setSelectedGlobalTimestamp = (value: number) => {
      if (globalTimestamp.value === value) return;
      globalTimestamp.value = value;
    };

    const handleTimestampRangeSelection = (
      newTimestampRange: { start: number; end: number } | null
    ) => {
      if (
        selectedTimestampRange.value?.start === newTimestampRange?.start &&
        selectedTimestampRange.value?.end === newTimestampRange?.end
      ) {
        return;
      }
      selectedTimestampRange.value = newTimestampRange;
    };
    const cacheUpdatedMetadata = (itemId: string, metadata: Model | Indicator) => {
      updateAnalysisItemCachedMetadata(itemId, {
        datacubeName: metadata.name,
        source: metadata.maintainer.organization,
      });
    };
    const cacheUpdatedFeatureName = (itemId: string, featureName: string) => {
      updateAnalysisItemCachedMetadata(itemId, { featureName });
    };

    watch(
      () => [activeTab.value, initialSelectedTimestampRange.value],
      () => {
        if (activeTab.value === ComparativeAnalysisMode.Overlay) {
          handleTimestampRangeSelection(initialSelectedTimestampRange.value);
        } else {
          // reset the active selected range non-overlay views
          handleTimestampRangeSelection(null);
        }
      }
    );

    const availableAdminLevelTitles = ref(
      Object.values(DatacubeGeoAttributeVariableType).map(
        (adminLevel) => ADMIN_LEVEL_TITLES[adminLevel]
      )
    );

    //
    // color scheme options
    //
    const finalColorScheme = computed(() => getColors(COLOR.PRIORITIZATION, colorBinCount.value));

    watchEffect(async () => {
      const countries = highlightedRegionId.value
        ? [highlightedRegionId.value.split('__')[0]]
        : [...new Set(globalBarsData.value.map((d) => d.label.split('__')[0]))];
      globalBbox.value = (await computeMapBoundsForCountries(countries)) || undefined;
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

    watchEffect(() => {
      const newDataState: DataAnalysisState = _.cloneDeep(analysisState.value);
      // Only save the selected timestamp when overlap mode is active
      newDataState.selectedTimestamp =
        activeTab.value === ComparativeAnalysisMode.Overlay ? globalTimestamp.value : null;
      store.dispatch('insightPanel/setDataState', newDataState);
      // No view state for this page. Set it to an empty object so that any view
      //  state from previous pages is cleared and not associated with insights
      //  taken from this page.
      store.dispatch('insightPanel/setViewState', {});
    });

    return {
      analysisItems,
      selectedAnalysisItems,
      allTimeseriesMap,
      cacheUpdatedMetadata,
      cacheUpdatedFeatureName,
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
      setColorBinCount,
      colorBinCount,
      finalColorScheme,
      selectedAdminLevel,
      setSelectedAdminLevel,
      availableAdminLevelTitles,
      globalBarsData,
      allRegionalRankingMap,
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
      timeseriesToDatacubeMap,
      colorFromIndex,
      shownDatacubesCountLabel,
      activeTab,
      analysisId,
      setActiveTab,
      setAnalysisItemViewConfig,
      removeAnalysisItem,
      duplicateAnalysisItem,
      toggleAnalysisItemSelected,
      toggleIsItemInverted,
    };
  },
  mounted() {
    // ensure the insight explorer panel is closed in case the user has
    //  previously opened it and clicked the browser back button
    this.hideInsightPanel();
  },
  computed: {
    ...mapGetters({
      project: 'app/project',
    }),
  },
  watch: {
    $route: {
      handler(/* newValue, oldValue */) {
        // NOTE:  this is only valid when the route is focused on the 'dataComparative' space
        if (this.$route.name === 'dataComparative' && this.$route.query) {
          const insight_id = this.$route.query.insight_id as any;
          if (insight_id !== undefined) {
            this.updateStateFromInsight(insight_id);
            // remove the insight_id from the url,
            //  so that (1) future insight capture is valid and (2) enable re-applying the same insight
            // FIXME: review to avoid double history later
            router
              .push({
                query: {
                  insight_id: undefined,
                },
              })
              .catch(() => {});
          }
        }
      },
      immediate: true,
    },
  },
  methods: {
    ...mapActions({
      hideInsightPanel: 'insightPanel/hideInsightPanel',
    }),
    onLoadedTimeseries(itemId: string, timeseriesList: Timeseries[]) {
      // we should only set the global timeseries one time
      //  once all individual datacubes' timeseries have been loaded
      if (!this.reCalculateGlobalTimeseries) return;

      const item = this.selectedAnalysisItems.find((item) => item.itemId === itemId);
      if (item === undefined) {
        // Incoming timeseries should no longer be included in the global
        //  timeseries because the corresponding datacube is no longer selected.
        return;
      }

      // Clone and save the incoming timeseries into a map object.
      // This will be used when calculating global timeseries after all
      //  timeseries are loaded.
      this.allTimeseriesMap[itemId] = _.cloneDeep(timeseriesList);
      if (this.selectedAnalysisItems.length === Object.keys(this.allTimeseriesMap).length) {
        // Timeseries data has been loaded for all datacubes so calculate the
        //  global timeseries.
        this.reCalculateGlobalTimeseries = false;
        const flatMap: Array<Timeseries[]> = [];
        Object.keys(this.allTimeseriesMap).forEach((_itemId) => {
          const timeseriesList: Timeseries[] = this.allTimeseriesMap[_itemId];

          // normalize the timeseries values for better y-axis scaling when multiple
          //  timeseries from different datacubes are shown together
          // i.e., re-map all timestamp point values to a range of [0: 1]
          //
          // NOTE: each timeseriesList represents the list of timeseries,
          //  where each timeseries in that list reflects the timeseries of one model run,
          //  and also noting that all the timeseries in that list share
          //  the same scale/range since they all relate to a single datacube (variable)
          normalizeTimeseriesList(timeseriesList);

          timeseriesList.forEach((timeseries) => {
            // override the timeseries id to match its owner datacube
            timeseries.id = _itemId;
            // build a map that links each timeseries to its owner datacube
            const info = this.selectedAnalysisItems.find(
              (item) => item.itemId === _itemId
            )?.cachedMetadata;
            this.timeseriesToDatacubeMap[_itemId] = {
              datacubeName: info?.datacubeName ?? '',
              datacubeOutputVariable: info?.featureName ?? '',
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
            .map((timeseries) => timeseries.points)
            .flat()
            .map((point) => point.timestamp);

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
      }
    },
  },
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
    min-width: calc(50% - calc($marginSize / 2));
    max-width: calc(50% - calc($marginSize / 2));
  }
  &.card-count-n {
    min-width: calc(calc(100% / 3) - calc($marginSize * 2 / 3));
    max-width: calc(calc(100% / 3) - calc($marginSize * 2 / 3));
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
