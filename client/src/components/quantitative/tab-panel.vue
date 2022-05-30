<template>
  <div class="tab-panel-container">
    <div class="tab-nav-bar">
      <slot name="action-bar" />
    </div>
    <div class="tab-content">
      <cag-side-panel
        class="side-panel"
        :is-experiment-download-visible="selectedScenarioId !== null"
        :model-summary="modelSummary"
        :model-components="modelComponents"
        :scenarios="scenarios"
        @show-path="showPath"
        @download-experiment="downloadExperiment"
        @new-scenario='$emit("new-scenario", $event)'
        @update-scenario='$emit("update-scenario", $event)'
        @delete-scenario='$emit("delete-scenario", $event)'
        @delete-scenario-clamp='$emit("delete-scenario-clamp", $event)'
        @duplicate-scenario='$emit("duplicate-scenario", $event)'
      >
        <template #below-tabs>
          <cag-comments-button :model-summary="modelSummary" />
        </template>
      </cag-side-panel>
      <div class="insight-capture tab-content">
        <main>
          <div
            v-if="activeTab === 'flow' && scenarioData && graphData"
            class="model-graph-layout-container">
            <model-graph
              :model-summary="modelSummary"
              :data="graphData"
              :scenario-data="scenarioData"
              :visual-state="visualState"
              ref="modelGraph"
              @background-click="onBackgroundClick"
              @node-sensitivity="onNodeSensitivity"
              @node-drilldown="openNodeDrilldownView"
              @edge-click="showRelation"
            />
            <div class="legend-config-row">
              <cag-legend
                :are-ridgelines-visible="selectedScenarioId !== null"
                :time-scale="timeScale"
                :show-data-warnings="true"
                :show-edge-type-explanation="doesCurrentEngineSupportLevelEdges"
              />
              <config-bar
                class="config-bar"
                :model-summary="modelSummary"
                @model-parameter-changed="$emit('model-parameter-changed')"
              />
            </div>
          </div>
          <sensitivity-analysis
            v-if="activeTab === 'matrix'"
            :model-summary="modelSummary"
            :sensitivity-result="sensitivityResult"
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
                :model-summary="modelSummary"
                :selected-relationship="selectedEdge"
                @edge-set-user-polarity="setEdgeUserPolarity"
                @edge-set-weights="setEdgeWeights"
              />
            </evidence-pane>
            <!-- make this a component later-->
            <sensitivity-pane
              v-else-if="activeDrilldownTab === PANE_ID.SENSITIVITY && selectedNode !== null"
              :model-summary="modelSummary"
              :model-components="modelComponents"
              :selected-node="selectedNode"
              :sensitivity-result="sensitivityResult"
              @open-drilldown="openNodeDrilldownView"
              @highlight-node-paths="highlightNodePaths"
            >
            </sensitivity-pane>
          </template>
        </drilldown-panel>
      </div>
    </div>
  </div>
</template>

<script lang="ts">
import _ from 'lodash';
import { defineComponent, ref, PropType, Ref } from 'vue';
import { mapGetters, mapActions } from 'vuex';

import ConfigBar from '@/components/quantitative/config-bar.vue';
import SensitivityAnalysis from '@/components/quantitative/sensitivity-analysis.vue';
import ModelGraph from '@/components/quantitative/model-graph.vue';
import DrilldownPanel from '@/components/drilldown-panel.vue';
import EdgePolaritySwitcher from '@/components/drilldown-panel/edge-polarity-switcher.vue';
import EvidencePane from '@/components/drilldown-panel/evidence-pane.vue';
import SensitivityPane from '@/components/drilldown-panel/sensitivity-pane.vue';
import modelService, { calculateProjectionEnd, Engine, supportsLevelEdges } from '@/services/model-service';
import { ProjectType } from '@/types/Enums';
import CagSidePanel from '@/components/cag/cag-side-panel.vue';
import CagCommentsButton from '@/components/cag/cag-comments-button.vue';
import CagLegend from '@/components/graph/cag-legend.vue';
import { findPaths, calculateNeighborhood } from '@/utils/graphs-util';
import { CAGModelSummary, CAGGraph, Scenario, NodeScenarioData, EdgeParameter, NodeParameter, CAGVisualState } from '@/types/CAG';
import { Statement } from '@/types/Statement';
import { getInsightById } from '@/services/insight-service';
import { ModelsSpaceDataState } from '@/types/Insight';
import useToaster from '@/services/composables/useToaster';

const PANE_ID = {
  SENSITIVITY: 'sensitivity',
  EVIDENCE: 'evidence'
};

const NODE_DRILLDOWN_TABS = [
  {
    name: 'Node Sensitivity',
    id: PANE_ID.SENSITIVITY
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
  DYSE: 'dyse',
  SENSEI: 'sensei'
};

const blankVisualState = (): CAGVisualState => {
  return {
    focus: { nodes: [], edges: [] },
    outline: { nodes: [], edges: [] }
  };
};

export default defineComponent({
  name: 'TabPanel',
  components: {
    ConfigBar,
    ModelGraph,
    SensitivityAnalysis,
    DrilldownPanel,
    EdgePolaritySwitcher,
    EvidencePane,
    SensitivityPane,
    CagSidePanel,
    CagCommentsButton,
    CagLegend
  },
  props: {
    currentEngine: {
      type: String,
      default: null
    },
    modelSummary: {
      type: Object as PropType<CAGModelSummary>,
      required: true
    },
    modelComponents: {
      type: Object as PropType<CAGGraph>,
      required: true
    },
    scenarios: {
      type: Array as PropType<Scenario[]>,
      required: true
    },
    resetLayoutToken: {
      type: Number,
      required: true
    }
  },
  emits: [
    'refresh-model',
    'set-sensitivity-analysis-type',
    'tab-click',
    'model-parameter-changed',
    'new-scenario',
    'update-scenario',
    'delete-scenario',
    'delete-scenario-clamp',
    'duplicate-scenario'
  ],
  setup() {
    const selectedNode = ref(null) as Ref<NodeParameter | null>;
    const selectedEdge = ref(null) as Ref<EdgeParameter | null>;
    const selectedStatements = ref([]) as Ref<Statement[]>;
    const visualState = ref(blankVisualState()) as Ref<CAGVisualState>;

    return {
      toaster: useToaster(),
      selectedNode,
      selectedEdge,
      selectedStatements,
      visualState,
      PANE_ID
    };
  },
  data: () => ({
    graphData: {},
    scenarioData: null as { [concept: string]: NodeScenarioData } | null,
    sensitivityResult: null,

    drilldownTabs: NODE_DRILLDOWN_TABS,
    activeDrilldownTab: PANE_ID.EVIDENCE,
    isDrilldownOpen: false,
    isFetchingStatements: false
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
    },
    timeScale() {
      return this.modelSummary.parameter.time_scale;
    },
    doesCurrentEngineSupportLevelEdges() {
      // FIXME: currentEngine's type should be Engine, not string
      return supportsLevelEdges(this.currentEngine as Engine);
    }
  },
  watch: {
    $route: {
      handler(/* newValue, oldValue */) {
        // NOTE:  this is only valid when the route is focused on the 'quantitative' space
        if (this.$route.name === 'quantitative' && this.$route.query) {
          const insight_id = this.$route.query.insight_id;
          if (typeof insight_id === 'string') {
            this.updateStateFromInsight(insight_id);
            this.$router.push({
              query: {
                insight_id: undefined,
                activeTab: this.$route.query.activeTab || undefined
              }
            });
          }
        }
      },
      immediate: true
    },
    scenarios() {
      this.refresh();
    },
    modelComponents() {
      this.refresh();
    },
    resetLayoutToken() {
      this.resetCAGLayout();
    },
    selectedScenarioId() {
      // FIXME: Probably need a ligher weight function than refresh
      this.refresh();
    }
  },
  mounted() {
    this.refresh();
  },
  methods: {
    ...mapActions({
      setSelectedScenarioId: 'model/setSelectedScenarioId',
      setDataState: 'insightPanel/setDataState'
    }),
    refresh() {
      // Get Model data
      const graph = { nodes: this.modelComponents.nodes, edges: this.modelComponents.edges };
      this.graphData = { model: this.currentCAG, graph, indicators: [] };

      const scenarioData = modelService.buildNodeChartData(this.modelSummary, this.modelComponents.nodes, this.scenarios);
      this.scenarioData = scenarioData;

      // Get sensitivity results, note these results may still be pending
      if (this.currentEngine === 'dyse') {
        modelService.getScenarioSensitivity(this.currentCAG, this.currentEngine).then(sensitivityResults => {
          // If historical data mode is active, use sensitivity results from
          //  the baseline scenario
          let scenarioId = this.selectedScenarioId;
          if (this.selectedScenarioId === null) {
            scenarioId = this.scenarios.find(scenario => scenario.is_baseline === true)?.id;
          }
          this.sensitivityResult = sensitivityResults.find(
            (d: any) => d.scenario_id === scenarioId
          );
        });
      }

      this.updateDataState();
    },
    onNodeSensitivity(node: NodeParameter) {
      this.drilldownTabs = NODE_DRILLDOWN_TABS;
      this.activeDrilldownTab = PANE_ID.SENSITIVITY;
      this.openDrilldown();
      this.selectedNode = node;
      const neighborhood = calculateNeighborhood(this.modelComponents as any, node.concept);
      this.visualState = {
        focus: neighborhood,
        outline: {
          nodes: [
            { concept: node.concept }
          ],
          edges: []
        }
      };
      this.updateDataState();
    },
    openNodeDrilldownView(node: NodeParameter) {
      this.onBackgroundClick();
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
    highlightNodePaths(node: { concept: string }, type: string) {
      if (!this.selectedNode) return;

      let paths = [];
      if (type === 'source') {
        paths = findPaths(node.concept, this.selectedNode.concept, this.modelComponents.edges);
      } else {
        paths = findPaths(this.selectedNode.concept, node.concept, this.modelComponents.edges);
      }

      const highlightEdges = [];
      const highlightNodes = [];
      const nodesSet = new Set<string>();

      // FIXME: might have dupliate edges, should clean up
      for (const path of paths) {
        for (let i = 0; i < path.length - 1; i++) {
          highlightEdges.push({
            source: path[i],
            target: path[i + 1]
          });
          nodesSet.add(path[i]);
          nodesSet.add(path[i + 1]);
        }
      }
      for (const nodeStr of nodesSet.values()) {
        highlightNodes.push({
          concept: nodeStr
        });
      }

      if (node) {
        this.visualState = {
          focus: {
            nodes: highlightNodes,
            edges: highlightEdges
          },
          outline: {
            nodes: [
              { concept: node.concept, color: '#8767c8' },
              { concept: this.selectedNode.concept }
            ],
            edges: []
          }
        };
        this.updateDataState();
      }
    },
    onBackgroundClick() {
      this.closeDrilldown();
      this.selectedEdge = null;
      this.selectedNode = null;
      this.visualState = blankVisualState();
      this.updateDataState();
    },
    openDrilldown() {
      this.isDrilldownOpen = true;
    },
    closeDrilldown() {
      this.isDrilldownOpen = false;
    },
    showRelation(edgeData: EdgeParameter) {
      this.isFetchingStatements = true;
      this.drilldownTabs = EDGE_DRILLDOWN_TABS;
      this.activeDrilldownTab = PANE_ID.EVIDENCE;
      this.openDrilldown();

      modelService.getEdgeStatements(this.currentCAG, edgeData.source, edgeData.target).then(statements => {
        this.selectedStatements = statements;
        this.selectedEdge = edgeData;
        const source = edgeData.source;
        const target = edgeData.target;
        this.visualState = {
          focus: {
            nodes: [{ concept: source }, { concept: target }],
            edges: [{ source, target }]
          },
          outline: {
            nodes: [],
            edges: [{ source, target }]
          }
        };

        this.updateDataState();
        this.isFetchingStatements = false;
      });
    },
    onDrilldownTabClick(tab: string) {
      this.activeDrilldownTab = tab;
    },
    async setEdgeUserPolarity(edge: EdgeParameter, polarity: number) {
      if (!this.selectedEdge) return;
      await modelService.updateEdgePolarity(this.currentCAG, edge.id, polarity);
      this.selectedEdge.user_polarity = this.selectedEdge.polarity = polarity;
      this.closeDrilldown();
      this.$emit('refresh-model');
    },
    async setEdgeWeights(edgeData: EdgeParameter, weights: [number, number]) {
      const payload = {
        id: edgeData.id,
        source: edgeData.source,
        target: edgeData.target,
        polarity: edgeData.polarity,
        parameter: {
          weights
        }
      };
      await modelService.updateEdgeParameter(this.currentCAG, payload as any);
      if (this.selectedEdge?.parameter) {
        this.selectedEdge.parameter.weights = weights;
      }
      this.$emit('refresh-model');
    },
    setSensitivityAnalysisType(analysisType: string) {
      // FIXME: can propbably remove
      this.$emit('set-sensitivity-analysis-type', analysisType);
    },
    async resetCAGLayout() {
      const modelGraph: any = this.$refs.modelGraph;
      if (modelGraph === undefined) return;
      const graphOptions = modelGraph.renderer.options;
      const prevStabilitySetting = graphOptions.useStableLayout;
      graphOptions.useStableLayout = false;
      await modelGraph.refresh();
      graphOptions.useStableLayout = prevStabilitySetting;
    },
    downloadExperiment() {
      const scenario = this.scenarios.find(s => s.id === this.selectedScenarioId);
      if (!scenario) return;

      const startTime = scenario.parameter.projection_start;
      const endTime = calculateProjectionEnd(startTime, this.timeScale);
      const experimentPayload = {
        experimentType: 'PROJECTION',
        experimentParam: {
          numTimesteps: scenario.parameter.num_steps,
          startTime,
          endTime,
          constraints: scenario.parameter.constraints
        }
      };
      const file = new Blob([JSON.stringify(experimentPayload)], {
        type: 'application/json'
      });
      (window as any).saveAs(file, 'experiment.json');
    },
    showPath(item: any) {
      const path = item.path;
      const highlightEdges = [];
      const highlightNode = _.uniq(path).map(d => {
        return {
          concept: (d as string)
        };
      });

      for (let i = 0; i < path.length - 1; i++) {
        highlightEdges.push({
          source: path[i],
          target: path[i + 1]
        });
      }
      this.visualState = {
        focus: {
          nodes: highlightNode,
          edges: highlightEdges
        },
        outline: {
          nodes: [],
          edges: []
        }
      };
      this.updateDataState();
    },
    async updateStateFromInsight(insight_id: string) {
      const loadedInsight = await getInsightById(insight_id);
      const scenarioId = loadedInsight.data_state?.selectedScenarioId;
      const selectedNodeStr = loadedInsight.data_state?.selectedNode;
      const selectedEdge = loadedInsight.data_state?.selectedEdge;
      const visualState = loadedInsight.data_state?.cagVisualState as CAGVisualState;

      let newVisualState: CAGVisualState = blankVisualState();

      if (!selectedEdge) {
        this.closeDrilldown();
      }

      if (selectedNodeStr) {
        const nodeToSelect = this.modelComponents.nodes.find(node => node.concept === selectedNodeStr);
        if (nodeToSelect) {
          this.onNodeSensitivity(nodeToSelect);
          const neighborhood = calculateNeighborhood(this.modelComponents, nodeToSelect.concept);

          newVisualState = {
            focus: neighborhood,
            outline: {
              nodes: [
                { concept: nodeToSelect.concept }
              ],
              edges: []
            }
          };
        }
      } else if (selectedEdge) {
        const [source, target] = selectedEdge;
        const edgeToSelect = this.modelComponents.edges.find(edge => edge.source === source && edge.target === target);

        if (edgeToSelect) {
          this.showRelation(edgeToSelect);
          newVisualState = {
            focus: {
              nodes: [{ concept: source }, { concept: target }],
              edges: [{ source, target }]
            },
            outline: {
              nodes: [],
              edges: [{ source, target }]
            }
          };
        }
      }

      // merge
      if (visualState) {
        newVisualState.focus.nodes = [...newVisualState.focus.nodes, ...visualState.focus.nodes];
        newVisualState.focus.edges = [...newVisualState.focus.edges, ...visualState.focus.edges];
        newVisualState.outline.nodes = [...newVisualState.outline.nodes, ...visualState.outline.nodes];
        newVisualState.outline.edges = [...newVisualState.outline.edges, ...visualState.outline.edges];
      }
      this.visualState = newVisualState;

      if (scenarioId && !this.scenarios.some(sc => sc.id === scenarioId)) {
        this.toaster(`Cannot restore deleted scenario ${scenarioId}`, 'error', true);
        return;
      }

      this.setSelectedScenarioId(scenarioId);

      // Restoring engine should probably be last, this may not work correctly pending each engine's own state
      const insightEngine = loadedInsight.data_state?.currentEngine;
      const currentEngine = this.modelSummary.parameter.engine;
      const engineStatus = this.modelSummary.engine_status;

      if (engineStatus[insightEngine] === modelService.MODEL_STATUS.TRAINING) {
        this.toaster(`Cannot restore back to ${insightEngine} because there is training in progress`, 'error', true);
        console.error(`Cannot restore back to ${insightEngine} because there is training in progress`);
        return;
      }
      if (!insightEngine || engineStatus[insightEngine] === modelService.MODEL_STATUS.NOT_REGISTERED) {
        this.toaster(`Cannot restore back to ${insightEngine}, bad state`, 'error', true);
        console.error(`Cannot restore back to ${insightEngine}, bad state`);
        return;
      }

      // Only DySE curently handle sensitivity analysis
      if (insightEngine !== PROJECTION_ENGINES.DYSE) {
        this.sensitivityResult = null;
      }

      if (insightEngine !== currentEngine) {
        await modelService.updateModelParameter(this.currentCAG, {
          engine: insightEngine
        });
        this.toaster(`Engine switched from ${currentEngine} to ${insightEngine}`, 'success', true);
        this.$emit('model-parameter-changed');
      }
    },
    updateDataState() {
      const dataState: ModelsSpaceDataState = {
        selectedScenarioId: this.selectedScenarioId,
        currentEngine: this.currentEngine,
        modelName: this.modelSummary.name,
        cagVisualState: this.visualState ?? null
      };
      this.setDataState(dataState);
    }
  }
});
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

.legend-config-row {
  position: absolute;
  bottom: 0;
  left: 0;
  display: flex;
  gap: 10px;
  align-items: flex-end;

  // Don't block the graph behind it
  pointer-events: none;
  // But do still receive mouse events on children
  > * {
    pointer-events: auto;
  }
}

.config-bar {
  margin-bottom: 5px;
}
</style>
