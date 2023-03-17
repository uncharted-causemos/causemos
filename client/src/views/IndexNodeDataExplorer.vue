<template>
  <div class="datacube-explorer-container">
    <ModalHeader
      :nav-back-label="navBackLabel"
      :select-label="selectLabel"
      :selected-search-items="selectedDatacubes"
      @close="onClose"
      @selection="selectData"
    />
    <div class="flex h-100" v-if="facets !== null && filteredFacets !== null">
      <div class="flex h-100">
        <FacetsPanel :facets="facets" :filtered-facets="filteredFacets" />
      </div>
      <div class="flex-grow-1 h-100">
        <search
          class="search"
          :facets="facets"
          :filtered-datacubes="datacubes"
          :enableMultipleSelection="false"
          :selected-search-items="selectedDatacubes"
          @set-datacube-selected="setSelectedDatacube"
        />
        <SimplePagination
          :current-page-length="datacubes.length"
          :page-count="pageCount"
          :page-size="pageSize"
          @next-page="nextPage"
          @prev-page="prevPage"
        />
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import _ from 'lodash';
import { useStore } from 'vuex';
import { ref, computed, onMounted, watch } from 'vue';

import FacetsPanel from '../components/data-explorer/facets-panel.vue';
import ModalHeader from '../components/data-explorer/modal-header.vue';
import Search from '../components/data-explorer/search.vue';
import SimplePagination from '../components/data-explorer/simple-pagination.vue';

import { FACET_FIELDS } from '@/utils/datacube-util';
import { getDatacubes, getDatacubeFacets } from '@/services/new-datacube-service';
import { Datacube } from '@/types/Datacube';
import { Filters } from '@/types/Filters';
import { Facets } from '@/types/common';
// import filtersUtil from '@/utils/filters-util';

const navBackLabel = 'test back label';
const selectLabel = 'Add Dataset';

// Move below logics to its own component and let view component deals with only routing

const store = useStore();

const pageSize = 100;
const pageCount = ref(0);
const datacubes = ref<Datacube[]>([]);
const selectedDatacubes = ref<Datacube[]>([]);

const facets = ref<Facets>({});
const filteredFacets = ref<Facets>({});

const filters = computed<Filters>(() => store.getters['app/filters']);

const enableOverlay = () => store.dispatch('app/enableOverlay');
const disableOverlay = () => store.dispatch('app/disableOverlay');

const fetchDatacubeList = async () => {
  // get the filtered data
  const options = {
    from: pageCount.value * pageSize,
    size: pageSize,
  };
  datacubes.value = await getDatacubes(filters.value, options);
};

const fetchDatacubeFacets = async () => {
  const defaultFilters: Filters = { clauses: [] };
  const [facetsResult, filteredFacetsResult] = await Promise.all(
    [defaultFilters, filters.value].map((filter) => getDatacubeFacets(FACET_FIELDS, filter))
  );
  facets.value = facetsResult;
  filteredFacets.value = filteredFacetsResult;
};

const refresh = async () => {
  pageCount.value = 0;
  enableOverlay();
  await Promise.all([fetchDatacubeList(), fetchDatacubeFacets()]);
  disableOverlay();
};

const onClose = () => {};

const selectData = () => {};

const setSelectedDatacube = (item: { id: string }) => {
  const datacube = datacubes.value.find((d) => d.id === item.id);
  if (!datacube) return;
  selectedDatacubes.value = [datacube];
};

const nextPage = () => {};

const prevPage = () => {};

onMounted(() => {
  refresh();
});

watch([filters], () => {
  refresh();
});
</script>

<style lang="scss" scoped>
.datacube-explorer-container {
}
</style>
