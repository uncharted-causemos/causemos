<template>
  <div class="index-projections-container">
    <div class="flex-col config-column">
      <header>
        <h3>Projections</h3>
        <p class="subtitle">{{ selectedNodeName }}</p>
      </header>
      <section>
        <header class="flex index-structure-header">
          <h4>Index structure</h4>
          <button class="btn btn-sm" @click="modifyStructure">Modify</button>
        </header>
        <IndexResultsStructurePreview class="index-structure-preview" />
      </section>
      <section>
        <header class="flex">
          <h4>Time series</h4>
          <button class="btn btn-sm disabled" @click="() => {}">Edit</button>
        </header>
        <!-- TODO: this will be dynamic-->
        <div class="time-series-row">
          <div class="time-series-color-indicator" :style="{ background: 'black' }"></div>
          <p>Ethiopia</p>
        </div>
      </section>
      <section>
        <header class="flex">
          <h4>Time range</h4>
          <button class="btn btn-sm disabled" @click="() => {}">Edit</button>
        </header>
        <!-- TODO: -->
        <p>January 2011 - January 2025</p>
      </section>
    </div>
    <main class="flex-col">
      <div class="editing-state-indicator">
        Editing <strong>{{ 'Untitled Scenario' }}</strong
        >'s constraints
      </div>
      <IndexProjectionsPane :selected-node-id="selectedNode.id" />
    </main>
  </div>
</template>

<script setup lang="ts">
import router from '@/router';
import { useRoute } from 'vue-router';
import { useStore } from 'vuex';
import { computed, onMounted } from 'vue';
import { ProjectType } from '@/types/Enums';
import IndexResultsStructurePreview from '@/components/index-results/index-results-structure-preview.vue';
import useIndexAnalysis from '@/services/composables/useIndexAnalysis';
import IndexProjectionsPane from '@/components/index-projections/index-projections-pane.vue';
import useIndexTree from '@/services/composables/useIndexTree';

const store = useStore();
const route = useRoute();

const analysisId = computed(() => route.params.analysisId as string);
// FIXME:
const { analysisName, refresh } = useIndexAnalysis(analysisId);
const indexTree = useIndexTree();
// FIXME: this won't always be the root node
const selectedNode = computed(() => indexTree.tree.value);

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

.time-series-row {
  display: flex;
  align-items: center;
  gap: 5px;

  p {
    flex: 1;
    min-width: 0;
  }
}

.time-series-color-indicator {
  width: 10px;
  height: 10px;
}
</style>
