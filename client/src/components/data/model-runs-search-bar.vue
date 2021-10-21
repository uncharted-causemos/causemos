<template>
  <div class="row no-gutter">
    <div class="col-md-12 search-bar lex-bar-container">
      <div ref="lexContainer" class="lex-box-container" />
      <div class="clear-button-container">
        <button
          class="btn btn-default clear-button"
          @click="clearSearch()">
          <i class="fa fa-remove" />
        </button>
      </div>
    </div>
  </div>
</template>

<script>
import _ from 'lodash';
import { Lex, ValueState } from '@uncharted.software/lex/dist/lex';

import TextPill from '@/search/pills/text-pill';
import ValuePill from '@/search/pills/value-pill';
// import RangePill from '@/search/pills/range-pill';

import datacubeUtil from '@/utils/datacube-util';
import filtersUtil from '@/utils/filters-util';

const CODE_TABLE = datacubeUtil.CODE_TABLE;

export default {
  name: 'ModelRunsSearchBar',
  props: {
    data: {
      type: Object,
      default: () => {}
    }
  },
  emits: ['filters-updated'],
  created() {
    this.lexRef = null;
    this.pills = [];
    this.filters = {};
  },
  mounted() {
    // Generates lex pills from select datacube columns
    const keys = Object.keys(this.data);
    const basicPills = keys.map(k => {
      const dcField = {
        field: k,
        searchDisplay: this.data[k].display_name
      };
      if (this.data[k].values && this.data[k].values.length > 0) {
        // suggestions are provided for this field
        const dcOptions = this.data[k].values;
        return new ValuePill(dcField, dcOptions);
      } else {
        return new TextPill(dcField);
      }
    });

    // Defines a list of searchable fields for LEX
    this.pills = [
      new TextPill(CODE_TABLE.SEARCH), // keyword
      // new RangePill(CODE_TABLE.PERIOD), // range field: user would need to specify start and end values for the range
      ...basicPills // searchable fields such as country, each would provide list of suggested values
    ];

    const filteredPills = _.reject(this.pills, (pill) => _.find(this.filters.clauses, { field: pill.searchKey }));
    const suggestions = filteredPills.map(pill =>
      pill.makeOption()
    );

    const language = Lex.from('field', ValueState, {
      name: 'Choose a field to search or search all with keyword',
      suggestions,
      suggestionLimit: suggestions.length,
      autoAdvanceDefault: true,
      defaultValue: filteredPills[0].makeOption(),
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
        // console.log(newFilters);
        this.filters = newFilters;
      } else {
        // console.log('Same query model detected ... skipping');
        this.filters = {};
      }
      // emit the filters so that the relevant components may react
      this.$emit('filters-updated', this.filters);
    });

    this.lexRef.render(this.$refs.lexContainer);
    this.setQuery();
  },
  methods: {
    setQuery() {
      if (!this.lexRef) return;
      const lexQuery = [];
      if (!_.isEmpty(this.filters)) {
        this.filters.clauses.forEach(clause => {
          const pill = this.pills.find(pill => pill.searchKey === clause.field);
          if (!_.isNil(pill)) {
            const selectedPill = pill.makeOption();
            pill.filters2Lex(clause, selectedPill, lexQuery);
          }
        });
      }
      this.lexRef.setQuery(lexQuery, false); // TODO: I assume this doesn't call query changed?
    },
    clearSearch() {
      this.lexRef.reset();
    }
  }
};
</script>

<style lang='scss'>
.lex-bar-container {
  display: flex;
  width: 100%;
  .clear-button-container {
    position: relative;
    display: flex;
    align-items: center;
    width: auto;
    button {
      border-radius: 25%;
      background: lightyellow;
      width: auto;
      height: auto;
      padding: 1px;
    }
  }
  .lex-box-container {
    width: 100%;
    div:first-child {
      padding: 0;
      display: flex;
      align-items: center;
      div.token {
        display: flex;
        flex-wrap: wrap;
        .button-group { // parent of the button classed .token-cancel
          display: flex;
          align-items: center;
          span {
            background: red;
          }
        }
        .token-cancel {
          position: relative;
          transform: inherit;
        }
        .token-remove {
          position: relative;
          transform: inherit;
          span {
            background: red;
          }
        }
      }
    }
  }
}


</style>
