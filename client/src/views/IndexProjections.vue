<template>
  <div class="index-projections-container">
    <div class="flex-col config-column">
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
      <div class="editing-state-indicator">
        <p class="subdued un-font-small">Click a concept to enlarge it.</p>
        <!-- TODO: Editing <strong>{{ 'Untitled Scenario' }}</strong>'s constraints -->
        <!-- <p class="subdued un-font-small">Click a concept to add or edit constraints.</p> -->
      </div>
      <IndexProjectionsGraphView
        v-if="selectedNodeId === null"
        class="fill-space"
        :projection-start-timestamp="projectionStartTimestamp"
        :projection-end-timestamp="projectionEndTimestamp"
        @select-element="selectElement"
        @deselect-edge="deselectEdge"
      />
      <IndexProjectionsNodeView
        v-else
        class="fill-space"
        :selected-node-id="selectedNodeId"
        :projection-start-timestamp="projectionStartTimestamp"
        :projection-end-timestamp="projectionEndTimestamp"
        @select-element="selectElement"
        @deselect-node="deselectNode"
      />
      <IndexLegend class="legend" :is-projection-space="true" />
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
import IndexProjectionsNodeView from '@/components/index-projections/index-projections-node-view.vue';
import { SelectableIndexElementId } from '@/types/Index';
import DropdownButton, { DropdownItem } from '@/components/dropdown-button.vue';
import IndexLegend from '@/components/index-legend.vue';
import { getTimestampMillis } from '@/utils/date-util';
import timestampFormatter from '@/formatters/timestamp-formatter';

const store = useStore();
const route = useRoute();
const router = useRouter();

const analysisId = computed(() => route.params.analysisId as string);
const { analysisName, refresh } = useIndexAnalysis(analysisId);
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
  // Make sure you can always scroll down to see nodes that are hidden behind the legend
  padding-bottom: 100px;

  .legend {
    position: absolute;
    bottom: 0;
    left: 20px;
    right: 20px;
  }

  .fill-space {
    flex: 1;
    min-height: 0;
  }
}

.editing-state-indicator {
  padding: 10px $index-graph-padding-horizontal;
  height: $navbar-outer-height;
}
</style>
