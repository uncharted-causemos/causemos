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
          :base-data="facet.baseData"
          :selected-data="facet.filteredData"
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
import codeUtil from '@/utils/code-util';
import filtersUtil from '@/utils/filters-util';

const CODE_TABLE = codeUtil.CODE_TABLE;



export default {
  name: 'DataExplorerFacetsPanel',
  components: {
    CategoricalFacet,
    SidePanel
  },
  data: () => ({
    facetTabs: [
      { name: 'Data Cube Facets', icon: 'fa fa-file-text' }
    ],
    currentTab: 'Data Cube Facets',
    CODE_TABLE: CODE_TABLE
  }),
  props: {
    datacubes: {
      type: Array,
      default: () => []
    },
    filteredDatacubes: {
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
      keys = keys.filter((k) => codeUtil.DATACUBE_DISPLAY_NAMES[k] !== undefined);
      keys.sort();
      const columns = keys.reduce((a, k) => {
        a[k] = {
          label: k,
          data: {}, // { label: count, } dictionary
          filteredData: {} //  { label: count, } dictionary
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

      if (this.filteredDatacubes) {
        this.filteredDatacubes.forEach((c) => {
          keys.forEach((k) => {
            if (Array.isArray(c[k])) {
              c[k].forEach((l) => {
                columns[k].filteredData[l] = columns[k].filteredData[l] ? columns[k].filteredData[l] + 1 : 1;
              });
            } else if (typeof c[k] === 'string') {
              columns[k].filteredData[c[k]] = columns[k].filteredData[c[k]] ? columns[k].filteredData[c[k]] + 1 : 1;
            }
          });
        });
      }

      // mux the filtered data and base data into facets.
      const facetList = keys.map((k) => {
        const categoryKeys = Object.keys(columns[k].data);
        const baseData = categoryKeys.map((ck) => {
          return {
            key: ck,
            value: columns[k].data[ck]
          };
        });
        const filteredData = categoryKeys.map((ck) => {
          return {
            key: ck,
            value: columns[k].filteredData[ck] || 0
          };
        });
        return {
          id: k,
          label: codeUtil.DATACUBE_DISPLAY_NAMES[k] || k,
          baseData,
          filteredData
        };
      }).filter((f) => f.baseData.length > 0);
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
