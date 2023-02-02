<template>
  <div class="index-tree-node-search-results-container">
    <ul v-if="props.searchText !== ''">
      <li
        :class="{ active: activeResultIndex === -1 }"
        @mouseenter="activeResultIndex = -1"
        @click="emit('keep-as-placeholder')"
      >
        Add "<strong>{{ props.searchText }}</strong
        >" as a placeholder
      </li>
      <!-- If results haven't returned, show a spinner -->
      <div v-if="isFetchingResults" class="loading">
        <i class="fa fa-spin fa-spinner" />
      </div>
      <div v-else class="results">
        <p v-if="results.length === 0" class="no-results-message de-emphasized">
          No datasets matching "{{ props.searchText }}" were found.
        </p>
        <ul v-else>
          <h5 class="results-header">Choose a dataset</h5>
          <li
            v-for="(result, index) of results"
            :key="result.id"
            :class="{
              active: activeResultIndex === index,
              'de-emphasized': result.displayName === '',
            }"
            @mouseenter="activeResultIndex = index"
            @click="emit('select-dataset', result)"
          >
            {{ result.displayName === '' ? '(missing name)' : result.displayName }}
          </li>
        </ul>
        <div class="details-pane" v-if="activeResult !== null">
          <h5>{{ activeResult.displayName }}</h5>
          <div>
            <h5 class="de-emphasized">Coverage</h5>
            <p>{{ '216 countries' }}</p>
            <div class="timeseries placeholder" />
            <p>
              <span class="de-emphasized">from</span> {{ 'January 1960' }}
              <span class="de-emphasized">to</span> {{ 'January 2021' }}
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
</template>

<script setup lang="ts">
import newDatacubeService from '@/services/new-datacube-service';
import { ref, computed, watch, toRefs } from 'vue';
import { DatasetSearchResult } from '@/types/Index';

const convertESDocToDatasetSearchResult = ({ doc }: any): DatasetSearchResult => {
  return {
    displayName: doc.display_name,
    datasetMetadataDocId: doc.id,
    dataId: doc.data_id,
    description: doc.description,
    familyName: doc.family_name,
    period: doc.period,
  };
};

const props = defineProps<{
  searchText: string;
}>();
const { searchText } = toRefs(props);

const emit = defineEmits<{
  'keep-as-placeholder': () => void;
}>();

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
    const esDocResults = await newDatacubeService.getDatacubeSuggestions(queryString);
    if (queryString !== searchText.value) {
      // Search text has changed since we started fetching results, so let the more recent call
      //  modify state.
      return;
    }
    results.value = esDocResults.map(convertESDocToDatasetSearchResult);
    isFetchingResults.value = false;
  } catch (e) {
    console.error('Unable to fetch search results for query', searchText);
    console.error(e);
  }
});

const results = ref<DatasetSearchResult[]>([]);

/**
 * The currently highlighted result.
 * - `null` means no result is active.
 * - `-1` means the option to add a new placeholder is active.
 * - Any number >=0 is an index into the results array.
 */
const activeResultIndex = ref<number | null>(-1);
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
</script>

<style lang="scss" scoped>
@import '~styles/variables';
@import '~styles/uncharted-design-tokens';

.index-tree-node-search-results-container {
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

.placeholder {
  background: $un-color-black-10;
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
