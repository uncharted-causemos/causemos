<template>
  <div class="qualitative-view-container">
    <action-bar
      :model-summary="modelSummary"
      :model-components="modelComponents"
      @add-concept="createNewNode()"
      @import-cag="showModalImportCAG = true"
      @reset-cag="resetCAGLayout()"
    />
    <main>
      <context-insight-panel />
      <div class="graph-container" @dblclick="onBackgroundDblClick">
        <empty-state-instructions v-if="showEmptyStateInstructions" />
        <CAG-graph
          v-else
          ref="cagGraph"
          class="cagGraph insight-capture"
          :data="modelComponents"
          :show-new-node="showNewNode"
          @refresh="captureThumbnail"
          @new-edge="addEdge"
          @background-click="onBackgroundClick"
          @background-dbl-click="onBackgroundDblClick"
          @node-click="onNodeClick"
          @edge-click="onEdgeClick"
          @delete="onDelete"
          @edge-set-user-polarity="setEdgeUserPolarity"
          @suggestion-selected="onSuggestionSelected"
        />
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
            v-if="
              activeDrilldownTab === PANE_ID.EVIDENCE && selectedEdge !== null
            "
            :selected-relationship="selectedEdge"
            :statements="selectedStatements"
            :project="project"
            :is-fetching-statements="isFetchingStatements"
            :should-confirm-curations="true"
          >
            <edge-polarity-switcher
              :selected-relationship="selectedEdge"
              @edge-set-user-polarity="setEdgeUserPolarity"
            />
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
          <factors-pane
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
            :is-fetching-statements="isFetchingStatements"
            @close-overlay="onDrilldownOverlayBack"
          />
        </template>
      </drilldown-panel>
    </main>
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
  </div>
</template>

<script lang="ts">
import _ from 'lodash';
import html2canvas from 'html2canvas';
import { mapActions, mapGetters } from 'vuex';

import EmptyStateInstructions from '@/components/empty-state-instructions.vue';
import ActionBar from '@/components/qualitative/action-bar.vue';
import CAGGraph from '@/components/qualitative/CAG-graph.vue';
import DrilldownPanel from '@/components/drilldown-panel.vue';
import EvidencePane from '@/components/drilldown-panel/evidence-pane.vue';
import EdgePolaritySwitcher from '@/components/drilldown-panel/edge-polarity-switcher.vue';
import RelationshipsPane from '@/components/drilldown-panel/relationships-pane.vue';
import FactorsPane from '@/components/drilldown-panel/factors-pane.vue';
import NodeSuggestionsPane from '@/components/drilldown-panel/node-suggestions-pane.vue';
import FactorsRecommendationsPane from '@/components/drilldown-panel/factors-recommendations-pane.vue';

import filtersUtil from '@/utils/filters-util';
import ModalConfirmation from '@/components/modals/modal-confirmation.vue';
import ModalPathFind from '@/components/modals/modal-path-find.vue';
import ModalImportCag from '@/components/qualitative/modal-import-cag.vue';
import ModalImportConflict from '@/components/qualitative/modal-import-conflict.vue';

import modelService from '@/services/model-service';
import projectService from '@/services/project-service';
import ContextInsightPanel from '@/components/context-insight-panel/context-insight-panel.vue';
import { defineComponent, ref } from '@vue/runtime-core';
import {
  CAGGraph as CAGGraphInterface,
  EdgeParameter,
  NodeParameter,
  SourceTargetPair
} from '@/types/CAG';
import useOntologyFormatter from '@/services/composables/useOntologyFormatter';
import useToaster from '@/services/composables/useToaster';

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
    FactorsPane,
    NodeSuggestionsPane,
    FactorsRecommendationsPane,
    ModalConfirmation,
    ModalImportCag,
    ModalImportConflict,
    ModalPathFind,
    ContextInsightPanel
  },
  setup() {
    return {
      ontologyFormatter: useOntologyFormatter(),
      toaster: useToaster(),
      cagGraph: ref<any>()
    };
  },
  data: () => ({
    modelSummary: null,
    modelComponents: {} as CAGGraphInterface,

    // State flags
    isDrilldownOpen: false,
    isDrilldownOverlayOpen: false,
    isFetchingStatements: false,
    showModalConfirmation: false,
    showModalConflict: false,
    showModalImportCAG: false,
    showPathSuggestions: false,

    drilldownTabs: [] as { name: string; id: string }[],
    activeDrilldownTab: null as string | null,
    selectedNode: null as NodeParameter | null,
    selectedEdge: null as EdgeParameter | null,
    selectedStatements: [],
    showNewNode: false,
    correction: null as {
      factor: any;
      newGrounding: any;
      curGrounding: any;
    } | null,
    factorRecommendationsList: [] as any[],
    pathSuggestionSource: '',
    pathSuggestionTarget: '',
    edgeToSelectOnNextRefresh: null as {
      source: string;
      target: string;
    } | null,
    PANE_ID,
    timerId: null as NodeJS.Timeout | null,
    cagsToImport: [] as CAGGraphInterface[]
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
    }
  },
  watch: {
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
    }
  },
  created() {
    // update insight related state
    // FIXME: use contextId to store cag-id, reflected context-specific-id; TO BE REFACTORED
    this.setContextId(this.currentCAG);
    this.setProjectId(this.project);
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
      setContextId: 'insightPanel/setContextId',
      setProjectId: 'insightPanel/setProjectId'
    }),
    async refresh() {
      // Get CAG data
      this.modelSummary = await modelService.getSummary(this.currentCAG);
      this.modelComponents = await modelService.getComponents(this.currentCAG);
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
    },
    async addCAGComponents(nodes: NodeParameter[], edges: EdgeParameter[]) {
      return modelService.addComponents(this.currentCAG, nodes, edges);
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
        const edgeData = await projectService.getProjectStatementIdsByEdges(
          this.project,
          [edge],
          filtersUtil.newFilters()
        );
        const formattedEdge = Object.assign(
          { user_polarity: null, id: '' },
          edge,
          {
            reference_ids: edgeData[edge.source + '///' + edge.target] || []
          }
        );
        this.edgeToSelectOnNextRefresh = {
          source: edge.source,
          target: edge.target
        };
        if (formattedEdge.reference_ids.length === 0) {
          this.showPathSuggestions = true;
          this.pathSuggestionSource = formattedEdge.source;
          this.pathSuggestionTarget = formattedEdge.target;
        } else {
          const data = await this.addCAGComponents([], [formattedEdge]);
          this.setUpdateToken(data.updateToken);
        }
      } else {
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
      if (!_.isNil(this.cagGraph)) {
        this.cagGraph.deselectNodeAndEdge();
      }
      // If this is the first node in the graph, focus it in two ticks when it's visible.
      //  First tick after `setNewNodeVisible(true)` is called, the `CAG-graph` component is displayed.
      //  Second tick, its children (including the new node input) are rendered.
      if (this.showEmptyStateInstructions) {
        this.$nextTick(() => {
          this.$nextTick(() => {
            this.cagGraph && this.cagGraph.focusNewNodeInput();
          });
        });
      }
      // If newNode is already visible, refocus it
      if (this.showNewNode && this.cagGraph !== undefined) {
        this.cagGraph.focusNewNodeInput();
        return;
      }
      this.setNewNodeVisible(true);
    },
    onSuggestionSelected(suggestion: Suggestion) {
      this.addNodeToGraph(suggestion);
      this.setNewNodeVisible(false);
    },
    addNodeToGraph(suggestion: Suggestion) {
      if (this.isConceptInCag(suggestion.concept)) {
        this.showConceptExistsToaster(suggestion.label);
        return;
      }
      const node = {
        id: new Date().getTime().toString(),
        concept: suggestion.concept,
        label: suggestion.label
      };
      this.saveNodeToGraph(node);
    },
    // Makes API call to store the new node on the backend
    async saveNodeToGraph(node: NodeParameter) {
      // Creates a shallow clone of `node`, replacing the `id` property
      //  with an empty value
      const { model_id, concept, label, modified_at, parameter } = node;
      const cleanedNode = { id: '', model_id, concept, label, modified_at, parameter };
      const data = await this.addCAGComponents([cleanedNode], []);
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
    onDelete() {
      if (!_.isEmpty(this.selectedNode) || !_.isEmpty(this.selectedEdge)) {
        this.showModalConfirmation = true;
      }
    },
    async captureThumbnail() {
      // To compensate for animiated transitions in the graph, we need to wait a little bit for the graph
      // components to move into their rightful positions.
      this.clearThumbnailTimer();
      this.timerId = setTimeout(async () => {
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
    onNodeClick(node: { data: NodeParameter }) {
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
    selectNode(node: { data: NodeParameter }) {
      this.deselectNodeAndEdge();
      this.setNewNodeVisible(false);
      this.isDrilldownOverlayOpen = false;
      this.selectedNode = node.data;
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
    loadStatementsKB() {
      this.selectedStatements = [];
      if (this.selectedNode === null) return;
      const searchFilters = filtersUtil.newFilters();
      const concept = this.selectedNode.concept;
      filtersUtil.addSearchTerm(searchFilters, 'topic', concept, 'or', false);

      this.isFetchingStatements = true;

      projectService
        .getProjectStatements(this.project, searchFilters, {
          size: projectService.STATEMENT_LIMIT
        })
        .then(result => {
          this.selectedStatements = result;
          this.isFetchingStatements = false;
        });
    },
    async onAddToCAG(subgraph: CAGGraphInterface) {
      const data = await this.addCAGComponents(subgraph.nodes, subgraph.edges);
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
      recommendations: any[]
    ) {
      this.correction = { factor, newGrounding, curGrounding };
      this.factorRecommendationsList = recommendations;
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
          parameter: n.parameter
        };
      });

      await this.addCAGComponents(nodes, edges);

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
            newSourceTargetPairs.push(edge);
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
      const newEdges: EdgeParameter[] = newSourceTargetPairs.map(sourceTargetPair => {
        const { source, target } = sourceTargetPair;
        return {
          id: '',
          reference_ids: edgeData[key(sourceTargetPair)] || [],
          user_polarity: null,
          source,
          target
        };
      });

      // 3 Save
      const newNodesPayload = newNodes.map(concept => {
        return {
          id: '',
          concept: concept,
          label: this.ontologyFormatter(concept)
        };
      });
      const result = await this.addCAGComponents(newNodesPayload, newEdges);
      this.setUpdateToken(result.updateToken);
    },
    async resetCAGLayout() {
      if (this.cagGraph === undefined) return;
      const graphOptions = this.cagGraph.renderer.options;
      const prevStabilitySetting = graphOptions.useStableLayout;
      graphOptions.useStableLayout = false;
      await this.cagGraph.refresh();
      graphOptions.useStableLayout = prevStabilitySetting;
    }
  }
});
</script>

<style lang="scss">
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
    box-shadow: $shadow-level-2;
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
