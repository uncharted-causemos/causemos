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
      @item-selected="breakdownOptionSelected($event)"
    />
    <aggregation-checklist-pane
      ref="region_ref"
      v-if="isRegionalDataValid"
      class="checklist-section"
      :aggregation-level-count="availableAdminLevelTitles.length"
      :aggregation-level="selectedAdminLevel"
      :aggregation-level-title="availableAdminLevelTitles[selectedAdminLevel]"
      :ordered-aggregation-level-keys="ADMIN_LEVEL_KEYS"
      :raw-data="filteredRegionalData"
      :units="unit"
      :selected-timeseries-points="selectedTimeseriesPoints"
      :selected-item-ids="selectedRegionIds"
      :should-show-deselected-bars="selectedBreakdownOption !== SpatialAggregationLevel.Region"
      :show-references="selectedBreakdownOption === SpatialAggregationLevel.Region && selectedAdminLevel > 0"
      :allow-collapsing="false"
      :reference-options="referenceOptions"
      :checkbox-type="getRegionalBreakdownCheckboxType()"
      @toggle-reference-options="toggleReferenceOptions"
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
      :ref="qualifierVariable.id + '_ref'"
      :key="qualifierVariable.id"
      :aggregation-level-count="1"
      :aggregation-level="0"
      :aggregation-level-title="qualifierVariable.name"
      :ordered-aggregation-level-keys="[qualifierVariable.id]"
      :raw-data="qualifierVariable.data"
      :total-data-length="qualifierVariable.totalDataLength"
      :selected-timeseries-points="selectedTimeseriesPoints"
      :should-show-deselected-bars="selectedBreakdownOption === SpatialAggregationLevel.Region || selectedBreakdownOption === TemporalAggregationLevel.Year || selectedBreakdownOption === null"
      :show-references="false"
      :allow-collapsing="qualifierVariable.id !== selectedBreakdownOption"
      :units="unit"
      :checkbox-type="
        selectedBreakdownOption === qualifierVariable.id ? 'checkbox' : null
      "
      :selected-item-ids="
        selectedBreakdownOption === qualifierVariable.id
          ? Array.from(selectedQualifierValues)
          : []
      "
      @toggle-is-item-selected="toggleIsQualifierSelected"
      @request-data="emitRequestQualifierData(qualifierVariable.id)"
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
      ref="year_ref"
      v-if="isTemporalBreakdownDataValid"
      class="checklist-section"
      :aggregation-level-count="Object.keys(temporalBreakdownData).length"
      :aggregation-level="0"
      :aggregation-level-title="'Year'"
      :ordered-aggregation-level-keys="['Year']"
      :raw-data="temporalBreakdownData"
      :units="unit"
      :should-show-deselected-bars="selectedBreakdownOption !== TemporalAggregationLevel.Year"
      :show-references="selectedBreakdownOption === TemporalAggregationLevel.Year"
      :allow-collapsing="true"
      :reference-options="referenceOptions"
      :selected-timeseries-points="selectedTimeseriesPoints"
      :checkbox-type="
        selectedBreakdownOption === TemporalAggregationLevel.Year
          ? 'checkbox'
          : null
      "
      :selected-item-ids="Array.from(selectedYears)"
      @toggle-is-item-selected="toggleIsYearSelected"
      @toggle-reference-options="toggleReferenceOptions"
    >
      <template #aggregation-description>
        <p class="aggregation-description">
          Aggregated by
          <strong>{{ selectedTemporalAggregation }}</strong
          >.
        </p>
      </template>
    </aggregation-checklist-pane>
    <aggregation-checklist-pane
      ref="variable_ref"
      v-if="isOutputVariableBreakdownDataValid"
      class="checklist-section"
      :aggregation-level-count="Object.keys(outputVariableBreakdownData).length"
      :aggregation-level="0"
      :aggregation-level-title="'Variable'"
      :ordered-aggregation-level-keys="['Variable']"
      :raw-data="outputVariableBreakdownData"
      :should-show-deselected-bars="selectedBreakdownOption !== SPLIT_BY_VARIABLE"
      :show-references="false"
      :allow-collapsing="false"
      :selected-timeseries-points="selectedTimeseriesPoints"
      :checkbox-type="
        selectedBreakdownOption === SPLIT_BY_VARIABLE
          ? 'checkbox'
          : null
      "
      :selected-item-ids="Array.from(selectedBreakdownOutputVariables)"
      @toggle-is-item-selected="toggleIsOutputVariableSelected"
    >
    </aggregation-checklist-pane>
  </div>
</template>

<script lang="ts">
import { computed, defineComponent, PropType, ref, toRefs, watch } from 'vue';
import aggregationChecklistPane from '@/components/drilldown-panel/aggregation-checklist-pane.vue';
import DropdownButton, { DropdownItem } from '@/components/dropdown-button.vue';
import formatTimestamp from '@/formatters/timestamp-formatter';
import { AdminRegionSets, BreakdownData, NamedBreakdownData, QualifierFetchInfo } from '@/types/Datacubes';
import { ModelRunReference } from '@/types/ModelRunReference';
import { ADMIN_LEVEL_KEYS, ADMIN_LEVEL_TITLES, filterRegionalLevelData } from '@/utils/admin-level-util';
import {
  AggregationOption,
  TemporalAggregationLevel,
  SpatialAggregationLevel,
  TemporalResolutionOption,
  AdminLevel,
  SPLIT_BY_VARIABLE
} from '@/types/Enums';
import { TimeseriesPointSelection } from '@/types/Timeseries';
import _ from 'lodash';

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
      type: String as PropType<AggregationOption | null>,
      default: AggregationOption.Mean
    },
    selectedTemporalAggregation: {
      type: String as PropType<AggregationOption | null>,
      default: AggregationOption.Mean
    },
    selectedTemporalResolution: {
      type: String as PropType<TemporalResolutionOption | null>,
      default: null
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
    outputVariableBreakdownData: {
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
    selectedRegionIdsAtAllLevels: {
      type: Object as PropType<AdminRegionSets | null>,
      default: null
    },
    selectedQualifierValues: {
      type: Object as PropType<Set<string>>,
      default: () => new Set()
    },
    selectedYears: {
      type: Object as PropType<Set<string>>,
      default: () => new Set()
    },
    selectedBreakdownOutputVariables: {
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
    },
    referenceOptions: {
      type: Array as PropType<ModelRunReference[]>,
      default: []
    },
    qualifierFetchInfo: {
      type: Map as PropType<Map<String, QualifierFetchInfo>>,
      default: () => new Map()
    }
  },
  emits: [
    'set-selected-admin-level',
    'toggle-is-region-selected',
    'toggle-is-qualifier-selected',
    'toggle-is-year-selected',
    'toggle-is-output-variable-selected',
    'toggle-reference-options',
    'set-breakdown-option',
    'request-qualifier-data'
  ],
  setup(props, { emit }) {
    const {
      regionalData,
      temporalBreakdownData,
      selectedBreakdownOption,
      selectedTemporalResolution,
      qualifierBreakdownData,
      outputVariableBreakdownData,
      selectedRegionIdsAtAllLevels
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

    const toggleIsYearSelected = (title: string, year: string) => {
      emit('toggle-is-year-selected', year);
    };

    const toggleIsOutputVariableSelected = (title: string, variable: string) => {
      emit('toggle-is-output-variable-selected', variable);
    };

    const toggleReferenceOptions = (value: string) => {
      emit('toggle-reference-options', value);
    };

    const emitBreakdownOptionSelection = (breakdownOption: string | null) => {
      emit('set-breakdown-option', breakdownOption);
    };

    const emitRequestQualifierData = (qualifierId: string) => {
      emit('request-qualifier-data', qualifierId);
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

    // Pull out the regions at the current level that are selected,
    //  or which have an ancestor that's selected.
    const filteredRegionalData = ref<BreakdownData | null>(null);
    watch(
      () => [
        regionalData.value,
        selectedRegionIdsAtAllLevels.value
      ],
      () => {
        if (regionalData.value && isRegionalDataValid.value && selectedRegionIdsAtAllLevels.value !== null) {
          // apply filtering to all levels starting from the admin1 (i.e., adminIndx > 0)
          const filteredRegionLevelData = filterRegionalLevelData(regionalData.value, selectedRegionIdsAtAllLevels.value, false /* apply filtering to country level */);
          filteredRegionalData.value = filteredRegionLevelData as BreakdownData | null;
        }
      }
    );

    const isTemporalBreakdownDataValid = computed(
      () =>
        temporalBreakdownData.value !== null &&
        Object.keys(temporalBreakdownData.value).length !== 0
    );

    const isOutputVariableBreakdownDataValid = computed(
      () =>

        outputVariableBreakdownData.value !== null &&
        Object.keys(outputVariableBreakdownData.value).length !== 0
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
        options.push({
          value: SPLIT_BY_VARIABLE,
          displayName: 'Split by variable'
        });
        options.push(
          ...qualifierBreakdownData.value.map(({ id, name }) => ({
            value: id,
            displayName: `Split by ${name}`
          }))
        );
      }
      return options;
    });

    const timestampFormatter = (timestamp: number) => {
      return formatTimestamp(
        timestamp,
        selectedBreakdownOption.value,
        selectedTemporalResolution.value
      );
    };

    return {
      setSelectedAdminLevel,
      toggleIsRegionSelected,
      toggleIsQualifierSelected,
      toggleIsYearSelected,
      toggleIsOutputVariableSelected,
      toggleReferenceOptions,
      availableAdminLevelTitles,
      timestampFormatter,
      ADMIN_LEVEL_KEYS,
      emitBreakdownOptionSelection,
      emitRequestQualifierData,
      breakdownOptions,
      isRegionalDataValid,
      isTemporalBreakdownDataValid,
      isOutputVariableBreakdownDataValid,
      AggregationOption,
      SpatialAggregationLevel,
      TemporalAggregationLevel,
      SPLIT_BY_VARIABLE,
      filteredRegionalData
    };
  },
  methods: {
    async scrollToBreakdown(newValue: string | null) {
      if (newValue) {
        const reference = newValue + '_ref';
        setTimeout(() => { // HACK: wait for element to be mounted, year_ref gets unmounted in certain cases so we need to wait before we try and scroll to it
          try { // in the future we should look into preventing the mount/unmount behavior
            const ref = (this.$refs[reference] as any);
            const element = ref?.$el || ref[0]?.$el; // this will throw an error if element hasn't been rendered (it's ref wont exist)
            const container = document.getElementById('panel-content-container');
            if (container) {
              container.scrollTop = element.offsetTop - 45; // set scroll height to slightly above relevant qualifier
            }
          } catch (e) {
            console.error('could not scroll to element: ', e);
          }
        }, 250);
      }
    },
    breakdownOptionSelected(breakdownOption: string | null) {
      if (breakdownOption &&
        this.qualifierBreakdownData?.some(breakdown => breakdown.id === breakdownOption)
      ) {
        // Request data for qualifiers. If the data is already available this will no-op.
        this.emitRequestQualifierData(breakdownOption);
      }
      this.emitBreakdownOptionSelection(breakdownOption);
      this.scrollToBreakdown(breakdownOption);
    },
    getRegionalBreakdownCheckboxType() {
      switch (this.selectedBreakdownOption) {
        case SpatialAggregationLevel.Region: {
          return 'checkbox';
        }
        case TemporalAggregationLevel.Year: {
          return 'radio';
        }
        case null: {
          return 'radio';
        }
        default: {
          // Qualifier is selected. If the selected admin level is greater than
          //  the max regional timeseries level for this qualifier, hide radio
          //  buttons.
          const maxLevel = this.qualifierFetchInfo.get(this.selectedBreakdownOption)
            ?.maxAdminLevelWithRegionalTimeseries;
          if (maxLevel !== undefined && this.selectedAdminLevel > maxLevel) {
            return null;
          }
          return 'radio';
        }
      }
    }
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
