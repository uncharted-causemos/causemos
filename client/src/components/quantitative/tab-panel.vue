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
          <div
            v-if="activeTab === 'table'"
            class="tabular-layout">
            <div>
              <div class="header">
                <h4 class="labels-list-title">Concepts</h4>
              </div>
              <labels-list
                :data="labelsData"
                :config="layoutConfig"
                :highlights="listHighlights"
                :hovered="hovered"
                @select-node="handleSelectNode"
                @hover-node="handleHoverNode"
              />
            </div>
            <div>
              <div class="header">&nbsp;</div>
              <arc-diagram
                :data="graphData"
                :config="layoutConfigArcDiagram"
                :highlights="highlights"
                :hovered="hovered"
                @select-node="handleSelectNode"
                @select-edge="handleSelectEdge"
                @hover-node="handleHoverNode"
              />
            </div>
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
import _ from 'lodash';
import Vue from 'vue';
import { mapGetters } from 'vuex';

import QuantitativeModelOptions from '@/components/quantitative/quantitative-model-options';
import ConfigBar from '@/components/quantitative/config-bar';
import SensitivityAnalysis from '@/components/quantitative/sensitivity-analysis';
import ModelGraph from '@/components/quantitative/model-graph';
import LabelsList from '@/components/model/models-matrix/labels-list';
import ArcDiagram from '@/components/model/models-matrix/arc-diagram';

import arcDiagramUtil from '@/utils/arc-diagram-util';
import graphsUtil from '@/utils/graphs-util';

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
    LabelsList,
    ArcDiagram,
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
        name: 'Table',
        id: 'table'
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

    labelsData: {},
    highlights: {},
    listHighlights: {},
    hovered: '',
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
    this.layoutConfig = {
      itemHeight: 70,
      margin: { top: 10, right: 20, bottom: 20, left: 30 }
    };
    this.layoutConfigArcDiagram = {
      itemHeight: 70,
      margin: { top: 12, right: 5, bottom: 10, left: 35 }
    };
  },
  mounted() {
    this.savedComment = this.modelSummary.description;
    this.refresh();
  },
  methods: {
    refresh() {
      // Get Model data
      const graph = { nodes: this.modelComponents.nodes, edges: this.modelComponents.edges };
      const order = arcDiagramUtil.calculateBestGraphOrder(graph);
      this.graphData = { model: this.currentCAG, graph, indicators: [], order };
      this.labelsData = { model: this.currentCAG, order };

      this.highlights = {};

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
    handleSelectNode(selection) {
      let highlights = _.clone(this.highlights);

      if (_.isNil(selection)) {
        highlights = null;
      } else {
        const node = selection.concept;
        const modelId = selection.modelId;

        // Calculate neighborhood given a node
        const neighorhood = graphsUtil.calculateNeighborhood(this.graphData.graph, node);

        highlights = {
          modelId,
          selectedNode: node,
          selectedEdge: null,
          nodes: neighorhood.nodes,
          edges: neighorhood.edges
        };
      }
      Vue.set(this, 'highlights', highlights);

      // Combined neighborhood for labels-list
      if (!_.isNil(selection)) {
        const node = selection.concept;
        const combinedNeighborhoodList = [];
        const arrayOfLabels = highlights.nodes.map(n => n.concept);
        const modelId = selection.modelId;
        combinedNeighborhoodList.push(arrayOfLabels);
        const uniqueList = _.uniq(_.flatten(combinedNeighborhoodList));
        Vue.set(this, 'listHighlights', { selectedNode: node, nodes: uniqueList, modelId });
      } else {
        Vue.set(this, 'listHighlights', null);
      }
    },
    handleSelectEdge(selection) {
      let highlights = _.clone(this.highlights);

      if (_.isNil(selection)) {
        highlights = null;
      } else {
        const edge = selection.edge;
        const modelId = selection.modelId;

        // If the edge is not present in the model, nodes shouldn't get highlighted
        const edges = this.graphData.graph.edges;
        const edgeIsPresent = edges.filter(e => e.source === edge.source && e.target === edge.target);
        let neighborNodes = [];
        if (!_.isEmpty(edgeIsPresent)) {
          neighborNodes = [{ concept: edge.source }, { concept: edge.target }];
        }
        highlights = {
          modelId,
          selectedNode: null,
          selectedEdge: edge,
          nodes: neighborNodes,
          edges: [edge]
        };
      }
      Vue.set(this, 'highlights', highlights);

      if (!_.isNil(selection)) {
        const edge = selection.edge;
        const list = [edge.source, edge.target];
        const modelId = selection.modelId;
        Vue.set(this, 'listHighlights', { selectedNode: null, nodes: list, modelId });
      } else {
        Vue.set(this, 'listHighlights', null);
      }
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
    handleHoverNode(selection) {
      this.hovered = _.isNil(selection) ? '' : selection;
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
.tabular-layout {
  padding: 5px;
  display: flex;
  height: 95vh;
  overflow-y: auto;
  .header {
    font-weight: bold;
    font-size: $font-size-small;
    min-height: 40px;
  }
  .labels-list-title{
    margin-top: 5px;
    margin-left: 30px;
  }

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
