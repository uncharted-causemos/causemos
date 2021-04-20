<template>
  <div class="breakdown-pane-container">
    <!-- TODO: dropdown to select what we're breaking down by -->
    <!-- TODO: Fetch units from model metadata `outputs` property -->
    <aggregation-checklist-pane
      class="checklist-section"
      v-for="type in typeBreakdownData"
      :key="type.name"
      :aggregation-level-count="1"
      :aggregation-level="1"
      :aggregation-level-title="type.name"
      :raw-data="type.data"
      :units="'tonnes'"
    >
      <template #aggregation-description>
        <!-- TODO: highlighted value should be dynamically populated based
        on the selected timestamp -->
        <p class="aggregation-description">
          Showing data for <span class="highlighted">2019</span>.
        </p>
        <p class="aggregation-description">
          Aggregated by <strong>averaging</strong>.
        </p>
      </template>
    </aggregation-checklist-pane>
    <aggregation-checklist-pane
      class="checklist-section"
      :aggregation-level-count="availableAdminLevelTitles.length"
      :aggregation-level="selectedAdminLevel"
      :aggregation-level-title="availableAdminLevelTitles[selectedAdminLevel]"
      :raw-data="adminLevelData"
      :units="'tonnes'"
      @aggregation-level-change="setSelectedAdminLevel"
    >
      <template #aggregation-description>
        <p class="aggregation-description">
          Showing data for <span class="highlighted">2019</span>.
        </p>
        <p class="aggregation-description">
          Aggregated by <strong>averaging</strong>.
        </p>
      </template>
    </aggregation-checklist-pane>
    <!-- <aggregation-checklist-pane
      :aggregation-level-count="aggregationLevels.length"
      :aggregation-level="selectedAdminLevel"
      :aggregation-level-title="'year'"
      :raw-data="adminLevelData"
      @aggregation-level-change="setSelectedAdminLevel"
    >
      <template #subtitle>
        <span>Showing data across <strong>all time</strong>.</span>
      </template>
    </aggregation-checklist-pane> -->
  </div>
</template>

<script lang="ts">
import { defineComponent, PropType } from 'vue';
import aggregationChecklistPane from '@/components/drilldown-panel/aggregation-checklist-pane.vue';
import ADMIN_LEVEL_DATA from '@/assets/admin-stats.js';

const ADMIN_LEVEL_TITLES = {
  country: 'Country',
  admin1: 'L1 admin region',
  admin2: 'L2 admin region',
  admin3: 'L3 admin region',
  admin4: 'L4 admin region',
  admin5: 'L5 admin region'
};

export default defineComponent({
  components: { aggregationChecklistPane },
  name: 'BreakdownPane',
  props: {
    selectedAdminLevel: {
      type: Number,
      required: true
    },
    selectedModelId: {
      type: String,
      default: null
    },
    selectedScenarioIds: {
      type: Array as PropType<string[]>,
      default: null
    },
    typeBreakdownData: {
      type: Array,
      default: () => []
    }
  },
  emits: ['set-selected-admin-level'],
  setup(props, { emit }) {
    function setSelectedAdminLevel(level: number) {
      emit('set-selected-admin-level', level);
    }
    // TODO: fetch regional-data for selected model and scenario
    // TODO: calculate available admin levels
    // availableAdminLevels is an array of strings, each of which
    //  must be a key in the ADMIN_LEVEL_TITLES map
    const availableAdminLevels = [] as (keyof typeof ADMIN_LEVEL_TITLES)[]; // Object.keys(result);
    const availableAdminLevelTitles = availableAdminLevels.map(
      adminLevel => ADMIN_LEVEL_TITLES[adminLevel]
    );
    return {
      setSelectedAdminLevel,
      availableAdminLevelTitles,
      adminLevelData: ADMIN_LEVEL_DATA,
      // TODO: eventually we'll add support for multiple
      //  selected scenario IDs
      selectedScenarioId: props.selectedScenarioIds[0]
    };
  }
});
</script>

<style lang="scss" scoped>
@import '~styles/_variables';

.aggregation-description {
  color: $text-color-medium;
  margin: 0;
  text-align: right;
}

.highlighted {
  color: $selected-dark;
}

.checklist-section {
  margin-top: 30px;
}
</style>
