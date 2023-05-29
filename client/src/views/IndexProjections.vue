<template>
  <div class="index-projections-container" :class="[INSIGHT_CAPTURE_CLASS]">
    <div
      class="flex-col config-column"
      :class="{ 'settings-disabled': scenarioBeingEdited !== null }"
    >
      <div class="disable-overlay" />
      <header>
        <button v-if="selectedNodeId !== null" class="btn btn-sm" @click="deselectNode">
          <i class="fa fa-fw fa-caret-left" />View all concepts
        </button>
        <button v-else class="btn btn-sm" @click="modifyStructure">
          <i class="fa fa-fw fa-caret-left" />Edit structure
        </button>
        <h3>Projections</h3>
      </header>
      <section v-if="selectedNodeId !== null">
        <header class="flex index-structure-header">
          <h4>Index structure</h4>
          <button class="btn btn-sm" @click="modifyStructure">Edit</button>
        </header>
        <IndexResultsStructurePreview
          class="index-structure-preview"
          :selected-node-id="selectedNodeId"
        />
      </section>
      <section>
        <header><h4>Settings</h4></header>
        <DropdownButton
          :is-dropdown-left-aligned="true"
          :items="COUNTRY_MODES"
          :selected-item="isSingleCountryModeActive"
          @item-selected="(newValue) => (isSingleCountryModeActive = newValue)"
        />
        <div class="subsection" v-if="isSingleCountryModeActive">
          <p>Country</p>
          <DropdownButton
            :is-dropdown-left-aligned="true"
            :items="selectableCountryDropdownItems"
            :selected-item="selectedCountry"
            :is-warning-state-active="selectedCountry === NO_COUNTRY_SELECTED.value"
            @item-selected="setSelectedCountry"
          />
          <p v-if="selectedCountry === NO_COUNTRY_SELECTED.value" class="warning">
            Select a country to display projections.
          </p>
        </div>
        <IndexProjectionsSettingsScenarios
          v-if="isSingleCountryModeActive && selectedCountry !== NO_COUNTRY_SELECTED.value"
          class="subsection"
          :scenarios="scenarios"
          :max-scenarios="MAX_NUM_TIMESERIES"
          @create="handleCreateScenario"
          @duplicate="handleDuplicateScenario"
          @edit="handleEditScenario"
          @delete="handleDeleteScenario"
          @toggleVisible="toggleScenarioVisibility"
        />

        <IndexProjectionsSettingsCountries
          v-if="!isSingleCountryModeActive"
          class="subsection"
          :countries="selectedCountries"
          :selectable-countries="selectableCountryDropdownItems"
          :max-countries="MAX_NUM_TIMESERIES"
          @add="addSelectedCountry"
          @remove="removeSelectedCountry"
          @change="changeSelectedCountry"
        />
      </section>
      <footer>
        <section>
          <header class="flex">
            <p>Time range</p>
            <button
              v-if="!isEditingTimeRange"
              class="btn btn-sm"
              @click="isEditingTimeRange = true"
            >
              Edit
            </button>
            <button
              v-else
              class="btn btn-sm btn-call-to-action"
              @click="onDoneEditingTimeRange"
              :disabled="!areProjectionDatesValid"
            >
              Done
            </button>
          </header>
          <div v-if="isEditingTimeRange">
            <div class="projection-date">
              <DropdownButton
                :items="MONTHS"
                :selected-item="projectionStartMonth"
                :is-dropdown-above="true"
                :is-dropdown-left-aligned="true"
                @item-selected="(month) => (projectionStartMonth = month)"
              />
              <DropdownButton
                :items="selectableYears"
                :selected-item="projectionStartYear"
                :is-dropdown-above="true"
                :is-dropdown-left-aligned="true"
                @item-selected="(year) => (projectionStartYear = year)"
              />
            </div>
            <p>to</p>
            <div class="projection-date">
              <DropdownButton
                :items="MONTHS"
                :selected-item="projectionEndMonth"
                :is-dropdown-above="true"
                :is-dropdown-left-aligned="true"
                @item-selected="(month) => (projectionEndMonth = month)"
              />
              <DropdownButton
                :items="selectableYears"
                :selected-item="projectionEndYear"
                :is-dropdown-above="true"
                :is-dropdown-left-aligned="true"
                @item-selected="(year) => (projectionEndYear = year)"
              />
            </div>
            <p v-if="!areProjectionDatesValid" class="warning">
              The projection end date must be after the projection start date.
            </p>
          </div>
          <p v-else class="un-font-small subtitle">
            {{ timestampFormatter(projectionStartTimestamp, null, null) }} -
            {{ timestampFormatter(projectionEndTimestamp, null, null) }}
          </p>
        </section>
        <section>
          <p class="un-font-small subtitle">
            How are projections calculated? <i class="fa fa-fw fa-info-circle" />
          </p>
        </section>
      </footer>
    </div>
    <main class="flex-col">
      <div class="editing-container">
        <div v-if="scenarioBeingEdited !== null" class="editing-ui-group">
          <label
            >Editing
            <input type="text" v-model="scenarioBeingEdited.name" />
          </label>
          <label class="flex-grow"
            >Description
            <input class="flex-grow" type="text" v-model="scenarioBeingEdited.description" />
          </label>
          <div>
            <button class="btn btn-sm" @click="handleCancelEditScenario">Cancel</button>
            <button class="btn btn-sm btn-call-to-action" @click="handleDoneEditScenario">
              Done
            </button>
          </div>
        </div>
        <p v-if="scenarioBeingEdited !== null" class="subdued un-font-small">
          Click a concept to add or edit constraints.
        </p>
        <p v-else class="subdued un-font-small">Click a concept to enlarge it.</p>
      </div>
      <IndexProjectionsGraphView
        v-if="selectedNodeId === null"
        class="fill-space"
        :projection-start-timestamp="projectionStartTimestamp"
        :projection-end-timestamp="projectionEndTimestamp"
        :projections="projectionData"
        @select-element="selectElement"
      />
      <IndexProjectionsNodeView
        v-else
        class="fill-space"
        :selected-node-id="selectedNodeId"
        :projection-start-timestamp="projectionStartTimestamp"
        :projection-end-timestamp="projectionEndTimestamp"
        :projections="projectionData"
        @select-element="selectElement"
        @deselect-node="deselectNode"
      />
      <IndexLegend class="legend" :is-projection-space="true" />
    </main>
  </div>
</template>

<script setup lang="ts">
import _ from 'lodash';
import { useRoute, useRouter } from 'vue-router';
import { useStore } from 'vuex';
import { computed, onMounted, ref, watch } from 'vue';
import useOverlay from '@/services/composables/useOverlay';
import { ProjectType, TemporalResolutionOption } from '@/types/Enums';
import IndexResultsStructurePreview from '@/components/index-results/index-results-structure-preview.vue';
import useIndexAnalysis from '@/services/composables/useIndexAnalysis';
import useProjectionDates from '@/services/composables/useProjectionDates';
import IndexProjectionsGraphView from '@/components/index-projections/index-projections-graph-view.vue';
import IndexProjectionsNodeView from '@/components/index-projections/index-projections-node-view.vue';
import { IndexProjectionScenario, SelectableIndexElementId } from '@/types/Index';
import DropdownButton, { DropdownItem } from '@/components/dropdown-button.vue';
import IndexLegend from '@/components/index-legend.vue';
import timestampFormatter from '@/formatters/timestamp-formatter';
import { TimeseriesPoint, TimeseriesPointProjected } from '@/types/Timeseries';
import useIndexTree from '@/services/composables/useIndexTree';
import { findAllDatasets } from '@/utils/index-tree-util';
import { createProjectionRunner } from '@/utils/projection-util';
import {
  MAX_NUM_TIMESERIES,
  NO_COUNTRY_SELECTED_VALUE,
  createNewScenario,
  getAvailableTimeseriesColor,
} from '@/utils/index-projection-util';
import { getTimeseriesNormalized } from '@/services/outputdata-service';
import { getSpatialCoverageOverlap } from '@/services/new-datacube-service';
import IndexProjectionsSettingsScenarios from '@/components/index-projections/index-projections-settings-scenarios.vue';
import useInsightStore from '@/services/composables/useInsightStore';
import useToaster from '@/services/composables/useToaster';
import { getInsightById } from '@/services/insight-service';
import { Insight, IndexProjectionsDataState } from '@/types/Insight';
import { INSIGHT_CAPTURE_CLASS, isIndexProjectionsDataState } from '@/utils/insight-util';
import { TYPE } from 'vue-toastification';
import IndexProjectionsSettingsCountries from '@/components/index-projections/index-projections-settings-countries.vue';
import useSelectedCountries from '@/services/composables/useSelectedCountries';

const MONTHS: DropdownItem[] = [
  { value: 0, displayName: 'January' },
  { value: 1, displayName: 'February' },
  { value: 2, displayName: 'March' },
  { value: 3, displayName: 'April' },
  { value: 4, displayName: 'May' },
  { value: 5, displayName: 'June' },
  { value: 6, displayName: 'July' },
  { value: 7, displayName: 'August' },
  { value: 8, displayName: 'September' },
  { value: 9, displayName: 'October' },
  { value: 10, displayName: 'November' },
  { value: 11, displayName: 'December' },
];

const store = useStore();
const route = useRoute();
const router = useRouter();
const overlay = useOverlay();

const analysisId = computed(() => route.params.analysisId as string);
const { analysisName, refresh, indexProjectionSettings, updateIndexProjectionSettings } =
  useIndexAnalysis(analysisId);
// If selectedNodeId === null, no node is selected and we're looking at the graph view
const selectedNodeId = ref<string | null>(null);
const selectElement = (id: SelectableIndexElementId) => {
  if (typeof id === 'string') {
    selectedNodeId.value = id;
  }
};
const deselectNode = () => {
  selectedNodeId.value = null;
};
const project = computed(() => store.getters['app/project']);

// Set analysis name on the navbar
onMounted(async () => {
  store.dispatch('app/setAnalysisName', '');
  await refresh();
  store.dispatch('app/setAnalysisName', analysisName.value);
});

const modifyStructure = () => {
  router.push({
    name: 'indexStructure',
    params: {
      project: project.value,
      analysisId: analysisId.value,
      projectType: ProjectType.Analysis,
    },
  });
};

const COUNTRY_MODES: DropdownItem[] = [
  { displayName: 'Single country', value: true },
  { displayName: 'Multiple countries', value: false },
];
const isSingleCountryModeActive = ref(true);

const temporalResolutionOption = ref(TemporalResolutionOption.Month);

const indexTree = useIndexTree();
const NO_COUNTRY_SELECTED: DropdownItem = {
  displayName: 'No country selected',
  value: NO_COUNTRY_SELECTED_VALUE,
};
// Countries covered by one or more datasets
const selectableCountries = ref<string[]>([NO_COUNTRY_SELECTED_VALUE]);
// Get list of selectable countries whenever indexTree.tree changes.
// The list is a union of the countries that are covered by each dataset in the tree.
watch([indexTree.tree], async () => {
  // Save a reference to the current version of the tree so that if it changes before all of the
  //  fetch requests return, we only perform calculations and update the state with the most up-to-
  //  date tree structure.
  const frozenTreeState = indexTree.tree.value;
  // Go through tree and pull out all the ndoes with datasets.
  const nodesWithDatasets = findAllDatasets(indexTree.tree.value);
  const countriesInOneOrMoreDataset = await getSpatialCoverageOverlap(
    nodesWithDatasets.map(({ dataset }) => dataset.config.datasetId)
  );
  if (indexTree.tree.value !== frozenTreeState) {
    // Tree has changed since the fetches began, so ignore these results.
    return;
  }
  const sortedCountries = countriesInOneOrMoreDataset.sort();
  sortedCountries.push(NO_COUNTRY_SELECTED_VALUE);
  selectableCountries.value = sortedCountries;
});

const selectableCountryDropdownItems = computed(() =>
  selectableCountries.value.map((country) =>
    country === NO_COUNTRY_SELECTED_VALUE
      ? NO_COUNTRY_SELECTED
      : { displayName: country, value: country }
  )
);

// The country whose historical data and projections will be displayed.
const selectedCountry = ref(NO_COUNTRY_SELECTED.value);
const setSelectedCountry = (newValue: string) => {
  selectedCountry.value = newValue;
};
// Whenever the list of selectable countries changes, if the currently selected country is not found
//  in the list, reset it to NO_COUNTRY_SELECTED.value.
watch([selectableCountries], () => {
  if (
    selectableCountries.value.find((country) => country === selectedCountry.value) === undefined
  ) {
    setSelectedCountry(NO_COUNTRY_SELECTED.value);
  }
});

// Contains data for each node with a dataset attached. The node's ID is used as the map key.
const historicalData = ref(new Map<string, TimeseriesPoint[]>());
// Whenever the tree changes, fetch timeseries for all datasets in the tree.
watch([indexTree.tree, selectedCountry], async () => {
  // Don't fetch data unless an actual country is selected.
  if (selectedCountry.value === NO_COUNTRY_SELECTED.value) {
    return;
  }
  // Save a reference to the current version of the tree so that if it changes before all of the
  //  fetch requests return, we only perform calculations and update the state with the most up-to-
  //  date tree structure.
  const frozenTreeState = indexTree.tree.value;
  // Go through tree and pull out all the ndoes with datasets.
  const nodesWithDatasets = findAllDatasets(indexTree.tree.value);
  // For each node with a dataset, fetch the selected country's timeseries
  const promises = nodesWithDatasets.map(async ({ dataset }) => {
    const { config } = dataset;
    const data = await getTimeseriesNormalized({
      modelId: config.datasetId,
      runId: config.runId,
      outputVariable: config.outputVariable,
      temporalResolution: config.temporalResolution,
      temporalAggregation: config.temporalAggregation,
      spatialAggregation: config.spatialAggregation,
      regionId: selectedCountry.value,
    });
    return data;
  });
  // Wait for all fetches to complete.
  const timeseriesForEachDataset = await Promise.all(promises);
  if (indexTree.tree.value !== frozenTreeState) {
    // Tree has changed since the fetches began, so ignore these results.
    return;
  }
  // Convert to map structure
  const newMap = new Map<string, TimeseriesPoint[]>();
  timeseriesForEachDataset.forEach((timeseries, i) => {
    const nodeId = nodesWithDatasets[i].id;
    newMap.set(nodeId, timeseries);
  });
  historicalData.value = newMap;
});

// Projection dates
const isEditingTimeRange = ref(false);
const historicalTimeseries = computed(() => Array.from(historicalData.value.values()));
const {
  projectionStartYear,
  projectionStartMonth,
  projectionStartTimestamp,
  projectionEndYear,
  projectionEndMonth,
  projectionEndTimestamp,
  lastSelectableYear,
  earliestSelectableYear,
  areProjectionDatesValid,
  saveProjectionDates,
} = useProjectionDates(historicalTimeseries);
const selectableYears = computed(() => {
  const result: DropdownItem[] = [];
  for (let year = earliestSelectableYear.value; year <= lastSelectableYear.value; year++) {
    result.push({ displayName: year.toString(), value: year });
  }
  return result;
});
const onDoneEditingTimeRange = () => {
  isEditingTimeRange.value = false;
  saveProjectionDates();
};

const projectionData = ref(new Map<string, TimeseriesPointProjected[]>());
// Whenever historical data changes, re-run projections
watch(
  [
    historicalData,
    indexTree.tree,
    projectionStartTimestamp,
    projectionEndTimestamp,
    temporalResolutionOption,
  ],
  () => {
    overlay.enable();
    const inputData: { [nodeId: string]: TimeseriesPoint[] } = {};
    // Filter out empty or single point timeseries data since projection runner expect data length >= 2
    for (const [nodeId, data] of historicalData.value) {
      if (data?.length && data.length > 1) {
        inputData[nodeId] = data;
      }
    }
    const result = createProjectionRunner(
      indexTree.tree.value,
      inputData,
      { start: projectionStartTimestamp.value, end: projectionEndTimestamp.value },
      temporalResolutionOption.value
    )
      .runProjection()
      .getResults();
    projectionData.value = new Map(Object.entries(result));
    overlay.disable();
  }
);
const { setContextId, setDataState, setViewState } = useInsightStore();
onMounted(() => {
  setContextId(analysisId.value + '--projections');
});

// Whenever state changes, sync it to insight panel store so that the latest state is captured when
//  taking an insight.
watch(
  [
    isSingleCountryModeActive,
    selectedCountry,
    projectionStartYear,
    projectionStartMonth,
    projectionEndYear,
    projectionEndMonth,
    selectedNodeId,
  ],
  () => {
    const newDataState: IndexProjectionsDataState = {
      isSingleCountryModeActive: isSingleCountryModeActive.value,
      selectedCountry: selectedCountry.value,
      projectionStartYear: projectionStartYear.value,
      projectionStartMonth: projectionStartMonth.value,
      projectionEndYear: projectionEndYear.value,
      projectionEndMonth: projectionEndMonth.value,
      selectedNodeId: selectedNodeId.value,
    };
    setDataState(newDataState);
    // No view state for this page. Set it to an empty object so that any view state from previous
    //  pages is cleared and not associated with insights taken from this page.
    setViewState({});
  },
  { immediate: true }
);
const toaster = useToaster();
const updateStateFromInsight = async (insightId: string) => {
  const loadedInsight: Insight = await getInsightById(insightId);
  const dataState = loadedInsight?.data_state;
  if (!dataState || !isIndexProjectionsDataState(dataState)) {
    toaster('Unable to apply the insight you selected.', TYPE.ERROR, false);
    return;
  }
  isSingleCountryModeActive.value = dataState.isSingleCountryModeActive;
  selectedCountry.value = dataState.selectedCountry;
  projectionStartYear.value = dataState.projectionStartYear;
  projectionStartMonth.value = dataState.projectionStartMonth;
  projectionEndYear.value = dataState.projectionEndYear;
  projectionEndMonth.value = dataState.projectionEndMonth;
  saveProjectionDates();
  if (dataState.selectedNodeId !== null && !indexTree.containsElement(dataState.selectedNodeId)) {
    toaster(
      'The node that is selected in this insight no longer exists in the analysis.',
      TYPE.ERROR,
      true
    );
    return;
  }
  selectedNodeId.value = dataState.selectedNodeId;
};

watch(
  [route],
  () => {
    const insight_id = route.query.insight_id as any;
    if (insight_id !== undefined) {
      updateStateFromInsight(insight_id);
      // Remove the insight_id from the url so that
      //  (1) future insight capture is valid
      //  (2) we can re-apply the same insight if necessary
      router
        .push({
          query: { insight_id: undefined },
        })
        .catch(() => {});
    }
  },
  { immediate: true }
);

// ========================== Scenario Management ==========================

const scenarios = computed(() => indexProjectionSettings.value.scenarios);
const scenarioBeingEdited = ref<IndexProjectionScenario | null>(null);
const updateScenarios = (scenarios: IndexProjectionScenario[]) => {
  updateIndexProjectionSettings({
    ...indexProjectionSettings.value,
    scenarios,
  });
};
const getAvailableScenarioColor = () => {
  const usedColors = scenarios.value.map((scenario) => scenario.color);
  return getAvailableTimeseriesColor(usedColors);
};

const handleCreateScenario = () => {
  const color = getAvailableScenarioColor();
  if (!color) return;
  updateScenarios([...scenarios.value, createNewScenario(undefined, '', color)]);
};

const handleEditScenario = (scenarioId: string) => {
  const target = scenarios.value.find((v) => v.id === scenarioId);
  if (!target) return;
  scenarioBeingEdited.value = _.cloneDeep(target);
};

const handleDuplicateScenario = (scenarioId: string) => {
  const target = scenarios.value.find((v) => v.id === scenarioId);
  const color = getAvailableScenarioColor();
  if (!target || !color) return;
  updateScenarios([...scenarios.value, createNewScenario(target.name, target.description, color)]);
};

const handleDeleteScenario = (scenarioId: string) => {
  updateScenarios(scenarios.value.filter((item) => item.id !== scenarioId));
};

const handleCancelEditScenario = () => {
  scenarioBeingEdited.value = null;
};

const handleDoneEditScenario = () => {
  const updatedScenarios = scenarios.value.map((scenario) =>
    scenario.id === scenarioBeingEdited.value?.id ? scenarioBeingEdited.value : scenario
  );
  updateScenarios(updatedScenarios);
  scenarioBeingEdited.value = null;
};

const toggleScenarioVisibility = (scenarioId: string) => {
  const updatedScenarios = scenarios.value.map((scenario) =>
    scenario.id === scenarioId ? { ...scenario, isVisible: !scenario.isVisible } : scenario
  );
  updateScenarios(updatedScenarios);
};

// ======================== Scenario Management End ========================

const { selectedCountries, addSelectedCountry, removeSelectedCountry, changeSelectedCountry } =
  useSelectedCountries(selectableCountries, indexProjectionSettings, updateIndexProjectionSettings);
</script>

<style lang="scss" scoped>
@import '@/styles/variables';
@import '@/styles/uncharted-design-tokens';
@import '@/styles/index-graph';

.index-projections-container {
  display: flex;
  height: $content-full-height;
  background: $background-light-2;
}

.config-column {
  background: white;
  width: 300px;
  padding: 20px;
  overflow-y: auto;
  border-right: 1px solid $un-color-black-10;
  gap: 40px;

  position: relative;
  // Make sure the lowest items are never covered by the footer content
  padding-bottom: 100px;
  footer {
    position: absolute;
    bottom: 0;
    left: 0;
    right: 0;

    section {
      border-top: 1px solid $un-color-black-10;
      padding: 10px 20px;
    }
  }
}

.subtitle {
  color: $un-color-black-40;
}

section {
  display: flex;
  flex-direction: column;
  gap: 5px;

  & > header {
    display: flex;
    justify-content: space-between;
  }
}

.subsection {
  margin-top: 40px;
}

.projection-date {
  display: flex;
  gap: 5px;
}

main {
  flex: 1;
  min-width: 0;
  position: relative;

  .legend {
    margin: 0 20px;
  }

  .fill-space {
    flex: 1;
    min-height: 0;
  }
}

.editing-container {
  padding: 10px $index-graph-padding-horizontal;
  height: $navbar-outer-height;
  .editing-ui-group {
    display: flex;
    justify-content: space-between;
    gap: 50px;
    label {
      display: flex;
      gap: 5px;
      align-items: baseline;
    }
    label:first-child input {
      width: 180px;
    }
  }
}

.warning {
  color: $un-color-feedback-warning;
}

.settings-disabled {
  pointer-events: none;
  .disable-overlay {
    display: block;
  }
}

.disable-overlay {
  display: none;
  position: absolute;
  width: 100%;
  height: 100%;
  z-index: 999;
  opacity: 0.4;
  background: white;
  top: 0px;
  left: 0px;
}
</style>
