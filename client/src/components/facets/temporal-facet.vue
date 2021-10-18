<template>
<!--
  :domain.prop="facetDomain"
  :filter.prop="facetFilter"
-->
  <facet-timeline
    :data.prop="facetData"
    :view.prop="[0, facetData.length]"
    >
    <!-- eslint-disable-next-line vue/no-deprecated-slot-attribute -->
    <facet-plugin-zoom-bar slot="scrollbar"/>
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
    }
  },
  computed: {
    facetData() {
      if (this.switchData) {
        //
        //
        const facet05Data = [];
        const facet05Length = 30;
        const date = new Date();
        date.setUTCMilliseconds(-86400000 * facet05Length);
        for (let i = 0; i < facet05Length; ++i) {
          const value = {
            ratio: Math.random(),
            label: [
              date.toLocaleDateString('default', { weekday: 'short', day: 'numeric' }),
              date.toLocaleDateString('default', { month: 'short', year: 'numeric' })
            ]
          };
          value.minDateLabel = date.toLocaleString();
          date.setUTCMilliseconds(86400000);
          value.maxDateLabel = date.toLocaleString();

          facet05Data.push(value);
        }
        return facet05Data;
      } else {
        //
        //
        return [
          { ratio: 0.1, label: ['Mon 27', 'Dec 2019'] },
          { ratio: 0.2, label: ['Tue 28', 'Dec 2019'] },
          { ratio: 0.3, label: ['Wed 29', 'Dec 2019'] },
          { ratio: 0.4, label: ['Thu 30', 'Dec 2019'] },
          { ratio: 0.5, label: ['Fri 31', 'Dec 2019'] },
          { ratio: 0.6, label: ['Sat 01', 'Jan 2020'] },
          { ratio: 0.7, label: ['Sun 02', 'Jan 2020'] },
          { ratio: 0.8, label: ['Mon 03', 'Jan 2020'] },
          { ratio: 0.9, label: ['Tue 04', 'Jan 2020'] },
          { ratio: 1.0, label: ['Wed 05', 'Jan 2020'] }
        ];
      }
    },
    facetDomain() {
      return undefined; // [0, 5];
    },
    facetFilter() {
      return undefined;
      /* [
        { value: 0.2, label: 'label left' },
        { value: 6.5, label: 'label right' }
      ]; */
    }
  },
  methods: {
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
