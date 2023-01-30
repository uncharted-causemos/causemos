<template>
  <div class="index-tree-node-search-results-container">
    <ul v-if="props.searchText !== ''">
      <li :class="{ active: activeResultIndex === -1 }" @mouseenter="activeResultIndex = -1">
        Add "<strong>{{ props.searchText }}</strong
        >" as a placeholder
      </li>
      <!-- If results haven't returned, show a spinner -->
      <i v-if="isFetchingResults" class="fa fa-spin fa-spinner" />
      <div v-else class="results">
        <p v-if="results.length === 0" class="no-results-message de-emphasized">
          No datasets matching "{{ props.searchText }}" were found.
        </p>
        <ul v-else>
          <h5 class="results-header">Results</h5>
          <li
            v-for="(result, index) of results"
            :key="result.id"
            :class="{ active: activeResultIndex === index }"
            @mouseenter="activeResultIndex = index"
          >
            {{ result.datasetName }}
          </li>
        </ul>
        <div class="details-pane" v-if="activeResult !== null">
          <h5>{{ activeResult.datasetName }}</h5>
          <!-- TODO: use real data -->
          <div class="timeseries placeholder" />
          <div>
            <h5 class="de-emphasized">Source</h5>
            <p>{{ 'WDI - share_income' }}</p>
          </div>
          <div>
            <h5 class="de-emphasized">Coverage</h5>
            <p>{{ '216 countries' }}</p>
            <p>
              <span class="de-emphasized">from</span> {{ 'January 1960' }}
              <span class="de-emphasized">to</span> {{ 'January 2021' }}
            </p>
          </div>
          <button
            class="btn btn-sm add-dataset"
            @click="
              () => {
                console.log('TODO');
              }
            "
          >
            Add
          </button>
        </div>
      </div>
    </ul>
    <button
      class="btn btn-sm advanced-search"
      disabled
      @click="
        () => {
          console.log('TODO');
        }
      "
    >
      Use advanced search
    </button>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch, toRefs } from 'vue';

const props = defineProps<{
  searchText: string;
}>();
const { searchText } = toRefs(props);

const isFetchingResults = ref(false);
watch([searchText], async () => {
  isFetchingResults.value = true;
  try {
    // Mock fetching results
    results.value = await new Promise((resolve) => {
      setTimeout(() => {
        resolve([
          { datasetName: 'dataset A', id: '1' },
          { datasetName: 'dataset B', id: '2' },
          { datasetName: 'dataset C', id: '3' },
          { datasetName: 'dataset D', id: '4' },
          { datasetName: 'dataset E', id: '5' },
          {
            datasetName:
              'dataset F that happens to have a very long name for style testing purposes',
            id: '6',
          },
          { datasetName: 'dataset G', id: '7' },
          { datasetName: 'dataset H', id: '8' },
          { datasetName: 'dataset I', id: '9' },
        ]);
      }, 1000);
    });
  } catch (e) {
    console.error('Unable to fetch search results for query', searchText);
    console.error(e);
  } finally {
    isFetchingResults.value = false;
  }
});

const results = ref<{ datasetName: string; id: string }[]>([]);

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
  margin-left: 10px;
}

.results-header {
  color: $un-color-black-40;
  margin-left: 10px;
}

.results {
  display: flex;
  height: 250px;
  margin-top: 5px;

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
  gap: 5px;
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
