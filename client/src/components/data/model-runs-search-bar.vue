<template>
  <div class="model-runs-search-bar-container">
    <div ref="lexContainer"/>
    <button
      class="btn btn-default clear-button"
      @click="clearSearch()">
      <i class="fa fa-remove" />
    </button>
  </div>
</template>

<script>
import _ from 'lodash';
import { Lex, ValueState } from '@uncharted.software/lex/dist/lex';

import DynamicValuePill from '@/search/pills/dynamic-value-pill';
import RangePill from '@/search/pills/range-pill';
import TextPill from '@/search/pills/text-pill';
import ValuePill from '@/search/pills/value-pill';

import SingleRelationState from '@/search/single-relation-state';

import filtersUtil from '@/utils/filters-util';
import { DatacubeGenericAttributeVariableType } from '@/types/Enums';
import { TAGS } from '@/utils/datacube-util';


export default {
  name: 'ModelRunsSearchBar',
  props: {
    data: {
      type: Object,
      default: () => {}
    },
    filters: {
      type: Object,
      default: () => {}
    }
  },
  emits: ['filters-updated'],
  created() {
    this.lexRef = null;
    this.pills = [];
  },
  watch: {
    filters: function filterChanged(n, o) {
      if (filtersUtil.isEqual(n, o)) return;
      this.$emit('filters-updated', this.filters);
      this.setQuery();
    }
  },
  mounted() {
    // Generates lex pills from select datacube columns
    const keys = Object.keys(this.data);
    const basicPills = keys.map(k => {
      const keyData = this.data[k];
      const dcField = {
        field: k,
        searchDisplay: keyData.display_name,
        searchable: true
      };
      if (k === TAGS) {
        return new DynamicValuePill(
          dcField,
          async () => {
            return this.data && this.data[TAGS] ? this.data[TAGS].values : [];
          },
          'Select one or more tags to filter model runs',
          true,
          SingleRelationState);
      }
      if (keyData.values && keyData.values.length > 0) {
        // suggestions are provided for this field
        const dcOptions = keyData.values;
        return new ValuePill(dcField, dcOptions);
      } else {
        return (keyData.type === DatacubeGenericAttributeVariableType.Int || keyData.type === DatacubeGenericAttributeVariableType.Float)
          ? new RangePill(dcField) : new TextPill(dcField);
      }
    });

    // Defines a list of searchable fields for LEX
    this.pills = [
      ...basicPills // searchable fields such as country, each would provide list of suggested values
    ];

    const filtersClauses = this.filters ? this.filters.clauses : undefined;
    const filteredPills = _.reject(this.pills, (pill) => _.find(filtersClauses, { field: pill.searchKey }));
    const suggestions = filteredPills.map(pill =>
      pill.makeOption()
    );

    const language = Lex.from('field', ValueState, {
      name: 'Choose a field to search',
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
      placeholder: 'Filter runs',
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
        // emit the filters so that the relevant components may react
        this.$emit('filters-updated', newFilters);
      }
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

<style lang='scss' scoped>
.model-runs-search-bar-container {
  display: flex;

  & > ::v-deep(div) {
    flex: 1;
    min-width: 0p;
  }
}

// Override lex box styles to allow for pills to wrap
::v-deep(.lex-box) {
  padding: 2px;
  // Lex has a min-height of 40px by default, but it's 41px when active/focused
  // Keeping this constant avoids a page reflow (and rerendering of PC chart)
  min-height: 41px;
  // Be sure to leave room to the right of long pills to allow the analyst
  //  to click to add new pills
  padding-right: 20px;

  .token-container:not(:first-child) {
    margin-top: 2px;
  }

  .token {
    margin: 0;
    font-size: 1.4rem;
    white-space: normal;

    button.token-remove,
    button.token-cancel {
      position: relative;
      top: unset;
      transform: none;
    }
  }

  .token-icon {
    display: none !important;
  }
}

.clear-button {
  flex: 0;
  padding: 5px;
}

</style>
