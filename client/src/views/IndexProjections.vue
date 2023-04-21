<template>
  <div class="index-projections-container">
    <div class="flex-col config-column">
      <header>
        <button class="btn btn-sm" @click="modifyStructure">
          <i class="fa fa-fw fa-caret-left" />Edit structure
        </button>
        <h3>Projections</h3>
        <p class="subtitle">{{ paneSubtitle }}</p>
      </header>
      <section v-if="selectedNodeId !== null">
        <header class="flex index-structure-header">
          <h4>Index structure</h4>
          <button class="btn btn-sm" @click="modifyStructure">Edit</button>
        </header>
        <IndexResultsStructurePreview class="index-structure-preview" />
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
        <!-- TODO: country dropdown -->
        <DropdownButton
          :is-dropdown-left-aligned="true"
          :items="['Ethiopia', 'Not Ethiopia']"
          :selected-item="'Ethiopia'"
          @item-selected="() => {}"
        />
      </section>
      <footer>
        <section>
          <header class="flex">
            <p>Time range</p>
            <button class="btn btn-sm disabled" @click="() => {}">Edit</button>
          </header>
          <!-- TODO: this will be dynamic -->
          <p class="un-font-small subtitle">January 2011 - January 2025</p>
        </section>
        <section>
          <p class="un-font-small subtitle">
            How are projections calculated? <i class="fa fa-fw fa-info-circle" />
          </p>
        </section>
      </footer>
    </div>
    <main class="flex-col">
      <div class="editing-state-indicator">
        Editing <strong>{{ 'Untitled Scenario' }}</strong
        >'s constraints
      </div>
      <IndexProjectionsGraphView
        v-if="selectedNodeId === null"
        @select-element="selectElement"
        @deselect-edge="deselectEdge"
      />
      <IndexProjectionsNodeView
        v-else
        :selected-node-id="selectedNodeId"
        @select-node="selectElement"
        @deselect-node="deselectNode"
      />
      <div class="legend">
        <!-- TODO: icons and styling -->
        <div class="legend-column">
          <p class="un-font-small">Concepts with datasets attached</p>
          <p class="un-font-small">Constraint</p>
          <p class="un-font-small">Dataset value</p>
          <p class="un-font-small">Interpolated data</p>
          <p class="un-font-small">Extrapolated data</p>
        </div>
        <div class="legend-column">
          <p class="un-font-small">Concepts without datasets</p>
          <p class="un-font-small">Constraint</p>
          <p class="un-font-small">All components have values</p>
          <p class="un-font-small">Some components do not have values</p>
        </div>
        <div class="legend-column">
          <p class="un-font-small">Relationships</p>
          <p class="un-font-small">High levels of A represent <span>high</span> levels of B</p>
          <p class="un-font-small">Low levels of A represent <span>low</span> levels of B</p>
        </div>
        <div class="legend-column">
          <p class="un-font-small">Data quality</p>
          <p class="un-font-small">Old data</p>
          <p class="un-font-small">Ignored due to insufficient data</p>
        </div>
      </div>
    </main>
  </div>
</template>

<script setup lang="ts">
import { useRoute, useRouter } from 'vue-router';
import { useStore } from 'vuex';
import { computed, onMounted, ref } from 'vue';
import { ProjectType } from '@/types/Enums';
import IndexResultsStructurePreview from '@/components/index-results/index-results-structure-preview.vue';
import useIndexAnalysis from '@/services/composables/useIndexAnalysis';
import IndexProjectionsGraphView from '@/components/index-projections/index-projections-graph-view.vue';
import useIndexTree from '@/services/composables/useIndexTree';
import IndexProjectionsNodeView from '@/components/index-projections/index-projections-node-view.vue';
import useIndexWorkBench from '@/services/composables/useIndexWorkBench';
import { SelectableIndexElementId } from '@/types/Index';
import DropdownButton, { DropdownItem } from '@/components/dropdown-button.vue';

const store = useStore();
const route = useRoute();
const router = useRouter();

const analysisId = computed(() => route.params.analysisId as string);
const { analysisName, refresh } = useIndexAnalysis(analysisId);
const { findNode } = useIndexTree();
const workbench = useIndexWorkBench();
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

const searchForNode = (id: string) => {
  const foundInTree = findNode(id);
  return foundInTree ?? workbench.findNode(id);
};

const paneSubtitle = computed(() => {
  if (selectedNodeId.value === null) {
    return 'Click a concept to enlarge it';
  }
  return searchForNode(selectedNodeId.value)?.found.name ?? '';
});

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
</script>

<style lang="scss" scoped>
@import '@/styles/variables';
@import '@/styles/uncharted-design-tokens';

.index-projections-container {
  display: flex;
  height: $content-full-height;
}

.config-column {
  background: white;
  width: 400px;
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
  // Make sure you can always scroll down to see nodes that are hidden behind the legend
  padding-bottom: 100px;

  .legend {
    position: absolute;
    bottom: 0;
    left: 20px;
    right: 20px;
    display: flex;
    padding: 10px 20px;
    background: white;
    border-radius: 3px 3px 0 0;
  }
}

.legend-column {
  flex: 1;
  min-width: 0;

  p:not(:first-child) {
    color: $un-color-black-40;
  }
}
</style>
