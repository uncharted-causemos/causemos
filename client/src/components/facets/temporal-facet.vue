<template>
  <facet-timeline
    :data.prop="facetData"
    :selection.prop="selection"
    :view.prop="[0, facetData.length]"
    ref="facet"
    @facet-element-updated="updateSelection"
    >

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
import { DatacubeGenericAttributeVariableType } from '@/types/Enums';

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
    }
  },
  data: () => ({
    selection: []
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
      // Next TODO Work
      //       date range
      //       display format vs. output/model format
      //       resolution
      //       include bars for missing date buckets!?

      // @FIXME: there is a limitation where bar selection must be consecutive
      //          if a range is provided and it is not consecutive, then all bars in the range will be selected

      rangeEndIndex += 1; // facet range works by selecting all bars between start and end excluding the end
      const sameSelection = this.selection[0] === rangeStartIndex && this.selection[1] === rangeEndIndex;
      if (!sameSelection) {
        this.selection = [rangeStartIndex, rangeEndIndex];
      }
    }
  },
  computed: {
    temporalDataMap() {
      // build a map of unique temporal keys, e.g., timestamp or dates
      //  for each key, the value would be an array of the matching model runs
      const temporalDataMap = {};
      this.modelRunData.forEach(modelRun => {
        // supported temporal param type: Date or DateRange
        const dateParam = modelRun.parameters.filter(p => p.name === DatacubeGenericAttributeVariableType.Date);
        // TODO: consider handling multiple generic date params
        //  for now, assume it is only one date param
        if (dateParam.length > 0) {
          const key = dateParam[0].value;
          if (temporalDataMap[key] !== undefined) {
            // key exists
            temporalDataMap[key].push(modelRun);
          } else {
            temporalDataMap[key] = [modelRun];
          }
        }
      });
      return temporalDataMap;
    },
    facetData() {
      const bars = [];
      const numAllRuns = this.modelRunData.length === 0 ? 1 : this.modelRunData.length; // avoid divide by zero
      for (const [key, value] of Object.entries(this.temporalDataMap)) {
        bars.push({
          ratio: value.length / numAllRuns, // normalized between 0 and 1
          label: key,
          tooltip: key + '\n' + value.map(r => r.name).join('\n')
        });
      }
      return bars;
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
</style>
