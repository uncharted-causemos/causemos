<template>
  <div class="qualitative-view-container">
    <action-column
      @belief-scores-updated="refresh"
    />
    <div
      class="graph-container"
      @dblclick="onBackgroundDblClick"
    >
      <action-bar
        :model-summary="modelSummary"
        :model-components="modelComponents"
        @add-concept="createNewNode()"
        @import-cag="showModalImportCAG=true"
      />
      <empty-state-instructions v-if="showEmptyStateInstructions" />
      <CAG-graph
        v-else
        ref="cagGraph"
        class="cagGraph"
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
      :is-open="isDrilldownOpen"
      :tabs="drilldownTabs"
      :active-tab-id="activeDrilldownTab"
      :overlay-pane-title="overlayPaneTitle"
      :is-overlay-open="isDrilldownOverlayOpen"
      @close="closeDrilldown"
      @tab-click="onTabClick"
      @overlay-back="onDrilldownOverlayBack"
    >
      <div slot="action">
        <button
          v-if="activeDrilldownTab === PANE_ID.RELATIONSHIPS && selectedNode !== null"
          class="btn btn-primary action-button"
          @click="openDrilldownOverlay(PANE_ID.NODE_SUGGESTIONS)"
        ><i class="fa fa-fw fa-plus" />Find More</button>
      </div>
      <div slot="content">
        <evidence-pane
          v-if="activeDrilldownTab === PANE_ID.EVIDENCE && selectedEdge !== null"
          :selected-relationship="selectedEdge"
          :statements="selectedStatements"
          :project="project"
          :is-fetching-statements="isFetchingStatements"
          :should-confirm-curations="true">
          <edge-polarity-switcher
            :selected-relationship="selectedEdge"
            @edge-set-user-polarity="setEdgeUserPolarity" />
        </evidence-pane>
        <relationships-pane
          v-if="activeDrilldownTab === PANE_ID.RELATIONSHIPS && selectedNode !== null"
          :selected-node="selectedNode"
          :model-components="modelComponents"
          :statements="selectedStatements"
          :project="project"
          :is-fetching-statements="isFetchingStatements"
          @select-edge="onRelationshipClick"
          @remove-edge="onRemoveRelationship"
        />
        <factors-pane
          v-if="activeDrilldownTab === PANE_ID.FACTORS && selectedNode !== null"
          :selected-item="selectedNode"
          :number-relationships="countNodeRelationships"
          :statements="selectedStatements"
          :project="project"
          :is-fetching-statements="isFetchingStatements"
          :should-confirm-curations="true"
          @show-factor-recommendations="onShowFactorRecommendations"
        />
      </div>
      <div slot="overlay-pane">
        <node-suggestions-pane
          v-if="activeDrilldownTab === PANE_ID.NODE_SUGGESTIONS && selectedNode !== null"
          :selected-node="selectedNode"
          :statements="selectedStatements"
          :graph-data="modelComponents"
          :is-fetching-statements="isFetchingStatements"
          @add-to-CAG="onAddToCAG"
        />
        <factors-recommendations-pane
          v-if="activeDrilldownTab === PANE_ID.FACTOR_RECOMMENDATIONS && selectedNode !== null && factorRecommendationsList.length > 0"
          :correction="correction"
          :recommendations="factorRecommendationsList"
          :is-fetching-statements="isFetchingStatements"
          @close-overlay="onDrilldownOverlayBack"
        />
      </div>
    </drilldown-panel>
    <modal-import-cag
      v-if="showModalImportCAG"
      @import-cag="runImportChecks"
      @close="showModalImportCAG = false" />

    <modal-confirmation
      v-if="showModalConfirmation"
      @confirm="onModalConfirm"
      @close="onModalClose"
    >
      <div slot="title">Confirmation</div>
      <div slot="message">
        <div v-if="selectedNode !== null">
          <div>
            Are you sure you want to remove
            <strong>{{ selectedNode.concept | shortName }}</strong> from your CAG?
          </div>
          <ul>
            <li>{{ countIncomingRelationships }} incoming relationship(s)</li>
            <li>{{ countOutgoingRelationships }} outgoing relationship(s)</li>
          </ul>
          will also be removed.
        </div>
        <div v-if="selectedEdge !== null">
          <div>Are you sure you want to remove the relationship between</div>
          <strong>{{ selectedEdge.source | shortName }}</strong> and
          <strong>{{ selectedEdge.target | shortName }}</strong> from this CAG?
        </div>
      </div>
    </modal-confirmation>

    <modal-import-conflict
      v-if="showModalConflict"
      @retain="importCAGs(false)"
      @overwrite="importCAGs(true)"
      @close="showModalConflict=false" />

    <modal-path-find
      v-if="showPathSuggestions"
      :source="pathSuggestionSource"
      :target="pathSuggestionTarget"
      @add-paths="addSuggestedPath"
      @close="showPathSuggestions = false"
    />
  </div>
</template>

<script>
import _ from 'lodash';
import html2canvas from 'html2canvas';
import { mapActions, mapGetters } from 'vuex';

import EmptyStateInstructions from '@/components/empty-state-instructions';
import ActionBar from '@/components/qualitative/action-bar';
import CAGGraph from '@/components/graph/CAG-graph';
import ActionColumn from '@/components/action-column';
import DrilldownPanel from '@/components/drilldown-panel';
import EvidencePane from '@/components/drilldown-panel/evidence-pane';
import EdgePolaritySwitcher from '@/components/drilldown-panel/edge-polarity-switcher';
import RelationshipsPane from '@/components/drilldown-panel/relationships-pane';
import FactorsPane from '@/components/drilldown-panel/factors-pane';
import NodeSuggestionsPane from '@/components/drilldown-panel/node-suggestions-pane';
import FactorsRecommendationsPane from '@/components/drilldown-panel/factors-recommendations-pane';

import { conceptShortName } from '@/utils/concept-util';
import filtersUtil from '@/utils/filters-util';
import ModalConfirmation from '@/components/modals/modal-confirmation';
import ModalPathFind from '@/components/modals/modal-path-find';
import ModalImportCag from '@/components/qualitative/modal-import-cag';
import ModalImportConflict from '@/components/qualitative/modal-import-conflict';
import cagUtil from '@/utils/cag-util';

import modelService from '@/services/model-service';
import projectService from '@/services/project-service';

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

export default {
  name: 'QualitativeView',
  components: {
    EmptyStateInstructions,
    ActionBar,
    CAGGraph,
    ActionColumn,
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
    ModalPathFind
  },
  filters: {
    shortName: function (concept) {
      return conceptShortName(concept + '');
    }
  },
  data: () => ({
    modelSummary: null,
    modelComponents: {},

    // State flags
    isDrilldownOpen: false,
    isDrilldownOverlayOpen: false,
    isFetchingStatements: false,
    showModalConfirmation: false,
    showModalConflict: false,
    showModalImportCAG: false,
    showPathSuggestions: false,

    drilldownTabs: [],
    activeDrilldownTab: '',
    selectedNode: null,
    selectedEdge: null,
    selectedStatements: [],
    showNewNode: false,
    correction: null,
    factorRecommendationsList: [],
    pathSuggestionSource: '',
    pathSuggestionTarget: ''
  }),
  computed: {
    ...mapGetters({
      currentCAG: 'app/currentCAG',
      project: 'app/project',
      updateToken: 'app/updateToken'
    }),
    showEmptyStateInstructions() {
      return _.isEmpty(this.modelComponents.nodes) &&
          _.isEmpty(this.modelComponents.edges) &&
          !this.showNewNode;
    },
    countIncomingRelationships: function () {
      return this.modelComponents.edges.filter((edge) => edge.target === this.selectedNode.concept).length;
    },
    countOutgoingRelationships: function () {
      return this.modelComponents.edges.filter((edge) => edge.source === this.selectedNode.concept).length;
    },
    countNodeRelationships: function () {
      const concept = this.selectedNode.concept;
      return this.modelComponents.edges.filter((edge) => edge.target === concept || edge.source === concept).length;
    },
    conceptsInCag() {
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
      if (_.isEqual(n, o)) return;
      this.clearThumbnailTimer();
      this.refresh();
      this.closeDrilldown();
    }
  },
  created() {
    this.PANE_ID = PANE_ID;
    this.timerId = null;
    this.cagsToImport = [];
  },
  mounted() {
    this.recalculateCAG();
  },
  beforeDestroy() {
    this.clearThumbnailTimer();
  },
  methods: {
    ...mapActions({
      setUpdateToken: 'app/setUpdateToken'
    }),
    async refresh() {
      // Get CAG data
      this.modelSummary = await modelService.getSummary(this.currentCAG);
      this.modelComponents = await modelService.getComponents(this.currentCAG);
    },
    async addCAGComponents(nodes, edges) {
      return modelService.addComponents(this.currentCAG, nodes, edges);
    },
    async removeCAGComponents(nodes, edges) {
      return modelService.removeComponents(this.currentCAG, nodes, edges);
    },
    async addEdge(v) {
      const edge = { source: v.source.concept, target: v.target.concept };

      const edges = this.modelComponents.edges.map(edge => edge.source + '///' + edge.target);

      if (edges.indexOf(edge.source + '///' + edge.target) === -1) {
        const edgeData = await projectService.getProjectStatementIdsByEdges(this.project, [edge], null);
        const formattedEdge = Object.assign({}, edge, { reference_ids: edgeData[edge.source + '///' + edge.target] || [] });
        if (formattedEdge.reference_ids.length === 0) {
          this.showPathSuggestions = true;
          this.pathSuggestionSource = formattedEdge.source;
          this.pathSuggestionTarget = formattedEdge.target;
        } else {
          const data = await this.addCAGComponents([], [formattedEdge]);
          this.setUpdateToken(data.updateToken);
        }
      } else {
        this.toaster(conceptShortName(edge.source) + ' ' + conceptShortName(edge.target) + ' already exists in the CAG', 'error', false);
      }
    },
    createNewNode() {
      this.deselectNodeAndEdge();
      this.closeDrilldown();
      if (!_.isNil(this.$refs.cagGraph)) { this.$refs.cagGraph.deselectNodeAndEdge(); }
      // If this is the first node in the graph, focus it in two ticks when it's visible.
      //  First tick after `setNewNodeVisible(true)` is called, the `CAG-graph` component is displayed.
      //  Second tick, its children (including the new node input) are rendered.
      if (this.showEmptyStateInstructions) {
        this.$nextTick(() => {
          this.$nextTick(() => {
            this.$refs.cagGraph.focusNewNodeInput();
          });
        });
      }
      // If newNode is already visible, refocus it
      if (this.showNewNode) {
        this.$refs.cagGraph.focusNewNodeInput();
        return;
      }
      this.setNewNodeVisible(true);
    },
    onSuggestionSelected(suggestion) {
      this.addNodeToGraph(suggestion);
      this.setNewNodeVisible(false);
    },
    addNodeToGraph(suggestion) {
      if (this.isConceptInCag(suggestion.concept)) {
        this.showConceptExistsToaster(suggestion.shortName);
        return;
      }
      const graphData = _.clone(this.modelComponents);
      const node = {
        id: (new Date()).getTime().toString(),
        concept: suggestion.concept,
        label: suggestion.shortName
      };
      graphData.nodes.push(node);
      this.modelComponents = graphData;
      this.saveNodeToGraph(node);
    },
    // Makes API call to store the new node on the backend
    async saveNodeToGraph(node) {
      const cleanedNode = _.clone(node);
      delete cleanedNode.id;
      const data = await this.addCAGComponents([cleanedNode], []);
      this.setUpdateToken(data.updateToken);
    },
    async onModalConfirm() {
      this.showModalConfirmation = false;

      if (!_.isEmpty(this.selectedNode)) {
        const data = await this.removeCAGComponents(
          [{ id: this.selectedNode.data.id }],
          this.modelComponents.edges.filter((edge) => edge.source === this.selectedNode.concept || edge.target === this.selectedNode.concept)
            .map((edge) => ({ id: edge.id }))
        );
        this.setUpdateToken(data.updateToken);
      }

      if (!_.isEmpty(this.selectedEdge)) {
        const data = await this.removeCAGComponents([], [{ id: this.selectedEdge.id }]);
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
        const thumbnailSource = (await html2canvas(el, { scale: 0.5 })).toDataURL();
        modelService.updateModelMetadata(this.currentCAG, { thumbnail_source: thumbnailSource });
      }, 2000);
    },
    clearThumbnailTimer() {
      if (this.timerId) clearTimeout(this.timerId);
    },
    onBackgroundDblClick() {
      this.createNewNode();
    },
    onNodeClick(node) {
      this.selectNode(node);
    },
    onEdgeClick(edge) {
      // Called when an edge is clicked in the CAG
      this.isDrilldownOverlayOpen = false;
      this.selectEdge(edge);
    },
    onRelationshipClick(relationship) {
      // Called when a relationship is clicked in the relationships pane

      // Reference IDs for the relationship's statements are not stored in the relationships pane
      //  but can be found by searching the CAG for the edge that represents the relationship,
      //  and surfacing it's underlying array of reference IDs.
      const foundEdge = this.modelComponents.edges.find((edge) => {
        return edge.source === relationship.source && edge.target === relationship.target;
      });
      this.selectEdge(foundEdge);
      this.$refs.cagGraph.renderEdgeClick(foundEdge.source, foundEdge.target);
    },
    async setEdgeUserPolarity(edge, polarity) {
      await modelService.updateEdgePolarity(this.currentCAG, edge.id, polarity);
      this.selectedEdge.user_polarity = this.selectedEdge.polarity = polarity;
      this.refresh();
    },
    onBackgroundClick() {
      this.deselectNodeAndEdge();
      this.isDrilldownOverlayOpen = false;
      this.closeDrilldown();
      this.setNewNodeVisible(false);
    },
    selectEdge(edge) {
      this.deselectNodeAndEdge();
      this.setNewNodeVisible(false);
      this.selectedEdge = edge;
      this.switchToTab(PANE_ID.EVIDENCE);
    },
    selectNode(node) {
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
    switchToTab(tab) {
      let newTabSet, newActiveTab;
      switch (tab) {
        case PANE_ID.EVIDENCE:
          newTabSet = EDGE_DRILLDOWN_TABS;
          newActiveTab = PANE_ID.EVIDENCE;
          this.loadCAGEdgeStatements(this.selectedEdge);
          break;
        case PANE_ID.RELATIONSHIPS:
          newTabSet = NODE_DRILLDOWN_TABS;
          newActiveTab = PANE_ID.RELATIONSHIPS;
          this.loadCAGNodeStatements(this.selectedNode);
          break;
        case PANE_ID.FACTORS:
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
    onTabClick(tabID) {
      this.switchToTab(tabID);
    },
    openDrilldownOverlay(tab) {
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
    loadCAGEdgeStatements(edge) {
      this.isFetchingStatements = true;
      modelService.getEdgeStatements(this.currentCAG, edge.source, edge.target).then(statements => {
        this.selectedStatements = statements;
        this.isFetchingStatements = false;
      });
    },
    loadCAGNodeStatements(node) {
      this.isFetchingStatements = true;
      modelService.getNodeStatements(this.currentCAG, node.concept).then(statements => {
        this.selectedStatements = statements;
        this.isFetchingStatements = false;
      });
    },
    loadStatementsKB() {
      this.selectedStatements = [];
      const searchFilters = filtersUtil.newFilters();
      const concept = this.selectedNode.concept;
      filtersUtil.addSearchTerm(searchFilters, 'topic', concept, 'or', false);

      this.isFetchingStatements = true;

      projectService.getProjectStatements(this.project, searchFilters, { size: projectService.STATEMENT_LIMIT }).then(result => {
        this.selectedStatements = result;
        this.isFetchingStatements = false;
      });
    },
    async onAddToCAG(subgraph) {
      const data = await this.addCAGComponents(subgraph.nodes, subgraph.edges);
      this.setUpdateToken(data.updateToken);
    },
    async onRemoveRelationship(edges) {
      // Get edge ids from CAG to be able to remove them
      // FIXME: This is not ideal. We will need to expand the API to operate on source/target instead of id.
      const edgesToRemove = edges.map(e => {
        const found = this.modelComponents.edges.find(edge => edge.source + '///' + edge.target === e.source + '///' + e.target);
        return { id: found.id };
      });

      const data = await this.removeCAGComponents([], edgesToRemove);
      this.setUpdateToken(data.updateToken);
    },
    setNewNodeVisible(isVisible) {
      this.showNewNode = isVisible;
    },
    isConceptInCag(concept) {
      return this.conceptsInCag.indexOf(concept) > -1;
    },
    showConceptExistsToaster(concept) {
      this.toaster(concept + ' already exists in the CAG', 'error', false);
    },
    async onShowFactorRecommendations(recommendations) {
      this.correction = { factor: recommendations.regrounding.factor, newGrounding: recommendations.regrounding.newGrounding, curGrounding: recommendations.regrounding.curGrounding };
      this.factorRecommendationsList = recommendations.recommendations;
      this.openDrilldownOverlay(PANE_ID.FACTOR_RECOMMENDATIONS);
    },
    async runImportChecks(ids) {
      this.showModalConflict = false;
      this.showModalImportCAG = false;
      this.cagsToImport = [];

      const current = await modelService.getComponents(this.currentCAG);
      for (let i = 0; i < ids.length; i++) {
        const toImport = await modelService.getComponents(ids[i]);
        this.cagsToImport.push(toImport);
      }

      // Check to see if there are conflicting indicators
      const hasNodeConflict = cagUtil.hasMergeConflictNodes(current, this.cagsToImport);
      const hasEdgeConflict = cagUtil.hasMergeConflictEdges(current, this.cagsToImport);
      if (hasNodeConflict === true || hasEdgeConflict === true) {
        this.showModalConflict = true;
      } else {
        this.importCAGs(false);
      }
    },
    async importCAGs(overwriteParameterisation) {
      this.showModalConflict = false;
      this.showModalImportCAG = false;

      // FIXME: Might want to move this server side, not very efficient if merge a lot of graphs
      const current = await modelService.getComponents(this.currentCAG);
      for (let i = 0; i < this.cagsToImport.length; i++) {
        cagUtil.mergeCAG(current, this.cagsToImport[i], overwriteParameterisation);
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
    async addSuggestedPath(paths) {
      this.showPathSuggestions = false;

      const key = (e) => `${e.source}///${e.target}`;

      // 1 Find segments not already in the graph
      const newEdges = [];
      const newNodes = [];
      const edgeSet = new Set();
      const nodeSet = new Set();
      this.modelComponents.edges.forEach(edge => {
        edgeSet.add(key(edge));
      });
      this.modelComponents.nodes.forEach(node => {
        nodeSet.add(node.concept);
      });

      paths.forEach(path => {
        path.forEach(edge => {
          if (!edgeSet.has(key(edge)) && !_.some(newEdges, e => e.source === edge.source && e.target === edge.target)) {
            newEdges.push(edge);
          }
          if (!nodeSet.has(edge.source) && newNodes.indexOf(edge.source) === -1) {
            newNodes.push(edge.source);
          }
          if (!nodeSet.has(edge.target) && newNodes.indexOf(edge.target) === -1) {
            newNodes.push(edge.target);
          }
        });
      });

      // 2 Get edge statement references
      const edgeData = await projectService.getProjectStatementIdsByEdges(this.project, newEdges, null);
      newEdges.forEach(edge => {
        edge.reference_ids = edgeData[key(edge)] || [];
      });

      // 3 Save
      const newNodesPayload = newNodes.map(concept => {
        return {
          concept: concept,
          label: conceptShortName(concept)
        };
      });
      const result = await this.addCAGComponents(newNodesPayload, newEdges);
      this.setUpdateToken(result.updateToken);
    }
  }
};
</script>

<style lang="scss">
@import "~styles/variables";

.qualitative-view-container {
  height: $content-full-height;
  box-sizing: border-box;
  overflow: hidden;
  display: flex;

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
</style>
