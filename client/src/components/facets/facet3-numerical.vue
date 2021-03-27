<template>
  <facet-bars
    :data.prop="facetData"
    :selection.prop="selection"
    :subselection.prop="subselection"
    @facet-element-updated="updateSelection"
  >
    <div
      slot="header-label"
    >
      <span>{{ label.toUpperCase() }}</span>
    </div>

    <facet-template
      v-if="facetData.values.length > 0"
      target="facet-bars-value"
      title="${tooltip}"
    />

    <div
      v-else
      slot="content"
    />

    <div
      v-if="facetData.values.length > 0"
      slot="footer"
      class="facet-footer-container"
    >
      <facet-plugin-zoom-bar
        min-bar-width="8"
        auto-hide="true"
        round-caps="true"
      />
    </div>
    <div
      v-else
      slot="footer"
      class="facet-footer-container"
    >
      No Data Available
    </div>
  </facet-bars>
</template>


<script lang="ts">
import { mapActions, mapGetters } from 'vuex';
import _ from 'lodash';

import '@uncharted.software/facets-core';
import '@uncharted.software/facets-plugins';
import { FacetBarsData } from '@uncharted.software/facets-core/dist/types/facet-bars/FacetBars';

import filtersUtil from '@/utils/filters-util';

/**
 * Facet 3 component - displays aggregated search terms and update query state.
 * Note facet does not filter itself, this is to allow term disjunction queries.
 * Properties
 * - label: facet label
 * - facet: field key
 * - selectedData: Array of selected bins
 */
export default {
  name: 'Facet3Numerical',
  props: {
    label: {
      type: String,
      default: 'Facet'
    },
    facet: {
      type: String,
      default: null
    },
    selectedData: {
      type: Array,
      default: () => []
    },
    baseData: {
      type: Array,
      default: () => []
    }
  },
  computed: {
    ...mapGetters({
      filters: 'query/filters'
    }),
    max(): number {
      const values = this.baseData.map(b => b.value);
      return Math.max(...values);
    },
    facetData(): FacetBarsData {
      const values = this.baseData.map((f) => {
        return {
          ratio: f.value / this.max,
          label: f.key,
          tooltip: `Value: ${f}`
        };
      });
      return {
        label: this.label,
        values
      };
    },
    selection(): number[] {
      const facetClause = filtersUtil.findPositiveFacetClause(this.filters, this.facet);
      if (facetClause) {
        const values = facetClause.values[0];
        const selIndexes = this.baseData.reduce((a, b, i) => {
          if (parseFloat(b.key) <= parseFloat(values[0])) {
            a[0] = i; // largest matching index for the start
          } else if (parseFloat(b.key) <= parseFloat(values[1])) {
            a[1] = i; // largest matching index for the end
          }
          return a;
        }, [null, null]);

        // if the largest key is still less than the last value or is a special string
        // set to the max length of the baseData array
        if (values[1] > this.baseData[this.baseData.length - 1].key || values[1] === '--') {
          selIndexes[1] = this.baseData.length;
        }
        return selIndexes;
      } else {
        return [0, this.baseData.length];
      }
    },
    subselection(): number[] {
      return this.selectedData ? this.selectedData.map(s => s.value / this.max) : [];
    }
  },
  methods: {
    ...mapActions({
      setSearchClause: 'query/setSearchClause',
      removeSearchTerm: 'query/removeSearchTerm'
    }),
    updateSelection(event) {
      const facet = event.currentTarget;
      if (
        event.detail.changedProperties.get('selection') !== undefined &&
        !_.isEqual(facet.selection, this.selection)
      ) {
        if (facet.selection) {
          const from = this.baseData[facet.selection[0]].key;

          // HACK: numEvidence key has a custom filter expectation for 5+
          const to = this.facet === 'numEvidence' && facet.selection[1] >= 5
            ? '--'
            : facet.selection[1] !== this.baseData.length
              ? this.baseData[facet.selection[1]].key
              : (this.baseData[1].key - this.baseData[0].key) * this.baseData.length + this.baseData[0].key;
          this.setSearchClause({ field: this.facet, values: [[from, to]] });
        } else {
          this.setSearchClause({ field: this.facet, values: [[0, this.baseData.length]] });
        }
      }
    }
  }
};

</script>
