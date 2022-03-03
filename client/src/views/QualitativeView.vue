<template>
  <div class="qualitative-view-container">
    <teleport to="#navbar-trailing-teleport-destination">
      <cag-analysis-options-button
        :model-summary="modelSummary"
        :view-after-deletion="'overview'"
      />
    </teleport>
    <action-bar
      :model-summary="modelSummary"
      :model-components="modelComponents"
      @add-concept="createNewNode()"
      @import-cag="showModalImportCAG = true"
      @reset-cag="resetCAGLayout()"
    />
    <main>
      <cag-side-panel
        class="side-panel"
        :model-components="modelComponents"
      >
        <template #below-tabs>
          <cag-comments-button :model-summary="modelSummary" />
        </template>
      </cag-side-panel>
      <div class="insight-capture tab-content">
        <div class="graph-container" @dblclick="onBackgroundDblClick">
          <empty-state-instructions v-if="showEmptyStateInstructions" />
          <CAG-graph
            v-else
            ref="cagGraph"
            class="cagGraph"
            :data="modelComponents"
            :show-new-node="showNewNode"
            :selected-time-scale="modelSummary?.parameter?.time_scale"
            :visual-state="visualState"
            @refresh="captureThumbnail"
            @new-edge="addEdge"
            @background-click="onBackgroundClick"
            @background-dbl-click="onBackgroundDblClick"
            @node-click="onNodeClick"
            @edge-click="onEdgeClick"
            @delete="onDelete"
            @suggestion-selected="onSuggestionSelected"
            @datacube-selected="onDatacubeSelected"
            @suggestion-duplicated="onSuggestionDuplicated"
            @rename-node="openRenameModal"
            @merge-nodes="mergeNodes"
            @add-to-CAG="onAddToCAG"
          />
          <div class="legend-config-row">
            <cag-legend
              v-if="!showEmptyStateInstructions"
              :histogram-time-slice-labels="[]"
            />
            <div class="config-bar" v-if="selectedTimeScaleLabel !== null">
              Time scale of interest:
              <strong>{{ selectedTimeScaleLabel}} </strong>
              <button
                class="btn btn-sm btn-default"
                disabled
                @click="showModalTimeScale = true"
              >
                <i class="fa fa-fw fa-pencil" />
              </button>
              .
            </div>
          </div>
        </div>
        <drilldown-panel
          class="qualitative-drilldown"
          :is-open="isDrilldownOpen"
          :tabs="drilldownTabs"
          :active-tab-id="activeDrilldownTab"
          :overlay-pane-title="overlayPaneTitle"
          :is-overlay-open="isDrilldownOverlayOpen"
          @close="closeDrilldown"
          @tab-click="onTabClick"
          @overlay-back="onDrilldownOverlayBack"
        >
          <template #content>
            <evidence-pane
              v-if="activeDrilldownTab === PANE_ID.EVIDENCE && selectedEdge !== null"
              :selected-relationship="selectedEdge"
              :statements="selectedStatements"
              :project="project"
              :is-fetching-statements="isFetchingStatements"
              :should-confirm-curations="true"
              :show-edge-recommendations="true"
              @updated-relations="resolveUpdatedRelations"
              @add-edge-evidence-recommendations="addEdgeEvidenceRecommendations"
            >
                <edge-polarity-switcher
                  :model-summary="modelSummary"
                  :selected-relationship="selectedEdge"
                  @edge-set-user-polarity="setEdgeUserPolarity"
                  @edge-set-weights="setEdgeWeights"
                />
                <button
                  style="font-weight: normal; width: 100%"
                  class="btn"
                  @click="openPathFind">
                  Indirect path
                </button>
            </evidence-pane>
            <relationships-pane
              v-if="
                activeDrilldownTab === PANE_ID.RELATIONSHIPS &&
                  selectedNode !== null
              "
              :selected-node="selectedNode"
              :model-components="modelComponents"
              :statements="selectedStatements"
              :project="project"
              :is-fetching-statements="isFetchingStatements"
              :show-get-suggestions-button="true"
              @select-edge="onRelationshipClick"
              @remove-edge="onRemoveRelationship"
              @show-relationship-suggestions="
                openDrilldownOverlay(PANE_ID.NODE_SUGGESTIONS)
              "
            />
            <qualitative-factors-pane
              v-if="
                activeDrilldownTab === PANE_ID.FACTORS && selectedNode !== null
              "
              :selected-item="selectedNode"
              :number-relationships="countNodeRelationships"
              :statements="selectedStatements"
              :project="project"
              :is-fetching-statements="isFetchingStatements"
              :should-confirm-curations="true"
              @show-factor-recommendations="onShowFactorRecommendations"
              @updated-relations="resolveUpdatedRelations"
              @add-to-CAG="onAddToCAG"
              @rename-node="openRenameModal"
            />
          </template>
          <template #overlay-pane>
            <node-suggestions-pane
              v-if="
                activeDrilldownTab === PANE_ID.NODE_SUGGESTIONS &&
                  selectedNode !== null
              "
              :selected-node="selectedNode"
              :statements="selectedStatements"
              :graph-data="modelComponents"
              :is-fetching-statements="isFetchingStatements"
              @add-to-CAG="onAddToCAG"
            />
            <factors-recommendations-pane
              v-if="
                activeDrilldownTab === PANE_ID.FACTOR_RECOMMENDATIONS &&
                  selectedNode !== null &&
                  factorRecommendationsList.length > 0
              "
              :correction="correction"
              :recommendations="factorRecommendationsList"
              :curationTrackingId="curationTrackingId"
              :is-fetching-statements="isFetchingStatements"
              @close-overlay="onDrilldownOverlayBack"
            />
          </template>
        </drilldown-panel>
      </div>
    </main>
    <modal-time-scale
      v-if="showModalTimeScale"
      :initially-selected-time-scale="modelSummary?.parameter?.time_scale"
      @save-time-scale="saveTimeScale"
      @close="showModalTimeScale = false"
    />
    <modal-import-cag
      v-if="showModalImportCAG"
      @import-cag="runImportChecks"
      @close="showModalImportCAG = false"
    />

    <modal-confirmation
      v-if="showModalConfirmation"
      @confirm="onModalConfirm"
      @close="onModalClose"
    >
      <template #title>Confirmation</template>
      <template #message>
        <div v-if="selectedNode !== null">
          <div>
            Are you sure you want to remove
            <strong>{{ ontologyFormatter(selectedNode.concept) }}</strong> from
            your CAG?
          </div>
          <ul>
            <li>{{ countIncomingRelationships }} incoming relationship(s)</li>
            <li>{{ countOutgoingRelationships }} outgoing relationship(s)</li>
          </ul>
          will also be removed.
        </div>
        <div v-if="selectedEdge !== null">
          <div>Are you sure you want to remove the relationship between</div>
          <strong>{{ ontologyFormatter(selectedEdge.source) }}</strong> and
          <strong>{{ ontologyFormatter(selectedEdge.target) }}</strong> from
          this CAG?
        </div>
      </template>
    </modal-confirmation>

    <modal-import-conflict
      v-if="showModalConflict"
      @retain="importCAGs(false)"
      @overwrite="importCAGs(true)"
      @close="showModalConflict = false"
    />

    <modal-path-find
      v-if="showPathSuggestions"
      :source="pathSuggestionSource"
      :target="pathSuggestionTarget"
      @add-paths="addSuggestedPath"
      @close="showPathSuggestions = false"
    />

    <rename-modal
      v-if="showModalRename"
      @confirm="renameNode"
      :modal-title="'Rename node'"
      :current-name="renameNodeName"
      @close="showModalRename = false"
    />
  </div>
</template>

<script lang="ts">
import _ from 'lodash';
import html2canvas from 'html2canvas';
import { mapActions, mapGetters } from 'vuex';

import RenameModal from '@/components/action-bar/rename-modal.vue';
import EmptyStateInstructions from '@/components/empty-state-instructions.vue';
import ActionBar from '@/components/qualitative/action-bar.vue';
import CAGGraph from '@/components/qualitative/CAG-graph.vue';
import DrilldownPanel from '@/components/drilldown-panel.vue';
import EvidencePane from '@/components/drilldown-panel/evidence-pane.vue';
import EdgePolaritySwitcher from '@/components/drilldown-panel/edge-polarity-switcher.vue';
import RelationshipsPane from '@/components/drilldown-panel/relationships-pane.vue';
import QualitativeFactorsPane from '@/components/drilldown-panel/qualitative-factors-pane.vue';
import NodeSuggestionsPane from '@/components/drilldown-panel/node-suggestions-pane.vue';
import FactorsRecommendationsPane from '@/components/drilldown-panel/factors-recommendations-pane.vue';

import filtersUtil from '@/utils/filters-util';
import ModalConfirmation from '@/components/modals/modal-confirmation.vue';
import ModalPathFind from '@/components/modals/modal-path-find.vue';
import ModalImportCag from '@/components/qualitative/modal-import-cag.vue';
import ModalImportConflict from '@/components/qualitative/modal-import-conflict.vue';
import { calculateNeighborhood } from '@/utils/graphs-util';

import modelService from '@/services/model-service';
import projectService from '@/services/project-service';
import { defineComponent, ref } from '@vue/runtime-core';
import {
  CAGGraph as CAGGraphInterface,
  CAGModelParameter,
  CAGModelSummary,
  EdgeParameter,
  NodeParameter,
  SourceTargetPair,
  CAGVisualState
} from '@/types/CAG';
import useOntologyFormatter from '@/services/composables/useOntologyFormatter';
import useToaster from '@/services/composables/useToaster';
import { DataState } from '@/types/Insight';
import CagCommentsButton from '@/components/cag/cag-comments-button.vue';
import CagSidePanel from '@/components/cag/cag-side-panel.vue';
import CagAnalysisOptionsButton from '@/components/cag/cag-analysis-options-button.vue';
import ModalTimeScale from '@/components/qualitative/modal-time-scale.vue';
import { TimeScale } from '@/types/Enums';
import { TIME_SCALE_OPTIONS_MAP } from '@/utils/time-scale-util';
import CagLegend from '@/components/graph/cag-legend.vue';
import { Statement } from '@/types/Statement';
import { getInsightById } from '@/services/insight-service';

const PANE_ID = {
  FACTORS: 'factors',
  RELATIONSHIPS: 'relationships',
  EVIDENCE: 'evidence',
  NODE_SUGGESTIONS: 'node-suggestions',
  FACTOR_RECOMMENDATIONS: 'factor-recommendations'
};

const NODE_DRILLDOWN_TABS = [
  {
    name: 'Factors',
    id: PANE_ID.FACTORS,
    icon: 'fa-sitemap'
  },
  {
    name: 'Relationships in CAG',
    id: PANE_ID.RELATIONSHIPS,
    icon: 'fa-long-arrow-right'
  }
];

const EDGE_DRILLDOWN_TABS = [
  {
    name: 'Relationship',
    id: PANE_ID.EVIDENCE
  }
];

interface Suggestion {
  concept: string;
  hasEvidence: boolean;
  shortName: string;
  label: string;
}

export default defineComponent({
  name: 'QualitativeView',
  components: {
    EmptyStateInstructions,
    ActionBar,
    CAGGraph,
    DrilldownPanel,
    EvidencePane,
    EdgePolaritySwitcher,
    RelationshipsPane,
    QualitativeFactorsPane,
    NodeSuggestionsPane,
    FactorsRecommendationsPane,
    ModalConfirmation,
    ModalImportCag,
    ModalImportConflict,
    ModalPathFind,
    CagCommentsButton,
    CagSidePanel,
    CagAnalysisOptionsButton,
    RenameModal,
    ModalTimeScale,
    CagLegend
  },
  setup() {
    return {
      ontologyFormatter: useOntologyFormatter(),
      toaster: useToaster(),
      cagGraph: ref<any>()
    };
  },
  data: () => ({
    modelSummary: null as CAGModelSummary | null,
    modelComponents: {} as CAGGraphInterface,

    // State flags
    isDrilldownOpen: false,
    isDrilldownOverlayOpen: false,
    isFetchingStatements: false,
    showModalConfirmation: false,
    showModalConflict: false,
    showModalImportCAG: false,
    showModalTimeScale: false,
    showPathSuggestions: false,

    showModalRename: false,
    renameNodeId: '',
    renameNodeName: '',

    // will be valid if populated from a previous insight that include such info
    initialSelectedNode: null as string | null,
    initialSelectedEdge: null as string[] | null,
    visualState: {
      focus: { nodes: [], edges: [] },
      outline: { nodes: [], edges: [] }
    } as CAGVisualState,

    drilldownTabs: [] as { name: string; id: string }[],
    activeDrilldownTab: null as string | null,
    selectedNode: null as NodeParameter | null,
    selectedEdge: null as EdgeParameter | null,
    selectedStatements: [] as Statement[],
    showNewNode: false,
    correction: null as {
      factor: any;
      newGrounding: any;
      curGrounding: any;
    } | null,
    factorRecommendationsList: [] as any[],
    curationTrackingId: '',
    pathSuggestionSource: null as NodeParameter | null,
    pathSuggestionTarget: null as NodeParameter | null,
    edgeToSelectOnNextRefresh: null as {
      source: string;
      target: string;
    } | null,
    PANE_ID,
    timerId: null as number | null,
    cagsToImport: [] as CAGGraphInterface[],
    prevStabilitySetting: true // matching CAG Renderer init
  }),
  computed: {
    ...mapGetters({
      currentCAG: 'app/currentCAG',
      project: 'app/project',
      updateToken: 'app/updateToken'
    }),
    showEmptyStateInstructions(): boolean {
      return (
        _.isEmpty(this.modelComponents.nodes) &&
        _.isEmpty(this.modelComponents.edges) &&
        !this.showNewNode
      );
    },
    countIncomingRelationships(): number {
      return this.modelComponents.edges.filter(
        edge => edge.target === this.selectedNode?.concept
      ).length;
    },
    countOutgoingRelationships(): number {
      return this.modelComponents.edges.filter(
        edge => edge.source === this.selectedNode?.concept
      ).length;
    },
    countNodeRelationships(): number {
      const concept = this.selectedNode?.concept;
      return this.modelComponents.edges.filter(
        edge => edge.target === concept || edge.source === concept
      ).length;
    },
    conceptsInCag(): string[] {
      return this.modelComponents.nodes.map(node => node.concept);
    },
    overlayPaneTitle() {
      let title = '';
      if (this.activeDrilldownTab === PANE_ID.NODE_SUGGESTIONS) {
        title = 'Top Relationships in KB';
      } else if (this.activeDrilldownTab === PANE_ID.FACTOR_RECOMMENDATIONS) {
        title = 'Suggested Factors to Correct';
      }
      return title;
    },
    selectedTimeScaleLabel() {
      const timeScale = this.modelSummary?.parameter?.time_scale;
      const timeScaleOption = TIME_SCALE_OPTIONS_MAP.get(timeScale ?? '');
      return timeScaleOption?.label ?? null;
    }
  },
  watch: {
    $route: {
      handler(/* newValue, oldValue */) {
        // NOTE:  this is only valid when the route is focused on the 'qualitative' space
        if (this.$route.name === 'qualitative' && this.$route.query) {
          const insight_id = this.$route.query.insight_id;
          if (typeof insight_id === 'string') {
            this.updateStateFromInsight(insight_id);
            this.$router.push({
              query: {
                insight_id: undefined
              }
            });
          }
        }
      },
      immediate: true
    },
    updateToken(n, o) {
      if (_.isEqual(n, o)) return;
      this.refresh();
      if (this.isDrilldownOpen) {
        this.switchToTab(this.activeDrilldownTab);
      }
    },
    currentCAG(n, o) {
      if (_.isEqual(n, o) || _.isNil(n)) return;
      this.clearThumbnailTimer();
      this.refresh();
      this.closeDrilldown();
    },
    modelComponents() {
      const selectedEdge = this.selectedEdge;
      if (selectedEdge !== null) {
        // The selected edge may have been deleted, or its polarity may have changed,
        //  so update selectedEdge to point to the updated version of the same edge.
        const updatedSelectedEdge = this.modelComponents.edges.find(
          newEdge => newEdge.id === selectedEdge.id
        );
        if (updatedSelectedEdge === undefined) {
          this.selectedEdge = null;
          return;
        }
        this.selectedEdge = updatedSelectedEdge;
      }
      this.updateDataState();
    },
    selectedNode() {
      this.updateDataState();
    },
    selectedEdge() {
      this.updateDataState();
    }
  },
  created() {
    // update insight related state
    // use contextId to store cag-id
    this.setContextId([this.currentCAG]);
  },
  mounted() {
    this.recalculateCAG();
  },
  beforeUnmount() {
    this.clearThumbnailTimer();
  },
  methods: {
    ...mapActions({
      setUpdateToken: 'app/setUpdateToken',
      setAnalysisName: 'app/setAnalysisName',
      setContextId: 'insightPanel/setContextId',
      setDataState: 'insightPanel/setDataState'
    }),
    async updateStateFromInsight(insight_id: string) {
      const loadedInsight = await getInsightById(insight_id);
      // FIXME: before applying the insight, which will overwrite current state,
      //  consider pushing current state to the url to support browser hsitory
      //  in case the user wants to navigate to the original state using back button
      if (loadedInsight) {
        //
        // insight was found and loaded
        //
        // data state
        // FIXME: the order of resetting the state is important
        if (loadedInsight.data_state?.selectedNode !== undefined) {
          const selectedNode = loadedInsight.data_state?.selectedNode;
          if (this.modelComponents && this.modelComponents.nodes) {
            this.applyNodeSelection(selectedNode);
          } else {
            this.initialSelectedNode = selectedNode;
          }
        }
        if (loadedInsight.data_state?.selectedEdge !== undefined) {
          const selectedEdge = loadedInsight.data_state?.selectedEdge;
          if (this.modelComponents && this.modelComponents.nodes) {
            this.applyEdgeSelection(selectedEdge);
          } else {
            this.initialSelectedEdge = selectedEdge;
          }
        }
        // If blank force a reset
        if (!loadedInsight.data_state?.selectedEdge && !loadedInsight.data_state?.selectedNode) {
          this.visualState = {
            focus: { nodes: [], edges: [] },
            outline: { nodes: [], edges: [] }
          };
          this.closeDrilldown();
        }
      }
    },
    applyNodeSelection(selectedNode: string) {
      if (selectedNode) {
        const nodeToSelect = this.modelComponents.nodes.find(node => node.concept === selectedNode);

        if (nodeToSelect) {
          const neighborhood = calculateNeighborhood(this.modelComponents, nodeToSelect.concept);
          this.selectNode(nodeToSelect);
          this.visualState = {
            focus: neighborhood,
            outline: {
              nodes: [
                { concept: nodeToSelect.concept }
              ],
              edges: []
            }
          };
        }
      }
    },
    applyEdgeSelection(selectedEdge: string[]) {
      if (selectedEdge) {
        const [source, target] = selectedEdge;
        const edgeToSelect = this.modelComponents.edges.find(edge => edge.source === source && edge.target === target);
        if (edgeToSelect) {
          this.selectEdge(edgeToSelect);
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
        }
      }
    },
    async refresh() {
      // Get CAG data
      this.setAnalysisName('');
      this.modelSummary = await modelService.getSummary(this.currentCAG);
      this.setAnalysisName(this.modelSummary?.name ?? '');
      this.modelComponents = await modelService.getComponents(this.currentCAG);

      // Prompt the analyst to select a time scale if this is the first time
      this.showModalTimeScale = this.modelSummary.parameter.time_scale === undefined;
      if (this.edgeToSelectOnNextRefresh !== null) {
        const { source, target } = this.edgeToSelectOnNextRefresh;
        const foundEdge = this.modelComponents.edges.find(
          edge => edge.source === source && edge.target === target
        );
        if (foundEdge !== undefined) {
          this.selectEdge(foundEdge);
        }
        this.edgeToSelectOnNextRefresh = null;
      }

      // apply node/edge selection if we have initial selection and insight is being applied
      if (this.initialSelectedNode) {
        this.applyNodeSelection(this.initialSelectedNode);
      }
      if (this.initialSelectedEdge) {
        this.applyEdgeSelection(this.initialSelectedEdge);
      }
    },
    updateDataState() {
      if (this.modelSummary === null) {
        console.warn('Trying to update data state while modelSummary is null.');
        return;
      }
      if (this.modelComponents === null) {
        console.warn('Trying to update data state while modelComponents is null.');
        return;
      }
      // save some state that will be part of any insight captured from this view
      const dataState: DataState = {
        modelName: this.modelSummary?.name
      };
      if (this.selectedNode !== null) {
        dataState.selectedNode = this.selectedNode.concept;
      }
      if (this.selectedEdge !== null) {
        const source = this.selectedEdge.source;
        const target = this.selectedEdge.target;
        dataState.selectedEdge = [source, target];
      }
      this.setDataState(dataState);
    },
    async addCAGComponents(nodes: NodeParameter[], edges: EdgeParameter[], updateType: string) {
      // edges.forEach(edge => {
      //   if (!edge.parameter) {
      //     edge.parameter = {
      //       weights: [0.0, 0.5]
      //     };
      //   }
      // });
      return modelService.addComponents(this.currentCAG, nodes, edges, updateType);
    },
    async removeCAGComponents(
      nodes: { id: string }[],
      edges: { id: string }[]
    ) {
      return modelService.removeComponents(this.currentCAG, nodes, edges);
    },
    async addEdge({
      source,
      target
    }: {
      source: NodeParameter;
      target: NodeParameter;
    }) {
      const edge = { source: source.concept, target: target.concept };

      const edges = this.modelComponents.edges.map(
        edge => edge.source + '///' + edge.target
      );

      if (edges.indexOf(edge.source + '///' + edge.target) === -1) {
        const relationsToAdd: SourceTargetPair[] = [];

        // Search for all possible combinations of source/target
        source.components.forEach(source => {
          target.components.forEach(target => {
            relationsToAdd.push({ source, target });
          });
        });
        const edgeData = await projectService.getProjectStatementIdsByEdges(
          this.project,
          relationsToAdd,
          filtersUtil.newFilters()
        );

        const backingStatements: string[] = _.uniq(_.flatten(Object.values(edgeData)));
        if (backingStatements.length === 0) {
          const newEdge = {
            id: '',
            user_polarity: null,
            source: source.concept,
            target: target.concept,
            reference_ids: []
          };
          const data = await this.addCAGComponents([], [newEdge], 'add:manual');
          this.setUpdateToken(data.updateToken);
        } else {
          const newEdge = {
            id: '',
            user_polarity: null,
            source: source.concept,
            target: target.concept,
            reference_ids: backingStatements
          };
          const data = await this.addCAGComponents([], [newEdge], 'add:manual');
          this.setUpdateToken(data.updateToken);
        }
        this.edgeToSelectOnNextRefresh = {
          source: edge.source,
          target: edge.target
        };
      } else {
        // FIXME: We should allow partial cases
        this.toaster(
          this.ontologyFormatter(edge.source) +
            ' ' +
            this.ontologyFormatter(edge.target) +
            ' already exists in the CAG',
          'error',
          false
        );
      }
    },
    createNewNode() {
      this.deselectNodeAndEdge();
      this.closeDrilldown();
      // if (!_.isNil(this.cagGraph)) {
      //   this.cagGraph.deselectNodeAndEdge();
      // }
      this.setNewNodeVisible(true);
    },
    onDatacubeSelected(datacubeParam: any) {
      // Strip off non-alphanumeric
      // - Engines cannot handle them
      // - Translation layer doesn't like consecutive spaces
      const cleanedName = datacubeParam.name
        .replace(/[^\w\s]/gi, '')
        .replace(/\s\s+/gi, ' ');
      const node = {
        id: '',
        concept: cleanedName,
        components: [cleanedName],
        label: cleanedName,
        parameter: datacubeParam
      };
      this.saveNodeToGraph(node);
      this.setNewNodeVisible(false);
    },
    onSuggestionSelected(suggestion: Suggestion) {
      this.addNodeToGraph(suggestion);
      this.setNewNodeVisible(false);
    },
    onSuggestionDuplicated(suggestion: Suggestion) {
      this.showConceptExistsToaster(suggestion.label);
    },
    addNodeToGraph(suggestion: Suggestion) {
      if (this.isConceptInCag(suggestion.concept)) {
        this.showConceptExistsToaster(suggestion.label);
        return;
      }
      const node = {
        id: new Date().getTime().toString(),
        concept: suggestion.concept,
        label: suggestion.label,
        components: [suggestion.concept]
      };
      this.saveNodeToGraph(node);
    },
    // Makes API call to store the new node on the backend
    async saveNodeToGraph(node: NodeParameter) {
      // Creates a shallow clone of `node`, replacing the `id` property
      //  with an empty value
      const { model_id, concept, label, modified_at, parameter, components } = node;
      const cleanedNode = { id: '', model_id, concept, label, modified_at, parameter, components };
      const data = await this.addCAGComponents([cleanedNode], [], 'add:manual');

      // HACK: Force cagGraph to inject a node to keep layout stable
      if (data.newNode && this.cagGraph) {
        this.cagGraph.injectNewNode(data.newNode);
      }

      this.setUpdateToken(data.updateToken);
    },
    async onModalConfirm() {
      this.showModalConfirmation = false;
      const selectedNode = this.selectedNode;
      if (selectedNode !== null) {
        const data = await this.removeCAGComponents(
          [{ id: selectedNode.id }],
          this.modelComponents.edges
            .filter(
              edge =>
                edge.source === selectedNode.concept ||
                edge.target === selectedNode.concept
            )
            .map(edge => ({ id: edge.id }))
        );
        this.setUpdateToken(data.updateToken);
      }

      if (this.selectedEdge !== null) {
        const data = await this.removeCAGComponents(
          [],
          [{ id: this.selectedEdge.id }]
        );
        this.setUpdateToken(data.updateToken);
      }

      this.closeDrilldown();
      this.deselectNodeAndEdge();
    },
    onModalClose() {
      this.showModalConfirmation = false;
    },
    onDelete(node: NodeParameter) {
      if (node) {
        this.selectNode(node);
      }
      if (!_.isEmpty(this.selectedNode) || !_.isEmpty(this.selectedEdge)) {
        this.showModalConfirmation = true;
      }
    },
    async captureThumbnail() {
      // FIXME: See layout hack in mergeNodes
      const graphOptions = this.cagGraph.renderer.options;
      graphOptions.useStableLayout = this.prevStabilitySetting;

      // To compensate for animiated transitions in the graph, we need to wait a little bit for the graph
      // components to move into their rightful positions.
      this.clearThumbnailTimer();
      this.timerId = window.setTimeout(async () => {
        const el = this.$el.querySelector('.CAG-graph-container');
        const thumbnailSource = (
          await html2canvas(el, { scale: 0.5 })
        ).toDataURL();
        modelService.updateModelMetadata(this.currentCAG, {
          thumbnail_source: thumbnailSource
        });
      }, 2000);
    },
    clearThumbnailTimer() {
      if (this.timerId) clearTimeout(this.timerId);
    },
    onBackgroundDblClick() {
      this.createNewNode();
    },
    onNodeClick(node: NodeParameter) {
      this.selectNode(node);
    },
    onEdgeClick(edge: EdgeParameter) {
      // Called when an edge is clicked in the CAG
      this.isDrilldownOverlayOpen = false;
      this.selectEdge(edge);
    },
    onRelationshipClick(relationship: SourceTargetPair) {
      // Called when a relationship is clicked in the relationships pane

      // Reference IDs for the relationship's statements are not stored in the relationships pane
      //  but can be found by searching the CAG for the edge that represents the relationship,
      //  and surfacing it's underlying array of reference IDs.
      const foundEdge = this.modelComponents.edges.find(edge => {
        return (
          edge.source === relationship.source &&
          edge.target === relationship.target
        );
      });
      if (foundEdge === undefined) return;
      this.selectEdge(foundEdge);
      if (this.cagGraph === undefined) return;
      this.cagGraph.renderEdgeClick(foundEdge.source, foundEdge.target);
    },
    async setEdgeUserPolarity(edge: EdgeParameter, polarity: number) {
      await modelService.updateEdgePolarity(this.currentCAG, edge.id, polarity);
      if (this.selectedEdge !== null) {
        this.selectedEdge.polarity = polarity;
        this.selectedEdge.user_polarity = polarity;
      }
      this.refresh();
    },
    async setEdgeWeights(_edge: EdgeParameter, weights: number[]) {
      if (this.selectedEdge) {
        const edge = this.selectedEdge;
        if (edge.parameter) {
          edge.parameter.weights = weights;
          await modelService.updateEdgeParameter(this.currentCAG, edge);
          this.refresh();
        }
      }
    },
    onBackgroundClick() {
      this.deselectNodeAndEdge();
      this.isDrilldownOverlayOpen = false;
      this.closeDrilldown();
      this.setNewNodeVisible(false);
    },
    selectEdge(edge: EdgeParameter) {
      this.deselectNodeAndEdge();
      this.setNewNodeVisible(false);
      this.selectedEdge = edge;
      this.switchToTab(PANE_ID.EVIDENCE);
    },
    selectNode(node: NodeParameter) {
      this.deselectNodeAndEdge();
      this.setNewNodeVisible(false);
      this.isDrilldownOverlayOpen = false;
      this.selectedNode = node;
      if (this.activeDrilldownTab === PANE_ID.NODE_SUGGESTIONS) {
        // User is on Suggestions overlay for node A, clicks node B
        // We assume they want to now investigate suggestions for B
        //  so we don't take them back to the Factors tab.
        this.openDrilldownOverlay(PANE_ID.NODE_SUGGESTIONS);
      } else {
        this.switchToTab(PANE_ID.FACTORS);
      }
    },
    deselectNodeAndEdge() {
      this.selectedNode = null;
      this.selectedEdge = null;
    },
    switchToTab(tab: string | null) {
      let newTabSet, newActiveTab;
      switch (tab) {
        case PANE_ID.EVIDENCE:
          if (this.selectedEdge === null) return;
          newTabSet = EDGE_DRILLDOWN_TABS;
          newActiveTab = PANE_ID.EVIDENCE;
          this.loadCAGEdgeStatements(this.selectedEdge);
          break;
        case PANE_ID.RELATIONSHIPS:
          if (this.selectedNode === null) return;
          newTabSet = NODE_DRILLDOWN_TABS;
          newActiveTab = PANE_ID.RELATIONSHIPS;
          this.loadCAGNodeStatements(this.selectedNode);
          break;
        case PANE_ID.FACTORS:
          if (this.selectedNode === null) return;
          newTabSet = NODE_DRILLDOWN_TABS;
          newActiveTab = PANE_ID.FACTORS;
          this.loadCAGNodeStatements(this.selectedNode);
          break;
        case PANE_ID.NODE_SUGGESTIONS:
          newTabSet = NODE_DRILLDOWN_TABS;
          newActiveTab = PANE_ID.NODE_SUGGESTIONS;
          this.loadStatementsKB();
          break;
        case PANE_ID.FACTOR_RECOMMENDATIONS:
          newTabSet = NODE_DRILLDOWN_TABS;
          newActiveTab = PANE_ID.FACTOR_RECOMMENDATIONS;
          break;
        default:
          console.error('Switching to invalid tab: ' + tab);
          return;
      }
      this.drilldownTabs = newTabSet;
      this.activeDrilldownTab = newActiveTab;
      this.openDrilldown();
    },
    openDrilldown() {
      this.isDrilldownOpen = true;
    },
    closeDrilldown() {
      this.isDrilldownOpen = false;
      this.activeDrilldownTab = null;
    },
    onTabClick(tabID: string) {
      this.switchToTab(tabID);
    },
    openDrilldownOverlay(tab: string) {
      this.isDrilldownOverlayOpen = true;
      this.switchToTab(tab);
    },
    onDrilldownOverlayBack() {
      this.isDrilldownOverlayOpen = false;
      let tabToSwitchTo = '';
      if (this.activeDrilldownTab === PANE_ID.NODE_SUGGESTIONS) {
        tabToSwitchTo = PANE_ID.RELATIONSHIPS;
      } else if (this.activeDrilldownTab === PANE_ID.FACTOR_RECOMMENDATIONS) {
        tabToSwitchTo = PANE_ID.FACTORS;
      }
      this.switchToTab(tabToSwitchTo);
    },
    loadCAGEdgeStatements(edge: EdgeParameter) {
      this.isFetchingStatements = true;
      modelService
        .getEdgeStatements(this.currentCAG, edge.source, edge.target)
        .then(statements => {
          this.selectedStatements = statements;
          this.isFetchingStatements = false;
        });
    },
    loadCAGNodeStatements(node: NodeParameter) {
      this.isFetchingStatements = true;
      modelService
        .getNodeStatements(this.currentCAG, node.concept)
        .then(statements => {
          this.selectedStatements = statements;
          this.isFetchingStatements = false;
        });
    },
    async loadStatementsKB() {
      this.selectedStatements = [];
      if (this.selectedNode === null) return;
      const concepts = this.selectedNode.components;
      this.isFetchingStatements = true;

      const statements = await projectService.getProjectStatementsForConcepts(concepts, this.project);
      this.selectedStatements = statements;
      this.isFetchingStatements = false;
    },
    async onAddToCAG(subgraph: CAGGraphInterface) {
      const data = await this.addCAGComponents(subgraph.nodes, subgraph.edges, 'add:suggestion');
      this.setUpdateToken(data.updateToken);
    },
    async onRemoveRelationship(edges: EdgeParameter[]) {
      // Get edge ids from CAG to be able to remove them
      // FIXME: This is not ideal. We will need to expand the API to operate on source/target instead of id.
      const edgesToRemove = edges
        .map(e => {
          const found = this.modelComponents.edges.find(
            edge =>
              edge.source + '///' + edge.target === e.source + '///' + e.target
          );
          if (found === undefined) return null;
          return { id: found.id };
        })
        .filter(edge => edge !== null) as { id: string }[];

      const data = await this.removeCAGComponents([], edgesToRemove);
      this.setUpdateToken(data.updateToken);
    },
    setNewNodeVisible(isVisible: boolean) {
      this.showNewNode = isVisible;
    },
    isConceptInCag(concept: string) {
      return this.conceptsInCag.indexOf(concept) > -1;
    },
    showConceptExistsToaster(concept: string) {
      this.toaster(concept + ' already exists in the CAG', 'error', false);
    },
    async onShowFactorRecommendations(
      factor: string,
      curGrounding: string,
      newGrounding: string,
      recommendations: any[],
      curationTrackingId: string
    ) {
      this.correction = { factor, newGrounding, curGrounding };
      this.factorRecommendationsList = recommendations;
      this.curationTrackingId = curationTrackingId;
      this.openDrilldownOverlay(PANE_ID.FACTOR_RECOMMENDATIONS);
    },
    async runImportChecks(ids: string[]) {
      this.showModalConflict = false;
      this.showModalImportCAG = false;
      this.cagsToImport = [];

      const current = await modelService.getComponents(this.currentCAG);
      for (let i = 0; i < ids.length; i++) {
        const toImport = await modelService.getComponents(ids[i]);
        this.cagsToImport.push(toImport);
      }

      // Check to see if there are conflicting indicators
      const hasNodeConflict = modelService.hasMergeConflictNodes(
        current,
        this.cagsToImport
      );
      const hasEdgeConflict = modelService.hasMergeConflictEdges(
        current,
        this.cagsToImport
      );
      if (hasNodeConflict === true || hasEdgeConflict === true) {
        this.showModalConflict = true;
      } else {
        this.importCAGs(false);
      }
    },
    async importCAGs(overwriteParameterisation: boolean) {
      this.showModalConflict = false;
      this.showModalImportCAG = false;

      // FIXME: Might want to move this server side, not very efficient if merge a lot of graphs
      const current: CAGGraphInterface = await modelService.getComponents(
        this.currentCAG
      );
      for (let i = 0; i < this.cagsToImport.length; i++) {
        modelService.mergeCAG(
          current,
          this.cagsToImport[i],
          overwriteParameterisation
        );
      }

      // Strip off uneeded edge properties
      const edges = current.edges.map(e => {
        return {
          id: e.id,
          source: e.source,
          target: e.target,
          reference_ids: e.reference_ids,
          user_polarity: e.user_polarity,
          parameter: e.parameter
        };
      });

      // Strip off uneeded node properties
      const nodes = current.nodes.map(n => {
        return {
          id: n.id,
          concept: n.concept,
          label: n.label,
          parameter: n.parameter,
          components: n.components
        };
      });

      await this.addCAGComponents(nodes, edges, 'add:merge-cag');

      // Make sure the reference_ids are not stale
      this.recalculateCAG();
    },
    async recalculateCAG() {
      // Invoke recovery endpoint to resolve invalid/stale CAGS
      await modelService.recalculate(this.currentCAG);
      this.refresh();
    },
    async addSuggestedPath(paths: SourceTargetPair[][]) {
      this.showPathSuggestions = false;

      const key = (e: SourceTargetPair) => `${e.source}///${e.target}`;

      // 1 Find segments not already in the graph
      const newSourceTargetPairs: SourceTargetPair[] = [];
      const newNodes: string[] = [];
      const edgeSet = new Set<string>();
      const nodeSet = new Set<string>();
      this.modelComponents.edges.forEach(edge => {
        edgeSet.add(key(edge));
      });
      this.modelComponents.nodes.forEach(node => {
        nodeSet.add(node.concept);
      });

      paths.forEach(path => {
        path.forEach(edge => {
          if (
            !edgeSet.has(key(edge)) &&
            !_.some(
              newSourceTargetPairs,
              e => e.source === edge.source && e.target === edge.target
            )
          ) {
            // handling the grouped nodes and the possiblity we need to get backing
            // data for the components of the source and target nodes
            if (this.pathSuggestionSource?.concept === edge.source) {
              this.pathSuggestionSource.components.forEach((source) => {
                newSourceTargetPairs.push({ source, target: edge.target });
              });
            } else if (this.pathSuggestionTarget?.concept === edge.target) {
              this.pathSuggestionTarget.components.forEach((target) => {
                newSourceTargetPairs.push({ source: edge.source, target });
              });
            } else {
              newSourceTargetPairs.push(edge);
            }
          }
          if (
            !nodeSet.has(edge.source) &&
            newNodes.indexOf(edge.source) === -1
          ) {
            newNodes.push(edge.source);
          }
          if (
            !nodeSet.has(edge.target) &&
            newNodes.indexOf(edge.target) === -1
          ) {
            newNodes.push(edge.target);
          }
        });
      });

      // 2 Get edge statement references
      const edgeData = await projectService.getProjectStatementIdsByEdges(
        this.project,
        newSourceTargetPairs,
        filtersUtil.newFilters()
      );

      // build a dictionary of the new edges with the backing data/reference ids
      // being aggregated for all of the components when the edge references a
      // source or target node
      const newEdgeDictionary: {[key: string]: EdgeParameter} = newSourceTargetPairs.reduce((edges, sourceTargetPair) => {
        const { source, target } = sourceTargetPair;
        const currentReferenceIds = edgeData[key(sourceTargetPair)] || [];
        const baseNewEdge = {
          id: '',
          reference_ids: currentReferenceIds,
          user_polarity: null,
          source,
          target
        };

        if (this.pathSuggestionSource?.components.includes(source)) {
          const normalizedKey = key({ source: this.pathSuggestionSource.concept, target });
          if (edges[normalizedKey]) {
            edges[normalizedKey].reference_ids = edges[normalizedKey].reference_ids.concat(currentReferenceIds);
          } else {
            baseNewEdge.source = this.pathSuggestionSource.concept;
            edges[normalizedKey] = baseNewEdge;
          }
        } else if (this.pathSuggestionTarget?.components.includes(target)) {
          const normalizedKey = key({ source, target: this.pathSuggestionTarget.concept });
          if (edges[normalizedKey]) {
            edges[normalizedKey].reference_ids = edges[normalizedKey].reference_ids.concat(currentReferenceIds);
          } else {
            baseNewEdge.target = this.pathSuggestionTarget.concept;
            edges[normalizedKey] = baseNewEdge;
          }
        } else {
          edges[key(sourceTargetPair)] = baseNewEdge;
        }
        return edges;
      }, {} as {[key: string]: EdgeParameter});

      const newEdges: EdgeParameter[] = Object.values(newEdgeDictionary);

      // 3 Save
      const newNodesPayload = newNodes.map(concept => {
        return {
          id: '',
          concept: concept,
          label: this.ontologyFormatter(concept),
          components: [concept]
        };
      });
      const result = await this.addCAGComponents(newNodesPayload, newEdges, 'add:path');
      this.setUpdateToken(result.updateToken);
    },
    async resetCAGLayout() {
      if (this.cagGraph === undefined) return;
      const graphOptions = this.cagGraph.renderer.options;
      this.prevStabilitySetting = graphOptions.useStableLayout;
      graphOptions.useStableLayout = false;
      await this.cagGraph.refresh();
      graphOptions.useStableLayout = this.prevStabilitySetting;
    },
    async resolveUpdatedRelations(edges: EdgeParameter[]) {
      const currentEdges = this.modelComponents.edges;
      const currentNodes = this.modelComponents.nodes;

      const edgePayload: EdgeParameter[] = [];
      const nodePayload: NodeParameter[] = [];

      const hasNode = (concept: string) => {
        return _.some(currentNodes, n => n.concept === concept) || _.some(nodePayload, n => n.concept === concept);
      };

      // Process new relations
      edges.forEach(edge => {
        const existingEdge = currentEdges.find(ce => ce.source === edge.source && ce.target === edge.target);
        if (existingEdge) {
          // Exists, need to transfer statements
          edgePayload.push({
            id: existingEdge.id,
            source: existingEdge.source,
            target: existingEdge.target,
            user_polarity: existingEdge.user_polarity,
            reference_ids: _.uniq([
              ...existingEdge.reference_ids,
              ...edge.reference_ids
            ])
          });
        } else {
          // Does not exist, need to create new edge and check for new nodes
          edgePayload.push({
            id: '',
            source: edge.source,
            target: edge.target,
            user_polarity: null,
            reference_ids: edge.reference_ids
          });

          [edge.source, edge.target].forEach(concept => {
            if (hasNode(concept) === false) {
              nodePayload.push({
                id: '',
                concept: concept,
                label: this.ontologyFormatter(concept),
                components: [concept]
              });
            }
          });
        }
      });

      // update and refresh
      const data = await this.addCAGComponents(nodePayload, edgePayload, 'curation');
      this.setUpdateToken(data.updateToken);
    },
    async renameNode(newName: string) {
      // FIXME: Stableness hack, because the node has changed, we end up caching the
      // DOM which refers to the old values. To get it to cache new values we need to swap new/old
      // into place. Needs better support from renderer itself!!
      const oldName = this.modelComponents.nodes.find(node => node.id === this.renameNodeId)?.concept;
      const node = this.cagGraph.renderer.graph.nodes.find((node: any) => node.label === oldName);
      node.id = newName;
      node.label = newName;

      const edges = this.cagGraph.renderer.graph.edges;
      for (const edge of edges) {
        const [source, target] = edge.id.split(':');
        if (source === oldName) {
          edge.id = `${newName}:${target}`;
        }
        if (target === oldName) {
          edge.id = `${source}:${newName}`;
        }
      }

      this.showModalRename = false;
      await modelService.renameNode(this.currentCAG, this.renameNodeId, newName);

      // if we have a selected node and it's the same as the one being renamed, update the label there too.
      if (this.selectedNode && this.selectedNode.id === this.renameNodeId) {
        this.selectedNode.concept = newName;
      }
      this.refresh();
    },
    openRenameModal(node: NodeParameter) {
      this.showModalRename = true;
      this.renameNodeId = node.id;
      this.renameNodeName = node.concept;
    },
    async addEdgeEvidenceRecommendations(ids: string[]) {
      if (this.selectedEdge) {
        const payload = {
          id: this.selectedEdge.id,
          source: this.selectedEdge.source,
          target: this.selectedEdge.target,
          user_polarity: null,
          reference_ids: ids
        };
        this.selectedEdge.reference_ids = ids;
        const data = await this.addCAGComponents([], [payload], 'curation');
        this.setUpdateToken(data.updateToken);
      }
    },
    async mergeNodes(mergeData: NodeParameter, targetData: NodeParameter) {
      // 1. collect all of the relevant data for the following steps
      const updatedComponents = [...mergeData.components, ...targetData.components];
      const mergeNodeEdges = this.modelComponents.edges.filter(e => e.target === mergeData.concept || e.source === mergeData.concept);
      const removedEdges = mergeNodeEdges
        .map(e => {
          return { id: e.id };
        });

      // create replacement edges with updated targets & sources - these are the "updatedEdges"
      const updatedEdges = mergeNodeEdges
        .filter(e => e.target !== targetData.concept && e.source !== targetData.concept)
        .map(e => {
          const updatedEdge = { } as any;
          updatedEdge.id = '';
          updatedEdge.user_polarity = e.user_polarity !== undefined ? e.user_polarity : null;
          updatedEdge.reference_ids = e.reference_ids;
          updatedEdge.parameter = e.parameter;
          if (e.target === mergeData.concept) {
            updatedEdge.target = targetData.concept;
            updatedEdge.source = e.source;
          } else if (e.source === mergeData.concept) {
            updatedEdge.target = e.target;
            updatedEdge.source = targetData.concept;
          }
          return updatedEdge;
        });

      // find any duplicate edges that might exist the graph relative to the updatedEdges
      // add the duplicates to the set to be removed, then combine their supporting data in the updatedEdges
      updatedEdges.forEach(e => {
        const duplicateEdge = this.modelComponents.edges.find(edge => {
          return e.source === edge.source && e.target === edge.target;
        });

        if (duplicateEdge) {
          removedEdges.push({ id: duplicateEdge.id });
          e.reference_ids = e.reference_ids.concat(duplicateEdge.reference_ids);
          // FIXME: We may need to decide how to handle weights merges
        }
      });

      const removedNode = { id: mergeData.id };
      const updatedNode = { ...this.modelComponents.nodes.filter(e => e.concept === targetData.concept)[0] };
      updatedNode.components = updatedComponents;

      // 2. remove the node to be merged, it's dependent edges and the duplicate edges
      await this.removeCAGComponents([removedNode], removedEdges);

      // 3. update the target node with new components and edges
      const result = await this.addCAGComponents([updatedNode], updatedEdges, 'add:merge-node');

      // FIXME: Layout hack: svg-flowgraph has a faulty stableness calculation that results in outdated edges not getting flusehd,
      // temporary fix to force layout to reset. - DC Dec2021
      const graphOptions = this.cagGraph.renderer.options;
      this.prevStabilitySetting = graphOptions.useStableLayout;
      graphOptions.useStableLayout = false;

      // 4. if either target or merge node are currently selected, then select the updated node.
      if (targetData.concept !== this.selectedNode?.concept || mergeData.concept !== this.selectedNode?.concept) {
        this.selectedNode = updatedNode;
      }

      this.setUpdateToken(result.updateToken);
    },
    openPathFind() {
      if (this.selectedEdge) {
        const source = this.selectedEdge.source;
        const target = this.selectedEdge.target;
        const nodes = this.modelComponents.nodes;

        const sourceNode = nodes.find(n => n.concept === source);
        const targetNode = nodes.find(n => n.concept === target);
        if (sourceNode && targetNode) {
          this.pathSuggestionSource = sourceNode;
          this.pathSuggestionTarget = targetNode;
          this.showPathSuggestions = true;
        }
      }
    },
    async saveTimeScale(newTimeScale: TimeScale) {
      let historyRange = 24;
      if (newTimeScale === TimeScale.Months) {
        historyRange = 24;
      } else if (newTimeScale === TimeScale.Years) {
        historyRange = 12 * 20;
      }

      const newParameter: Partial<CAGModelParameter> = { time_scale: newTimeScale, history_range: historyRange };
      await modelService.updateModelParameter(this.currentCAG, newParameter);
      this.refresh();
    }
  }
});
</script>

<style lang="scss" scoped>
@import '@/styles/variables';

.qualitative-view-container {
  height: $content-full-height;
  box-sizing: border-box;
  overflow: hidden;
  display: flex;
  flex-direction: column;

  main {
    display: flex;
    min-height: 0;
    flex: 1;
  }

  .graph-container {
    width: 100%;
    min-width: 0;
    display: flex;
    flex-direction: column;
    position: relative;

    .empty-state-instructions-container {
      padding-top: 2 * $navbar-outer-height;
    }

    .cagGraph {
      flex: 1;
      min-height: 0;
    }
  }

  .action-button {
    i {
      margin-right: 5px;
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
  display: flex;
  align-items: baseline;
  gap: 5px;
}

.side-panel {
  isolation: isolate;
  z-index: 1;
}
.tab-content {
  flex: 1;
  min-height: 0;
  position: relative;
  overflow: hidden;
  z-index: 1;
  display: flex;
  background-color: $background-light-2;
}

.qualitative-drilldown {
  margin-top: 10px;
  // Some panes have tabs in this space, some don't
  //  remove the padding that's baked into the tabs
  //  to always have a 10px gap exactly
  ::v-deep(.tab-bar) {
    padding-top: 0;
  }
}
</style>
