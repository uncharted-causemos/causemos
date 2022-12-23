<template>
  <facet-timeline
    :data.prop="facetData"
    :selection.prop="selection"
    :view.prop="facetView"
    ref="timeline"
    @facet-element-updated="updateSelection"
  >
    <!-- eslint-disable-next-line vue/no-deprecated-slot-attribute -->
    <div slot="header" class="temporal-resolution-buttons">
      <small-text-button
        v-for="resolution in supportedResolutions"
        :key="resolution.value"
        :label="resolution.label"
        :disabled="resolution.value === dateParamResolution"
        class="temporal-resolution-button"
        @click="dateParamResolution = resolution.value"
      />
    </div>

    <facet-template target="facet-bars-value" title="${tooltip}" class="facet-pointer" />

    <!-- eslint-disable vue/no-deprecated-slot-attribute -->
    <facet-plugin-zoom-bar
      slot="scrollbar"
      min-bar-width="8"
      auto-hide="true"
      round-caps="true"
      ref="zoomBar"
    />
    <!-- eslint-enable vue/no-deprecated-slot-attribute -->
  </facet-timeline>
</template>

<script>
import '@uncharted.software/facets-core';
import '@uncharted.software/facets-plugins';
import { TemporalResolution, DatacubeGenericAttributeVariableType } from '@/types/Enums';
import _ from 'lodash';
import { DEFAULT_DATE_RANGE_DELIMETER } from '@/utils/datacube-util';
import smallTextButton from '@/components/widgets/small-text-button.vue';

// NOTE: Honestly, for date range a Gantt-like chart is much better representation
//  than the facet-timeline, which is more suitable for single date runs

/**
 * Facet 3 component
 */
export default {
  components: { smallTextButton },
  name: 'TemporalFacet',
  emits: ['update-scenario-selection'],
  props: {
    modelRunData: {
      type: Array,
      default: () => [],
    },
    selectedScenarios: {
      // IDs
      type: Array,
      default: () => [],
    },
    modelParameter: {
      // which (date) model param this facet is representing
      type: Object,
      default: () => {},
    },
  },
  data: () => ({
    selection: [],
    facetView: [0, 0],
    dateParamResolution: TemporalResolution.Annual,
    TemporalResolution,
  }),
  async mounted() {
    // The Facets 3.0 library doesn't expose the style options we need, so we
    //  need to use JS to override the styles.
    // Wait for the custom element to render (undefined when component is
    //  first mounted)
    await customElements.whenDefined('facet-timeline');
    try {
      const facetBlueprint = this.$refs.timeline.shadowRoot.querySelector('.facet-blueprint');
      facetBlueprint.style.background = 'none';
      const content = facetBlueprint.querySelector(
        '.facet-blueprint-body .facet-blueprint-content'
      );
      content.style.padding = '0';
      const zoomBar = this.$refs.zoomBar.shadowRoot.querySelector('.zoom-bar-container');
      zoomBar.style.marginBottom = '0';
      zoomBar.querySelector('.zoom-bar-background').style.margin = '0';
    } catch (e) {
      console.log('Unable to override temporal facet styles.', e);
    }
  },
  watch: {
    selectedScenarios() {
      // update facet selection
      //  find the bars that include the selected runs

      // FIXME: disable this feature for date-range since current facet limitation end up selecting bars which overlap with other runs date range causing a cycle ultimately that ends when all runs/bars are selected
      const isDateRange =
        this.modelParameter.type === DatacubeGenericAttributeVariableType.DateRange;
      if (isDateRange) return;

      let rangeStartIndex = -1;
      let rangeEndIndex = -1;
      this.selectedScenarios.forEach((runID) => {
        for (const [key, value] of Object.entries(this.temporalDataMap)) {
          // note: each value is an array of model runs
          if (value.map((r) => r.id).includes(runID)) {
            // use the key to find the bar index
            if (this.facetData) {
              const indx = this.facetData.findIndex((bar) => bar.label === key);
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
      const sameSelection =
        this.selection[0] === rangeStartIndex && this.selection[1] === rangeEndIndex;
      if (!sameSelection) {
        this.selection = [rangeStartIndex, rangeEndIndex];
      }
    },
    facetData() {
      if (this.facetData.length > 0) {
        // update facet view
        //  i.e., try to fit all bars in view unless the number is larger than the max-allowed-visible
        const maxVisibleBars = 8;
        this.facetView = [
          0,
          this.facetData.length > maxVisibleBars ? maxVisibleBars : this.facetData.length,
        ];
      }
    },
  },
  computed: {
    temporalDataMap() {
      // build a map of unique temporal keys, e.g., timestamp or dates
      //  for each key, the value would be an array of the matching model runs
      let temporalDataMap = {};
      const delimiter = DEFAULT_DATE_RANGE_DELIMETER;
      // build a histogram for bins only relevant to the available model runs
      const isYearlyResolution = this.dateParamResolution === TemporalResolution.Annual;
      const isMonthlyResolution = this.dateParamResolution === TemporalResolution.Monthly;
      const isDateRange =
        this.modelParameter.type === DatacubeGenericAttributeVariableType.DateRange;

      // key will always be either the full, original ISO, date or a combination of year+month
      // const getKeyFromDate = (date) => date.getFullYear() + '_' + (date.getMonth() + 1); // e.g. 2015-05 (note getMonth() is zero-based)

      // first pass, add all key date (based on run data)
      this.modelRunData.forEach((modelRun) => {
        const dateParam = modelRun.parameters.find((p) => p.name === this.modelParameter.name);
        if (dateParam) {
          const key = dateParam.value;
          let k1 = '';
          let k2 = '';
          if (isDateRange) {
            const k12 = key.split(delimiter);
            k1 = k12[0];
            k2 = k12[1];
          }
          if (!isDateRange) {
            if (isYearlyResolution || isMonthlyResolution) {
              // data will be added later
              if (temporalDataMap[key] === undefined) {
                temporalDataMap[key] = [];
              }
            } else {
              // for the histogram (No Gaps) mode, data is added now
              if (temporalDataMap[key] !== undefined) {
                temporalDataMap[key].push(modelRun);
              } else {
                temporalDataMap[key] = [modelRun];
              }
            }
          } else {
            // just add the date as key, and the relevant runs will be added later
            //  and the temporal resolution will be taking into account at that time
            if (temporalDataMap[k1] === undefined) {
              temporalDataMap[k1] = [];
            }
            if (temporalDataMap[k2] === undefined) {
              temporalDataMap[k2] = [];
            }
          }
        }
      });

      const addRunsToDateBucket = (bucketDate) => {
        // TODO: optimize: instead of search for every model run, utilize a map for quick access
        const getDateKey = (date) =>
          isYearlyResolution
            ? date.getFullYear()
            : date.getFullYear() + '-' + (date.getMonth() + 1);
        this.modelRunData.forEach((modelRun) => {
          const dateParam = modelRun.parameters.find((p) => p.name === this.modelParameter.name);
          if (dateParam) {
            let key = dateParam.value;
            if (!isDateRange) {
              const keyAsDate = new Date(key);
              key = getDateKey(keyAsDate);
              if (bucketDate === key) {
                temporalDataMap[key].push(modelRun);
              }
            } else {
              let k1 = '';
              let k2 = '';
              const k12 = key.split(delimiter);
              k1 = k12[0];
              k2 = k12[1];
              const key1AsDate = new Date(k1);
              const key2AsDate = new Date(k2);
              k1 = getDateKey(key1AsDate);
              k2 = getDateKey(key2AsDate);
              if (isYearlyResolution) {
                if (bucketDate >= k1 && bucketDate <= k2) {
                  temporalDataMap[bucketDate].push(modelRun);
                }
              } else {
                if (new Date(bucketDate) >= new Date(k1) && new Date(bucketDate) <= new Date(k2)) {
                  temporalDataMap[bucketDate].push(modelRun);
                }
              }
            }
          }
        });
      };

      const allDateKeys = Object.keys(temporalDataMap);
      if (allDateKeys.length > 0 && (isYearlyResolution || isMonthlyResolution)) {
        // we are going to assign data, but we need to clear existing full-date keys
        //  since now only yearly/monthly resolution will be the keys
        temporalDataMap = {};

        // extract the first/last date to identify the full date range
        const allDates = allDateKeys.map((dateKeyStr) => new Date(dateKeyStr));
        const allRunsStartDate = _.min(allDates);
        const allRunsEndDate = _.max(allDates);

        // add buckets/bins/bars (of height 0) covering gaps or missing parts according to selected resolution
        const yearStart = allRunsStartDate.getFullYear();
        const yearEnd = allRunsEndDate.getFullYear();

        for (let year = yearStart; year <= yearEnd; year++) {
          if (isYearlyResolution) {
            // first, add the bucket if missing
            if (temporalDataMap[year] === undefined) {
              temporalDataMap[year] = [];
            }
            // should some run(s) be added to this bucket
            // loop through runs again to fill in the buckets
            addRunsToDateBucket(year);
          }
          if (isMonthlyResolution) {
            const monthStart = year === yearStart ? allRunsStartDate.getMonth() + 1 : 1;
            const monthEnd = year === yearEnd ? allRunsEndDate.getMonth() + 1 : 12;
            for (let month = monthStart; month <= monthEnd; month++) {
              const newKey = year + '-' + month;
              if (temporalDataMap[newKey] === undefined) {
                temporalDataMap[newKey] = [];
              }
              // should some run(s) be added to this bucket
              // loop through runs again to fill in the buckets
              addRunsToDateBucket(newKey);
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
      const isDateRange =
        this.modelParameter.type === DatacubeGenericAttributeVariableType.DateRange;

      const getBarTooltip = (key, runNames) => {
        // if number of runs to be listed in a tooltip is too large, then truncate
        let runNamesAndValues = runNames;
        if (isDateRange) {
          runNamesAndValues = runNames.map((name) => {
            const run = this.modelRunData.find((run) => run.name === name);
            const dateParam = run.parameters.find((p) => p.name === this.modelParameter.name);
            return name + '\t' + dateParam.value;
          });
        }
        if (runNamesAndValues.length > maxTooltipItems) {
          return (
            key + '\n' + [...runNamesAndValues.slice(0, maxTooltipItems), '... and more'].join('\n')
          );
        }
        return key + '\n' + runNamesAndValues.join('\n');
      };
      // ensure insertion in correct order to reflect a timeline
      const sortedKeys = _.sortBy(Object.keys(this.temporalDataMap), function (d) {
        return new Date(d);
      }); // Object.keys(this.temporalDataMap).sort(compFunc);
      sortedKeys.forEach((key) => {
        const value = this.temporalDataMap[key];
        bars.push({
          ratio: value.length / numAllRuns, // normalized between 0 and 1
          label: key,
          tooltip: getBarTooltip(
            key,
            value.map((r) => r.name)
          ),
        });
      });
      return bars;
    },
    supportedResolutions() {
      const temporalResolutions = [
        {
          value: TemporalResolution.Annual,
          label: 'Annual',
        },
        {
          value: TemporalResolution.Monthly,
          label: 'Monthly',
        },
      ];
      if (this.modelParameter.type === DatacubeGenericAttributeVariableType.Date) {
        temporalResolutions.push({
          value: TemporalResolution.Other,
          label: 'No Gaps',
        });
      }
      return temporalResolutions;
    },
  },
  methods: {
    updateSelection(event) {
      const facet = event.currentTarget;
      if (event.detail.changedProperties.get('selection') !== undefined) {
        if (facet.selection && facet.selection.length > 0) {
          // this will returns an array with two values reflection the lower/uppoer bounds of the selected bars
          const selectedBars = this.facetData.slice(facet.selection[0], facet.selection[1]);
          const selectedScenarioIDs = [];
          selectedBars.forEach((bar) => {
            const runsForLabel = this.temporalDataMap[bar.label];
            selectedScenarioIDs.push(...runsForLabel.map((run) => run.id));
          });
          this.$emit('update-scenario-selection', _.uniq(selectedScenarioIDs));
        }
      }
    },
  },
};
</script>

<style scoped lang="scss">
.facet-pointer {
  cursor: pointer;
}

.temporal-resolution-buttons {
  display: flex;
  margin-top: 3px;
}

.temporal-resolution-button:not(:first-child) {
  margin-left: 5px;
}
</style>
