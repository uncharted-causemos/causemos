<template>
  <div class="comp-analysis-container">
    <Teleport to="#navbar-trailing-teleport-destination" v-if="isMounted">
      <AnalysisOptionsButton :analysis-id="analysisId" />
    </Teleport>
    <AnalyticalQuestionsAndInsightsPanel
      class="side-panel"
      :analysis-items="analysisItems"
      @remove-analysis-item="removeAnalysisItem"
      @toggle-analysis-item-selected="toggleAnalysisItemSelected"
    >
      <template #below-tabs>
        <AnalysisCommentsButton :analysis-id="analysisId" />
      </template>
    </AnalyticalQuestionsAndInsightsPanel>
    <main class="insight-capture">
      <div class="action-bar-container">
        <ActionBar
          :active-tab="activeTab"
          :analysisId="analysisId"
          @set-active-tab="setActiveTab"
          style="flex: 1"
        />
        <div class="shown-datacubes-count">{{ shownDatacubesCountLabel }}</div>
      </div>

      <!-- overlay view content -->
      <DatacubeComparativeTimelineSync
        v-if="globalTimeseries.length > 0 && activeTab === ComparativeAnalysisMode.Overlay"
        :timeseriesData="globalTimeseries"
        :timeseriesToDatacubeMap="timeseriesToDatacubeMap"
        :selected-timestamp="globalTimestamp ?? initialSelectedTimestamp ?? undefined"
        @select-timestamp="setSelectedGlobalTimestamp"
      />
      <!--
        listing individual datacube cards
      -->
      <div v-if="selectedAnalysisItems.length" class="column">
        <template v-if="activeTab === ComparativeAnalysisMode.List">
          <DatacubeComparativeCard
            v-for="(item, indx) in selectedAnalysisItems"
            :key="getAnalysisItemId(item)"
            class="datacube-comparative-card"
            :datacube-id="getDatacubeId(item)"
            :item-id="getAnalysisItemId(item)"
            :item-index="indx"
            :selected-timestamp="selectedTimestamp ?? 0"
            :analysis-item="item"
            :analysis-id="analysisId"
            @select-timestamp="setSelectedTimestamp"
            @remove-analysis-item="removeAnalysisItem"
            @duplicate-analysis-item="duplicateAnalysisItem"
          />
        </template>
        <template v-if="activeTab === ComparativeAnalysisMode.Overlay">
          <div class="card-maps-container">
            <div
              v-for="(item, indx) in selectedAnalysisItems"
              :key="getAnalysisItemId(item)"
              class="card-map-container"
              :class="[
                `card-count-${
                  selectedAnalysisItems.length < 5 ? selectedAnalysisItems.length : 'n'
                }`,
              ]"
            >
              <DatacubeComparativeOverlayRegion
                :style="{ borderColor: colorFromIndex(indx) }"
                class="card-map"
                :datacube-id="getDatacubeId(item)"
                :item-id="getAnalysisItemId(item)"
                :item-index="indx"
                :global-timestamp="globalTimestamp ?? initialSelectedTimestamp ?? 0"
                :analysis-item="item"
                :analysis-id="analysisId"
                @loaded-timeseries="onLoadedTimeseries"
                @remove-analysis-item="removeAnalysisItem"
                @duplicate-analysis-item="duplicateAnalysisItem"
              />
            </div>
          </div>
        </template>
      </div>
      <p v-else>Models and datasets you select will appear here.</p>
    </main>
  </div>
</template>

<script setup lang="ts">
import _ from 'lodash';
import { computed, onMounted, Ref, ref, watch, watchEffect } from 'vue';
import { useStore } from 'vuex';
import { useRoute } from 'vue-router';

import router from '@/router';

import { ComparativeAnalysisMode } from '@/types/Enums';
import { Timeseries } from '@/types/Timeseries';
import { Insight } from '@/types/Insight';
import { DataAnalysisState } from '@/types/Analysis';

import DatacubeComparativeCard from '@/components/comp-analysis/datacube-comparative-card.vue';
import DatacubeComparativeOverlayRegion from '@/components/comp-analysis/datacube-comparative-overlay-region.vue';
import ActionBar from '@/components/data/action-bar.vue';
import AnalyticalQuestionsAndInsightsPanel from '@/components/analytical-questions/analytical-questions-and-insights-panel.vue';
import DatacubeComparativeTimelineSync from '@/components/widgets/datacube-comparative-timeline-sync.vue';
import AnalysisOptionsButton from '@/components/analysis-options-button.vue';
import AnalysisCommentsButton from '@/components/data/analysis-comments-button.vue';

import { useDataAnalysis } from '@/composables/useDataAnalysis';

import { colorFromIndex } from '@/utils/colors-util';
import { getId as getAnalysisItemId, getDatacubeId, getId } from '@/utils/analysis-util';
import { normalizeTimeseriesList, getTimestampRange } from '@/utils/timeseries-util';
import { isDataAnalysisState } from '@/utils/insight-util';

import { getAnalysis } from '@/services/analysis-service';
import { getInsightById } from '@/services/insight-service';

// This is required because teleported components require their teleport destination to be mounted
//  before they can be rendered.
const isMounted = ref(false);
onMounted(() => {
  isMounted.value = true;
  store.dispatch('insightPanel/hideInsightPanel');
});

const store = useStore();
const route = useRoute();
const analysisId = computed(() => route.params.analysisId as string);
const {
  analysisState,
  analysisItems,
  selectedAnalysisItems,
  activeTab,
  setActiveTab,
  removeAnalysisItem,
  duplicateAnalysisItem,
  toggleAnalysisItemSelected,
  setAnalysisState,
} = useDataAnalysis(analysisId);

const allTimeseriesMap = ref<{ [key: string]: Timeseries[] }>({});
const allTimestampRangeMap = ref<{
  [key: string]: { start: number | null; end: number | null };
}>({});
const globalTimeseries = computed(() => Object.values(allTimeseriesMap.value).flat());
const timeseriesToDatacubeMap = ref<{
  [timeseriesId: string]: { datacubeName: string; datacubeOutputVariable: string };
}>({});

const selectedTimestamp = ref(null) as Ref<number | null>;

const globalTimestamp = ref(null) as Ref<number | null>;
const initialSelectedTimestamp = computed(() => {
  const allLastTimestamps = Object.values(allTimestampRangeMap.value)
    .map((v) => v.end)
    .filter((v) => v !== null) as number[];
  return allLastTimestamps.length > 0 ? Math.max(...allLastTimestamps) : null;
});

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
      const contextIDs = analysisItems.map((item) => getId(item));
      store.dispatch('insightPanel/setContextId', contextIDs);
    } else {
      // no datacubes in this analysis, so do not fetch any insights/questions
      store.dispatch('insightPanel/setContextId', undefined);
    }
    allTimeseriesMap.value = {};
    allTimestampRangeMap.value = {};
    timeseriesToDatacubeMap.value = {};
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
      globalTimestamp.value = dataState.selectedTimestamp;
    }
  }
};
// Any time an insight is applied (either on first page load or after applying an insight from this
//  page), immediately update the state and remove it from the URL
watch(
  () => route.query.insight_id,
  async (insightId) => {
    if (typeof insightId === 'string') {
      updateStateFromInsight(insightId);
      // Remove insightId from the route once state is applied
      router.replace({
        query: {
          ...route.query,
          insight_id: undefined,
        },
      });
    }
  },
  { immediate: true }
);

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

const onLoadedTimeseries = (
  itemId: string,
  timeseriesList: Timeseries[],
  metadata: { outputDisplayName: string; datacubeName: string }
) => {
  const item = selectedAnalysisItems.value.find((item) => getAnalysisItemId(item) === itemId);
  if (item === undefined) {
    // Incoming timeseries should no longer be included in the global
    //  timeseries because the corresponding datacube is no longer selected.
    return;
  }

  timeseriesToDatacubeMap.value[itemId] = {
    datacubeName: metadata.datacubeName ?? '',
    datacubeOutputVariable: metadata.outputDisplayName ?? '',
  };

  // Clone and save the incoming timeseries into a map object.
  // This will be used when calculating global timeseries after all
  //  timeseries are loaded.
  // Also, override the timeseries id to match its owner analysis item id
  const timeseriesData = _.cloneDeep(timeseriesList).map((timeseries) => ({
    ...timeseries,
    id: itemId,
  }));

  // normalize the timeseries values for better y-axis scaling when multiple
  //  timeseries from different datacubes are shown together
  // i.e., re-map all timestamp point values to a range of [0: 1]
  //
  // NOTE: each timeseriesList represents the list of timeseries,
  //  where each timeseries in that list reflects the timeseries of one model run,
  //  and also noting that all the timeseries in that list share
  //  the same scale/range since they all relate to a single datacube (variable)
  normalizeTimeseriesList(timeseriesData);

  allTimeseriesMap.value[itemId] = timeseriesData;
  allTimestampRangeMap.value[itemId] = getTimestampRange(timeseriesData);
};
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
