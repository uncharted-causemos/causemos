<template>
  <side-panel
    class="facet-panel-container"
    :tabs="facetTabs"
    :current-tab-name="currentTab"
  >
    <div v-if="currentTab === 'Data Cube Facets'" class="facet-panel-list">
      <div v-for="facet in facets" :key="facet.label">
        <categorical-facet
          key="facet.label"
          :facet="facet.id"
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

import CategoricalFacet from '@/components/facets/categorical-facet';

import SidePanel from '@/components/side-panel/side-panel';

import ontologyFormatter from '@/formatters/ontology-formatter';
import statementPolarityFormatter from '@/formatters/statement-polarity-formatter';
import contradictionCategoryFormatter from '@/formatters/contradiction-category-formatter';
import hedgingCategoryFormatter from '@/formatters/hedging-category-formatter';
import codeUtil from '@/utils/code-util';
import datacubeUtil from '@/utils/datacube-util';
import facetUtil from '@/utils/facet-util';
import filtersUtil from '@/utils/filters-util';

const CODE_TABLE = codeUtil.CODE_TABLE;



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
    datacubes: {
      type: Array,
      default: () => []
    }
  },
  computed: {
    ...mapGetters({
      filters: 'query/filters',
      updateToken: 'app/updateToken',
      project: 'app/project'
    }),
    facets() {
      let keys = Object.keys(this.datacubes[0]);
      keys = keys.filter((k) => datacubeUtil.COLUMN_BLACKLIST.indexOf(k) < 0);
      keys.sort();
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
          id: k,
          label: datacubeUtil.DISPLAY_NAMES[k] || k,
          values
        };
      }).filter((f) => f.values.length > 0);
      return facetList;
    }
  },
  watch: {
    filters(n, o) {
      if (filtersUtil.isEqual(n, o)) return;
      if (!filtersUtil.isClauseEqual(n, o, 'enable', false)) {
        this.groupBaseState = {};
      }
      this.groupFacetState = {};
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
  methods: {
    ...mapActions({
      disableOverlay: 'app/disableOverlay'
    })
  }
};
</script>

<style lang="scss" scoped>
  @import "~styles/variables";
  .facet-panel-container {
    margin-top: 5px;
  }
  .facet-panel-list {
    padding-bottom: 10rem;
  }
</style>
