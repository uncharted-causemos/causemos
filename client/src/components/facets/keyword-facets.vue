<template>
  <div class="facet-container">
    <div ref="container" />
  </div>
</template>

<script>
import _ from 'lodash';
import { mapActions, mapGetters } from 'vuex';
import Facet from '@uncharted.software/stories-facets';
import filtersUtil from '@/utils/filters-util';

export default {
  name: 'KeywordFacets',
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
    }
  },
  computed: {
    ...mapGetters({
      filters: 'query/filters'
    })
  },
  watch: {
    filters(n, o) {
      if (filtersUtil.isEqual(n, o)) return;
      this.refresh();
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
      removeSearchTerm: 'query/removeSearchTerm'
    }),
    init() {
      const targetElement = this.$refs.container;
      this.facetRef = new Facet(targetElement, [], null, { enableBadges: true, badgesTitle: this.label });

      this.facetRef.on('badge:close', (evt, key, value) => {
        this.removeSearchTerm({ field: this.facet, term: value });
      });
      this.refresh();
    },
    refresh() {
      const facetClause = filtersUtil.findPositiveFacetClause(this.filters, this.facet);
      if (!_.isEmpty(facetClause)) {
        const keywords = facetClause.values;
        const data = keywords.map(keyword => {
          return { key: this.facet, value: keyword };
        });
        this.facetRef.removeBadges();
        this.facetRef.createBadges(data);
      } else {
        this.facetRef.removeBadges();
      }
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

