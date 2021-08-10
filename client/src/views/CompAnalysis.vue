<template>
  <div class="comp-analysis-container">
    <action-bar />
    <main>
    <analytical-questions-and-insights-panel />
    <div class="flex-row insight-capture">
      <div class="column" v-if="analysisItems.length">
        <datacube-comparative-card
          v-for="item in analysisItems"
          :key="item.id"
          class="datacube-comparative-card"
          :class="{ 'selected': selectedDatacubeId === item.id }"
          :datacubeId="item.datacubeId"
          :id="item.id"
          :isSelected="selectedDatacubeId === item.datacubeId"
          :selected-timestamp="selectedTimestamp"
          :selected-timestamp-range="selectedTimestampRange"
          @click="selectedDatacubeId = item.datacubeId"
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
    </div>
    </main>
  </div>
</template>

<script lang="ts">
import { computed, defineComponent, Ref, ref, watch, watchEffect } from 'vue';
import { mapActions, mapGetters, useStore } from 'vuex';
import DatacubeComparativeCard from '@/components/widgets/datacube-comparative-card.vue';
import ActionBar from '@/components/data/action-bar.vue';
import EmptyStateInstructions from '@/components/empty-state-instructions.vue';
import AnalyticalQuestionsAndInsightsPanel from '@/components/analytical-questions/analytical-questions-and-insights-panel.vue';
import { Timeseries } from '@/types/Timeseries';
import DatacubeComparativeTimelineSync from '@/components/widgets/datacube-comparative-timeline-sync.vue';
import _ from 'lodash';

export default defineComponent({
  name: 'CompAnalysis',
  components: {
    DatacubeComparativeCard,
    ActionBar,
    EmptyStateInstructions,
    AnalyticalQuestionsAndInsightsPanel,
    DatacubeComparativeTimelineSync
  },
  setup() {
    const store = useStore();
    const analysisItems = computed(() => store.getters['dataAnalysis/analysisItems']);
    const timeSelectionSyncing = computed(() => store.getters['dataAnalysis/timeSelectionSyncing']);

    const selectedDatacubeId = ref('');

    watchEffect(() => {
      if (analysisItems.value && analysisItems.value.length > 0) {
        // @FIXME: select first one by default
        selectedDatacubeId.value = analysisItems.value[0].id;

        // set context-ids to fetch insights correctly for all datacubes in this analysis
        const contextIDs = analysisItems.value.map((dc: any) => dc.id);
        store.dispatch('insightPanel/setContextId', contextIDs);
      }
    });

    const allTimeseriesMap: {[key: string]: Timeseries[]} = {};
    const globalTimeseries = ref([]) as Ref<Timeseries[]>;
    const reCalculateGlobalTimeseries = ref(true);

    const selectedTimestamp = ref(null) as Ref<number | null>;
    const selectedTimestampRange = ref(null) as Ref<{timestamp1: number; timestamp2: number} | null>;

    const initialSelectedTimestamp = ref(0) as Ref<number>;
    const initialSelectedTimestampRange = ref({}) as Ref<{timestamp1: number; timestamp2: number}>;

    const setSelectedTimestamp = (value: number) => {
      if (selectedTimestamp.value === value || timeSelectionSyncing.value === false) return;
      selectedTimestamp.value = value;
    };

    const handleTimestampRangeSelection = (newTimestampRange: {timestamp1: number; timestamp2: number}) => {
      // we should pass the incoming (global) range to all datacube-comparative-card components
      //  so that they may zoom accordingly
      if (!timeSelectionSyncing.value) {
        // if time-sync is disabled do nothing
        return;
      }
      if (selectedTimestampRange.value?.timestamp1 === newTimestampRange.timestamp1 &&
        selectedTimestampRange.value?.timestamp2 === newTimestampRange.timestamp2) {
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
      selectedDatacubeId,
      analysisItems,
      allTimeseriesMap,
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
  unmounted(): void {
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
      hideInsightPanel: 'insightPanel/hideInsightPanel'
    }),
    onLoadedTimeseries(timeseriesInfo: {datacubeId: string; timeseriesList: Timeseries[]}) {
      // we should only set the global timeseries one time
      //  once all individual datacubes' timeseries have been loaded
      if (!this.reCalculateGlobalTimeseries) return;

      // save the incoming timeseries in the map object where all timeseries lists will be saved
      this.allTimeseriesMap[timeseriesInfo.datacubeId] = timeseriesInfo.timeseriesList;
      //
      // calculate (the global timeseries)
      //
      if (this.analysisItems.length === Object.keys(this.allTimeseriesMap).length) {
        this.reCalculateGlobalTimeseries = false;
        // all time series data for all datacubes have been loaded
        const flatMap: Array<Timeseries[]> = [];
        Object.keys(this.allTimeseriesMap).forEach(key => {
          const timeseriesList: Timeseries[] = this.allTimeseriesMap[key];
          flatMap.push(timeseriesList);
        });

        // set timeseries data
        this.globalTimeseries = flatMap.flat();
        // also, set the initial global selectedTimestamp and range
        // /*
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
            const newTimestampRange = { timestamp1: firstTimestamp, timestamp2: lastTimestamp };
            // this.handleTimestampRangeSelection(newTimestampRange);
            this.initialSelectedTimestampRange = newTimestampRange;
          }
        }
        // */
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
  flex-direction: column;
  overflow: hidden;
}

.flex-row {
  display: flex;
  flex: 1;
  min-height: 0;
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
}

main {
  flex: 1;
  display: flex;
  min-height: 0;
}

.datacube-comparative-timeline-sync {
  background-color: rgb(235, 235, 235);
}

.column {
  overflow-y: auto;

  .datacube-comparative-card {
    border-style: solid;
    border-color: transparent;
    border-width: thin;
    margin: 1rem;
    &:hover {
      border-color: blue;
    }
  }
  .selected {
    border-color: black;
  }
}

</style>
