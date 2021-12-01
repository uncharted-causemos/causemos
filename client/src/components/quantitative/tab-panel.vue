<template>
  <div class="tab-panel-container">
    <div class="tab-nav-bar">
      <slot name="action-bar" />
    </div>
    <div class="tab-content">
      <cag-side-panel
        class="side-panel"
        :is-experiment-download-visible="true"
        :model-components="modelComponents"
        @download-experiment="downloadExperiment"
      >
        <template #below-tabs>
          <cag-comments-button :model-summary="modelSummary" />
        </template>
      </cag-side-panel>
      <main class="insight-capture">
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
          <config-bar
            class="config-bar"
            :model-summary="modelSummary"
            @model-parameter-changed="$emit('model-parameter-changed')"
          />
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
              @edge-set-user-polarity="setEdgeUserPolarity"
              @edge-set-weights="setEdgeWeights"
            />
          </evidence-pane>
        </template>
      </drilldown-panel>
    </div>
  </div>
</template>

<script>
import { mapGetters } from 'vuex';
import moment from 'moment';

import ConfigBar from '@/components/quantitative/config-bar';
import SensitivityAnalysis from '@/components/quantitative/sensitivity-analysis';
import ModelGraph from '@/components/quantitative/model-graph';
import modelService from '@/services/model-service';
import ColorLegend from '@/components/graph/color-legend';
import DrilldownPanel from '@/components/drilldown-panel';
import EdgePolaritySwitcher from '@/components/drilldown-panel/edge-polarity-switcher';
import EvidencePane from '@/components/drilldown-panel/evidence-pane';
import { ProjectType } from '@/types/Enums';
import CagSidePanel from '@/components/cag/cag-side-panel.vue';
import CagCommentsButton from '@/components/cag/cag-comments-button.vue';

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
    EvidencePane,
    CagSidePanel,
    CagCommentsButton
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
    'background-click',
    'refresh-model',
    'set-sensitivity-analysis-type',
    'tab-click',
    'model-parameter-changed'
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
    async setEdgeWeights(edgeData, weights) {
      const payload = {
        id: edgeData.id,
        source: edgeData.source,
        target: edgeData.target,
        polarity: edgeData.polarity,
        parameter: {
          weights
        }
      };
      await modelService.updateEdgeParameter(this.currentCAG, payload);
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
  position: relative;
  width: 100%;
  min-width: 0;
  display: flex;
  flex-direction: column;
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
// FIXME: hideable legend contains its own absolute positioning styles.
//  Refactor it so that its parent determines its positioning, then put both
//  the legend and the config bar in a flexbox so we don't need hardcoded
//  positions like we have here.
$legendWidth: 200px;

.config-bar {
  position: absolute;
  left: calc(calc(#{$legendWidth} - #{$navbar-outer-height}) + 10px);
  bottom: 5px;
}
</style>
