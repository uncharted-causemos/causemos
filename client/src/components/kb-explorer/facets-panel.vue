<template>
  <side-panel
    class="facet-panel-container"
    :tabs="facetTabs"
    :current-tab-name="currentTab"
    @set-active="setActive"
  >
    <div v-if="currentTab === 'Evidence quality'">
      <numerical-facet
        v-if="hasData(CODE_TABLE.BELIEF.field)"
        key="CODE_TABLE.BELIEF.field"
        :facet="CODE_TABLE.BELIEF.field"
        :label="CODE_TABLE.BELIEF.searchDisplay"
        :base-data="baseData[CODE_TABLE.BELIEF.field]"
        :selected-data="facetData[CODE_TABLE.BELIEF.field]"
      />
      <numerical-facet
        v-if="hasData(CODE_TABLE.SCORE.field)"
        key="CODE_TABLE.SCORE.field"
        :facet="CODE_TABLE.SCORE.field"
        :label="CODE_TABLE.SCORE.searchDisplay"
        :base-data="baseData[CODE_TABLE.SCORE.field]"
        :selected-data="facetData[CODE_TABLE.SCORE.field]"
      />
      <categorical-facet
        v-if="hasData(CODE_TABLE.HEDGING_CATEGORY.field)"
        key="CODE_TABLE.HEDGING_CATEGORY.field"
        :facet="CODE_TABLE.HEDGING_CATEGORY.field"
        :label="CODE_TABLE.HEDGING_CATEGORY.searchDisplay"
        :formatter-fn="hedgingCategoryFormatter"
        :base-data="baseData[CODE_TABLE.HEDGING_CATEGORY.field]"
        :selected-data="facetData[CODE_TABLE.HEDGING_CATEGORY.field]"
        :rescale-after-select="true"
      />
      <numerical-facet
        v-if="hasData(CODE_TABLE.NUM_EVIDENCES.field)"
        key="CODE_TABLE.NUM_EVIDENCES.field"
        :facet="CODE_TABLE.NUM_EVIDENCES.field"
        :label-formatter-fn="numEvidencesLabelFormatter"
        :label="CODE_TABLE.NUM_EVIDENCES.searchDisplay"
        :base-data="baseData[CODE_TABLE.NUM_EVIDENCES.field]"
        :selected-data="facetData[CODE_TABLE.NUM_EVIDENCES.field]"
      />
      <categorical-facet
        v-if="hasData(CODE_TABLE.READERS.field)"
        key="CODE_TABLE.READERS.field"
        :facet="CODE_TABLE.READERS.field"
        :label="CODE_TABLE.READERS.searchDisplay"
        :base-data="baseData[CODE_TABLE.READERS.field]"
        :selected-data="facetData[CODE_TABLE.READERS.field]"
        :rescale-after-select="true"
      />
      <categorical-facet
        v-if="hasData(CODE_TABLE.QUALITY.field)"
        key="CODE_TABLE.QUALITY.field"
        :facet="CODE_TABLE.QUALITY.field"
        :label="CODE_TABLE.QUALITY.searchDisplay"
        :base-data="baseData[CODE_TABLE.QUALITY.field]"
        :selected-data="facetData[CODE_TABLE.QUALITY.field]"
        :rescale-after-select="true"
      />
    </div>

    <div v-if="currentTab === 'Relationships'">
      <categorical-facet
        v-if="hasData(CODE_TABLE.STATEMENT_POLARITY.field)"
        key="CODE_TABLE.STATEMENT_POLARITY.field"
        :facet="CODE_TABLE.STATEMENT_POLARITY.field"
        :label="CODE_TABLE.STATEMENT_POLARITY.searchDisplay"
        :formatter-fn="statementPolarityFormatter"
        :base-data="baseData[CODE_TABLE.STATEMENT_POLARITY.field]"
        :selected-data="facetData[CODE_TABLE.STATEMENT_POLARITY.field]"
        :rescale-after-select="true"
      />
      <categorical-facet
        v-if="hasData(CODE_TABLE.SUBJ_CONCEPT.field)"
        key="CODE_TABLE.SUBJ_CONCEPT.field"
        :facet="CODE_TABLE.SUBJ_CONCEPT.field"
        :label="CODE_TABLE.SUBJ_CONCEPT.searchDisplay"
        :formatter-fn="ontologyFormatter"
        :base-data="baseData[CODE_TABLE.SUBJ_CONCEPT.field]"
        :selected-data="facetData[CODE_TABLE.SUBJ_CONCEPT.field]"
        :rescale-after-select="true"
      />
      <categorical-facet
        v-if="hasData(CODE_TABLE.OBJ_CONCEPT.field)"
        key="CODE_TABLE.OBJ_CONCEPT.field"
        :facet="CODE_TABLE.OBJ_CONCEPT.field"
        :label="CODE_TABLE.OBJ_CONCEPT.searchDisplay"
        :formatter-fn="ontologyFormatter"
        :base-data="baseData[CODE_TABLE.OBJ_CONCEPT.field]"
        :selected-data="facetData[CODE_TABLE.OBJ_CONCEPT.field]"
        :rescale-after-select="true"
      />
      <categorical-facet
        v-if="hasData(CODE_TABLE.TOPIC.field)"
        key="CODE_TABLE.TOPIC.field"
        :facet="CODE_TABLE.TOPIC.field"
        :label="CODE_TABLE.TOPIC.searchDisplay"
        :formatter-fn="ontologyFormatter"
        :base-data="baseData[CODE_TABLE.TOPIC.field]"
        :selected-data="facetData[CODE_TABLE.TOPIC.field]"
        :rescale-after-select="true"
      />
    </div>
    <div v-if="currentTab === 'Documents'">
      <categorical-facet
        v-if="hasData(CODE_TABLE.DOC_GENRE.field)"
        key="CODE_TABLE.DOC_GENRE.field"
        :facet="CODE_TABLE.DOC_GENRE.field"
        :label="CODE_TABLE.DOC_GENRE.searchDisplay"
        :base-data="baseData[CODE_TABLE.DOC_GENRE.field]"
        :selected-data="facetData[CODE_TABLE.DOC_GENRE.field]"
        :rescale-after-select="true"
      />
      <categorical-facet
        v-if="hasData(CODE_TABLE.DOC_LABEL.field)"
        key="CODE_TABLE.DOC_LABEL.field"
        :facet="CODE_TABLE.DOC_LABEL.field"
        :label="CODE_TABLE.DOC_LABEL.searchDisplay"
        :base-data="baseData[CODE_TABLE.DOC_LABEL.field]"
        :selected-data="facetData[CODE_TABLE.DOC_LABEL.field]"
        :rescale-after-select="true"
      />
      <categorical-facet
        v-if="hasData(CODE_TABLE.DOC_BYOD_TAG.field)"
        key="CODE_TABLE.DOC_BYOD_TAG.field"
        :facet="CODE_TABLE.DOC_BYOD_TAG.field"
        :label="CODE_TABLE.DOC_BYOD_TAG.searchDisplay"
        :base-data="baseData[CODE_TABLE.DOC_BYOD_TAG.field]"
        :selected-data="facetData[CODE_TABLE.DOC_BYOD_TAG.field]"
        :rescale-after-select="true"
      />
      <categorical-facet
        v-if="hasData(CODE_TABLE.DOC_LOCATION.field)"
        key="CODE_TABLE.DOC_LOCATION.field"
        :facet="CODE_TABLE.DOC_LOCATION.field"
        :label="CODE_TABLE.DOC_LOCATION.searchDisplay"
        :base-data="baseData[CODE_TABLE.DOC_LOCATION.field]"
        :selected-data="facetData[CODE_TABLE.DOC_LOCATION.field]"
        :rescale-after-select="true"
      />
      <categorical-facet
        v-if="hasData(CODE_TABLE.DOC_ORGANIZATION.field)"
        key="CODE_TABLE.DOC_ORGANIZATION.field"
        :facet="CODE_TABLE.DOC_ORGANIZATION.field"
        :label="CODE_TABLE.DOC_ORGANIZATION.searchDisplay"
        :base-data="baseData[CODE_TABLE.DOC_ORGANIZATION.field]"
        :selected-data="facetData[CODE_TABLE.DOC_ORGANIZATION.field]"
        :rescale-after-select="true"
      />
      <categorical-facet
        v-if="hasData(CODE_TABLE.DOC_PUBLICATION_YEAR.field)"
        key="CODE_TABLE.DOC_PUBLICATION_YEAR.field"
        :facet="CODE_TABLE.DOC_PUBLICATION_YEAR.field"
        :label="CODE_TABLE.DOC_PUBLICATION_YEAR.searchDisplay"
        :base-data="baseData[CODE_TABLE.DOC_PUBLICATION_YEAR.field]"
        :selected-data="facetData[CODE_TABLE.DOC_PUBLICATION_YEAR.field]"
        :rescale-after-select="true"
      />
      <categorical-facet
        v-if="hasData(CODE_TABLE.DOC_STANCE.field)"
        key="CODE_TABLE.DOC_STANCE.field"
        :facet="CODE_TABLE.DOC_STANCE.field"
        :label="CODE_TABLE.DOC_STANCE.searchDisplay"
        :base-data="baseData[CODE_TABLE.DOC_STANCE.field]"
        :selected-data="facetData[CODE_TABLE.DOC_STANCE.field]"
        :rescale-after-select="true"
      />
      <categorical-facet
        v-if="hasData(CODE_TABLE.DOC_SENTIMENT.field)"
        key="CODE_TABLE.DOC_SENTIMENT.field"
        :facet="CODE_TABLE.DOC_SENTIMENT.field"
        :label="CODE_TABLE.DOC_SENTIMENT.searchDisplay"
        :base-data="baseData[CODE_TABLE.DOC_SENTIMENT.field]"
        :selected-data="facetData[CODE_TABLE.DOC_SENTIMENT.field]"
        :rescale-after-select="true"
      />
    </div>
  </side-panel>
</template>

<script lang="ts">

import _ from 'lodash';
import { defineComponent, ref, Ref } from 'vue';
import { mapActions, mapGetters } from 'vuex';
import projectService from '@/services/project-service';

import CategoricalFacet from '@/components/facets/categorical-facet.vue';
import NumericalFacet from '@/components/facets/numerical-facet.vue';
import SidePanel from '@/components/side-panel/side-panel.vue';

import statementPolarityFormatter from '@/formatters/statement-polarity-formatter';
import contradictionCategoryFormatter from '@/formatters/contradiction-category-formatter';
import hedgingCategoryFormatter from '@/formatters/hedging-category-formatter';
import codeUtil from '@/utils/code-util';
import facetUtil from '@/utils/facet-util';
import filtersUtil from '@/utils/filters-util';

const CODE_TABLE = codeUtil.CODE_TABLE;

/**
 * Notes
 * - keyword is technically not a facet, it just uses the faceting UI
 */
const STATEMENT_FACETS = [
  CODE_TABLE.BELIEF.field,
  CODE_TABLE.NUM_EVIDENCES.field,
  CODE_TABLE.READERS.field,
  CODE_TABLE.QUALITY.field,
  CODE_TABLE.HEDGING_CATEGORY.field,
  CODE_TABLE.SCORE.field
];

const RELATIONSHIP_FACETS = [
  CODE_TABLE.SUBJ_CONCEPT.field,
  CODE_TABLE.OBJ_CONCEPT.field,
  CODE_TABLE.TOPIC.field,
  CODE_TABLE.STATEMENT_POLARITY.field
];

const DOCUMENT_FACETS = [
  CODE_TABLE.DOC_GENRE.field,
  CODE_TABLE.DOC_LABEL.field,
  CODE_TABLE.DOC_BYOD_TAG.field,
  CODE_TABLE.DOC_PUBLICATION_YEAR.field,
  CODE_TABLE.DOC_LOCATION.field,
  CODE_TABLE.DOC_ORGANIZATION.field,
  CODE_TABLE.DOC_STANCE.field,
  CODE_TABLE.DOC_SENTIMENT.field
];

const FACET_GROUPS: { [key: string]: string[] } = {
  'Documents': DOCUMENT_FACETS,
  'Relationships': RELATIONSHIP_FACETS,
  'Evidence quality': STATEMENT_FACETS
};


export default defineComponent({
  name: 'FacetsPanel',
  components: {
    CategoricalFacet,
    NumericalFacet,
    SidePanel
  },
  setup() {
    const cachedPromises = ref({}) as Ref<{[key: string]: Promise<any>}>;
    const currentTab = ref('Documents');

    const groupBaseState = ref({}) as Ref<{ [key: string]: number }>;
    const groupFacetState = ref({}) as Ref<{ [key: string]: number }>;

    const baseData = ref({}) as any;
    const facetData = ref({}) as any;

    return {
      cachedPromises,
      currentTab,
      groupBaseState,
      groupFacetState,
      baseData,
      facetData,

      // Formatter
      statementPolarityFormatter,
      contradictionCategoryFormatter,
      hedgingCategoryFormatter,

      // special type label formatters
      numEvidencesLabelFormatter: facetUtil.numEvidencesLabelFormatter,
      monthLabelFormatter: facetUtil.monthLabelFormatter,

      // Static
      CODE_TABLE,
      facetTabs: [
        { name: 'Documents', icon: 'fa fa-file-text' },
        { name: 'Relationships', icon: 'fa fa-sitemap' },
        { name: 'Evidence quality', icon: 'fa fa-long-arrow-right' }
      ]
    };
  },
  computed: {
    ...mapGetters({
      filters: 'query/filters',
      updateToken: 'app/updateToken',
      project: 'app/project'
    })
  },
  watch: {
    filters(n, o) {
      if (filtersUtil.isEqual(n, o)) return;
      this.cachedPromises = {};
      if (!filtersUtil.isClauseEqual(n, o, 'enable', false)) {
        this.groupBaseState = {};
        this.refreshBase();
      }
      this.groupFacetState = {};
      this.refresh();
    },
    updateToken(n, o) {
      if (_.isEqual(n, o)) return;

      // Update happened, invalidate
      this.groupBaseState = {};
      this.groupFacetState = {};
      this.refreshBase();
      this.refresh();
    }
  },
  created() {
    this.cachedPromises = {};
  },
  mounted() {
    this.refreshBase();
    this.refresh();
  },
  methods: {
    ...mapActions({
      disableOverlay: 'app/disableOverlay'
    }),
    refreshBase() {
      const facetGroup = FACET_GROUPS[this.currentTab];
      const baseFilters = filtersUtil.newFilters();
      const enableClause = filtersUtil.findPositiveFacetClause(this.filters, 'enable');
      if (enableClause) {
        const { field, values, operand, isNot } = enableClause;
        filtersUtil.setClause(baseFilters, field, values, operand ?? 'or', isNot ?? false);
      }
      const promise = projectService.getProjectFacetsPromise(this.project, facetGroup, baseFilters);
      this.cachedPromises[this.currentTab] = promise;
      promise.then(result => {
        Object.keys(result.data).forEach(key => {
          // HACK for demo: filter out "" labels for stance and sentiment
          let data = result.data[key];
          if (key === CODE_TABLE.DOC_STANCE.field || key === CODE_TABLE.DOC_SENTIMENT.field) {
            data = data.filter((d: any) => d.key !== '');
          }
          // this.$set(this.baseData, key, data); // Needed for reactivity
          this.baseData[key] = data;
        });
        this.groupBaseState[this.currentTab] = 1;
      });
    },
    refresh() {
      const facetGroup = FACET_GROUPS[this.currentTab];

      let promise = null;
      if (filtersUtil.isEmpty(this.filters) && {}.hasOwnProperty.call(this.cachedPromises, this.currentTab)) {
        promise = this.cachedPromises[this.currentTab];
      } else {
        promise = projectService.getProjectFacetsPromise(this.project, facetGroup, this.filters);
      }
      promise.then(result => {
        Object.keys(result.data).forEach(key => {
          // HACK for demo: filter out "" labels for stance and sentiment
          let data = result.data[key];
          if (key === CODE_TABLE.DOC_STANCE.field || key === CODE_TABLE.DOC_SENTIMENT.field) {
            data = data.filter((d: any) => d.key !== '');
          }
          // this.$set(this.facetData, key, data); // Needed for reactivity
          this.facetData[key] = data;
        });
        this.groupFacetState[this.currentTab] = 1;
        this.disableOverlay(); // HACK: added this for the demo
      });
    },
    hasData(field: string) {
      return !_.isEmpty(this.baseData[field]) && !_.isEmpty(this.facetData[field]);
    },
    setActive(tab: string) {
      this.currentTab = tab;
      if (this.currentTab === '') {
        // No need to make any refresh() calls
        return;
      }


      if (!this.groupBaseState[tab]) {
        this.refreshBase();
      }
      if (!this.groupFacetState[tab]) {
        this.refresh();
      }
    }
  }
});
</script>

<style lang="scss" scoped>
  @import "~styles/variables";
  .facet-panel-container {
    margin-top: 5px;
  }
</style>
