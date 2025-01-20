<template>
  <div class="comp-analysis-container insight-capture">
    <Teleport to="#navbar-trailing-teleport-destination" v-if="isMounted">
      <AnalysisOptionsButton :analysis-id="analysisId" />
    </Teleport>
    <main>
      <div class="header-row">
        <div class="header-row">
          <SelectButton
            :options="[
              { label: 'Side by side', value: ComparativeAnalysisMode.List },
              { label: 'Overlay', value: ComparativeAnalysisMode.Overlay },
            ]"
            :model-value="activeTab"
            option-label="label"
            option-value="value"
            @update:model-value="setActiveTab"
          />
          <Button
            v-if="hiddenDatacubeCount > 0 || isHideDatacubePanelVisible"
            :label="`View ${hiddenDatacubeCount} hidden ${
              isFirstDatacubeAnIndicator ? 'dataset' : 'model'
            }${hiddenDatacubeCount === 1 ? '' : 's'}`"
            outlined
            @click="isHideDatacubePanelVisible = true"
          />
          <Dialog v-model:visible="isHideDatacubePanelVisible" modal :style="{ width: '800px' }">
            <template #header>
              <strong
                >Hidden {{ isFirstDatacubeAnIndicator ? 'dataset' : 'model' }}s
                <span class="subdued"
                  >({{ analysisItems.filter((item) => !item.selected).length }})</span
                ></strong
              >
            </template>
            <Message
              icon="fa fa-info-circle"
              :style="{ marginTop: '10px', display: 'inline-block' }"
            >
              Up to {{ MAX_ANALYSIS_DATACUBES_COUNT }}
              {{ isFirstDatacubeAnIndicator ? 'dataset' : 'model' }}s can be visible at once.
            </Message>
            <div class="hidden-datacubes">
              <div
                v-for="item in analysisItems.filter((item) => !item.selected)"
                :key="item.datacubeId"
                class="hide-datacube-panel-row"
              >
                <div>
                  <p :style="{ marginBottom: '2px' }">
                    {{ getDisplayInfo(item).outputDisplayName.join(',') }}
                  </p>
                  <p class="subdued font-size-small">{{ getDisplayInfo(item).source }}</p>
                  <p class="subdued font-size-small">{{ getDisplayInfo(item).organization }}</p>
                </div>
                <Button
                  label="Show"
                  :disabled="!canSelectItem"
                  severity="secondary"
                  @click="toggleAnalysisItemSelected(getId(item))"
                />
              </div>
            </div>
            <div class="visible-datacubes">
              <strong
                >Visible {{ isFirstDatacubeAnIndicator ? 'dataset' : 'model' }}s
                <span class="subdued"
                  >({{ analysisItems.filter((item) => item.selected).length }})</span
                ></strong
              >
              <div
                v-for="item in analysisItems.filter((item) => item.selected)"
                :key="item.datacubeId"
                class="hide-datacube-panel-row"
              >
                <div>
                  <p :style="{ marginBottom: '2px' }">
                    {{ getDisplayInfo(item).outputDisplayName.join(',') }}
                  </p>
                  <p class="subdued font-size-small">{{ getDisplayInfo(item).source }}</p>
                  <p class="subdued font-size-small">{{ getDisplayInfo(item).organization }}</p>
                </div>
                <Button
                  label="Hide"
                  severity="secondary"
                  @click="toggleAnalysisItemSelected(getId(item))"
                />
              </div>
            </div>
            <template #footer>
              <Button label="Done" @click="isHideDatacubePanelVisible = false" />
            </template>
          </Dialog>
        </div>
        <Button
          icon="fa fa-plus"
          :label="`Add ${isFirstDatacubeAnIndicator ? 'dataset' : 'model'}s`"
          @click="openDataExplorer"
        />
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
      <div
        v-if="selectedAnalysisItems.length && activeTab === ComparativeAnalysisMode.List"
        class="column"
      >
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
      </div>
      <div
        class="card-maps-container"
        v-else-if="selectedAnalysisItems.length && activeTab === ComparativeAnalysisMode.Overlay"
      >
        <DatacubeComparativeOverlayRegion
          v-for="(item, indx) in selectedAnalysisItems"
          :key="getAnalysisItemId(item)"
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
      <p v-else>
        {{ isFirstDatacubeAnIndicator ? 'Dataset' : 'Model' }}s you select will appear here.
      </p>
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
import { AnalysisItem, DataAnalysisState } from '@/types/Analysis';

import DatacubeComparativeCard from '@/components/comp-analysis/datacube-comparative-card.vue';
import DatacubeComparativeOverlayRegion from '@/components/comp-analysis/datacube-comparative-overlay-region.vue';
import DatacubeComparativeTimelineSync from '@/components/widgets/datacube-comparative-timeline-sync.vue';
import AnalysisOptionsButton from '@/components/analysis-options-button.vue';

import { useDataAnalysis } from '@/composables/useDataAnalysis';

import { colorFromIndex } from '@/utils/colors-util';
import {
  getId as getAnalysisItemId,
  getDatacubeId,
  getId,
  getState,
  MAX_ANALYSIS_DATACUBES_COUNT,
} from '@/utils/analysis-util';
import { normalizeTimeseriesList, getTimestampRange } from '@/utils/timeseries-util';
import { isDataAnalysisState } from '@/utils/insight-util';

import { getAnalysis } from '@/services/analysis-service';
import { getInsightById } from '@/services/insight-service';
import filtersUtil from '@/utils/filters-util';
import {
  getOutputDisplayNamesForBreakdownState,
  isIndicator,
  STATUS,
  TYPE,
} from '@/utils/datacube-util';
import Button from 'primevue/button';
import SelectButton from 'primevue/selectbutton';
import { getDatacubeById, getDatacubesByIds } from '@/services/datacube-service';
import { Datacube } from '@/types/Datacube';
import Dialog from 'primevue/dialog';
import Message from 'primevue/message';

// This is required because teleported components require their teleport destination to be mounted
//  before they can be rendered.
const isMounted = ref(false);
onMounted(() => {
  isMounted.value = true;
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

// NOTE: As of October 2023, "quantitative" analyses can contain any combination of models and
//  datasets(indicators), though the interface guides the user to create an analysis of one type
//  or the other. As a temporary measure, we store the type of the first datacube in each analysis
//  to sort the analyses into "collections of datasets" and "collections of models".
// If the analysis has no datacubes, don't set the flag.
const isFirstDatacubeAnIndicator = ref(false);
watch(analysisItems, async (items) => {
  if (items.length === 0) {
    return;
  }
  const firstDatacube = await getDatacubeById(getDatacubeId(items[0]));
  isFirstDatacubeAnIndicator.value = isIndicator(firstDatacube);
});

const openDataExplorer = () => {
  const filters = filtersUtil.newFilters();
  filtersUtil.setClause(filters, STATUS, ['READY'], 'or', false);
  const type = isFirstDatacubeAnIndicator.value ? 'indicator' : 'model';
  filtersUtil.setClause(filters, TYPE, [type], 'or', false);
  router.push({
    name: 'dataExplorer',
    query: { analysisId: analysisId.value, filters: filters as any },
  });
};

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

const hiddenDatacubeCount = computed(
  () => analysisItems.value.length - selectedAnalysisItems.value.length
);
const isHideDatacubePanelVisible = ref(false);

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

const metadataMap = ref<{ [datacubeId: string]: Partial<Datacube> }>({});
watchEffect(async () => {
  // Only fetch datacubes with necessary fields specified in `includes`
  const result = await getDatacubesByIds(_.uniq(analysisItems.value.map(getDatacubeId)), {
    includes: ['id', 'name', 'maintainer.organization', 'outputs.name', 'outputs.display_name'],
  });
  result.forEach((datacube) => (metadataMap.value[datacube.id] = datacube));
});

const getDisplayInfo = (item: AnalysisItem) => {
  const metadata = metadataMap.value[getDatacubeId(item)] ?? {};
  const outputDisplayName = getOutputDisplayNamesForBreakdownState(
    getState(item).breakdownState,
    metadata.outputs
  );
  return {
    outputDisplayName,
    source: metadata.name ?? '',
    organization: metadata.maintainer?.organization ?? '',
  };
};

const canSelectItem = computed(() => {
  return analysisItems.value.filter((item) => item.selected).length < MAX_ANALYSIS_DATACUBES_COUNT;
});
</script>

<style lang="scss" scoped>
@import '~styles/variables';

.comp-analysis-container {
  height: $content-full-height;
  display: flex;
  overflow: hidden;
  background: var(--p-surface-50);
}

main {
  display: flex;
  flex-direction: column;
  gap: 10px;
  flex: 1;
  min-width: 0;
  margin-right: 10px;
  padding: 20px;
}

.datacube-comparative-card:not(:first-child) {
  margin-top: 10px;
}

.column {
  margin: 10px 0;
  overflow-y: auto;
  height: 100%;
}

.card-maps-container {
  width: 100%;
  height: 100%;
  gap: 5px;
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(400px, 1fr));
  grid-auto-rows: 1fr;
}

.header-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 5px;
}

.hide-datacube-panel-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 10px 0;

  &:not(:first-of-type) {
    border-top: 1px solid var(--p-surface-100);
  }

  & > *:first-child {
    flex: 1;
    min-width: 0;
    display: flex;
    flex-direction: column;
  }
  & > *:last-child {
    width: 60px;
    flex-shrink: 0;
  }
}

.visible-datacubes {
  margin-top: 30px;
}

.font-size-small {
  font-size: $font-size-small;
}
</style>
