<template>
  <div class="search-bar-container">
    <div ref="lexContainer" />
    <button class="btn clear-button" @click="clearSearch()">
      <i class="fa fa-remove" /> Clear
    </button>
  </div>
</template>

<script>
import _ from 'lodash';
import { Lex, ValueState } from '@uncharted.software/lex/dist/lex';
import { mapActions, mapGetters } from 'vuex';

import KeyValuePill from '@/search/pills/key-value-pill';
import ValuePill from '@/search/pills/value-pill';
import RangePill from '@/search/pills/range-pill';
import DynamicValuePill from '@/search/pills/dynamic-value-pill';
import TextPill from '@/search/pills/text-pill';
import EdgePill from '@/search/pills/edge-pill';
import NumEvidencePill from '@/search/pills/num-evidence-pill';
import BinaryRelationState from '@/search/binary-relation-state';
import SingleRelationState from '@/search/single-relation-state';

import codeUtil from '@/utils/code-util';
import filtersUtil from '@/utils/filters-util';
import polarityUtil from '@/utils/polarity-util';

import suggestionService from '@/services/suggestion-service';

const CODE_TABLE = codeUtil.CODE_TABLE;
const CONCEPTS_MSG = 'Select one or more ontological concepts';
const LABEL_MSG = 'Select a tag';
const BYOD_TAG_MSG = 'Select a label';
const AUTHOR_MSG = 'Select an author';
const ORGANIZATION_MSG = 'Select an organization';
const GEO_LOCATION_MSG = 'Select a location';
const DOC_LOCATION_MSG = 'Select a location';

const QUALITY = [
  'Not Evaluated',
  'Edited',
  'Vetted'
];

// const EVIDENCE_SOURCE = [
//   'User',
//   'Document'
// ];

export default {
  name: 'SearchBar',
  computed: {
    ...mapGetters({
      filters: 'query/filters',
      ontologyConcepts: 'app/ontologyConcepts',
      project: 'app/project'
    })
  },
  watch: {
    filters(n, o) {
      if (filtersUtil.isEqual(n, o)) return;
      this.setQuery();
    }
  },
  created() {
    this.lexRef = null;
    this.pills = [];
  },
  mounted() {
    const topicPill = new DynamicValuePill(
      CODE_TABLE.TOPIC,
      suggestionService.getConceptSuggestionFunction(this.project, this.ontologyConcepts),
      CONCEPTS_MSG,
      true,
      BinaryRelationState
    );
    const causePill = new DynamicValuePill(
      CODE_TABLE.SUBJ_CONCEPT,
      suggestionService.getConceptSuggestionFunction(this.project, this.ontologyConcepts),
      CONCEPTS_MSG,
      true,
      BinaryRelationState
    );
    const effectPill = new DynamicValuePill(
      CODE_TABLE.OBJ_CONCEPT,
      suggestionService.getConceptSuggestionFunction(this.project, this.ontologyConcepts),
      CONCEPTS_MSG,
      true,
      BinaryRelationState
    );
    const edgePill = new EdgePill(CODE_TABLE.EDGE,
      suggestionService.getConceptSuggestionFunction(this.project, this.ontologyConcepts));
    const numEvidencePill = new NumEvidencePill(CODE_TABLE.NUM_EVIDENCES);
    // Concept formatter
    [
      topicPill,
      causePill,
      effectPill,
      edgePill
    ].forEach(pill => {
      pill.setFormatter(this.ontologyFormatter);
    });

    // Defines a list of searchable fields for LEX
    this.pills = [
      new KeyValuePill(
        CODE_TABLE.POLARITY,
        polarityUtil.POLARITY_MAP,
        'Select polarity'
      ),
      new KeyValuePill(
        CODE_TABLE.STATEMENT_POLARITY,
        polarityUtil.STATEMENT_POLARITY_MAP,
        'Select polarity'
      ),
      new KeyValuePill(
        CODE_TABLE.CONTRADICTION_CATEGORY,
        codeUtil.CONTRADICTION_MAP,
        'Select one or more contradiction categories'
      ),
      new KeyValuePill(
        CODE_TABLE.HEDGING_CATEGORY,
        codeUtil.HEDGING_MAP,
        'Select one or more hedging categories'
      ),

      // TODO: Disabled for now. Check if evidence source search is required
      // new ValuePill(
      //   CODE_TABLE.EVIDENCE_SOURCE,
      //   EVIDENCE_SOURCE,
      //   'Select one or more evidence source categories'
      // ),
      new ValuePill(
        CODE_TABLE.QUALITY,
        QUALITY,
        'Select one or more quality categories'
      ),
      new ValuePill(
        CODE_TABLE.READERS,
        codeUtil.READERS_NAMES,
        'Select one or more readers'
      ),

      topicPill,
      causePill,
      effectPill,

      new TextPill(CODE_TABLE.KEYWORD),
      new TextPill(CODE_TABLE.DOC_FILE_TYPE),
      new TextPill(CODE_TABLE.DOC_PUBLICATION_YEAR),
      new TextPill(CODE_TABLE.DOC_ID),

      new DynamicValuePill(CODE_TABLE.DOC_GENRE,
        suggestionService.getSuggestionFunction(this.project, CODE_TABLE.DOC_GENRE.field),
        'Select genre',
        true,
        SingleRelationState),

      new DynamicValuePill(CODE_TABLE.DOC_LABEL,
        suggestionService.getSuggestionFunction(this.project, CODE_TABLE.DOC_LABEL.field),
        LABEL_MSG,
        true,
        SingleRelationState),
      new DynamicValuePill(CODE_TABLE.DOC_BYOD_TAG,
        suggestionService.getSuggestionFunction(this.project, CODE_TABLE.DOC_BYOD_TAG.field),
        BYOD_TAG_MSG,
        true,
        SingleRelationState),
      new DynamicValuePill(CODE_TABLE.DOC_AUTHOR,
        suggestionService.getSuggestionFunction(this.project, CODE_TABLE.DOC_AUTHOR.field),
        AUTHOR_MSG,
        true,
        SingleRelationState),
      new DynamicValuePill(CODE_TABLE.GEO_LOCATION_NAME,
        suggestionService.getSuggestionFunction(this.project, CODE_TABLE.GEO_LOCATION_NAME.field),
        GEO_LOCATION_MSG,
        true,
        SingleRelationState),
      new DynamicValuePill(CODE_TABLE.DOC_LOCATION,
        suggestionService.getSuggestionFunction(this.project, CODE_TABLE.DOC_LOCATION.field),
        DOC_LOCATION_MSG,
        true,
        SingleRelationState),
      new DynamicValuePill(CODE_TABLE.DOC_ORGANIZATION,
        suggestionService.getSuggestionFunction(this.project, CODE_TABLE.DOC_ORGANIZATION.field),
        ORGANIZATION_MSG,
        true,
        SingleRelationState),
      new TextPill(CODE_TABLE.DOC_STANCE),
      new TextPill(CODE_TABLE.DOC_SENTIMENT),

      // Specialized - range decoding
      new RangePill(CODE_TABLE.SCORE),
      new RangePill(CODE_TABLE.BELIEF),
      new RangePill(CODE_TABLE.YEAR),
      new RangePill(CODE_TABLE.MONTH),

      // Specialized - filter by edge (subj///obj)
      edgePill,

      // Specialized - number of evidence (with open-ended maximum range)
      numEvidencePill
    ];

    const language = Lex.from('field', ValueState, {
      name: 'Choose a field to search',
      suggestions: _.sortBy(this.pills, p => p.searchDisplay).map(pill =>
        pill.makeOption()
      ),
      suggestionLimit: 30,
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

      // Add hidden filters back to the newly created filters if applicable
      const enableClause = filtersUtil.findPositiveFacetClause(
        this.filters,
        'enable'
      );
      if (!_.isNil(enableClause)) {
        filtersUtil.setClause(
          newFilters,
          enableClause.field,
          enableClause.values,
          enableClause.operand,
          enableClause.isNot
        );
      }

      if (filtersUtil.isEqual(this.filters, newFilters) === false) {
        this.setSearchFilters(newFilters);
      } else {
        console.log('Same query model detected ... skipping');
      }
    });

    this.lexRef.render(this.$refs.lexContainer);
    this.setQuery();
  },
  beforeUnmount() {
    this.lexRef.reset();
  },
  methods: {
    ...mapActions({
      setSearchFilters: 'query/setSearchFilters'
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
      this.lexRef.setQuery(lexQuery, false);
    },
    clearSearch() {
      this.lexRef.reset();
    }
  }
};
</script>

<style lang="scss" scoped>

.search-bar-container :deep {
  @import '@/styles/lex-overrides';
  @include lex-wrapper;
}

</style>
