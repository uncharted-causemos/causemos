<template>
  <div class="facet-container">
    <div ref="container" />
  </div>
</template>

<script>
import _ from 'lodash';
import { mapActions, mapGetters } from 'vuex';

import Facet from '@uncharted.software/stories-facets';
import numberFormatter from '@/formatters/number-formatter';
import facetUtil from '@/utils/facet-util';
import filtersUtil from '@/utils/filters-util';

const FACET_DEFAULT_SIZE = 5;

const makeLabel = (newCount, totalCount) => {
  const c = '#0089a4';
  const newCountLabel = numberFormatter(newCount);
  const totalCountLabel = numberFormatter(totalCount);
  return `<span style="color:${c}">${newCountLabel}</span>/${totalCountLabel}`;
};

/**
 * Facet component - displays aggregated search terms and update query state.
 * Note facet does not filter itself, this is to allow term disjunction queries.
 *
 * Properties
 * - label: facet label
 * - facet: field key
 * - formatterFn: value formatter
 * - rescaleAfterSelect: Whether the bars should be rescaled after selection, to reflect
 *   the current possible maximum value, rather than the global absolute maximum value.
 */
export default {
  name: 'Facets',
  props: {
    label: {
      type: String,
      default: 'Facet'
    },
    facet: {
      type: String,
      default: null
    },
    formatterFn: {
      type: Function,
      default: null
    },
    rescaleAfterSelect: {
      type: Boolean,
      default: false
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
    facetRef: null, // Facet widget reference
    facetMax: 0,
    facetExpandState: 0
  }),
  computed: {
    ...mapGetters({
      filters: 'query/filters'
    }),
    selectedTerms() {
      const facetClause = filtersUtil.findPositiveFacetClause(this.filters, this.facet);
      if (!_.isEmpty(facetClause)) {
        return facetClause.values;
      }
      return [];
    }
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
  beforeDestroy() {
    if (this.facetRef) this.facetRef.destroy();
    this.facetRef = null;
  },
  methods: {
    ...mapActions({
      addSearchTerm: 'query/addSearchTerm',
      removeSearchTerm: 'query/removeSearchTerm'
    }),
    init() {
      if (this.facetRef) {
        this.facetRef.destroy();
        this.facetRef = null;
      }

      const targetElement = this.$refs.container;
      this.facetRef = new Facet(targetElement, []);
      const facetRef = this.facetRef;

      // Handles showing "more/less"
      facetRef.on('facet-group:more', (evt) => {
        if (evt.currentTarget.classList.contains('more')) {
          this.facetExpandState++;
        } else {
          this.facetExpandState--;
        }
        this.resetOrCreateFacet();
        this.applySelectedTerms();
      });


      // Handler to toggle highlight/selection
      facetRef.on('facet:click', (evt, key, value) => {
        if (this.selectedTerms.indexOf(value) >= 0) {
          this.removeSearchTerm({ field: this.facet, term: value });
        } else {
          this.addSearchTerm({ field: this.facet, term: value });
        }
      });

      // Load all the data for the first time
      this.facetData = this.baseData.map(d => {
        return {
          label: this.formatterFn ? this.formatterFn(d.key) : d.key,
          value: d.key,
          count: d.value,
          selected: d.value,
          countLabel: makeLabel(d.value, d.value),
          origCount: d.value,
          icon: {}
        };
      });
      this.facetMax = _.max(this.facetData.map(d => d.count));

      // If filter is not full, get the distribution of the filtered results
      if (!_.isEmpty(this.selectedData)) {
        this.refresh();
      } else {
        this.resetOrCreateFacet();
      }
    },
    resetOrCreateFacet() {
      const ref = this.facetRef;
      const expand = this.facetExpandState;

      const newFacet = {
        key: this.facet,
        label: this.label,
        total: this.facetMax
      };

      const dataLength = this.facetData.length;
      const numSelected = this.selectedTerms.length;

      if (dataLength > FACET_DEFAULT_SIZE) {
        if (expand === 0) {
          newFacet.more = [{ label: 'More', class: 'more', clickable: true }];
          newFacet.facets = this.facetData.slice(0, FACET_DEFAULT_SIZE + numSelected);
        } else if (expand === 1) {
          newFacet.more = [
            { label: 'Less', class: 'less', clickable: true }
          ];

          if (dataLength > 20 + numSelected) {
            newFacet.more.push({ label: 'More', class: 'more', clickable: true });
          }

          newFacet.facets = this.facetData.slice(0, 20 + numSelected);
        } else {
          newFacet.more = [{ label: 'Less', class: 'less', clickable: true }];
          newFacet.facets = this.facetData.slice(0, dataLength);
        }
      } else {
        newFacet.facets = this.facetData;
      }

      if (ref.getGroup(this.facet) === null) {
        ref.append([newFacet]);
      } else {
        ref.replaceGroup(newFacet);
      }
    },
    updateFacetData(data) {
      // We need to use our own attribute "origCount" in order to keep track and to rescale according to selected
      // terms, this may be error prone if the library decides to prune extra fields.
      this.facetData.forEach(term => {
        const newTerm = _.find(data, bucket => bucket.key === term.value);
        if (_.isEmpty(newTerm)) {
          term.selected = 0;
        } else {
          term.selected = newTerm.value;
        }
        term.countLabel = makeLabel(term.selected, term.origCount);
      });

      // Check if we want ot rescale: rescale the bars (not the labels) to the max width of the
      // selected terms.
      if (this.rescaleAfterSelect === false) {
        this.facetMax = _.max(this.facetData.map(d => d.count));
      } else {
        this.facetMax = _.max(this.facetData.map(d => d.selected));
        this.facetData.forEach(term => {
          term.count = this.facetMax < term.origCount ? this.facetMax : term.origCount;
        });
      }
    },
    applySelectedCounts() {
      // This seem to cause problems after stories-facet is replace for some odd reason...
      const selection = facetUtil.createFacetCountSelection(this.facet, this.facetData);
      this.facetRef.select([selection]);
    },
    applySelectedTerms() {
      // Deselect all first
      this.facetData.forEach(d => {
        this.facetRef.unhighlight([{ key: this.facet, value: d.value }]);
      });

      // Reselect previous selection/highlight
      if (!_.isEmpty(this.selectedTerms)) {
        this.selectedTerms.forEach(term => {
          this.facetRef.highlight([{ key: this.facet, value: term }]);
        });
      }
    },
    refresh() {
      if (_.isEmpty(this.baseData)) return;
      if (_.isEmpty(this.selectedData)) return;
      this.updateFacetData(this.selectedData);
      this.facetData = facetUtil.reshuffle(this.facetData, this.selectedTerms);
      this.resetOrCreateFacet();
      this.applySelectedTerms();
    }
  }
};
</script>

<style lang="scss">
@import "~styles/variables";
.facet-container {
  padding: 5px 0;
  box-sizing: border-box;


  .group-other-label-container {
    font-family: FontAwesome;

    .more, .less{
      font-size: $font-size-small;
      margin-left: 15px;
    }
    .more:before {
      content: '\f107 ';
    }
    .less:before {
      content: '\f106 ';
    }
  }

  // Remove 'Oswald' font
  .group-header,
  .facet-label,
  .facet-label-count {
    font-family: inherit;
  }

  .facet-label-count {
    font-size: $font-size-large;
    top: -4px;
    position: relative;
  }

  // Remove hover transition since it felt slow and less snappy
  .facets-facet-vertical {
    transition: margin .5s ease, padding .5s ease, height .5s ease, opacity .5s ease;
  }
  // Remove 'box-shadow' transition which is used to darken the bar on hover
  // for the same reason
  .facets-facet-vertical .facet-bar-base {
    transition: width .4s, opacity 0.5s;
  }

  //Facets overrides
  .facets-facet-vertical .facet-bar-selected {
    box-shadow: inset 0 0 0 1000px $selected;
  }
  .facets-facet-vertical:hover .facet-bar-selected {
    box-shadow: inset 0 0 0 1000px $selected-dark; }

  .facet-label-count {
    span{
      color: $selected-dark !important;
    }
  }

  .facets-facet-horizontal .facet-histogram-bar-highlighted {
    fill: $selected;
  }

  .facets-facet-horizontal g:hover .facet-histogram-bar-highlighted {
    fill: $selected-dark; }

  .facets-facet-horizontal .facet-range-filter {
    box-shadow: inset 0 0 0 1000px rgba(86, 179, 233,.15);
  }
}
</style>
