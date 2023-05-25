<template>
  <div class="index-projections-container">
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
        <p>Country</p>
        <DropdownButton
          :is-dropdown-left-aligned="true"
          :items="selectableCountries"
          :selected-item="selectedCountry"
          :is-warning-state-active="selectedCountry === NO_COUNTRY_SELECTED.value"
          @item-selected="setSelectedCountry"
        />
        <p v-if="selectedCountry === NO_COUNTRY_SELECTED.value" class="warning">
          Select a country to display projections.
        </p>
        <br />
        <IndexProjectionsSettingsScenarios
          :scenarios="scenarios"
          :max-scenarios="MAX_NUM_SCENARIOS"
          @create="handleCreateScenario"
          @duplicate="handleDuplicateScenario"
          @edit="handleEditScenario"
          @delete="handleDeleteScenario"
          @toggleVisible="toggleScenarioVisibility"
        />
      </section>
      <footer>
        <section>
          <header class="flex">
            <p>Time range</p>
            <button class="btn btn-sm disabled" @click="() => {}">Edit</button>
          </header>
          <p class="un-font-small subtitle">
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
        <p v-if="scenarioBeingEdited !== nul" class="subdued un-font-small">
          Click a concept to add or edit constraints.
        </p>
        <p v-else class="subdued un-font-small">Click a concept to enlarge it.</p>
        <!-- TODO: Editing <strong>{{ 'Untitled Scenario' }}</strong>'s constraints -->
      </div>
      <IndexProjectionsGraphView
        v-if="selectedNodeId === null"
        class="fill-space"
        :projection-start-timestamp="projectionStartTimestamp"
        :projection-end-timestamp="projectionEndTimestamp"
        :projections="projectionData"
        @select-element="selectElement"
        @deselect-edge="deselectEdge"
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
import IndexProjectionsGraphView from '@/components/index-projections/index-projections-graph-view.vue';
import IndexProjectionsNodeView from '@/components/index-projections/index-projections-node-view.vue';
import { IndexProjectionScenario, SelectableIndexElementId } from '@/types/Index';
import DropdownButton, { DropdownItem } from '@/components/dropdown-button.vue';
import IndexLegend from '@/components/index-legend.vue';
import { getTimestampMillis } from '@/utils/date-util';
import timestampFormatter from '@/formatters/timestamp-formatter';
import { TimeseriesPoint, TimeseriesPointProjected } from '@/types/Timeseries';
import useIndexTree from '@/services/composables/useIndexTree';
import { findAllDatasets } from '@/utils/index-tree-util';
import { createProjectionRunner } from '@/utils/projection-util';
import { createNewScenario } from '@/utils/index-projection-util';
import { getTimeseriesNormalized } from '@/services/outputdata-service';
import { getSpatialCoverageOverlap } from '@/services/new-datacube-service';
import IndexProjectionsSettingsScenarios from '@/components/index-projections/index-projections-settings-scenarios.vue';
import { COLORS } from '@/utils/colors-util';

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
  // if (isEdge(id)) {
  //   // TODO:
  // }
};
const deselectNode = () => {
  selectedNodeId.value = null;
};

const deselectEdge = () => {
  // TODO
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

const projectionStartTimestamp = ref(getTimestampMillis(1990, 0));
const projectionEndTimestamp = ref(getTimestampMillis(2025, 0));

const temporalResolutionOption = ref(TemporalResolutionOption.Month);

const indexTree = useIndexTree();
const NO_COUNTRY_SELECTED: DropdownItem = { displayName: 'No country selected', value: '' };
// Countries covered by one or more datasets
const selectableCountries = ref<DropdownItem[]>([NO_COUNTRY_SELECTED]);
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
  const dropdownItems = sortedCountries.map<DropdownItem>((country) => ({
    displayName: country,
    value: country,
  }));
  dropdownItems.push(NO_COUNTRY_SELECTED);
  selectableCountries.value = dropdownItems;
});

// The country whose historical data and projections will be displayed.
const selectedCountry = ref(NO_COUNTRY_SELECTED.value);
const setSelectedCountry = (newValue: string) => {
  selectedCountry.value = newValue;
};
// Whenever the list of selectable countries changes, if the currently selected country is not found
//  in the list, reset it to NO_COUNTRY_SELECTED.value.
watch([selectableCountries], () => {
  if (
    selectableCountries.value.find((country) => country.value === selectedCountry.value) ===
    undefined
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

// ========================== Scenario Management ==========================

const MAX_NUM_SCENARIOS = COLORS.length + 1; // + 1 for the default scenario
const scenarios = computed(() => indexProjectionSettings.value.scenarios);
const scenarioBeingEdited = ref<IndexProjectionScenario | null>(null);
const updateScenarios = (scenarios: IndexProjectionScenario[]) => {
  updateIndexProjectionSettings({
    ...indexProjectionSettings.value,
    scenarios,
  });
};
const getAvailableScenarioColor = () => {
  if (scenarios.value.length >= MAX_NUM_SCENARIOS) return;
  const used = scenarios.value.map((v) => v.color);
  return COLORS.filter((v) => !used.includes(v)).shift();
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
</script>

<style lang="scss" scoped>
@import '@/styles/variables';
@import '@/styles/uncharted-design-tokens';
@import '@/styles/index-graph';

.index-projections-container {
  display: flex;
  height: $content-full-height;
}

.config-column {
  background: white;
  width: 300px;
  padding: 20px;
  overflow-y: auto;
  border-right: 1px solid $un-color-black-10;
  gap: 20px;

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
