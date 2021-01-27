<template>
  <div class="data-view-container flex">
    <div class="main-content flex-grow-1 flex-col">
      <action-bar />
      <div class="analysis-content flex-grow-1 flex h-0">
        <analysis-side-panel v-if="analysisItems.length && mapReady" />
        <data-analysis
          v-if="analysisItems.length && mapReady"
          :fullscreen-card-id="fullscreenCardId"
          @set-card-fullscreen="setCardFullscreen"
        />
        <div
          v-else
          class="helper"
        >
          <empty-state-instructions />
        </div>
      </div>
    </div>
    <drilldown-panel
      class="drilldown"
      :is-open="fullscreenCardId !== null"
      :tabs="drilldownTabs"
      :active-tab-id="activeDrilldownTab"
      @tab-click="onTabClick"
      @close="exitFullscreenMode"
    >
      <div slot="content">
        <datacube-metadata-pane
          v-if="activeDrilldownTab === 'metadata'"
          :fullscreen-card-id="fullscreenCardId"
        />
        <!-- Aggregation Pane -->
        <aggregation-checklist-pane
          v-if="activeDrilldownTab ==='adminData'"
          :aggregation-level-count="aggregationLevels.length"
          :aggregation-level="aggregationLevel"
          :aggregation-level-type="'Admin level'"
          :aggregation-level-title="aggregationLevels[aggregationLevel]"
          :raw-data="adminLevelData"
          @aggregation-level-change="(newVal) => { aggregationLevel = newVal }"
        />
      </div>
    </drilldown-panel>
  </div>
</template>

<script>
import { mapGetters } from 'vuex';

import ActionBar from '@/components/data/action-bar';
import DataAnalysis from '@/components/data/analysis';
import DrilldownPanel from '@/components/drilldown-panel';
import EmptyStateInstructions from '@/components/empty-state-instructions';
import { enableConcurrentTileRequestsCaching, disableConcurrentTileRequestsCaching } from '@/utils/map-utils';
import AnalysisSidePanel from '@/components/data/analysis-side-panel';
import AggregationChecklistPane from '@/components/drilldown-panel/aggregation-checklist-pane.vue';
import ADMIN_LEVEL_DATA from '@/assets/admin-stats.js';
import DatacubeMetadataPane from '../components/drilldown-panel/datacube-metadata-pane.vue';

const ALL_DRILLDOWN_TABS = {
  metadata: {
    name: 'Metadata',
    id: 'metadata',
    icon: 'fa-info'
  },
  adminData: {
    // TODO: can we dynamically display the selected time slice in the header
    name: 'Data by Region',
    id: 'adminData',
    // TODO: our version of FA doesn't include fa-chart
    icon: 'fa-question'
  }
};

export default {
  name: 'DataView',
  components: {
    ActionBar,
    DataAnalysis,
    DrilldownPanel,
    EmptyStateInstructions,
    AnalysisSidePanel,
    AggregationChecklistPane,
    DatacubeMetadataPane
  },
  data: () => ({
    mapReady: false,
    fullscreenCardId: null,
    activeDrilldownTab: ALL_DRILLDOWN_TABS.metadata.id,
    aggregationLevel: 1,
    adminLevelData: ADMIN_LEVEL_DATA.data
  }),
  computed: {
    ...mapGetters({
      analysisItems: 'dataAnalysis/analysisItems'
    }),
    drilldownTabs() {
      // TODO: only show the adminData pane for the models that we've
      //  generated admin level data for
      // if (true) {
      return [ALL_DRILLDOWN_TABS.metadata, ALL_DRILLDOWN_TABS.adminData];
      // }
      // return [ALL_DRILLDOWN_TABS.metadata];
    },
    aggregationLevels() {
      return ['Country', 'L1', 'L2', 'L3', 'L4', 'L5'].slice(0, ADMIN_LEVEL_DATA.maxDepth);
    }
  },
  watch: {
    analysisItems(n, o) {
      const newLength = n.length;
      const oldLength = o.length;
      if (newLength === 1 && oldLength !== 1) {
        // Just added our first card or removed our second-last card,
        //  so fullscreen our only card
        this.setCardFullscreen(n[0].id);
        return;
      }
      if (oldLength === 1 && newLength !== 1) {
        // Just removed our last card or added a second card
        //  so exit fullscreen
        this.exitFullscreenMode();
        return;
      }
      if (n.find(item => item.id === this.fullscreenCardId) === undefined) {
        // Card that was previously fullscreen has been removed
        this.exitFullscreenMode();
      }
    }
  },
  created() {
    enableConcurrentTileRequestsCaching().then(() => (this.mapReady = true));
  },
  destroyed() {
    disableConcurrentTileRequestsCaching();
  },
  methods: {
    setCardFullscreen(id) {
      this.fullscreenCardId = id;
    },
    exitFullscreenMode() {
      this.fullscreenCardId = null;
    },
    onTabClick(newTabId) {
      this.activeDrilldownTab = newTabId;
    }
  }
};
</script>

<style lang="scss" scoped>
@import "~styles/variables";

.data-view-container {
  height: $content-full-height;
  background: $background-light-2;
  box-sizing: border-box;
  overflow: hidden;
  display: flex;

  .helper {
    width: 100%;
    position: relative;
  }
}

.main-content {
  min-width: 0;
}

// TODO: apply these transition animations to the drilldown panel
//  across views, and extract these default transition values for reuse
//  in analysis.vue and elsewhere
$fullscreenTransition: .5s ease-in-out;

.drilldown {
  transition: all $fullscreenTransition;

  /deep/ .close-button {
    transition: opacity $fullscreenTransition;
  }

  &.closed {
    display: block;
    width: 0;
    padding: 0;

    /deep/ .close-button {
      opacity: 0;
      pointer-events: none;
    }
  }

}
</style>
