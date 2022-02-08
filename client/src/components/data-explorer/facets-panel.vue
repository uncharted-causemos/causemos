<template>
  <side-panel
    class="facet-panel-container"
    :tabs="facetTabs"
    :current-tab-name="currentTab"
    @set-active="setActive"
  >
    <div v-if="currentTab === 'Data Cube Facets'" class="facet-panel-list">
      <div v-for="facet in formattedFacets" :key="facet.label">
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

<script lang="ts">

import { defineComponent, PropType } from 'vue';
import { mapGetters } from 'vuex';

import CategoricalFacet from '@/components/facets/categorical-facet.vue';
import SidePanel from '@/components/side-panel/side-panel.vue';
import datacubeUtil from '@/utils/datacube-util';

import { Facets, FacetBucket } from '@/types/Common';

export default defineComponent({
  name: 'FacetsPanel',
  components: {
    CategoricalFacet,
    SidePanel
  },
  data: () => ({
    facetTabs: [
      { name: 'Data Cube Facets', icon: 'fa fa-file-text' }
    ],
    currentTab: 'Data Cube Facets'
  }),
  props: {
    facets: {
      type: Object as PropType<Facets>,
      default: () => {}
    },
    filteredFacets: {
      type: Object as PropType<Facets>,
      default: () => {}
    }
  },
  computed: {
    ...mapGetters({
      filters: 'query/filters',
      updateToken: 'app/updateToken',
      project: 'app/project'
    }),
    formattedFacets() {
      const keys = Object.keys(this.facets);

      // mux the filtered data and base data into facets.
      const facetList = keys.map((key) => {
        const baseData: FacetBucket[] = [];
        const filteredData: FacetBucket[] = [];

        const filteredFacetDict = this.filteredFacets[key] ? this.filteredFacets[key].reduce((dict, category) => {
          dict[category.key] = category.value;
          return dict;
        }, {} as { [key: string]: number }) : {};

        this.facets[key].forEach(category => {
          baseData.push({
            key: category.key,
            value: category.value
          });
          filteredData.push({
            key: category.key,
            value: filteredFacetDict[category.key] || 0
          });
        });

        return {
          id: key,
          label: datacubeUtil.DISPLAY_NAMES[key] || key,
          baseData,
          filteredData
        };
      });
      return facetList;
    }
  },
  methods: {
    setActive(tab: string) {
      this.currentTab = tab;
    }
  }
});
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
