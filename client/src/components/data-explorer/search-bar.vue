<template>
  <div class="search-bar-container">
    <div ref="lexContainer" />
    <button class="btn clear-button" @click="clearSearch()"><i class="fa fa-remove" />Clear</button>
  </div>
</template>

<script>
import _ from 'lodash';
import { Lex, ValueState } from '@uncharted.software/lex/dist/lex';
import { mapActions, mapGetters } from 'vuex';

import TextPill from '@/search/pills/text-pill';
import RangePill from '@/search/pills/range-pill';
import ValuePill from '@/search/pills/value-pill';
import DynamicValuePill from '@/search/pills/dynamic-value-pill';
import SingleRelationState from '@/search/single-relation-state';

import datacubeUtil from '@/utils/datacube-util';
import filtersUtil from '@/utils/filters-util';
import suggestionService from '@/services/suggestion-service';

const CODE_TABLE = datacubeUtil.CODE_TABLE;
const SUGGESTION_CODE_TABLE = datacubeUtil.SUGGESTION_CODE_TABLE;

export default {
  name: 'SearchBar',
  props: {
    facets: {
      type: Object,
      default: () => {},
    },
  },
  computed: {
    ...mapGetters({
      filters: 'dataSearch/filters',
    }),
  },
  watch: {
    filters: function filterChanged(n, o) {
      if (filtersUtil.isEqual(n, o)) return;
      this.setQuery();
    },
  },
  created() {
    this.lexRef = null;
    this.pills = [];
  },
  mounted() {
    // Generates lex pills from select datacube columns
    const excludedFields = Object.values(SUGGESTION_CODE_TABLE)
      .map((v) => v.field)
      .concat(Object.values(CODE_TABLE).map((v) => v.field));
    const keys = _.difference(Object.keys(this.facets), excludedFields);
    const basicPills = keys.map((k) => {
      const dcField = {
        field: k,
        display: k,
        icon: '',
        iconText: '',
        searchDisplay: datacubeUtil.DISPLAY_NAMES[k],
      };
      const dcOptions = this.facets[k].map((f) => f.key);

      return new ValuePill(dcField, dcOptions);
    });

    const suggestionPills = Object.values(SUGGESTION_CODE_TABLE).map(
      (suggestInfo) =>
        new DynamicValuePill(
          suggestInfo,
          suggestionService.getDatacubeFieldSuggestionFunction(
            suggestInfo.field,
            suggestInfo.filterFunc
          ),
          suggestInfo.searchMessage,
          true,
          SingleRelationState
        )
    );

    // Defines a list of searchable fields for LEX
    this.pills = [
      new TextPill(CODE_TABLE.SEARCH),
      new DynamicValuePill(
        CODE_TABLE.ONTOLOGY_MATCH,
        suggestionService.getDatacubeFieldSuggestionFunction(CODE_TABLE.ONTOLOGY_MATCH.field),
        'Select one or more ontological concepts',
        true,
        SingleRelationState
      ),
      new RangePill(CODE_TABLE.PERIOD),
      ...suggestionPills,
      ...basicPills, // excludes suggestionPills and CODE_TABLE pills
      new TextPill(CODE_TABLE.ID),
    ];

    const filteredPills = _.reject(this.pills, (pill) =>
      _.find(this.filters.clauses, { field: pill.searchKey })
    );
    const suggestions = filteredPills.map((pill) => pill.makeOption());

    const language = Lex.from('field', ValueState, {
      name: 'Choose a field to search or search all with keyword',
      suggestions,
      suggestionLimit: suggestions.length,
      autoAdvanceDefault: true,
      defaultValue: filteredPills[0].makeOption(),
      icon: (v) => {
        if (_.isNil(v)) return '<i class="fa fa-search"></i>';
        const pill = this.pills.find((pill) => pill.searchKey === v.meta.searchKey);
        return pill.makeIcon();
      },
    }).branch(...this.pills.map((pill) => pill.makeBranch()));

    this.lexRef = new Lex({
      language: language,
      placeholder: 'Search items...',
      tokenXIcon: '<i class="fa fa-remove"></i>',
    });

    this.lexRef.on('query changed', (...args) => {
      const model = args[0];
      const newFilters = filtersUtil.newFilters();

      model.forEach((item) => {
        const pill = this.pills.find((pill) => pill.searchKey === item.field.meta.searchKey);
        if (!_.isNil(pill)) {
          pill.lex2Filters(item, newFilters);
        }
      });

      if (filtersUtil.isEqual(this.filters, newFilters) === false) {
        this.setSearchFilters(newFilters);
      } else {
        console.log('Same query model detected ... skipping');
      }
    });

    this.lexRef.render(this.$refs.lexContainer);
    this.setQuery();
  },
  methods: {
    ...mapActions({
      setSearchFilters: 'dataSearch/setSearchFilters',
    }),
    setQuery() {
      if (!this.lexRef) return;
      const lexQuery = [];
      this.filters.clauses.forEach((clause) => {
        const pill = this.pills.find((pill) => pill.searchKey === clause.field);
        if (!_.isNil(pill)) {
          const selectedPill = pill.makeOption();
          pill.filters2Lex(clause, selectedPill, lexQuery);
        }
      });
      this.lexRef.setQuery(lexQuery, false); // TODO: I assume this doesn't call query changed?
    },
    clearSearch() {
      this.lexRef.reset();
    },
  },
};
</script>

<style lang="scss" scoped>
// Need to import this file at the top level to be able to @include lex-wrapper.
@import '@/styles/lex-overrides';
// .search-bar-container can't be inside the :deep() selector since it's at
//  the top level of this component.
.search-bar-container {
  @include lex-wrapper;
}
:deep(*) {
  // Import these styles within the deep wildcard selector to apply them to all
  //  the elements created by lex within this component.
  @import '@/styles/lex-overrides';
}
</style>
