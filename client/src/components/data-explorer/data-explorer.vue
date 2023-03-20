<template>
  <div class="data-explorer-container">
    <ModalHeader
      :nav-back-label="navBackLabel"
      :select-label="selectButtonLabel"
      :selected-search-items="selectedDatacubes"
      @close="onClose"
      @selection="onSelection"
    />
    <div class="flex h-100" v-if="facets !== null && filteredFacets !== null">
      <div class="flex h-100">
        <FacetsPanel :facets="facets" :filtered-facets="filteredFacets" />
      </div>
      <div class="flex-grow-1 h-100">
        <Search
          class="search"
          :facets="facets"
          :filtered-datacubes="datacubes"
          :enableMultipleSelection="enableMultipleSelection"
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
import { ref, computed, onMounted, watch, defineEmits } from 'vue';

import FacetsPanel from './facets-panel.vue';
import ModalHeader from './modal-header.vue';
import Search from './search.vue';
import SimplePagination from './simple-pagination.vue';

import { FACET_FIELDS } from '@/utils/datacube-util';
import { getDatacubes, getDatacubeFacets } from '@/services/new-datacube-service';
import { Datacube } from '@/types/Datacube';
import { Filters } from '@/types/Filters';
import { Facets } from '@/types/common';

interface Props {
  navBackLabel: string;
  selectButtonLabel: string;
  enableMultipleSelection: boolean;
  onClose: () => void;
}
defineProps<Props>();

const emit = defineEmits<{
  (e: 'selection', selection: Datacube[]): void;
  (e: 'close'): void;
}>();

const store = useStore();

const pageSize = 100;
const pageCount = ref(0);
const datacubes = ref<Datacube[]>([]);
const selectedDatacubes = ref<Datacube[]>([]);

const facets = ref<Facets | null>(null);
const filteredFacets = ref<Facets | null>(null);

const filters = computed<Filters>(() => store.getters['app/filters']);

const enableOverlay = () => store.dispatch('app/enableOverlay');
const disableOverlay = () => store.dispatch('app/disableOverlay');

const fetchDatacubeList = async () => {
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

const setSelectedDatacube = (item: { id: string }) => {
  const datacube = datacubes.value.find((d) => d.id === item.id);
  if (!datacube) return;
  selectedDatacubes.value = [datacube];
};

const nextPage = async () => {
  enableOverlay();
  pageCount.value += 1;
  await fetchDatacubeList();
  disableOverlay();
};

const prevPage = async () => {
  enableOverlay();
  pageCount.value -= 1;
  await fetchDatacubeList();
  disableOverlay();
};

const onClose = () => emit('close');
const onSelection = () => emit('selection', selectedDatacubes.value);

onMounted(() => {
  refresh();
});

watch([filters], () => {
  refresh();
});
</script>

<style lang="scss" scoped>
.data-explorer-container {
  height: 100vh;
  position: relative;
  box-sizing: border-box;
  overflow: hidden;
  .search {
    height: calc(100% - 100px);
  }
}
</style>
