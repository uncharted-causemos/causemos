<template>
  <div class="breakdown-pane-container">
    <aggregation-checklist-pane
      v-if="regionalData.length !== 0"
      class="checklist-section"
      :aggregation-level-count="availableAdminLevelTitles.length"
      :aggregation-level="selectedAdminLevel"
      :aggregation-level-title="availableAdminLevelTitles[selectedAdminLevel]"
      :ordered-aggregation-level-keys="ADMIN_LEVEL_KEYS"
      :raw-data="regionalData"
      :units="unit"
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
import _ from 'lodash';
import {
  computed,
  defineComponent,
  PropType,
  ref,
  toRefs,
  watchEffect
} from 'vue';
import aggregationChecklistPane from '@/components/drilldown-panel/aggregation-checklist-pane.vue';
import dateFormatter from '@/formatters/date-formatter';
import API from '@/api/api';
import { BreakdownData, NamedBreakdownData } from '@/types/Datacubes';
import { ADMIN_LEVEL_TITLES, ADMIN_LEVEL_KEYS } from '@/utils/admin-level-util';
import { Model } from '@/types/Datacube';

function timestampFormatter(timestamp: number) {
  return dateFormatter(timestamp, 'MMM DD, YYYY');
}

export default defineComponent({
  components: { aggregationChecklistPane },
  name: 'BreakdownPane',
  props: {
    selectedAdminLevel: {
      type: Number,
      required: true
    },
    metadata: {
      type: Object as PropType<Model>,
      default: null
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
      type: Array as PropType<NamedBreakdownData[]>,
      default: () => []
    },
    selectedTimestamp: {
      type: Number,
      default: null
    },
    selectedTemporalResolution: {
      type: String as PropType<string>,
      default: 'month'
    },
    selectedTemporalAggregation: {
      type: String as PropType<string>,
      default: 'mean'
    },
    selectedSpatialAggregation: {
      type: String as PropType<string>,
      default: 'mean'
    },
    unit: {
      type: String as PropType<string>,
      default: null
    }
  },
  emits: ['set-selected-admin-level'],
  setup(props, { emit }) {
    const {
      selectedModelId,
      selectedScenarioIds,
      selectedTimestamp,
      metadata,
      selectedTemporalResolution,
      selectedTemporalAggregation,
      selectedSpatialAggregation
    } = toRefs(props);
    function setSelectedAdminLevel(level: number) {
      emit('set-selected-admin-level', level);
    }

    // Fetch regional-data for selected model and scenarios
    // FIXME: this code contains a race condition if the selected model or
    //  scenario IDs were to change quickly and the promise sets completed
    //  out of order.
    const regionalData = ref<BreakdownData[]>([]);
    watchEffect(async () => {
      regionalData.value = [];
      if (
        selectedModelId.value === null ||
        selectedScenarioIds.value.length === 0 ||
        selectedTimestamp.value === null
      ) {
        return;
      }
      const spatialAggregation =
        selectedSpatialAggregation.value === ''
          ? 'mean'
          : selectedSpatialAggregation.value;
      const promises = selectedScenarioIds.value.map(scenarioId =>
        API.get('/maas/output/regional-data', {
          params: {
            model_id: selectedModelId.value,
            run_id: scenarioId,
            feature: metadata.value.outputs[0].name,
            resolution: selectedTemporalResolution.value,
            temporal_agg: selectedTemporalAggregation.value,
            spatial_agg: spatialAggregation,
            timestamp: selectedTimestamp.value
          }
        })
      );
      const allRegionalData = (await Promise.all(promises)).map(response => {
        const data = response.data;
        return _.isEmpty(data) ? {} : data;
      });
      if (_.some(allRegionalData, response => _.isEmpty(response))) {
        return;
      }
      regionalData.value = allRegionalData;
    });

    const availableAdminLevelTitles = computed(() => {
      if (regionalData.value.length === 0) return [];
      const adminLevelCount = Object.keys(regionalData.value[0]).length;
      return ADMIN_LEVEL_KEYS.slice(0, adminLevelCount).map(
        adminLevel => ADMIN_LEVEL_TITLES[adminLevel]
      );
    });

    return {
      setSelectedAdminLevel,
      availableAdminLevelTitles,
      regionalData,
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
