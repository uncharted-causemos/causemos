<template>
  <div class="row no-gutter">
    <div class="col-md-12 search-bar">
      <div ref="lexContainer" />
      <div class="clear-button-container">
        <button
          class="btn btn-default clear-button"
          @click="clearSearch()">
          <i class="fa fa-remove" /> Clear
        </button>
      </div>
    </div>
  </div>
</template>

<script>
import _ from 'lodash';
import API from '@/api/api';
import { h } from 'preact'; // eslint-disable-line @typescript-eslint/no-unused-vars
import { Lex, ValueState } from '@uncharted.software/lex/dist/lex';
import { mapActions, mapGetters } from 'vuex';

import TextPill from '@/search/pills/text-pill';
import RangePill from '@/search/pills/range-pill';
import DynamicValuePill from '@/search/pills/dynamic-value-pill';
import SingleRelationState from '@/search/single-relation-state';

import codeUtil from '@/utils/code-util';
import datacubeUtil from '@/utils/datacube-util';
import filtersUtil from '@/utils/filters-util';

const CODE_TABLE = codeUtil.CODE_TABLE;
const CONCEPTS_MSG = 'Select one or more ontological concepts';

export default {
  name: 'SearchBar',
  props: {
    datacubes: {
      type: Array,
      default: () => []
    }
  },
  computed: {
    ...mapGetters({
      filters: 'dataSearch/filters',
      ontologyConcepts: 'dataSearch/ontologyConcepts'
    })
  },
  watch: {
    filters: function filterChanged(n, o) {
      if (filtersUtil.isEqual(n, o)) return;
      this.setQuery();
    }
  },
  created() {
    this.lexRef = null;
    this.pills = [];
  },
  mounted() {
    // Generates lex pills from select datacube columns
    let keys = Object.keys(this.datacubes[0]);
    keys = keys.filter((k) => datacubeUtil.DISPLAY_NAMES[k] !== undefined);
    keys.sort();
    const datacubePills = keys.map(k => new TextPill({ field: k, display: k, icon: '', iconText: '', searchDisplay: datacubeUtil.DISPLAY_NAMES[k] }));

    // Defines a list of searchable fields for LEX
    this.pills = [
      // TODO: Will add when there's support for location
      // new ValuePill(CODE_TABLE.GEO_LOCATION_NAME, GeoUtil.GEO_LOCATION_NAMES, 'Select one or more geospatial context'),
      new TextPill(CODE_TABLE.DC_SEARCH),
      new DynamicValuePill(CODE_TABLE.DC_CONCEPT_NAME, () => this.ontologyConcepts, CONCEPTS_MSG, true, SingleRelationState),
      new RangePill(CODE_TABLE.DC_PERIOD),
      ...datacubePills
    ];

    const language = Lex.from('field', ValueState, {
      name: 'Choose a field to search',
      fetchSuggestions: (function(self) {
        return function() {
          // This limits the lex bar so that it can only have one unique kind of pill, i.e. only one concept, one temporal field, one location
          const filteredPills = _.reject(self.pills, (pill) => _.find(self.filters.clauses, { field: pill.searchKey }));
          return _.sortBy(filteredPills, p => p.searchDisplay).map(pill =>
            pill.makeOption()
          );
        };
      })(this),
      suggestionLimit: 50,
      icon: v => {
        if (_.isNil(v)) return '<i class="fa fa-search"></i>';
        const pill = this.pills.find(
          pill => pill.searchKey === v.meta.searchKey
        );
        return pill.makeIcon();
      }
    }).branch(...this.pills.map(pill => pill.makeBranch()));

    this.lexRef = new Lex({
      language: language,
      placeholder: 'Search items...',
      tokenXIcon: '<i class="fa fa-remove"></i>'
    });

    this.lexRef.on('query changed', (...args) => {
      const model = args[0];
      const newFilters = filtersUtil.newFilters();

      model.forEach(item => {
        const pill = this.pills.find(
          pill => pill.searchKey === item.field.meta.searchKey
        );
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
    this.updateOntologyConcepts();
  },
  methods: {
    ...mapActions({
      setSearchFilters: 'dataSearch/setSearchFilters',
      setOntologyConcepts: 'dataSearch/setOntologyConcepts'
    }),
    setQuery() {
      if (!this.lexRef) return;
      const lexQuery = [];
      this.filters.clauses.forEach(clause => {
        const pill = this.pills.find(pill => pill.searchKey === clause.field);
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
    async updateOntologyConcepts() {
      const { data } = await API.get('maas/concepts');
      this.setOntologyConcepts(data);
    }
  }
};
</script>

<style lang='scss' scoped>
@import "~@uncharted.software/lex/dist/lex.scss";
@import "~styles/variables";

// Lex expands if there are pills, this is to insure things don't jump around
$searchbar-height: 40px;

.lex-assistant-box {
  z-index: 99;
  max-width: 50vw !important; // lex sets this style in-line and require important flag
  .selectable {
    // this is backup just in case we have a really long identifier
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }
}

div.lex-box {
  min-height: $searchbar-height;
  height: auto;
  background: #FFFFFF;
}

.form-control {
  padding: 2px 8px;
}

.clear-button {
  min-height: $searchbar-height;
  width: 100%;
}

.search-bar {
  padding-bottom: 5px;
  padding-left: 0;
}

//Remove gutter spaces for rows
.row.no-gutter {
  margin-left: 0;
  margin-right: 0;
}

.row.no-gutter [class*='col-']:not(:first-child),
.row.no-gutter [class*='col-']:not(:last-child) {
  padding-right: 0;
  padding-left: 0;
}
</style>
