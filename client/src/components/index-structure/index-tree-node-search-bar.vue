<template>
  <div class="index-tree-node-search-bar-container">
    <div class="search-bar-container flex">
      <input
        @keydown="handleKeyDown"
        ref="searchInput"
        class="form-control"
        type="text"
        v-model="searchText"
        placeholder="Type a concept"
      />
      <button class="btn btn-default" @click="emit('cancel')">Cancel</button>
    </div>
    <div class="search-filter-container flex">
      <p class="subdued">Filter datasets</p>
      <p
        v-for="(filter, index) in countryFilters"
        :key="index"
        class="filter"
        :class="{
          'filter-active': filter.active,
        }"
        @click="toggleFilter(index)"
      >
        <i v-if="filter.active" class="fa fa-check subdued" />
        <i v-if="!filter.active" class="fa fa-plus subdued" />
        {{ filter.countryName }}
      </p>
      <DropdownButton
        class="un-font-small"
        :items="countryFilterChoicesRemaining"
        :inner-button-label="'Select another country'"
        :is-dropdown-left-aligned="true"
        @item-selected="handleNewFilter"
      ></DropdownButton>
    </div>
    <div class="search-results-container">
      <ul class="results-list" v-if="searchText !== ''">
        <li
          :class="{ active: activeResultIndex === -1 }"
          @mousemove="setActiveResultIndexOnHover(-1)"
          @click="emit('set-node-name', searchText)"
        >
          <span v-if="!isModifyingExistingNode">
            Add "<strong>{{ searchText }}</strong
            >" without data
          </span>
          <span v-else-if="initialSearchText === searchText.trim()">Leave without data</span>
          <span v-else>
            Rename to "<strong>{{ searchText }}</strong
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
            <h5 v-if="isModifyingExistingNode" class="results-header">Attach a dataset</h5>
            <h5 v-else class="results-header">Add "{{ searchText }}" and attach a dataset</h5>
            <li
              v-for="(result, index) of results"
              :key="result.dataId + result.outputName"
              :class="{
                active: activeResultIndex === index,
                'de-emphasized': result.displayName === '',
              }"
              @mousemove="setActiveResultIndexOnHover(index)"
              @click="selectDataset(result)"
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
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch, onMounted } from 'vue';
import { DatasetSearchResult } from '@/types/Index';
import useModelMetadataSimple from '@/services/composables/useModelMetadataSimple';
import useModelMetadataCoverage from '@/services/composables/useModelMetadataCoverage';
import Sparkline from '@/components/widgets/charts/sparkline.vue';
import {
  searchFeatures,
  DojoFeatureSearchResult,
} from '@/services/semantic-feature-search-service';
import { capitalizeEachWord } from '@/utils/string-util';
import newDatacubeService from '@/services/new-datacube-service';
import DropdownButton from '@/components/dropdown-button.vue';
import { getCountryList } from '@/services/region-service';
import { CountryFilter } from '@/types/Analysis';
import { defaultCountryFilters } from '@/services/analysis-service-new';

const convertFeatureSearchResultToDatasetSearchResult = (
  feature: DojoFeatureSearchResult
): DatasetSearchResult => {
  const displayName =
    feature.display_name === '' ? capitalizeEachWord(feature.name) : feature.display_name;
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
  countryFilters: CountryFilter[];
}
const props = defineProps<Props>();

// If `initialSearchText` is set, the node already exists and we're attaching data to it.
//  If not, we're creating a new node.
const isModifyingExistingNode = computed(() => props.initialSearchText !== '');

const emit = defineEmits<{
  (e: 'select-dataset', dataset: DatasetSearchResult, nodeNameAfterAttachingDataset: string): void;
  (e: 'set-node-name', value: string): void;
  (e: 'cancel'): void;
  (e: 'add-country-filter', selectedCountry: CountryFilter): void;
  (e: 'update-country-filter', updatedFilter: CountryFilter): void;
  (e: 'delete-country-filter', filterToDelete: CountryFilter): void;
}>();

// Input box

const searchInput = ref();
onMounted(() => searchInput.value?.focus());

const searchText = ref('');
onMounted(async () => {
  if (props.initialSearchText) {
    searchText.value = props.initialSearchText;
  }
  countryFilterChoices.value = await getCountryList();
});

// Search
const results = ref<DatasetSearchResult[]>([]);
const isFetchingResults = ref(false);

const countryFilterChoices = ref<string[]>([]);
const countryFilterChoicesRemaining = computed(() => {
  return countryFilterChoices.value.filter(
    (choice) =>
      props.countryFilters.filter((item) => item.countryName.toUpperCase() === choice.toUpperCase())
        .length === 0
  );
});
const handleNewFilter = (item: string) => {
  emit('add-country-filter', { countryName: item, active: true });
};

const toggleFilter = (index: number) => {
  const filter = { ...props.countryFilters[index] };
  if (defaultCountryFilters.findIndex((item) => filter.countryName === item.countryName) >= 0) {
    filter.active = !filter.active;
    emit('update-country-filter', filter);
  } else {
    deleteCountryFilter(filter);
  }
};

const deleteCountryFilter = (filterToDelete: CountryFilter) => {
  emit('delete-country-filter', filterToDelete);
};

const selectedCountries = computed(() => {
  const countryList: CountryFilter[] = props.countryFilters.filter((item) =>
    item.active ? item.countryName : false
  );
  const activeCountryList = countryList.map((country) => country.countryName);
  return activeCountryList;
});

watch([searchText, () => props.countryFilters], async () => {
  // Save a copy of the current search text value in case it changes before results are fetched
  // note: we are watching selected countries though not using them here YET.  The semantic search
  //       cannot take the filter presently.  The models are filtered after the semantic return currently.
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
    const unverifiedResults = dojoFeatureSearchResults.map(
      convertFeatureSearchResultToDatasetSearchResult
    );
    results.value = await verifySearchFeatures(unverifiedResults);

    isFetchingResults.value = false;
  } catch (e) {
    console.error('Unable to fetch search results for query', searchText.value);
    console.error(e);
  }
});

/**
 * Ensure the system contains valid processed data before showing the user an option to select.
 * Prevent interface problems associated with incorrect/unavailable data.
 *
 * Basically, we pre-run the datacube query ahead of user mouse actions to verify a return.
 * Don't show the users options that fail to resolve data.
 *
 * Note: The reason for this filter is that the data cubes (that are local) may not have processed correctly.
 * The semantic search is done against a remote (Jataware) service that assumes we have processed the data
 * correctly and the cube is available.
 *
 * @param features
 */
const verifySearchFeatures = async (features: DatasetSearchResult[]) => {
  const verified: any[] = features.map((feature) =>
    newDatacubeService.getDatacubeByDataIdAndOutputVariableAndCountry(
      feature.dataId,
      feature.outputName,
      selectedCountries.value
    )
  );
  const allVerified = await Promise.allSettled(verified);

  return features.filter((feature, index) => {
    const test = allVerified[index];
    if ('value' in test) {
      return test.value !== null;
    }
    return false;
  });
};

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

const activeResultDataId = computed(() => activeResult.value?.dataId ?? null);
const activeResultOutputVariable = computed(() => activeResult.value?.outputName ?? null);
const { metadata: activeResultMetadata } = useModelMetadataSimple(
  activeResultDataId,
  activeResultOutputVariable
);

const { sparklineData, temporalCoverage } = useModelMetadataCoverage(
  activeResultMetadata,
  activeResultOutputVariable
);

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
      if (activeResultIndex.value === -1) return emit('set-node-name', searchText.value.trim());
      if (activeResult.value !== null) return selectDataset(activeResult.value);
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

const selectDataset = (dataset: DatasetSearchResult) => {
  // If we're attaching a dataset to a node that already exists, don't change the node's name
  // If we're attaching a dataset to a new node, set its name to the search text.
  const nodeNameAfterAttachingDataset = isModifyingExistingNode.value
    ? props.initialSearchText
    : searchText.value;
  emit('select-dataset', dataset, nodeNameAfterAttachingDataset);
};
</script>

<style lang="scss" scoped>
@import '@/styles/variables';
@import '@/styles/uncharted-design-tokens';
@import '@/styles/common';

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

.search-filter-container {
  max-width: 620px;
  padding: 3px 10px;
  gap: 5px;
  flex-wrap: wrap;
  overflow-wrap: normal;

  p {
    @extend .un-font-small;
    &.filter {
      border: solid 1px $un-color-black-40;
      border-radius: 0.8rem;
      padding: 0 8px 0 4px;
      &.filter-active {
        background-color: $un-color-black-5;
      }
    }
    &:hover {
      background-color: $un-color-black-5;
    }
    i {
      padding-left: 5px;
    }
  }
  ::v-deep(.dropdown-button-container) {
    height: 1.6rem;
  }
  ::v-deep(.dropdown-button-container button) {
    border: solid 1px $un-color-black-40;
    border-radius: 0.8rem;
    padding: 0 2px 0 8px;
    background-color: white;
  }
  ::v-deep(.dropdown-button-container button span) {
    @extend .un-font-small;
  }
}

.search-results-container {
  width: 600px;
  display: flex;
  flex-direction: column;
  gap: 10px;
}

ul {
  list-style: none;
  margin: 0;
  padding: 0;
}
ul.results-list {
  margin: 5px 0;
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

i.fa-spinner {
  font-size: x-large;
  color: $un-color-black-30;
  margin-top: 10px;
  margin-left: 20px;
}
</style>
