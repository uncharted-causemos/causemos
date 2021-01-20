<template>
  <div class="data-view-container flex">
    <div class="main-content flex-grow-1 flex-col">
      <action-bar />
      <div class="analysis-content flex-grow-1 flex h-0">
        <analysis-side-panel v-if="analysisItems.length && mapReady" />
        <data-analysis
          v-if="analysisItems.length && mapReady"
          :is-focused-card-fullscreen="isFocusedCardFullscreen"
          @setFocusedCardFullscreen="setFocusedCardFullscreen"
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
      :is-open="isFocusedCardFullscreen"
      :tabs="drilldownTabs"
      :active-tab-id="activeDrilldownTab"
      @tab-click="onTabClick"
      @close="setFocusedCardFullscreen(false)"
    >
      <div slot="content">
        <!-- Metadata Pane -->
        <div
          v-if="activeDrilldownTab ==='metadata' && isFetchingMetadata"
          class="pane-loading-message"
        >
          <i class="fa fa-spin fa-spinner pane-loading-icon" /><span>Loading metadata...</span>
        </div>
        <div
          v-else-if="activeDrilldownTab ==='metadata' && focusedCardMetadata === null"
          class="pane-loading-message"
        >
          <span>Error loading metadata. Please try again.</span>
        </div>
        <div v-else-if="activeDrilldownTab ==='metadata'">
          <h5><strong>{{ focusedCardMetadata.name }}</strong> ({{ focusedCardMetadata.units }})</h5>
          <p
            v-for="(period, index) of focusedCardMetadata.period"
            :key="index"
          >
            <em>{{ Number.parseInt(period.gte) | date-formatter('MMM YYYY') }}</em>
            -
            <em>{{ Number.parseInt(period.lte) | date-formatter('MMM YYYY') }}</em>
          </p>
          <p>{{ focusedCardMetadata.description }}</p>
          <p><strong>Source: </strong>{{ focusedCardMetadata.source }}</p>
          <p><strong>Model: </strong>{{ focusedCardMetadata.modelName }}</p>
          <p>{{ focusedCardMetadata.modelDescription }}</p>
          <strong v-if="focusedCardMetadata.parameters.length > 0">Parameters:</strong>
          <ul
            v-if="focusedCardMetadata.parameters.length > 0"
            class="parameter-metadata"
          >
            <li
              v-for="(parameter, index) of focusedCardMetadata.parameters"
              :key="index"
            >
              <strong>{{ parameter.name }}</strong>: {{ parameter.description }}
            </li>
          </ul>
        </div>

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
import _ from 'lodash';

import { getDatacubeById } from '@/services/datacube-service';
import ActionBar from '@/components/data/action-bar';
import DataAnalysis from '@/components/data/analysis';
import DrilldownPanel from '@/components/drilldown-panel';
import EmptyStateInstructions from '@/components/empty-state-instructions';
import { enableConcurrentTileRequestsCaching, disableConcurrentTileRequestsCaching } from '@/utils/map-utils';
import AnalysisSidePanel from '@/components/data/analysis-side-panel';
import AggregationChecklistPane from '@/components/drilldown-panel/aggregation-checklist-pane.vue';
import ADMIN_LEVEL_DATA from '@/assets/admin-stats.js';

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
    AggregationChecklistPane
  },
  data: () => ({
    mapReady: false,
    isFocusedCardFullscreen: false,
    isFetchingMetadata: false,
    focusedCardMetadata: null,
    activeDrilldownTab: ALL_DRILLDOWN_TABS.metadata.id,
    aggregationLevel: 1,
    adminLevelData: ADMIN_LEVEL_DATA.data
  }),
  computed: {
    ...mapGetters({
      analysisItems: 'dataAnalysis/analysisItems',
      focusedItem: 'dataAnalysis/focusedItem'
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
    isFocusedCardFullscreen(isFullscreen, wasFullscreen) {
      if (isFullscreen && !wasFullscreen) {
        this.fetchMetadata(this.focusedItem.id);
      }
    },
    analysisItems(n, o) {
      const newLength = n.length;
      const oldLength = o.length;
      if (newLength === 1 && oldLength !== 1) {
        // Just added our first card or removed our second-last card,
        //  so fullscreen our only card
        this.setFocusedCardFullscreen(true);
        return;
      }
      if (oldLength === 1 && newLength !== 1) {
        // Just removed our last card or added a second card
        //  so exit fullscreen
        this.setFocusedCardFullscreen(false);
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
    setFocusedCardFullscreen(newValue) {
      this.isFocusedCardFullscreen = newValue;
    },
    async fetchMetadata(itemId) {
      this.isFetchingMetadata = true;
      this.focusedCardMetadata = this.parseRawMetadata(await getDatacubeById(itemId)) || null;
      this.isFetchingMetadata = false;
    },
    parseRawMetadata(raw) {
      const parameters = [];
      if (
        _.isArray(raw.parameters) &&
        _.isArray(raw.parameter_descriptions) &&
        raw.parameters.length === raw.parameter_descriptions.length
      ) {
        raw.parameters.forEach((parameter, index) => {
          parameters.push({ name: parameter, description: raw.parameter_descriptions[index] });
        });
      }
      return {
        name: raw.output_name,
        description: raw.output_description,
        units: raw.output_units,
        source: raw.source,
        modelName: raw.label,
        modelDescription: raw.model_description,
        period: raw.period,
        parameters
        // TODO: aggregation method
        // TODO: periodicity
        // TODO: limitations
        // TODO: statistical concept and methodology
      };
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

.parameter-metadata {
  padding-inline-start: 20px;
}
</style>
