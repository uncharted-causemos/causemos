<template>
  <div class="tab-panel-container">
    <div class="main-content h-100 flex flex-col">
      <div class="tab-nav-bar">
        <radio-button-group
          v-if="isSensitivityAnalysisSupported"
          class="tour-matrix-tab"
          :buttons="[{'label': 'Causal Flow', value: 'flow'}, {'label': 'Matrix', value: 'matrix'}]"
          :selected-button-value="activeTab"
          @button-clicked="setActive"
        />
        <slot name="action-bar" />
        <div class="augment-model">
          <arrow-button
            :text="'Augment Model'"
            :icon="'fa-book'"
            :is-pointing-left="true"
            @click="onAugmentCAG"
          />
        </div>
      </div>
      <div class="tab-content insight-capture">
        <cag-side-panel
          class="side-panel"
          :is-experiment-download-visible="true"
          @download-experiment="downloadExperiment"
        >
          <template #below-tabs>
            <cag-comments-button :model-summary="modelSummary" />
          </template>
        </cag-side-panel>
        <main>
          <div
            v-if="activeTab === 'flow' && scenarioData && graphData"
            class="model-graph-layout-container">
            <model-graph
              :data="graphData"
              :scenario-data="scenarioData"
              ref="modelGraph"
              @background-click="onBackgroundClick"
              @node-drilldown="onNodeDrilldown"
              @edge-click="showRelation"
            />
            <color-legend
              :show-cag-encodings="true" />
          </div>
          <sensitivity-analysis
            v-if="activeTab === 'matrix'"
            :model-summary="modelSummary"
            :matrix-data="sensitivityMatrixData"
            :analysis-type="sensitivityAnalysisType"
            @set-analysis-type="setSensitivityAnalysisType"
          />
        </main>
        <drilldown-panel
          class="quantitative-drilldown"
          :is-open="isDrilldownOpen"
          :tabs="drilldownTabs"
          :active-tab-id="activeDrilldownTab"
          @close="closeDrilldown"
          @tab-click="onDrilldownTabClick">

          <template #content>
            <evidence-pane
              v-if="activeDrilldownTab === PANE_ID.EVIDENCE && selectedEdge !== null"
              :show-curation-actions="false"
              :selected-relationship="selectedEdge"
              :statements="selectedStatements"
              :project="project"
              :is-fetching-statements="isFetchingStatements"
              :should-confirm-curations="true">
              <edge-polarity-switcher
                :selected-relationship="selectedEdge"
                @edge-set-user-polarity="setEdgeUserPolarity" />
              <edge-weight-slider
                v-if="showComponent"
                :selected-relationship="selectedEdge"
                @set-edge-weights="setEdgeWeights" />
            </evidence-pane>
          </template>
        </drilldown-panel>
      </div>
      <config-bar
        :model-summary="modelSummary"
        @edit-parameters="showModelParameters"
      />
    </div>
  </div>
</template>

<script>
import { mapGetters } from 'vuex';
import moment from 'moment';

import router from '@/router';
import ConfigBar from '@/components/quantitative/config-bar';
import SensitivityAnalysis from '@/components/quantitative/sensitivity-analysis';
import ModelGraph from '@/components/quantitative/model-graph';
import modelService from '@/services/model-service';
import ColorLegend from '@/components/graph/color-legend';
import EdgeWeightSlider from '@/components/drilldown-panel/edge-weight-slider';
import DrilldownPanel from '@/components/drilldown-panel';
import EdgePolaritySwitcher from '@/components/drilldown-panel/edge-polarity-switcher';
import EvidencePane from '@/components/drilldown-panel/evidence-pane';
import ArrowButton from '../widgets/arrow-button.vue';
import { ProjectType } from '@/types/Enums';
import CagSidePanel from '@/components/cag/cag-side-panel.vue';
import CagCommentsButton from '@/components/cag/cag-comments-button.vue';
import RadioButtonGroup from '../widgets/radio-button-group.vue';

const PANE_ID = {
  INDICATOR: 'indicator',
  EVIDENCE: 'evidence'
};

const NODE_DRILLDOWN_TABS = [
  {
    name: 'Indicator',
    id: PANE_ID.INDICATOR
  }
];

const EDGE_DRILLDOWN_TABS = [
  {
    name: 'Relationship',
    id: PANE_ID.EVIDENCE
  }
];

const PROJECTION_ENGINES = {
  DELPHI: 'delphi',
  DYSE: 'dyse'
};

export default {
  name: 'TabPanel',
  components: {
    ConfigBar,
    ModelGraph,
    SensitivityAnalysis,
    ColorLegend,
    DrilldownPanel,
    EdgePolaritySwitcher,
    EdgeWeightSlider,
    EvidencePane,
    ArrowButton,
    CagSidePanel,
    CagCommentsButton,
    RadioButtonGroup
  },
  props: {
    currentEngine: {
      type: String,
      default: null
    },
    modelSummary: {
      type: Object,
      required: true
    },
    modelComponents: {
      type: Object,
      required: true
    },
    sensitivityMatrixData: {
      type: Object,
      default: null
    },
    sensitivityAnalysisType: {
      type: String,
      required: true
    },
    scenarios: {
      type: Array,
      required: true
    },
    resetLayoutToken: {
      type: Number,
      required: true
    }
  },
  emits: [
    'background-click', 'show-model-parameters', 'refresh-model', 'set-sensitivity-analysis-type', 'tab-click'
  ],
  data: () => ({
    graphData: {},
    scenarioData: null,


    drilldownTabs: NODE_DRILLDOWN_TABS,
    activeDrilldownTab: PANE_ID.INDICATOR,
    isDrilldownOpen: false,
    isFetchingStatements: false,
    selectedEdge: null
  }),
  computed: {
    ...mapGetters({
      project: 'app/project',
      currentCAG: 'app/currentCAG',
      selectedScenarioId: 'model/selectedScenarioId'
    }),
    isSensitivityAnalysisSupported() {
      return this.currentEngine === PROJECTION_ENGINES.DYSE;
    },
    activeTab() {
      // if we ever need more state than this
      // add a query store for model
      return this.$route.query?.activeTab || 'flow';
    },
    showComponent() {
      return this.currentEngine !== PROJECTION_ENGINES.DELPHI;
    }
  },
  watch: {
    scenarios() {
      this.refresh();
    },
    modelComponents() {
      this.refresh();
    },
    resetLayoutToken() {
      this.resetCAGLayout();
    }
  },
  created() {
    this.PANE_ID = PANE_ID;
  },
  mounted() {
    this.refresh();
  },
  methods: {
    refresh() {
      // Get Model data
      const graph = { nodes: this.modelComponents.nodes, edges: this.modelComponents.edges };
      this.graphData = { model: this.currentCAG, graph, indicators: [] };

      const scenarioData = modelService.buildNodeChartData(this.modelSummary, this.modelComponents.nodes, this.scenarios);
      this.scenarioData = scenarioData;
    },
    setActive (activeTab) {
      router.push({ query: { activeTab } }).catch(() => {});
      this.$emit('tab-click', activeTab);
    },
    onAugmentCAG() {
      this.$router.push({
        name: 'qualitative',
        params: {
          project: this.project,
          currentCAG: this.currentCAG,
          projectType: ProjectType.Analysis
        }
      });
    },
    onNodeDrilldown(node) {
      this.$router.push({
        name: 'nodeDrilldown',
        params: {
          project: this.project,
          currentCAG: this.currentCAG,
          projectType: ProjectType.Analysis,
          nodeId: node.id
        }
      });
    },
    onBackgroundClick() {
      this.$emit('background-click');
      this.closeDrilldown();
      this.selectedEdge = null;
    },
    openDrilldown() {
      this.isDrilldownOpen = true;
    },
    closeDrilldown() {
      this.isDrilldownOpen = false;
    },
    showModelParameters() {
      this.$emit('show-model-parameters');
    },
    showRelation(edgeData) {
      this.isFetchingStatements = true;
      this.drilldownTabs = EDGE_DRILLDOWN_TABS;
      this.activeDrilldownTab = PANE_ID.EVIDENCE;
      this.openDrilldown();

      modelService.getEdgeStatements(this.currentCAG, edgeData.source, edgeData.target).then(statements => {
        this.selectedStatements = statements;
        this.selectedEdge = edgeData;
        this.isFetchingStatements = false;
      });
    },
    onDrilldownTabClick(tab) {
      this.activeDrilldownTab = tab;
    },
    async setEdgeUserPolarity(edge, polarity) {
      await modelService.updateEdgePolarity(this.currentCAG, edge.id, polarity);
      this.selectedEdge.user_polarity = this.selectedEdge.polarity = polarity;
      this.closeDrilldown();
      this.$emit('refresh-model');
    },
    async setEdgeWeights(edgeData) {
      await modelService.updateEdgeParameter(this.currentCAG, edgeData);
      this.selectedEdge.parameter.weights = edgeData.parameter.weights;
      this.$emit('refresh-model');
    },
    setSensitivityAnalysisType(analysisType) {
      this.$emit('set-sensitivity-analysis-type', analysisType);
    },
    async resetCAGLayout() {
      const modelGraph = this.$refs.modelGraph;
      if (modelGraph === undefined) return;
      const graphOptions = modelGraph.renderer.options;
      const prevStabilitySetting = graphOptions.useStableLayout;
      graphOptions.useStableLayout = false;
      await modelGraph.refresh();
      graphOptions.useStableLayout = prevStabilitySetting;
    },
    downloadExperiment() {
      const scenario = this.scenarios.find(s => s.id === this.selectedScenarioId);
      const start = scenario.parameter.projection_start;
      const numTimeSteps = scenario.parameter.num_steps;

      const experimentPayload = {
        experimentType: 'PROJECTION',
        experimentParams: {
          numTimeSteps: numTimeSteps,
          startTime: start,
          endTime: moment(start).add(numTimeSteps - 1, 'M').valueOf(),
          constraints: scenario.parameter.constraints
        }
      };
      const file = new Blob([JSON.stringify(experimentPayload)], {
        type: 'application/json'
      });
      window.saveAs(file, 'experiment.json');
    }
  }
};
</script>

<style lang="scss" scoped>
@import "~styles/variables";

.tab-panel-container {
  height: $content-full-height;
}

.main-content {
  position: relative;
  width: 100%;
  min-width: 0;
}

.tab-nav-bar {
  display: flex;
  align-items: center;
  height: $navbar-outer-height;

  // Add an empty pseudo element at the left side of the bar to center the
  //  action buttons
  &::before {
    display: block;
    content: '';
    flex: 1;
    min-width: 0;
  }
}

.tab-content {
  flex: 1;
  min-height: 0;
  position: relative;
  overflow: hidden;
  z-index: 1;
  display: flex;
}

main {
  min-width: 0;
  flex: 1;
}

.side-panel {
  margin-top: 10px;
}

.quantitative-drilldown {
  margin: 10px 0;
}

.model-graph-layout-container {
  width: 100%;
  height: 100%;
  position: relative;
}

.augment-model {
  display: flex;
  align-items: center;
  background-color: transparent;
  margin-right: 10px;
  flex: 1;
  min-width: 0;
  justify-content: flex-end;
  box-sizing: border-box;
  .btn {
    &:active {
      background-color: #255DCC;
    }
  }
}
</style>
