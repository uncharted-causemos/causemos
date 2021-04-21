<template>
  <div class="comp-analysis-experiment-container">
    <button class="search-button btn btn-primary btn-call-for-action" disabled>
      Search datacubes
    </button>
    <main>
    <!-- TODO: whether a card is actually expanded or not will
    be dynamic later -->
    <datacube-card
      :class="{ 'datacube-expanded': true }"
      :selected-admin-level="selectedAdminLevel"
      :selected-model-id="selectedModelId"
      :all-scenario-ids="allScenarioIds"
      :selected-scenario-ids="selectedScenarioIds"
      :selected-timestamp="selectedTimestamp"
      @set-selected-scenario-ids="setSelectedScenarioIds"
      @select-timestamp="setSelectedTimestamp"
    />
    <drilldown-panel
        class="drilldown"
        :is-open="activeDrilldownTab !== null"
        :tabs="drilldownTabs"
        :active-tab-id="activeDrilldownTab"
      >
        <template #content>
          <breakdown-pane
            v-if="activeDrilldownTab ==='breakdown'"
            :selected-admin-level="selectedAdminLevel"
            :type-breakdown-data="typeBreakdownData"
            :selected-model-id="selectedModelId"
            :selected-scenario-ids="selectedScenarioIds"
            :selected-timestamp="selectedTimestamp"
            @set-selected-admin-level="setSelectedAdminLevel"
          />
        </template>
    </drilldown-panel>
    </main>
  </div>
</template>

<script lang="ts">
import DatacubeCard from '@/components/data/datacube-card.vue';
import DrilldownPanel from '@/components/drilldown-panel.vue';
import { AGGREGATED_PRODUCT_TYPE_DATA } from '@/assets/admin-stats.js';
import DSSAT_PRODUCTION_DATA from '@/assets/DSSAT-production.js';
import { defineComponent, ref } from 'vue';
import BreakdownPane from '@/components/drilldown-panel/breakdown-pane.vue';

const DRILLDOWN_TABS = [
  {
    name: 'Breakdown',
    id: 'breakdown',
    // TODO: our version of FA doesn't include fa-chart
    icon: 'fa-question'
  }
];

export default defineComponent({
  name: 'CompAnalysisExperiment',
  components: { DatacubeCard, DrilldownPanel, BreakdownPane },
  setup() {
    const selectedAdminLevel = ref(0);
    function setSelectedAdminLevel(newValue: number) {
      selectedAdminLevel.value = newValue;
    }

    const typeBreakdownData = [
      AGGREGATED_PRODUCT_TYPE_DATA
    ];

    const allScenarioIds = DSSAT_PRODUCTION_DATA.scenarioIds;
    // TODO: select baseline by default, not necessarily the first one
    const selectedScenarioIds = ref([allScenarioIds[0]]);
    function setSelectedScenarioIds(newIds: string[]) {
      selectedScenarioIds.value = newIds;
    }

    const selectedTimestamp = ref(0);
    function setSelectedTimestamp(value: number) {
      selectedTimestamp.value = value;
    }

    return {
      drilldownTabs: DRILLDOWN_TABS,
      activeDrilldownTab: 'breakdown',
      selectedAdminLevel,
      setSelectedAdminLevel,
      selectedModelId: DSSAT_PRODUCTION_DATA.modelId,
      allScenarioIds,
      selectedScenarioIds,
      setSelectedScenarioIds,
      typeBreakdownData,
      selectedTimestamp,
      setSelectedTimestamp
    };
  }
});
</script>

<style lang="scss" scoped>
@import '~styles/variables';
.comp-analysis-experiment-container {
  height: $content-full-height;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

main {
  flex: 1;
  display: flex;
  min-height: 0;
}

.datacube-expanded {
  min-width: 0;
  flex: 1;
  margin: 10px;
  margin-top: 0;
}

.search-button {
  align-self: center;
  margin: 10px 0;
}
</style>
