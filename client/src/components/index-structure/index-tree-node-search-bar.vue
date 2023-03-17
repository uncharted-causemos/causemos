<template>
  <div class="index-tree-node-search-bar-container">
    <div class="search-bar-container flex">
      <input
        @keydown="handleKeyDown"
        ref="searchInput"
        class="form-control"
        type="text"
        v-model="searchText"
        placeholder="Search for a dataset"
      />
      <button class="btn btn-default" @click="emit('cancel')">Cancel</button>
    </div>
    <div class="search-results-container">
      <ul v-if="searchText !== ''">
        <li
          :class="{ active: activeResultIndex === -1 }"
          @mousemove="setActiveResultIndexOnHover(-1)"
          @click="emit('keep-as-placeholder', searchText)"
        >
          <span v-if="initialSearchText === ''">
            Add "<strong>{{ searchText }}</strong
            >" as a placeholder
          </span>
          <span v-else-if="initialSearchText === searchText.trim()"> Leave as placeholder </span>
          <span v-else>
            Rename placeholder to "<strong>{{ searchText }}</strong
            >"
          </span>
        </li>
        <!-- If results haven't returned, show a spinner -->
        <div v-if="isFetchingResults" class="loading">
          <i class="fa fa-spin fa-spinner" />
        </div>
        <div v-else class="results">
          <p v-if="results.length === 0" class="no-results-message de-emphasized">
            No datasets matching "{{ searchText }}" were found.
          </p>
          <ul v-else>
            <h5 class="results-header">Choose a dataset</h5>
            <li
              v-for="(result, index) of results"
              :key="result.dataId + result.outputName"
              :class="{
                active: activeResultIndex === index,
                'de-emphasized': result.displayName === '',
              }"
              @mousemove="setActiveResultIndexOnHover(index)"
              @click="emit('select-dataset', result)"
            >
              {{ result.displayName === '' ? '(missing name)' : result.displayName }}
            </li>
          </ul>
          <div class="details-pane" v-if="activeResult !== null">
            <h5>{{ activeResult.displayName }}</h5>
            <div>
              <h5 class="de-emphasized">Coverage</h5>
              <p>{{ spatialCoverageDisplayString }}</p>
              <div v-if="sparklineData === null" class="timeseries timeseries-loading" />
              <Sparkline v-else :data="[sparklineData]" :size="[215, 30]" />
              <p>
                <span class="de-emphasized">from</span> {{ temporalCoverage.from }}
                <span class="de-emphasized">to</span> {{ temporalCoverage.to }}
              </p>
            </div>
            <div>
              <h5 class="de-emphasized">Description</h5>
              <p>{{ activeResult.description }}</p>
            </div>
            <div>
              <h5 class="de-emphasized">Source</h5>
              <p>{{ activeResult.familyName }}</p>
            </div>
          </div>
        </div>
      </ul>
      <button class="btn btn-sm advanced-search" disabled>Use advanced search</button>
    </div>
  </div>
</template>

<script setup lang="ts">
import _ from 'lodash';
import { ref, computed, watch, onMounted } from 'vue';
import newDatacubeService from '@/services/new-datacube-service';
import { DatasetSearchResult } from '@/types/Index';
import useModelMetadataCoverage from '@/services/composables/useModelMetadataCoverage';
import Sparkline from '@/components/widgets/charts/sparkline.vue';
import { Indicator } from '@/types/Datacube';
import {
  searchFeatures,
  DojoFeatureSearchResult,
} from '@/services/semantic-feature-search-service';

const toDisplayName = (v: string) => _.words(v).map(_.capitalize).join(' ');

const convertFeatureSearchResultToDatasetSearchResult = (
  feature: DojoFeatureSearchResult
): DatasetSearchResult => {
  const displayName =
    feature.display_name === '' ? toDisplayName(feature.name) : feature.display_name;
  return {
    displayName,
    dataId: feature.owner_dataset.id,
    description: feature.description,
    familyName: feature.owner_dataset.name,
    // We need this to distinguish between results with the same dataId and to fetch the actual data for calculating index results.
    outputName: feature.name,
  };
};

interface Props {
  initialSearchText: string;
}
const props = defineProps<Props>();

const emit = defineEmits<{
  (e: 'select-dataset', dataset: DatasetSearchResult): void;
  (e: 'keep-as-placeholder', value: string): void;
  (e: 'cancel'): void;
}>();

// Input box

const searchInput = ref();
onMounted(() => searchInput.value?.focus());

const searchText = ref('');
onMounted(() => {
  if (props.initialSearchText) {
    searchText.value = props.initialSearchText;
  }
});

// Search

const results = ref<DatasetSearchResult[]>([]);
const isFetchingResults = ref(false);

watch([searchText], async () => {
  // Save a copy of the current search text value in case it changes before results are fetched
  const queryString = searchText.value;
  if (queryString === '') {
    results.value = [];
    isFetchingResults.value = false;
    return;
  }
  isFetchingResults.value = true;
  try {
    const dojoFeatureSearchResults = await searchFeatures(queryString);
    if (queryString !== searchText.value) {
      // Search text has changed since we started fetching results, so let the more recent call
      //  modify state.
      return;
    }
    results.value = dojoFeatureSearchResults.map(convertFeatureSearchResultToDatasetSearchResult);
    isFetchingResults.value = false;
  } catch (e) {
    console.error('Unable to fetch search results for query', searchText.value);
    console.error(e);
  }
});

/**
 * The currently highlighted result.
 * - `-1` means the option to add a new placeholder is active.
 * - Any number >=0 is an index into the results array.
 */
const activeResultIndex = ref<number>(-1);
// Reset active result to "create placeholder" option whenever search text changes
watch([searchText], () => {
  activeResultIndex.value = -1;
});

const activeResult = computed(() => {
  if (activeResultIndex.value === null || activeResultIndex.value === -1) {
    return null;
  }
  return results.value[activeResultIndex.value];
});

const activeResultMetadata = ref<Indicator | null>(null);
watch([activeResult], async () => {
  if (activeResult.value === null) {
    activeResultMetadata.value = null;
    return;
  }
  activeResultMetadata.value = await newDatacubeService.getIndicatorMetadata(
    activeResult.value.dataId
  );
});

const { sparklineData, temporalCoverage } = useModelMetadataCoverage(activeResultMetadata);

const spatialCoverageDisplayString = computed(() => {
  if (activeResultMetadata.value === null) {
    return '...';
  }
  const count = activeResultMetadata.value.geography.country.length;
  return `${count} countr${count === 1 ? 'y' : 'ies'}.`;
});

const setActiveResultIndexOnHover = (targetIndex: number) => {
  if (activeResultIndex.value !== targetIndex) {
    activeResultIndex.value = targetIndex;
  }
};

// Handling keyboard interaction

const handleKeyDown = (e: KeyboardEvent) => {
  switch (e.key) {
    case 'Escape':
      e.preventDefault();
      return emit('cancel');
    case 'Enter':
      e.preventDefault();
      if (activeResultIndex.value === -1)
        return emit('keep-as-placeholder', searchText.value.trim());
      if (activeResult.value !== null) return emit('select-dataset', activeResult.value);
      return;
    case 'ArrowUp':
      e.preventDefault();
      return shiftIndex(-1);
    case 'ArrowDown':
      e.preventDefault();
      return shiftIndex(1);
  }
};

const shiftIndex = (direction: -1 | 1) => {
  if (direction === -1) {
    activeResultIndex.value = Math.max(-1, activeResultIndex.value - 1);
  } else if (direction === 1) {
    activeResultIndex.value = Math.min(results.value.length - 1, activeResultIndex.value + 1);
  }
};
</script>

<style lang="scss" scoped>
@import '~styles/variables';
@import '~styles/uncharted-design-tokens';
@import '~styles/common';

.search-bar-container {
  padding: 5px 10px;
  .form-control {
    height: 32px;
    padding: 8px 8px;
  }
  button {
    margin-left: 5px;
  }
}

.search-results-container {
  width: 600px;
  margin: 5px 0 10px 0;
  display: flex;
  flex-direction: column;
  gap: 10px;
}

ul {
  list-style: none;
  margin: 0;
  padding: 0;
}
li {
  margin: 0;
  padding: 5px 10px;
  position: relative;
  overflow-x: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  cursor: pointer;

  &.active {
    background: $un-color-black-5;

    // Add purple bar pseudoelement to display overtop of the list item without nudging the content
    //  over
    &::before {
      content: '';
      display: block;
      position: absolute;
      pointer-events: none;
      left: 0;
      width: 2px;
      top: 0;
      height: 100%;
      background: $accent-main;
    }
  }
}

.no-results-message {
  margin-top: 10px;
  margin-left: 10px;
}

.results-header {
  color: $un-color-black-40;
  margin-left: 10px;
}

.loading,
.results {
  height: 250px;
  margin-top: 5px;
}

.results {
  display: flex;

  ul {
    flex: 1;
    min-width: 0;
    overflow-y: auto;
  }
}

.details-pane {
  width: 250px;
  padding: 0 10px;
  display: flex;
  flex-direction: column;
  gap: 10px;
  // Stop pane from stretching(/squashing) itself to be exactly the height of the .results element
  // This allows the pane to grow and scroll if the dataset or source has a very long name.
  overflow-y: auto;
  & > * {
    flex-shrink: 0;
  }

  button {
    align-self: flex-start;
    background: $call-to-action-color;
    color: white;
  }
}

.timeseries {
  height: 30px;
}

.de-emphasized {
  color: $un-color-black-40;
}

.timeseries-loading {
  background: $un-color-black-5;
}

.advanced-search {
  margin-left: 10px;
  align-self: flex-start;
}

i.fa-spinner {
  font-size: x-large;
  color: $un-color-black-30;
  margin-top: 10px;
  margin-left: 20px;
}
</style>
