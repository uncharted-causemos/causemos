<template>
  <div class="comp-analysis-experiment-container">
    <button class="search-button btn btn-primary btn-call-for-action" disabled>
      Search datacubes
    </button>
    <main>
    <!-- TODO: whether a card is actually expanded or not will
    be dynamic later -->
    <!-- TODO: we'll need to store the admin level data for each card
    in this component and pass it down -->
    <datacube-card
      :class="{ 'datacube-expanded': true }"
      :selected-admin-level="selectedAdminLevel"
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
            :admin-level-data="adminLevelData"
            :available-admin-levels="availableAdminLevels"
            :type-breakdown-data="typeBreakdownData"
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
import ADMIN_LEVEL_DATA, { AGGREGATED_PRODUCT_TYPE_DATA } from '@/assets/admin-stats.js';
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
    const availableAdminLevels = [
      'Country',
      'L1 admin region',
      'L2 admin region',
      'L3 admin region',
      'L4 admin region',
      'L5 admin region'
    ].slice(0, ADMIN_LEVEL_DATA.maxDepth);

    const typeBreakdownData = [
      AGGREGATED_PRODUCT_TYPE_DATA
    ];
    return {
      drilldownTabs: DRILLDOWN_TABS,
      activeDrilldownTab: 'breakdown',
      adminLevelData: ADMIN_LEVEL_DATA.data,
      selectedAdminLevel,
      setSelectedAdminLevel,
      availableAdminLevels,
      typeBreakdownData
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
