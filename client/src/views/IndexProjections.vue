<template>
  <div class="index-projections-container" :class="[INSIGHT_CAPTURE_CLASS]">
    <div
      class="flex-col config-column"
      :class="{ 'settings-disabled': scenarioBeingEdited !== null }"
    >
      <div class="disable-overlay" />
      <header class="title-header">
        <button v-if="selectedNodeId !== null" class="btn btn-sm" @click="deselectNode">
          <i class="fa fa-fw fa-caret-left" />View all concepts
        </button>
        <Button
          v-else
          text
          severity="secondary"
          icon="fa fa-arrow-left"
          @click="modifyStructure"
          label="Edit structure"
        />
        <h3>Projections</h3>
      </header>
      <section v-if="selectedNodeId !== null" class="horizontal-padding">
        <header class="flex index-structure-header">
          <h4>Index structure</h4>
        </header>
        <IndexResultsStructurePreview
          class="index-structure-preview"
          :selected-node-id="selectedNodeId"
        />
      </section>
      <section class="settings-section horizontal-padding">
        <header><h4>Settings</h4></header>
        <DropdownButton
          :is-dropdown-left-aligned="true"
          :items="COUNTRY_MODES"
          :selected-item="isSingleCountryModeActive"
          @item-selected="setIsSingleCountryModeActive"
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
          @create="createAndEditScenario"
          @duplicate="duplicateScenario"
          @edit="enableEditingScenario"
          @delete="deleteScenario"
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
        <section class="show-outside-values horizontal-padding">
          <label @click="setShowDataOutsideNorm(!showDataOutsideNorm)">
            <span>Show values outside the <b>0</b> to <b>1</b> range</span>
            <i
              class="fa fa-lg fa-fw"
              :class="{
                'fa-check-square-o': showDataOutsideNorm,
                'fa-square-o': !showDataOutsideNorm,
              }"
            />
          </label>
        </section>
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
          <p
            class="un-font-small subtitle projection-explanation-link"
            @click="showProjectionExplanation"
          >
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
            <input type="text" v-model="scenarioBeingEdited.name" v-focus />
          </label>
          <label class="flex-grow"
            >Description
            <input class="flex-grow" type="text" v-model="scenarioBeingEdited.description" />
          </label>
          <div>
            <button class="btn btn-sm" @click="cancelEditingScenario">Cancel</button>
            <button class="btn btn-sm btn-call-to-action" @click="finishEditingScenario">
              Done
            </button>
          </div>
        </div>
        <p v-if="scenarioBeingEdited !== null" class="edit-msg subdued un-font-small">
          Click a concept to add or edit constraints.
        </p>
        <p v-else class="subdued un-font-small">Click a concept to enlarge it.</p>
      </div>
      <IndexProjectionsGraphView
        v-if="selectedNodeId === null"
        class="fill-space"
        :projection-start-timestamp="projectionStartTimestamp"
        :projection-end-timestamp="projectionEndTimestamp"
        :projections="timeseriesToDisplay"
        :show-data-outside-norm="showDataOutsideNorm"
        :data-warnings="dataWarnings"
        @select-element="selectElement"
      />
      <IndexProjectionsNodeView
        v-else
        class="fill-space"
        :selected-node-id="selectedNodeId"
        :historical-data="historicalData"
        :scenarios="scenarios"
        :projection-temporal-resolution-option="temporalResolutionOption"
        :weighting-behaviour="weightingBehaviour"
        :projection-start-timestamp="projectionStartTimestamp"
        :projection-end-timestamp="projectionEndTimestamp"
        :projections="timeseriesToDisplay"
        :projection-for-scenario-being-edited="projectionForScenarioBeingEdited"
        :show-data-outside-norm="showDataOutsideNorm"
        :data-warnings="dataWarnings"
        @select-element="selectElement"
        @deselect-node="deselectNode"
        @click-chart="onNodeChartClick"
        @open-drilldown="handleNavigateToDataset"
      />
      <IndexLegend class="legend" :is-projection-space="true" />
    </main>
  </div>

  <ModalConfirmation
    v-if="isShowingConfirmInsightModal"
    @confirm="confirmUpdateStateFromInsight"
    @close="isShowingConfirmInsightModal = false"
  >
    <template #title>Are you sure you want to overwrite the current scenarios?</template>
    <template #message>
      <p>Applying this insight will remove some scenarios that don't exist in the insight.</p>
    </template>
  </ModalConfirmation>
  <ModalProjectionExplanation
    v-if="isProjectionExplanationVisible"
    @close="isProjectionExplanationVisible = false"
  />
</template>

<script setup lang="ts">
import { useRoute, useRouter } from 'vue-router';
import { useStore } from 'vuex';
import { computed, onMounted, ref, watch } from 'vue';
import { ProjectType, TemporalResolutionOption } from '@/types/Enums';
import IndexResultsStructurePreview from '@/components/index-results/index-results-structure-preview.vue';
import useIndexAnalysis from '@/composables/useIndexAnalysis';
import useProjectionDates from '@/composables/useProjectionDates';
import IndexProjectionsGraphView from '@/components/index-projections/index-projections-graph-view.vue';
import IndexProjectionsNodeView from '@/components/index-projections/index-projections-node-view.vue';
import { SelectableIndexElementId } from '@/types/Index';
import DropdownButton, { DropdownItem } from '@/components/dropdown-button.vue';
import IndexLegend from '@/components/index-legend.vue';
import ModalConfirmation from '@/components/modals/modal-confirmation.vue';
import timestampFormatter from '@/formatters/timestamp-formatter';
import useIndexTree from '@/composables/useIndexTree';
import { findAllDatasets } from '@/utils/index-tree-util';
import { MAX_NUM_TIMESERIES, NO_COUNTRY_SELECTED_VALUE } from '@/utils/index-projection-util';
import { getSpatialCoverageOverlap } from '@/services/datacube-service';
import IndexProjectionsSettingsScenarios from '@/components/index-projections/index-projections-settings-scenarios.vue';
import useInsightStore from '@/composables/useInsightStore';
import useToaster from '@/composables/useToaster';
import { getInsightById } from '@/services/insight-service';
import { Insight, IndexProjectionsDataState } from '@/types/Insight';
import { INSIGHT_CAPTURE_CLASS, isIndexProjectionsDataState } from '@/utils/insight-util';
import { TYPE } from 'vue-toastification';
import IndexProjectionsSettingsCountries from '@/components/index-projections/index-projections-settings-countries.vue';
import useSelectedCountries from '@/composables/useSelectedCountries';
import useScenarios from '@/composables/useScenarios';
import useScenarioProjections from '@/composables/useScenarioProjections';
import useHistoricalData from '@/composables/useHistoricalData';
import useMultipleCountryProjections from '@/composables/useMultipleCountryProjections';
import ModalProjectionExplanation from '@/components/modals/modal-projection-explanation.vue';
import Button from 'primevue/button';

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

const analysisId = computed(() => route.params.analysisId as string);
const {
  analysisName,
  refresh,
  indexProjectionSettings,
  updateIndexProjectionSettings,
  updateProjectionDateRange,
  getProjectionDateRange,
  weightingBehaviour,
} = useIndexAnalysis(analysisId);
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

  const projectionDateRange = getProjectionDateRange();
  projectionEndMonth.value = projectionDateRange.endMonth;
  projectionEndYear.value = projectionDateRange.endYear;
  projectionStartMonth.value = projectionDateRange.startMonth;
  projectionStartYear.value = projectionDateRange.startYear;
  saveProjectionDates();
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
const isSingleCountryModeActive = computed(
  () => indexProjectionSettings.value.isSingleCountryModeActive
);
const setIsSingleCountryModeActive = (val: boolean) => {
  updateIndexProjectionSettings({ isSingleCountryModeActive: val });
};

const showDataOutsideNorm = computed(() => indexProjectionSettings.value.showDataOutsideNorm);
const setShowDataOutsideNorm = (val: boolean) => {
  updateIndexProjectionSettings({ showDataOutsideNorm: val });
};

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
const selectedCountry = computed(() => indexProjectionSettings.value.selectedCountry);
const setSelectedCountry = (newValue: string) => {
  updateIndexProjectionSettings({
    selectedCountry: newValue,
  });
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

const { historicalData: historicalDataForSingleCountry } = useHistoricalData(
  computed(() => [selectedCountry.value]),
  indexTree.tree
);
// Contains data for each node with a dataset attached. The node's ID is used as the map key.
const historicalDataForSelectedCountry = computed(
  () => historicalDataForSingleCountry.value[selectedCountry.value] ?? {}
);

// Projection dates
const isEditingTimeRange = ref(false);
const historicalTimeseriesForSelectedCountry = computed(() =>
  Object.values(historicalDataForSelectedCountry.value)
);
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
} = useProjectionDates(historicalTimeseriesForSelectedCountry);
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
  updateProjectionDateRange({
    // keep a copy of the selected range in the analysis object (persistent data)
    endMonth: projectionEndMonth.value,
    endYear: projectionEndYear.value,
    startMonth: projectionStartMonth.value,
    startYear: projectionStartYear.value,
  });
};

// Scenario Management
const {
  scenarios,
  scenarioBeingEdited,
  duplicateScenario,
  toggleScenarioVisibility,
  deleteScenario,
  enableEditingScenario,
  cancelEditingScenario,
  finishEditingScenario,
  updateScenarioConstraints,
  createAndEditScenario,
} = useScenarios(indexProjectionSettings, updateIndexProjectionSettings);

const onNodeChartClick = (timestamp: number, value: number) => {
  updateScenarioConstraints(selectedNodeId.value || '', { timestamp, value });
};

// Scenario projections
const {
  visibleScenarioProjectionData,
  projectionForScenarioBeingEdited,
  visibleScenarioDataWarnings,
  runScenarioProjections,
} = useScenarioProjections(scenarios, scenarioBeingEdited);

watch(
  [
    historicalDataForSelectedCountry,
    indexTree.tree,
    projectionStartTimestamp,
    projectionEndTimestamp,
    temporalResolutionOption,
    scenarios,
  ],
  () => {
    // TODO: For optimization, other than initial run, only run projection for the specific scenario when a new scenario is added or when the edit for a scenario is done.
    // Check diff from old and new scenarios data and only run the projection for a scenario if necessary.
    // When a scenario is deleted, just remove the projection for that scenario from the projection data.
    runScenarioProjections(
      indexTree.tree.value,
      historicalDataForSelectedCountry.value,
      { start: projectionStartTimestamp.value, end: projectionEndTimestamp.value },
      temporalResolutionOption.value,
      scenarios.value,
      weightingBehaviour.value
    );
  }
);

const { selectedCountries, addSelectedCountry, removeSelectedCountry, changeSelectedCountry } =
  useSelectedCountries(selectableCountries, indexProjectionSettings, updateIndexProjectionSettings);
const selectedCountryNames = computed(() => selectedCountries.value.map(({ name }) => name));
const { historicalData: historicalDataForSelectedCountries } = useHistoricalData(
  selectedCountryNames,
  indexTree.tree
);

const {
  multipleCountryProjectionData,
  dataWarnings: multiCountryProjectionDataWarnings,
  runMultipleCountryProjections,
} = useMultipleCountryProjections();

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
    selectedCountries,
    scenarios,
    projectionStartYear,
    projectionStartMonth,
    projectionEndYear,
    projectionEndMonth,
    selectedNodeId,
    showDataOutsideNorm,
  ],
  () => {
    const newDataState: IndexProjectionsDataState = {
      isSingleCountryModeActive: isSingleCountryModeActive.value,
      selectedCountry: selectedCountry.value,
      selectedCountries: selectedCountries.value,
      scenarios: scenarios.value,
      projectionStartYear: projectionStartYear.value,
      projectionStartMonth: projectionStartMonth.value,
      projectionEndYear: projectionEndYear.value,
      projectionEndMonth: projectionEndMonth.value,
      selectedNodeId: selectedNodeId.value,
      showDataOutsideNorm: showDataOutsideNorm.value,
    };
    setDataState(newDataState);
    // No view state for this page. Set it to an empty object so that any view state from previous
    //  pages is cleared and not associated with insights taken from this page.
    setViewState({});
  },
  { immediate: true }
);
const toaster = useToaster();
const isShowingConfirmInsightModal = ref(false);
const insightDataState = ref<IndexProjectionsDataState | null>(null);
const tryToUpdateStateFromInsight = async (insightId: string) => {
  const loadedInsight: Insight = await getInsightById(insightId);
  const dataState = loadedInsight?.data_state;
  if (!dataState || !isIndexProjectionsDataState(dataState)) {
    toaster('Unable to apply the insight you selected.', TYPE.ERROR, false);
    return;
  }
  // Need to store dataState in the component's state since confirmUpdateStateFromInsight may be
  //  called from a confirmation modal.
  insightDataState.value = dataState;
  // Prompt the user for confirmation if some scenarios will be removed.
  const scenarioIdsInInsight = dataState.scenarios.map(({ id }) => id);
  const scenariosThatWillBeRemoved = scenarios.value.filter(
    (scenario) => !scenarioIdsInInsight.includes(scenario.id)
  );
  if (scenariosThatWillBeRemoved.length === 0) {
    confirmUpdateStateFromInsight();
    return;
  }
  isShowingConfirmInsightModal.value = true;
};

const confirmUpdateStateFromInsight = () => {
  const dataState = insightDataState.value;
  isShowingConfirmInsightModal.value = false;
  insightDataState.value = null;
  if (dataState === null) return;
  updateIndexProjectionSettings({
    isSingleCountryModeActive: dataState.isSingleCountryModeActive,
    selectedCountry: dataState.selectedCountry,
    selectedCountries: dataState.selectedCountries,
    scenarios: [...dataState.scenarios],
  });
  indexProjectionSettings.value.showDataOutsideNorm = dataState.showDataOutsideNorm;
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
      tryToUpdateStateFromInsight(insight_id);
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

watch(
  [
    historicalDataForSelectedCountries,
    indexTree.tree,
    projectionStartTimestamp,
    projectionEndTimestamp,
    temporalResolutionOption,
    selectedCountries,
  ],
  () => {
    runMultipleCountryProjections(
      indexTree.tree.value,
      historicalDataForSelectedCountries.value,
      { start: projectionStartTimestamp.value, end: projectionEndTimestamp.value },
      temporalResolutionOption.value,
      selectedCountries.value,
      weightingBehaviour.value
    );
  }
);

const historicalData = computed(() =>
  isSingleCountryModeActive.value
    ? historicalDataForSingleCountry.value
    : historicalDataForSelectedCountries.value
);

const timeseriesToDisplay = computed(() =>
  isSingleCountryModeActive.value
    ? visibleScenarioProjectionData.value
    : multipleCountryProjectionData.value
);

const dataWarnings = computed(() =>
  isSingleCountryModeActive.value
    ? visibleScenarioDataWarnings.value
    : multiCountryProjectionDataWarnings.value
);

const handleNavigateToDataset = (datacubeId: string) => {
  if (!selectedNodeId.value) return;
  router.push({
    name: 'datasetDrilldown',
    params: {
      projectType: route.params.projectType as string,
      project: route.params.project as string,
      datacubeId,
    },
    query: {
      analysis_id: analysisId.value,
      index_projections_node_id: selectedNodeId.value,
    },
  });
};

const isProjectionExplanationVisible = ref(false);
const showProjectionExplanation = () => {
  isProjectionExplanationVisible.value = true;
};
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

.horizontal-padding {
  padding-left: 20px;
  padding-right: 20px;
}

.config-column {
  background: white;
  width: 300px;
  border-right: 1px solid $un-color-black-10;
  gap: 40px;
  position: relative;
  .title-header {
    padding: 20px 20px 0 20px;
  }

  .settings-section {
    flex: 1;
    overflow-y: auto;
  }

  .show-outside-values {
    label {
      display: flex;
      justify-content: space-between;
      align-items: center;
    }
  }
  footer {
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

.projection-explanation-link {
  cursor: pointer;
  &:hover {
    color: black;
  }
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
  .edit-msg {
    color: $accent-main;
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
  top: 0;
  left: 0;
}
</style>
