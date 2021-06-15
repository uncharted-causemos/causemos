<template>
  <div class="breakdown-pane-container">
    <aggregation-checklist-pane
      v-if="regionalData !== null && regionalData.length !== 0"
      class="checklist-section"
      :aggregation-level-count="availableAdminLevelTitles.length"
      :aggregation-level="selectedAdminLevel"
      :aggregation-level-title="availableAdminLevelTitles[selectedAdminLevel]"
      :ordered-aggregation-level-keys="ADMIN_LEVEL_KEYS"
      :raw-data="regionalData"
      :units="unit"
      :selected-scenario-ids="selectedScenarioIds"
      @aggregation-level-change="setSelectedAdminLevel"
    >
      <template #aggregation-description>
        <p class="aggregation-description">
          Showing data for
          <span class="highlighted">{{
            timestampFormatter(selectedTimestamp)
          }}</span
          >.
        </p>
        <p class="aggregation-description">
          Aggregated by
          <strong>{{
            selectedSpatialAggregation === ''
              ? 'mean'
              : selectedSpatialAggregation
          }}</strong
          >.
        </p>
      </template>
    </aggregation-checklist-pane>
    <!-- TODO: dropdown to select what we're breaking down by -->
    <aggregation-checklist-pane
      class="checklist-section"
      v-for="type in visibleTypeBreakdownData"
      :key="type.name"
      :aggregation-level-count="1"
      :aggregation-level="1"
      :aggregation-level-title="type.name"
      :ordered-aggregation-level-keys="['Total', type.name]"
      :raw-data="type.data"
      :selected-scenario-ids="selectedScenarioIds"
      :units="unit"
    >
      <template #aggregation-description>
        <!-- TODO: highlighted value should be dynamically populated based
        on the selected timestamp -->
        <p class="aggregation-description">
          Showing <strong>placeholder</strong> data.
        </p>
        <p class="aggregation-description">
          Aggregated by <strong>sum</strong>.
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
import { computed, defineComponent, PropType, toRefs } from 'vue';
import aggregationChecklistPane from '@/components/drilldown-panel/aggregation-checklist-pane.vue';
import dateFormatter from '@/formatters/date-formatter';
import { BreakdownData, NamedBreakdownData } from '@/types/Datacubes';
import { ADMIN_LEVEL_TITLES, ADMIN_LEVEL_KEYS } from '@/utils/admin-level-util';

function timestampFormatter(timestamp: number) {
  // FIXME: we need to decide whether we want our timestamps to be stored in millis or seconds
  //  and be consistent.
  return dateFormatter(timestamp * 1000, 'MMM DD, YYYY');
}

export default defineComponent({
  components: { aggregationChecklistPane },
  name: 'BreakdownPane',
  props: {
    selectedAdminLevel: {
      type: Number,
      required: true
    },
    typeBreakdownData: {
      type: Array as PropType<NamedBreakdownData[]>,
      default: () => []
    },
    selectedTimestamp: {
      type: Number as PropType<number | null>,
      default: null
    },
    selectedSpatialAggregation: {
      type: String as PropType<string | null>,
      default: 'mean'
    },
    unit: {
      type: String as PropType<string>,
      default: null
    },
    regionalData: {
      type: Object as PropType<BreakdownData | null>,
      default: null
    },
    selectedScenarioIds: {
      type: Array as PropType<string[]>,
      default: []
    }
  },
  emits: ['set-selected-admin-level'],
  setup(props, { emit }) {
    const { regionalData } = toRefs(props);
    function setSelectedAdminLevel(level: number) {
      emit('set-selected-admin-level', level);
    }

    const availableAdminLevelTitles = computed(() => {
      if (regionalData.value === null) return [];
      const adminLevelCount = Object.keys(regionalData.value).length;
      return ADMIN_LEVEL_KEYS.slice(0, adminLevelCount).map(
        adminLevel => ADMIN_LEVEL_TITLES[adminLevel]
      );
    });

    return {
      setSelectedAdminLevel,
      availableAdminLevelTitles,
      timestampFormatter,
      ADMIN_LEVEL_KEYS
    };
  },
  computed: {
    visibleTypeBreakdownData(): NamedBreakdownData[] {
      // HACK: Filter out any breakdown parameters that duplicate
      //  an admin level, since they will already be shown in the
      //  standard admin level breakdown above.
      // Eventually we will need to disallow models from including
      //  admin regions as parameters, but this will require some
      //  thought since some models (e.g. MaxHop) require the user
      //  to request data for a specific admin region.
      return this.typeBreakdownData.filter(breakdownParameter => {
        const isAdminLevelDuplicate = (ADMIN_LEVEL_KEYS as string[]).includes(
          breakdownParameter.name
        );
        return !isAdminLevelDuplicate;
      });
    }
  }
});
</script>

<style lang="scss" scoped>
@import '~styles/variables';

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
