<template>
  <div class="breakdown-pane-container">
    <p
      v-if="selectedScenarioIds.length !== 1"
      class="disabled-dropdown-instructions"
    >
      Select <strong>exactly one scenario</strong> to enable breakdown options.
    </p>
    <dropdown-button
      v-else
      class="breakdown-option-dropdown"
      :items="breakdownOptions"
      :selectedItem="selectedBreakdownOption"
      :is-dropdown-left-aligned="true"
      @item-selected="emitBreakdownOptionSelection"
    />
    <aggregation-checklist-pane
      v-if="isRegionalDataValid"
      class="checklist-section"
      :aggregation-level-count="availableAdminLevelTitles.length"
      :aggregation-level="selectedAdminLevel"
      :aggregation-level-title="availableAdminLevelTitles[selectedAdminLevel]"
      :ordered-aggregation-level-keys="ADMIN_LEVEL_KEYS"
      :raw-data="regionalData"
      :units="unit"
      :selected-timeseries-points="selectedTimeseriesPoints"
      :selected-item-ids="selectedRegionIds"
      :checkbox-type="
        selectedBreakdownOption === SpatialAggregationLevel.Region
          ? 'checkbox'
          : 'radio'
      "
      @toggle-is-item-selected="toggleIsRegionSelected"
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
              ? AggregationOption.Mean
              : selectedSpatialAggregation
          }}</strong
          >.
        </p>
      </template>
    </aggregation-checklist-pane>
    <aggregation-checklist-pane
      class="checklist-section"
      v-for="qualifierVariable in qualifierBreakdownData"
      :key="qualifierVariable.name"
      :aggregation-level-count="1"
      :aggregation-level="0"
      :aggregation-level-title="qualifierVariable.name"
      :ordered-aggregation-level-keys="[qualifierVariable.name]"
      :raw-data="qualifierVariable.data"
      :selected-timeseries-points="selectedTimeseriesPoints"
      :units="unit"
      :checkbox-type="
        selectedBreakdownOption === qualifierVariable.name ? 'checkbox' : null
      "
      :selected-item-ids="
        selectedBreakdownOption === qualifierVariable.name
          ? Array.from(selectedQualifierValues)
          : []
      "
      @toggle-is-item-selected="toggleIsQualifierSelected"
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
              ? AggregationOption.Mean
              : selectedSpatialAggregation
          }}</strong
          >.
        </p>
      </template>
    </aggregation-checklist-pane>
    <aggregation-checklist-pane
      v-if="isTemporalBreakdownDataValid && selectedBreakdownOption === null"
      class="checklist-section"
      :aggregation-level-count="Object.keys(temporalBreakdownData).length"
      :aggregation-level="0"
      :aggregation-level-title="'Year'"
      :ordered-aggregation-level-keys="['Year']"
      :raw-data="temporalBreakdownData"
      :units="unit"
      :selected-timeseries-points="selectedTimeseriesPoints"
    >
      <template #aggregation-description>
        <p class="aggregation-description">
          Aggregated by
          <strong>{{ selectedTemporalAggregation }}</strong
          >.
        </p>
      </template>
    </aggregation-checklist-pane>
  </div>
</template>

<script lang="ts">
import { computed, defineComponent, PropType, toRefs } from 'vue';
import aggregationChecklistPane from '@/components/drilldown-panel/aggregation-checklist-pane.vue';
import dateFormatter from '@/formatters/date-formatter';
import { BreakdownData, NamedBreakdownData } from '@/types/Datacubes';
import { ADMIN_LEVEL_KEYS, ADMIN_LEVEL_TITLES } from '@/utils/admin-level-util';
import DropdownButton, { DropdownItem } from '@/components/dropdown-button.vue';
import {
  AggregationOption,
  TemporalAggregationLevel,
  SpatialAggregationLevel,
  AdminLevel
} from '@/types/Enums';
import { TimeseriesPointSelection } from '@/types/Timeseries';
import { getTimestampMillis } from '@/utils/date-util';

// FIXME: This should dynamically change to whichever temporal aggregation level is selected
const selectedTemporalAggregationLevel = TemporalAggregationLevel.Year;

export default defineComponent({
  components: { aggregationChecklistPane, DropdownButton },
  name: 'BreakdownPane',
  props: {
    selectedAdminLevel: {
      type: Number,
      required: true
    },
    qualifierBreakdownData: {
      type: Array as PropType<NamedBreakdownData[]>,
      default: () => []
    },
    selectedTimestamp: {
      type: Number as PropType<number | null>,
      default: null
    },
    selectedSpatialAggregation: {
      type: String as PropType<string | null>,
      default: AggregationOption.Mean
    },
    selectedTemporalAggregation: {
      type: String as PropType<string | null>,
      default: AggregationOption.Mean
    },
    unit: {
      type: String as PropType<string>,
      default: null
    },
    regionalData: {
      type: Object as PropType<BreakdownData | null>,
      default: null
    },
    temporalBreakdownData: {
      type: Object as PropType<BreakdownData | null>,
      default: null
    },
    selectedScenarioIds: {
      type: Array as PropType<string[]>,
      default: []
    },
    selectedRegionIds: {
      type: Object as PropType<string[] | null>,
      default: null
    },
    selectedQualifierValues: {
      type: Object as PropType<Set<string>>,
      default: () => new Set()
    },
    selectedBreakdownOption: {
      type: String as PropType<string | null>,
      default: null
    },
    selectedTimeseriesPoints: {
      type: Array as PropType<TimeseriesPointSelection[]>,
      required: true
    }
  },
  emits: [
    'set-selected-admin-level',
    'toggle-is-region-selected',
    'toggle-is-qualifier-selected',
    'set-breakdown-option'
  ],
  setup(props, { emit }) {
    const {
      regionalData,
      temporalBreakdownData,
      selectedBreakdownOption,
      qualifierBreakdownData
    } = toRefs(props);
    const setSelectedAdminLevel = (level: number) => {
      emit('set-selected-admin-level', level);
    };

    const toggleIsRegionSelected = (adminLevel: string, regionId: string) => {
      emit('toggle-is-region-selected', adminLevel, regionId);
    };

    const toggleIsQualifierSelected = (
      variableName: string,
      qualifierValue: string
    ) => {
      emit('toggle-is-qualifier-selected', qualifierValue);
    };

    const emitBreakdownOptionSelection = (breakdownOption: string | null) => {
      emit('set-breakdown-option', breakdownOption);
    };

    const availableAdminLevelTitles = computed(() => {
      const _regionalData = regionalData.value;
      if (_regionalData === null) return [];
      return Object.values(AdminLevel)
        .filter(
          adminLevelKey =>
            _regionalData[adminLevelKey] !== undefined &&
            _regionalData[adminLevelKey].length > 0
        )
        .map(adminLevel => ADMIN_LEVEL_TITLES[adminLevel]);
    });

    const isRegionalDataValid = computed(
      () =>
        regionalData.value !== null &&
        Object.keys(regionalData.value).length !== 0
    );

    const isTemporalBreakdownDataValid = computed(
      () =>
        temporalBreakdownData.value !== null &&
        Object.keys(temporalBreakdownData.value).length !== 0
    );

    const breakdownOptions = computed(() => {
      const options: DropdownItem[] = [];
      options.push({ value: null, displayName: 'none' });
      if (props.selectedScenarioIds.length === 1) {
        options.push({
          value: SpatialAggregationLevel.Region,
          displayName: 'Split by region'
        });
        options.push({
          value: selectedTemporalAggregationLevel,
          displayName: 'Split by year'
        });
        options.push(
          ...qualifierBreakdownData.value.map(({ name }) => ({
            value: name,
            displayName: `Split by ${name}`
          }))
        );
      }
      return options;
    });

    const timestampFormatter = (timestamp: number) => {
      if (selectedBreakdownOption.value === TemporalAggregationLevel.Year) {
        const month = timestamp;
        // We're only displaying the month, so the year doesn't matter
        return dateFormatter(getTimestampMillis(1970, month), 'MMMM');
      }
      return dateFormatter(timestamp, 'MMMM YYYY');
    };

    return {
      setSelectedAdminLevel,
      toggleIsRegionSelected,
      toggleIsQualifierSelected,
      availableAdminLevelTitles,
      timestampFormatter,
      ADMIN_LEVEL_KEYS,
      emitBreakdownOptionSelection,
      breakdownOptions,
      isRegionalDataValid,
      isTemporalBreakdownDataValid,
      AggregationOption,
      SpatialAggregationLevel
    };
  }
});
</script>

<style lang="scss" scoped>
@import '~styles/variables';

.breakdown-pane-container {
  margin-bottom: 40px;
}

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

.breakdown-option-dropdown {
  display: inline-block;
  width: 100%;
}

.disabled-dropdown-instructions {
  color: $text-color-medium;
}
</style>
