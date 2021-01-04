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
        <div class="tab-pane active" />
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
          :scenarios="scenarios"
        />
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
import ModelGraph from '@/components/graph/model-graph';
import LabelsList from '@/components/model/models-matrix/labels-list';
import ArcDiagram from '@/components/model/models-matrix/arc-diagram';

import arcDiagramUtil from '@/utils/arc-diagram-util';
import graphsUtil from '@/utils/graphs-util';

import modelService from '@/services/model-service';

import ColorLegend from '@/components/graph/color-legend';
import TextAreaCard from '@/components/cards/text-area-card';
import API from '@/api/api';
import { EXPORT_MESSAGES } from '@/utils/messages-util';
import TabBar from '../widgets/tab-bar.vue';

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
    TabBar
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
    scenarios: {
      type: Array,
      required: true
    }
  },
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
      const result = await API.put(`cags/${this.currentCAG}`, {
        description: commentsText
      });
      if (result.status !== 200) {
        this.toaster(EXPORT_MESSAGES.COMMENT_NOT_SAVED, 'error', true);
      }
    },
    onBackgroundClick() {
      this.$emit('background-click');
    },
    handleHoverNode(selection) {
      this.hovered = _.isNil(selection) ? '' : selection;
    },
    showIndicator(nodeData) {
      this.$emit('show-indicator', nodeData);
    },
    showConstraints(nodeData) {
      this.$emit('show-constraints', nodeData, this.scenarioData[nodeData.concept]);
    },
    showModelParameters() {
      this.$emit('show-model-parameters');
    },
    showRelation(edge) {
      this.$emit('show-edge', edge);
    }
  }
};
</script>

<style lang="scss" scoped>
@import "~styles/wm-theme/wm-theme";
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
}

.tab-content {
  flex: 1;
  min-height: 0;
  position: relative;
  overflow: hidden;
}
.model-graph-layout-container {
  width: 100%;
  height: 100%;
}
.tabular-layout {
  background-color: #ffffff;
  padding: 5px;
  display: flex;
  height: 95vh;
  overflow-y: auto;
  .header {
    font-weight: bold;
    font-size: 12px;
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
    &:hover {
      color: $color-text-base-light;
    }
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
  background: white;
}
</style>
