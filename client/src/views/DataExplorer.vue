<template>
  <div class="data-explorer-container">
    <modal-header
      :nav-back-label="navBackLabel"
      @close="onCancel" />
    <div class="flex h-100" v-if="datacubes.length > 0">
      <div class="flex h-100">
        <data-explorer-facets-panel :datacubes="datacubes"/>
      </div>
      <search class="flex-grow-1 h-100" :datacubes="datacubes"/>
    </div>
  </div>
</template>

<script>
import _ from 'lodash';
import { getDatacubes } from '@/services/datacube-service';
import { mapActions, mapGetters } from 'vuex';

import DataExplorerFacetsPanel from '@/components/facets-panel/data-explorer-facets-panel';
import ModalHeader from '../components/data-explorer/modal-header.vue';
import Search from '@/components/data-explorer/search';

import filtersUtil from '@/utils/filters-util';

export default {
  name: 'DataExplorer',
  components: {
    Search,
    DataExplorerFacetsPanel,
    ModalHeader
  },
  data: () => ({
    datacubes: []
  }),
  computed: {
    ...mapGetters({
      filters: 'dataSearch/filters'
    }),
    navBackLabel() {
      const name = this.$route.query.analysisName;
      return name ? `Data Space (${name})` : 'Data Space';
    }
  },
  watch: {
    filters(n, o) {
      if (filtersUtil.isEqual(n, o)) return;
      this.refresh();
    }
  },
  mounted() {
    this.refresh();
  },
  methods: {
    ...mapActions({
      enableOverlay: 'app/enableOverlay',
      disableOverlay: 'app/disableOverlay',
      setSearchResultsCount: 'dataSearch/setSearchResultsCount'
    }),
    onCancel() {
      this.$router.push({ name: 'data' });
    },
    async refresh() {
      await this.fetchDatacubes();
    },
    async fetchDatacubes() {
      this.enableOverlay();
      const filters = _.cloneDeep(this.filters);
      filtersUtil.setClause(filters, 'type', ['model'], 'or', false);
      this.datacubes = await getDatacubes(filters);
      this.datacubes.forEach(item => (item.isAvailable = true));
      this.setSearchResultsCount(this.datacubes.length);
      this.disableOverlay();
    }
  }
};
</script>

<style lang="scss" scoped>
@import "~styles/variables";

.data-explorer-container {
  height: 100vh;
  position: relative;
  box-sizing: border-box;
  overflow: hidden;
}

</style>
