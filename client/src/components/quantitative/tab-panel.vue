<template>
  <div
    class="tab-panel-container">
    <div class="main-content h-100 flex flex-col">
      <div class="tab-nav-bar">
        <quantitative-model-options />
        <tab-bar
          class="tab-bar"
          :tabs="tabs"
          :active-tab-id="activeTab"
          @tab-click="setActive"
        />
        <slot name="action-bar" />
        <div class="augment-model">
          <button
            v-tooltip.top-center="'Augment Model'"
            type="button"
            class="btn btn-call-for-action btn-arrow-left"
            @click="onAugmentCAG"
          > <i class="fa fa-fw fa-book" />Augment Model</button>
        </div>

        <div class="comment-btn">
          <button
            v-tooltip.top-center="'Comments'"
            type="button"
            class="btn btn-primary"
            @click="toggleComments"
          >
            <i
              class="fa fa-fw"
              :class="{'fa-commenting': savedComment !== '', 'fa-commenting-o': savedComment === ''}"
            />
          </button>
          <text-area-card
            v-if="isCommentOpen"
            class="comment-box"
            :title="'Comments'"
            :initial-text="savedComment"
            @close="isCommentOpen = false"
            @saveText="updateComments"
          />
        </div>
      </div>
      <div class="tab-content">
        <main>
          <div
            v-if="activeTab === 'flow' && scenarioData && graphData"
            class="model-graph-layout-container">
            <model-graph
              :data="graphData"
              :scenario-data="scenarioData"
              @background-click="onBackgroundClick"
              @node-body-click="showConstraints"
              @node-header-click="showIndicator"
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
            <indicator-summary
              v-if="activeDrilldownTab === PANE_ID.INDICATOR && selectedNode && isDrilldownOpen"
              :node="selectedNode"
              :model-summary="modelSummary"
              @function-selected="onFunctionSelected"
              @edit-indicator="editIndicator"
              @remove-indicator="removeIndicator"
            />
            <evidence-pane
              v-if="activeDrilldownTab === PANE_ID.EVIDENCE && selectedEdge !== null"
              :show-curation-actions="false"
              :selected-relationship="selectedEdge"
              :statements="selectedStatements"
              :project="project"
              :is-fetching-statements="isFetchingStatements"
              :should-confirm-curations="true"
              @edge-weight="setEdgeWeight">
              <edge-polarity-switcher
                :selected-relationship="selectedEdge"
                @edge-set-user-polarity="setEdgeUserPolarity" />
              <edge-weight-slider
                :selected-relationship="selectedEdge"
                @edge-weight="setEdgeWeight" />
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

import QuantitativeModelOptions from '@/components/quantitative/quantitative-model-options';
import ConfigBar from '@/components/quantitative/config-bar';
import SensitivityAnalysis from '@/components/quantitative/sensitivity-analysis';
import ModelGraph from '@/components/quantitative/model-graph';
import modelService from '@/services/model-service';
import ColorLegend from '@/components/graph/color-legend';
import TextAreaCard from '@/components/cards/text-area-card';
import EdgeWeightSlider from '@/components/drilldown-panel/edge-weight-slider';
import DrilldownPanel from '@/components/drilldown-panel';
import EdgePolaritySwitcher from '@/components/drilldown-panel/edge-polarity-switcher';
import EvidencePane from '@/components/drilldown-panel/evidence-pane';
import IndicatorSummary from '@/components/indicator/indicator-summary';
import { EXPORT_MESSAGES } from '@/utils/messages-util';
import TabBar from '../widgets/tab-bar.vue';


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


export default {
  name: 'TabPanel',
  components: {
    QuantitativeModelOptions,
    ConfigBar,
    ModelGraph,
    SensitivityAnalysis,
    ColorLegend,
    TextAreaCard,
    TabBar,
    DrilldownPanel,
    EdgePolaritySwitcher,
    EdgeWeightSlider,
    EvidencePane,
    IndicatorSummary
  },
  props: {
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
    selectedNode: {
      type: Object,
      default: null
    }
  },
  emits: [
    'background-click', 'show-indicator', 'show-constraints', 'show-model-parameters',
    'refresh', 'set-sensitivity-analysis-type', 'save-indicator-edits'
  ],
  data: () => ({
    tabs: [
      {
        name: 'Causal Flow',
        id: 'flow'
      },
      {
        name: 'Matrix',
        id: 'matrix'
      }
    ],
    activeTab: 'flow',
    graphData: {},
    scenarioData: null,


    drilldownTabs: NODE_DRILLDOWN_TABS,
    activeDrilldownTab: PANE_ID.INDICATOR,
    isDrilldownOpen: false,
    isFetchingStatements: false,
    selectedEdge: null,

    savedComment: '',
    isCommentOpen: false
  }),
  computed: {
    ...mapGetters({
      project: 'app/project',
      currentCAG: 'app/currentCAG'
    })
  },
  watch: {
    scenarios() {
      this.refresh();
    }
  },
  created() {
    this.PANE_ID = PANE_ID;
  },
  mounted() {
    this.savedComment = this.modelSummary.description;
    this.refresh();
  },
  methods: {
    refresh() {
      // Get Model data
      const graph = { nodes: this.modelComponents.nodes, edges: this.modelComponents.edges };
      this.graphData = { model: this.currentCAG, graph, indicators: [] };

      const scenarioData = modelService.buildNodeChartData(this.modelSummary, this.modelComponents.nodes, this.scenarios);
      this.scenarioData = scenarioData;
      this.closeDrilldown();
    },
    setActive (tabId) {
      this.activeTab = tabId;
    },
    onAugmentCAG() {
      this.$router.push({
        name: 'qualitative',
        params: {
          project: this.project,
          currentCAG: this.currentCAG
        }
      });
    },
    toggleComments() {
      this.isCommentOpen = !this.isCommentOpen;
    },
    async updateComments(commentsText) {
      this.savedComment = commentsText;
      modelService.updateModelMetadata(this.currentCAG, { description: commentsText }).catch(() => {
        this.toaster(EXPORT_MESSAGES.COMMENT_NOT_SAVED, 'error', true);
      });
    },
    onBackgroundClick() {
      this.$emit('background-click');
      this.closeDrilldown();
      this.selectedEdge = null;
    },
    showIndicator(nodeData) {
      this.$emit('show-indicator', nodeData);
      this.drilldownTabs = NODE_DRILLDOWN_TABS;
      this.activeDrilldownTab = PANE_ID.INDICATOR;
      const indicatorTab = this.drilldownTabs.find(tab => tab.id === PANE_ID.INDICATOR);
      if (indicatorTab !== undefined) {
        indicatorTab.name = `Data to quantify ${nodeData.label}`;
      }
      this.openDrilldown();
    },
    openDrilldown() {
      this.isDrilldownOpen = true;
    },
    closeDrilldown() {
      this.isDrilldownOpen = false;
    },
    showConstraints(nodeData) {
      this.$emit('show-constraints', nodeData, this.scenarioData[nodeData.concept]);
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
    async removeIndicator() {
      // FIXME: Needs a bit of thought, how to properly clean out values in ES vs empty vs nulls
      const payload = { id: this.selectedNode.id, concept: this.selectedNode.concept };
      payload.parameter = {
        indicator_time_series: [],
        indicator_time_series_parameter: null,
        indicator_name: null,
        indicator_score: null,
        indicator_id: null,
        initial_value_parameter: { func: 'last' },
        initial_value: null,
        indicator_source: null
      };
      await modelService.updateNodeParameter(this.currentCAG, payload);
      this.closeDrilldown();
      this.$emit('refresh');
    },
    onFunctionSelected(newProperties) {
      const newParameter = Object.assign({}, this.selectedNode.parameter, newProperties);
      this.closeDrilldown();
      this.$emit('save-indicator-edits', newParameter);
    },
    async setEdgeUserPolarity(edge, polarity) {
      await modelService.updateEdgePolarity(this.currentCAG, edge.id, polarity);
      this.selectedEdge.user_polarity = this.selectedEdge.polarity = polarity;
      this.closeDrilldown();
      this.$emit('refresh');
    },
    async setEdgeWeight(edgeData) {
      await modelService.updateEdgeParameter(this.currentCAG, edgeData);
      this.selectedEdge.parameter.weight = edgeData.parameter.weight;
      this.closeDrilldown();
      this.$emit('refresh');
    },
    editIndicator() {
      this.$emit('edit-indicator');
    },
    setSensitivityAnalysisType(analysisType) {
      this.$emit('set-sensitivity-analysis-type', analysisType);
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
  background: $background-light-3;
}

.tab-content {
  flex: 1;
  min-height: 0;
  position: relative;
  overflow: hidden;
  background: $background-light-2;
  box-shadow: $shadow-level-2;
  z-index: 1;
  display: flex;
}

main {
  min-width: 0;
  flex: 1;
}


.quantitative-drilldown {
  margin: 10px 0;
}

.model-graph-layout-container {
  width: 100%;
  height: 100%;
}

.augment-model {
  display: flex;
  align-items: center;
  background-color: transparent;
  margin-right: 10px;
  flex-grow: 1;
  justify-content: flex-end;
  box-sizing: border-box;
  .btn {
    &:active {
      background-color: #255DCC;
    }
  }
}

.comment-btn {
  margin-right: 5px;
  margin-left: 5px;
  position: relative;

  .comment-box {
    position: absolute;
    right: 0;
    top: calc(100% + 3px);
    width: 25vw;
  }
}

.comment-area {
  margin-top: 50px;
}

/deep/ .tab-bar li.active {
  background: $background-light-2;
  box-shadow: 0px -8px 8px 4px rgba(0, 0, 0, 0.02);
  z-index: 2;
}
</style>
