<template>
  <div>
    <div class="facet-container">
      <div ref="container" />
    </div>
  </div>
</template>


<script>
import _ from 'lodash';
import { mapActions, mapGetters } from 'vuex';

import Facet from '@uncharted.software/stories-facets';
import facetUtil from '@/utils/facet-util';
import filtersUtil from '@/utils/filters-util';

/**
 * Facet component - displays aggregated search terms and update query state.
 * Note facet does not filter itself, this is to allow term disjunction queries.
 * Properties
 * - label: facet label
 * - facet: field key
 * - labelFormatterFn: formatter for histogram labels
 * - selectedData: Array of selected bins
 */
export default {
  name: 'HistogramFacets',
  props: {
    label: {
      type: String,
      default: 'Facet'
    },
    facet: {
      type: String,
      default: null
    },
    labelFormatterFn: {
      type: Function,
      default: (val) => {
        return val;
      }
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
  data: () => ({
    facetData: [],
    facetRef: null, // Facet widget reference,
    rangeIndexMap: {
      start: {},
      end: {}
    }
  }),
  computed: {
    ...mapGetters({
      filters: 'query/filters'
    })
  },
  watch: {
    selectedData() {
      this.refresh();
    },
    baseData() {
      this.init();
    }
  },
  mounted() {
    this.init();
  },
  beforeUnmount() {
    if (this.facetRef) this.facetRef.destroy();
    this.facetRef = null;
  },
  methods: {
    ...mapActions({
      setSearchClause: 'query/setSearchClause',
      removeSearchTerm: 'query/removeSearchTerm'
    }),
    init() {
      if (this.facetRef) {
        this.facetRef.destroy();
        this.facetRef = null;
      }
      if (_.isEmpty(this.baseData)) return;

      const targetElement = this.$refs.container;
      this.facetRef = new Facet(targetElement, []);
      const facetRef = this.facetRef;
      const labelFormatterFn = this.labelFormatterFn;

      // Handler to toggle highlight/selection
      facetRef.on('facet-histogram:click', (event, key, barData) => {
        const { from, to } = barData.metadata[0];
        const startIndex = this.rangeIndexMap.start[from];
        const endIndex = this.rangeIndexMap.end[to];
        const selection = facetUtil.createHistogramSelection(key, startIndex, endIndex);

        facetRef.select(selection, false);
        this.setSearchClause({ field: this.facet, values: [[from, to]] });
      });

      facetRef.on('facet-histogram:rangechangeduser', (event, key, range) => {
        const [from, to] = [range.from.metadata[0].from, range.to.metadata[0].to];
        this.setSearchClause({ field: this.facet, values: [[from, to]] });
      });

      let interval = 0;
      if (this.baseData.length > 1) {
        interval = (+this.baseData[1].key - +this.baseData[0].key);
      }

      // Get all the data for the intial load
      const slices = this.baseData.map((d, i) => {
        const fromValue = +d.key;
        const toValue = +d.key + interval;

        // let [from, to] = [d.startValue, d.endValue];
        let [from, to] = [fromValue, toValue];

        // HACK: Set end range to 6 for handling 5-and-above case
        if (this.facet === 'numEvidence' && fromValue >= 5) {
          to = '--';
        }
        const binStart = from + '';
        const binEnd = to + '';
        this.rangeIndexMap.start[from] = i;
        this.rangeIndexMap.end[to] = i;

        return {
          binStart: binStart,
          binEnd: binEnd,
          count: d.value,
          metadata: {
            from,
            to
          }
        };
      });
      this.facetData = [{
        histogram: { slices }
      }];
      const ref = this.facetRef;
      const newFacetData = {
        key: this.facet,
        label: this.label,
        facets: this.facetData,
        displayFn: labelFormatterFn
      };

      if (ref.getGroup(this.facet) === null) {
        ref.append([newFacetData]);
      } else {
        ref.replaceGroup(newFacetData);
      }

      if (!_.isEmpty(this.selectedData)) {
        this.refresh();
      }
    },
    refresh() {
      if (_.isEmpty(this.baseData)) return;
      if (_.isEmpty(this.selectedData)) return;

      const ref = this.facetRef;
      let ownSelection = [{}];
      let otherSelection = [{}];

      // Reselect previous range
      const facetClause = filtersUtil.findPositiveFacetClause(this.filters, this.facet);
      if (!_.isEmpty(facetClause)) {
        const range = facetClause.values[0];
        let startIndex = this.rangeIndexMap.start[range[0]];
        let endIndex = this.rangeIndexMap.end[range[1]];
        if (_.isNil(startIndex)) {
          startIndex = 0;
        }
        if (_.isNil(endIndex)) {
          // get the last index of rangeMap
          endIndex = Object.keys(this.rangeIndexMap.end).length - 1;
        }
        ownSelection = facetUtil.createHistogramSelection(this.facet, startIndex, endIndex);
      }
      // Selections via other facets
      const partial = {};
      this.selectedData.forEach(bucket => {
        partial[bucket.key] = bucket.value;
      });
      otherSelection = facetUtil.createHistogramSlices(this.facet, partial);
      ref.select([_.merge(ownSelection[0], otherSelection[0])], false);
    }
  }
};

</script>

<style scoped lang="scss">
.facet-container {
  padding: 5px 0;
  box-sizing: border-box;
}
</style>
