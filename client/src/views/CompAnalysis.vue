<template>
  <div class="comp-analysis-container">
    <navbar-new
      :show-help-button="true"
    />
    <teleport to="#navbar-trailing-teleport-destination">
      <analysis-options-button />
    </teleport>
    <div class="flex-row">
      <analytical-questions-and-insights-panel class="side-panel" />
      <main>
        <action-bar />
        <div class="column insight-capture" v-if="analysisItems.length">
          <datacube-comparative-card
            v-for="item in analysisItems"
            :key="item.id"
            class="datacube-comparative-card"
            :id="item.id"
            :selected-timestamp="selectedTimestamp"
            :selected-timestamp-range="selectedTimestampRange"
            @loaded-timeseries="onLoadedTimeseries"
          />
        </div>
        <empty-state-instructions v-else />
        <datacube-comparative-timeline-sync
          v-if="globalTimeseries.length > 0 && timeSelectionSyncing"
          class="datacube-comparative-timeline-sync"
          :timeseriesData="globalTimeseries"
          :selected-timestamp="selectedTimestamp"
          @select-timestamp="setSelectedTimestamp"
          @select-timestamp-range="handleTimestampRangeSelection"
        />
      </main>
    </div>
  </div>
</template>

<script lang="ts">
import { computed, defineComponent, onMounted, Ref, ref, watch, watchEffect } from 'vue';
import { mapActions, mapGetters, useStore } from 'vuex';
import DatacubeComparativeCard from '@/components/widgets/datacube-comparative-card.vue';
import ActionBar from '@/components/data/action-bar.vue';
import EmptyStateInstructions from '@/components/empty-state-instructions.vue';
import AnalyticalQuestionsAndInsightsPanel from '@/components/analytical-questions/analytical-questions-and-insights-panel.vue';
import { Timeseries } from '@/types/Timeseries';
import DatacubeComparativeTimelineSync from '@/components/widgets/datacube-comparative-timeline-sync.vue';
import _ from 'lodash';
import { DataState } from '@/types/Insight';
import NavbarNew from '@/components/navbar-new.vue';
import AnalysisOptionsButton from '@/components/data/analysis-options-button.vue';
import { getAnalysis } from '@/services/analysis-service';

export default defineComponent({
  name: 'CompAnalysis',
  components: {
    DatacubeComparativeCard,
    ActionBar,
    EmptyStateInstructions,
    AnalyticalQuestionsAndInsightsPanel,
    DatacubeComparativeTimelineSync,
    NavbarNew,
    AnalysisOptionsButton
  },
  setup() {
    const store = useStore();
    const analysisItems = computed(() => store.getters['dataAnalysis/analysisItems']);
    const timeSelectionSyncing = computed(() => store.getters['dataAnalysis/timeSelectionSyncing']);
    const quantitativeAnalysisId = computed(
      () => store.getters['dataAnalysis/analysisId']
    );

    onMounted(async () => {
      store.dispatch('app/setAnalysisName', '');
      const result = await getAnalysis(quantitativeAnalysisId.value);
      store.dispatch('app/setAnalysisName', result.title);
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

    const selectedTimestamp = ref(null) as Ref<number | null>;
    const selectedTimestampRange = ref(null) as Ref<{start: number; end: number} | null>;

    const initialSelectedTimestamp = ref(0);
    const initialSelectedTimestampRange = ref({}) as Ref<{start: number; end: number}>;

    const setSelectedTimestamp = (value: number) => {
      if (selectedTimestamp.value === value || timeSelectionSyncing.value === false) return;
      selectedTimestamp.value = value;
    };

    const handleTimestampRangeSelection = (newTimestampRange: {start: number; end: number}) => {
      // we should pass the incoming (global) range to all datacube-comparative-card components
      //  so that they may zoom accordingly
      if (!timeSelectionSyncing.value) {
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
      () => timeSelectionSyncing.value,
      timeSelectionSyncing => {
        if (timeSelectionSyncing === false) {
          selectedTimestampRange.value = null;
          selectedTimestamp.value = null;
        } else {
          setSelectedTimestamp(initialSelectedTimestamp.value);
          handleTimestampRangeSelection(initialSelectedTimestampRange.value);
        }
      }
    );

    return {
      analysisItems,
      allTimeseriesMap,
      allDatacubesMetadataMap,
      globalTimeseries,
      selectedTimestamp,
      setSelectedTimestamp,
      handleTimestampRangeSelection,
      selectedTimestampRange,
      reCalculateGlobalTimeseries,
      initialSelectedTimestamp,
      initialSelectedTimestampRange,
      timeSelectionSyncing
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
  methods: {
    ...mapActions({
      hideInsightPanel: 'insightPanel/hideInsightPanel',
      setDataState: 'insightPanel/setDataState'
    }),
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
          regions.push(...this.allDatacubesMetadataMap[key].region);
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
  height: 100vh;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.flex-row {
  flex: 1;
  display: flex;
  min-height: 0;
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

.column {
  margin: 10px 0;
  overflow-y: auto;
  padding-bottom: 80px;
}

</style>
