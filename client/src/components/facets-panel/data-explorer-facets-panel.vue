<template>
  <side-panel
    class="facet-panel-container"
    :tabs="facetTabs"
    :current-tab-name="currentTab"
    @set-active="setActive"
  >
    <div v-if="currentTab === 'Data Cube Facets'">
      <div v-for="facet in facets" :key="facet.label">
        <categorical-facet
          key="facet.label"
          :facet="facet.label"
          :label="facet.label"
          :base-data="facet.values"
          :selected-data="facet.values"
          :rescale-after-select="true"
        />
      </div>
    </div>
  </side-panel>
</template>

<script>

import _ from 'lodash';
import { mapActions, mapGetters } from 'vuex';
import projectService from '@/services/project-service';

import CategoricalFacet from '@/components/facets/categorical-facet';

import SidePanel from '@/components/side-panel/side-panel';

import ontologyFormatter from '@/formatters/ontology-formatter';
import statementPolarityFormatter from '@/formatters/statement-polarity-formatter';
import contradictionCategoryFormatter from '@/formatters/contradiction-category-formatter';
import hedgingCategoryFormatter from '@/formatters/hedging-category-formatter';
import codeUtil from '@/utils/code-util';
import facetUtil from '@/utils/facet-util';
import filtersUtil from '@/utils/filters-util';

const CODE_TABLE = codeUtil.CODE_TABLE;

const FACET_GROUPS = {
  'Data Cube Facets': []
};


export default {
  name: 'DataExplorerFacetsPanel',
  components: {
    CategoricalFacet,
    SidePanel
  },
  data: () => ({
    ontologyFormatter: ontologyFormatter,
    statementPolarityFormatter: statementPolarityFormatter,
    contradictionCategoryFormatter: contradictionCategoryFormatter,
    hedgingCategoryFormatter: hedgingCategoryFormatter,

    // special type label formatters
    numEvidencesLabelFormatter: facetUtil.numEvidencesLabelFormatter,
    monthLabelFormatter: facetUtil.monthLabelFormatter,

    facetTabs: [
      { name: 'Data Cube Facets', icon: 'fa fa-file-text' }
    ],
    baseData: {},
    facetData: {},

    groupBaseState: {},
    groupFacetState: {},

    currentTab: 'Data Cube Facets',
    CODE_TABLE: CODE_TABLE
  }),
  props: {
    datacubes: Array
  },
  computed: {
    ...mapGetters({
      filters: 'query/filters',
      updateToken: 'app/updateToken',
      project: 'app/project'
    }),
    facets() {
      let keys = this.datacubes?.length > 0 ? Object.keys(this.datacubes[0]) : [];
      keys = keys.filter((k) => ['id', 'model_id', 'label', 'type'].indexOf(k) < 0);
      const columns = keys.reduce((a, k) => {
        a[k] = {
          label: k,
          data: {} // { label: count, } dictionary
        };
        return a;
      }, []);
      this.datacubes.forEach((c) => {
        keys.forEach((k) => {
          if (Array.isArray(c[k])) {
            c[k].forEach((l) => {
              columns[k].data[l] = columns[k].data[l] ? columns[k].data[l] + 1 : 1;
            });
          } else if (typeof c[k] === 'string') {
            columns[k].data[c[k]] = columns[k].data[c[k]] ? columns[k].data[c[k]] + 1 : 1;
          }
        });
      });

      const facetList = keys.map((k) => {
        const categoryKeys = Object.keys(columns[k].data);
        const values = categoryKeys.map((ck) => {
          return {
            key: ck,
            value: columns[k].data[ck]
          };
        });
        return {
          label: k,
          values
        };
      }).filter((f) => f.values.length > 0);
      console.table(facetList);
      return facetList;
    }
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
      if (!_.isEmpty(enableClause)) {
        const { field, values, operand, isNot } = enableClause;
        filtersUtil.setClause(baseFilters, field, values, operand, isNot);
      }
      const promise = projectService.getProjectFacetsPromise(this.project, facetGroup, baseFilters);
      this.cachedPromises[this.currentTab] = promise;
      promise.then(result => {
        Object.keys(result.data).forEach(key => {
          // HACK for demo: filter out "" labels for stance and sentiment
          let data = result.data[key];
          if (key === CODE_TABLE.DOC_STANCE.field || key === CODE_TABLE.DOC_SENTIMENT.field) {
            data = data.filter(d => d.key !== '');
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
            data = data.filter(d => d.key !== '');
          }
          // this.$set(this.facetData, key, data); // Needed for reactivity
          this.facetData[key] = data;
        });
        this.groupFacetState[this.currentTab] = 1;
        this.disableOverlay(); // HACK: added this for the demo
      });
    },
    hasData(field) {
      return !_.isEmpty(this.baseData[field]) && !_.isEmpty(this.facetData[field]);
    },
    setActive(tab) {
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
};
</script>

<style lang="scss" scoped>
  @import "~styles/variables";
  .facet-panel-container {
    margin-top: 5px;
  }
</style>
