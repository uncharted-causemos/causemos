<template>
  <facet-timeline
    :data.prop="facetData"
    :selection.prop="selection"
    :view.prop="facetView"
    ref="facet"
    @facet-element-updated="updateSelection"
    >

    <!-- eslint-disable-next-line vue/no-deprecated-slot-attribute -->
    <div slot="header" style="display: flex;">
      <a v-for="resolution in supportedResolutions"
        :key="resolution.value"
        class="temporal-facet-resolution"
        :class="{'temporal-facet-resolution-selected': resolution.value === dateParamResolution}"
        @click="dateParamResolution = resolution.value">
        {{resolution.label}}
      </a>
    </div>

    <facet-template
      target="facet-bars-value"
      title="${tooltip}"
      class="facet-pointer"
    />

    <!-- eslint-disable-next-line vue/no-deprecated-slot-attribute -->
    <facet-plugin-zoom-bar slot="scrollbar"
      min-bar-width="8"
      auto-hide="true"
      round-caps="true"/>
  </facet-timeline>
</template>


<script>
import '@uncharted.software/facets-core';
import '@uncharted.software/facets-plugins';
import { TemporalResolution /* , DatacubeGenericAttributeVariableType */ } from '@/types/Enums';
import _ from 'lodash';

/**
 * Facet 3 component
 */
export default {
  name: 'TemporalFacet',
  emits: ['update-scenario-selection'],
  props: {
    modelRunData: {
      type: Array,
      default: () => []
    },
    selectedScenarios: { // IDs
      type: Array,
      default: () => []
    },
    modelParameter: { // which (date) model param this facet is representing
      type: Object,
      default: () => {}
    }
  },
  data: () => ({
    selection: [],
    facetView: [0, 0],
    dateParamResolution: TemporalResolution.Other,
    TemporalResolution
  }),
  watch: {
    selectedScenarios() {
      // update facet selection
      //  find the bars that include the selected runs
      let rangeStartIndex = -1;
      let rangeEndIndex = -1;
      this.selectedScenarios.forEach(runID => {
        for (const [key, value] of Object.entries(this.temporalDataMap)) {
          // note: each value is an array of model runs
          if (value.map(r => r.id).includes(runID)) {
            // use the key to find the bar index
            if (this.facetData) {
              const indx = this.facetData.findIndex(bar => bar.label === key);
              if (indx !== -1) {
                // include this index in the facet selection range
                if (rangeStartIndex === -1) {
                  rangeStartIndex = indx;
                  rangeEndIndex = indx;
                } else {
                  rangeStartIndex = Math.min(rangeStartIndex, indx);
                  rangeEndIndex = Math.max(rangeEndIndex, indx);
                }
              }
            }
          }
        }
      });
      // @FIXME: there is a limitation where bar selection must be consecutive
      //          if a range is provided and it is not consecutive, then all bars in the range will be selected

      rangeEndIndex += 1; // facet range works by selecting all bars between start and end excluding the end
      const sameSelection = this.selection[0] === rangeStartIndex && this.selection[1] === rangeEndIndex;
      if (!sameSelection) {
        this.selection = [rangeStartIndex, rangeEndIndex];
      }
    },
    facetData() {
      if (this.facetData.length > 0) {
        // update facet view
        //  i.e., try to fit all bars in view unless the number is larger than the max-allowed-visible
        const maxVisibleBars = 8;
        this.facetView = [0, this.facetData.length > maxVisibleBars ? maxVisibleBars : this.facetData.length];
      }
    }
  },
  computed: {
    temporalDataMap() {
      // build a map of unique temporal keys, e.g., timestamp or dates
      //  for each key, the value would be an array of the matching model runs
      const temporalDataMap = {};
      // build a histogram for bins only relevant to the available model runs
      const isYearlyResolution = this.dateParamResolution === TemporalResolution.Annual;
      const isMonthlyResolution = this.dateParamResolution === TemporalResolution.Monthly;
      // const isDateRange = this.modelParameter.type === DatacubeGenericAttributeVariableType.DateRange;
      // console.log(isDateRange);

      this.modelRunData.forEach(modelRun => {
        const dateParam = modelRun.parameters.find(p => p.name === this.modelParameter.name);
        if (dateParam) {
          let key = dateParam.value; // FIXME: what if this is a range!?
          if (isYearlyResolution) {
            key = new Date(dateParam.value).getFullYear(); // e.g. 2015
          }
          if (isMonthlyResolution) {
            const keyAsDate = new Date(key);
            key = keyAsDate.getFullYear() + '-' + (keyAsDate.getMonth() + 1); // e.g. 2015-05 (note getMonth() is zero-based)
          }
          if (temporalDataMap[key] !== undefined) {
            // key exists
            temporalDataMap[key].push(modelRun);
          } else {
            temporalDataMap[key] = [modelRun];
          }
        }
      });
      const allDateKeys = Object.keys(temporalDataMap);
      if (allDateKeys.length > 0) {
        // extract the first/last date to identify the full date range
        const allDates = allDateKeys.map(dateKeyStr => new Date(dateKeyStr));
        const allRunsStartDate = _.min(allDates);
        const allRunsEndDate = _.max(allDates);

        // add buckets/bins/bars (of height 0) covering gaps or missing parts according to selected resolution
        if (isYearlyResolution || isMonthlyResolution) {
          const yearStart = allRunsStartDate.getFullYear();
          const yearEnd = allRunsEndDate.getFullYear();
          for (let year = yearStart; year <= yearEnd; year++) {
            if (isYearlyResolution) {
              if (temporalDataMap[year] === undefined) {
                temporalDataMap[year] = [];
              }
            }
            if (isMonthlyResolution) {
              const monthStart = year === yearStart ? (allRunsStartDate.getMonth() + 1) : 1;
              const monthEnd = year === yearEnd ? (allRunsEndDate.getMonth() + 1) : 12;
              for (let month = monthStart; month <= monthEnd; month++) {
                const newKey = year + '-' + month;
                if (temporalDataMap[newKey] === undefined) {
                  temporalDataMap[newKey] = [];
                }
              }
            }
          }
        }
      }
      return temporalDataMap;
    },
    facetData() {
      const bars = [];
      const numAllRuns = this.modelRunData.length === 0 ? 1 : this.modelRunData.length; // avoid divide by zero
      const maxTooltipItems = 5;
      const getBarTooltip = (key, values) => {
        // if number of runs to be listed in a tooltip is too large, then truncate
        if (values.length > maxTooltipItems) {
          return key + '\n' + [...values.slice(0, maxTooltipItems), '... and more'].join('\n');
        }
        return key + '\n' + values.join('\n');
      };
      // ensure insertion in correct order to reflect a timeline
      const sortedKeys = _.sortBy(Object.keys(this.temporalDataMap), function (d) { return new Date(d); }); // Object.keys(this.temporalDataMap).sort(compFunc);
      sortedKeys.forEach(key => {
        const value = this.temporalDataMap[key];
        bars.push({
          ratio: value.length / numAllRuns, // normalized between 0 and 1
          label: key,
          tooltip: getBarTooltip(key, value.map(r => r.name))
        });
      });
      return bars;
    },
    supportedResolutions() {
      return [
        {
          value: TemporalResolution.Annual,
          label: 'Annual'
        },
        {
          value: TemporalResolution.Monthly,
          label: 'Monthly'
        },
        {
          value: TemporalResolution.Other,
          label: 'No Gaps'
        }];
    }
  },
  methods: {
    updateSelection(event) {
      const facet = event.currentTarget;
      if (event.detail.changedProperties.get('selection') !== undefined) {
        if (facet.selection && facet.selection.length > 0) {
          // this will returns an array with two values reflection the lower/uppoer bounds of the selected bars
          const selectedBars = this.facetData.slice(facet.selection[0], facet.selection[1]);
          const selectedScenarioIDs = [];
          selectedBars.forEach(bar => {
            const runsForLabel = this.temporalDataMap[bar.label];
            selectedScenarioIDs.push(...runsForLabel.map(run => run.id));
          });
          this.$emit('update-scenario-selection', selectedScenarioIDs);
        }
      }
    }
  }
};

</script>

<style scoped lang="scss">
.facet-font {
  font-family: "Source Sans Pro", -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif, "Apple Color Emoji", "Segoe UI Emoji", "Segoe UI Symbol";
}
.facet-pointer {
  cursor: pointer;
}
.temporal-facet-resolution {
  color: blue;
  cursor: pointer;
  margin-left: 2px;
  margin-right: 2px;
  font-size: x-small;
}

.temporal-facet-resolution-selected {
  background-color: lightgray;
}
</style>
