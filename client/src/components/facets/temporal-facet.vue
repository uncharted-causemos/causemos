<template>
  <facet-timeline
    :data.prop="facetData"
    :filter.prop="facetFilter"
    :domain.prop="facetDomain"
    :view.prop="[0, facetData.length]"
    ref="facet"
    @facet-element-updated="updateSelection"
    >
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

/**
 * Facet 3 component
 */
export default {
  name: 'TemporalFacet',
  props: {
    switchData: {
      type: Boolean,
      default: true
    },
    applyFilter: {
      type: Boolean,
      default: false
    },
    allModelRunData: {
      type: Array,
      default: () => []
    }
  },
  computed: {
    temporalDataMap() {
      // a model may expose one temporal param for month, one param for year, or two both month/year
      //  case 1: only one month param
      //  case 2: only one year param
      //  case 3: one for month and one for year
      //
      // so, we need a computed map to track unique timestamps and the how many runs in each.
      //  the key would be either month only (case 1), year only (case 2), or month-year (case 3)
      //  the value for each key is an array of the run IDs with values matching the key
      /*
      {
        Jan-2019: [run_11, run_14, run_15],
        Feb-2019: [],
        Mar-2019: [run_12, run_13],
        Dec-2020: [run_19],
      }
      */
      const temporalDataMap = {};
      const Year = 'year';
      const Month = 'month';
      this.allModelRunData.forEach(modelRun => {
        // supported temporal param types: year, month
        //  or datetime?
        let key = '';
        const monthlyParam = modelRun.parameters.filter(p => p.name === Month);
        if (monthlyParam.length > 0) {
          key += monthlyParam[0].value;
        }
        const yearlyParam = modelRun.parameters.filter(p => p.name === Year);
        if (yearlyParam.length > 0) {
          if (key !== '') {
            key += '-';
          }
          key += yearlyParam[0].value;
        }
        if (temporalDataMap[key] !== undefined) {
          // key exists
          temporalDataMap[key].push(modelRun.id);
        } else {
          temporalDataMap[key] = [modelRun.id];
        }
      });
      return temporalDataMap;
    },
    facetData() {
      if (this.switchData) {
        //
        //
        return [
          { ratio: 0.1, label: ['Sep', '2019'] },
          { ratio: 0.2, label: ['Oct', '2019'] },
          { ratio: 0.3, label: ['Dec', '2019'] },
          { ratio: 0.4, label: ['Jan', '2020'] },
          { ratio: 0.5, label: ['Feb', '2020'] },
          { ratio: 0.6, label: ['Mar', '2020'] },
          { ratio: 0.7, label: ['Apr', '2020'] },
          { ratio: 0.8, label: ['May', '2020'] }
        ];
      } else {
        //
        //
        const d = [];
        for (const [key, value] of Object.entries(this.temporalDataMap)) {
          d.push({ ratio: value.length, label: key });
        }
        return d;
      }
    },
    facetDomain() {
      // control which bars get actually rendered
      return undefined; // [2, 5];
    },
    facetFilter() {
      // add filter controls
      const facetElement = this.$refs.facet;
      // const filteredData = this.applyFilter && facetElement ? [facetElement.data[0]] : undefined;
      // console.log(filteredData);
      // return filteredData;
      return this.applyFilter && facetElement ? [
        { value: 1.7, label: 'label left' },
        { value: 6.5, label: 'label right' }
      ] : undefined;
    }
    // @TODO add selection support based on initial data selection
  },
  methods: {
    updateSelection(event) {
      const facet = event.currentTarget;
      if (event.detail.changedProperties.get('selection') !== undefined) {
        if (facet.selection) {
          // this will returns an array with two values reflection the lower/uppoer bounds of the selected bars
          // console.log(facet.selection);
        }
      }
      if (event.detail.changedProperties.get('view') !== undefined) {
        // filtered view
        if (facet.view) {
          // this will returns an array with two values reflection the range of the filtered bars
          // console.log(facet.view);
        }
      }
      if (event.detail.changedProperties.get('hover') !== undefined) {
        // @FIXME: need a way to control hover content
        // console.log(facet.hover); // only prints true/false!!
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
