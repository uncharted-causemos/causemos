<template>
  <div class="data-explorer-container">
    <ModalHeader
      :nav-back-label="navBackLabel"
      :select-label="completeButtonLabel"
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
          @toggle-datacube-selected="toggleDatacubeSelected"
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

import { Datacube } from '@/types/Datacube';
import { Filters } from '@/types/Filters';
import { Facets } from '@/types/Common';

import useOverlay from '@/composables/useOverlay';

import FacetsPanel from './facets-panel.vue';
import ModalHeader from './modal-header.vue';
import Search from './search.vue';
import SimplePagination from './simple-pagination.vue';

import { getDatacubes, getDatacubeFacets } from '@/services/datacube-service';

import { FACET_FIELDS, TYPE as TYPE_FIELD } from '@/utils/datacube-util';
import filtersUtil from '@/utils/filters-util';

interface Props {
  navBackLabel: string;
  completeButtonLabel: string;
  enableMultipleSelection: boolean;
  initialSelection?: Datacube[];
  facetFields?: string[];
  omitModelDatacubes?: boolean;
}
const props = defineProps<Props>();

const emit = defineEmits<{
  (e: 'complete', selection: Datacube[]): void;
  (e: 'close'): void;
}>();

const store = useStore();
const overlay = useOverlay();

const pageSize = 100;
const pageCount = ref(0);
const datacubes = ref<Datacube[]>([]);
const selectedDatacubes = ref<Datacube[]>([]);

watch(
  () => props.initialSelection,
  () => {
    if (props.initialSelection) {
      selectedDatacubes.value = [...props.initialSelection];
    }
  },
  { immediate: true }
);

const facets = ref<Facets | null>(null);
const filteredFacets = ref<Facets | null>(null);

// Add a filter to exiting filters to omit model type datacubes if omitModelDatacubes flag is true
const omitModelType = (baseFilters: Filters) => {
  const filters = _.cloneDeep(baseFilters);
  if (props.omitModelDatacubes) {
    filtersUtil.addSearchTerm(filters, TYPE_FIELD, 'model', 'and', true);
  }
  return filters;
};

const filters = computed<Filters>(() => {
  // filters set by lex search bar, url or facets ui
  const baseFilter = store.getters['dataSearch/filters'];
  return omitModelType(baseFilter);
});

const fetchDatacubeList = async () => {
  const options = {
    from: pageCount.value * pageSize,
    size: pageSize,
  };
  datacubes.value = await getDatacubes(filters.value, options);
};

const fetchDatacubeFacets = async () => {
  const facetFileds = props.facetFields || FACET_FIELDS;
  const defaultFilters: Filters = omitModelType({ clauses: [] });
  const [facetsResult, filteredFacetsResult] = await Promise.all(
    [defaultFilters, filters.value].map((filter) => getDatacubeFacets(facetFileds, filter))
  );
  facets.value = facetsResult;
  filteredFacets.value = filteredFacetsResult;
};

const refresh = async () => {
  pageCount.value = 0;
  overlay.enable();
  await Promise.all([fetchDatacubeList(), fetchDatacubeFacets()]);
  overlay.disable();
};

const setSelectedDatacube = (item: { id: string }) => {
  const datacube = datacubes.value.find((d) => d.id === item.id);
  if (!datacube) return;
  selectedDatacubes.value = [datacube];
};

const isDatacubeSelected = (id: string) => {
  return selectedDatacubes.value.find((i) => i.id === id) !== undefined;
};

const toggleDatacubeSelected = (item: { datacubeId: string; id: string }) => {
  if (isDatacubeSelected(item.id)) {
    selectedDatacubes.value = selectedDatacubes.value.filter((sd) => sd.id !== item.id);
    return;
  }
  const datacube = datacubes.value.find((d) => d.id === item.id);
  if (!datacube) return;
  selectedDatacubes.value.push(datacube);
};

const nextPage = async () => {
  overlay.enable();
  pageCount.value += 1;
  await fetchDatacubeList();
  overlay.disable();
};

const prevPage = async () => {
  overlay.enable();
  pageCount.value -= 1;
  await fetchDatacubeList();
  overlay.disable();
};

const onClose = () => emit('close');
const onSelection = () => emit('complete', selectedDatacubes.value);

onMounted(() => refresh());

watch(filters, (newVal, oldVal) => {
  if (filtersUtil.isEqual(newVal, oldVal)) return;
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
