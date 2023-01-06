<template>
  <div class="knowledge-base-explorer-container">
    <modal-header :nav-back-label="navBackLabel" @close="onCancel" @add-to-CAG="onAddToCAG" />
    <div class="body flex">
      <facets-panel />

      <!-- body -->
      <div class="body-main-content flex-col">
        <!-- searchbar -->

        <search-bar class="search" />

        <div class="flex-grow-1 min-width-0">
          <tab-panel />
        </div>
      </div>

      <drilldown-panel
        class="kb-drilldown-panel"
        :is-open="showDrilldownPanel"
        :tabs="drilldownTabs"
        :active-tab-id="activeDrilldownTab"
        :overlay-pane-title="'Evidence'"
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
          />
          <relationships-pane
            v-if="activeDrilldownTab === PANE_ID.RELATIONSHIPS && restructuredNode !== null"
            :selected-node="restructuredNode"
            :statements="selectedStatements"
            :project="project"
            :is-fetching-statements="isFetchingStatements"
            @select-edge="onRelationshipClick"
            @remove-edge="onRemoveRelationship"
          />
          <factors-pane
            v-if="activeDrilldownTab === PANE_ID.FACTORS && restructuredNode !== null"
            :selected-item="restructuredNode"
            :statements="selectedStatements"
            :project="project"
            :is-fetching-statements="isFetchingStatements"
          />
          <multi-relationships-pane
            v-if="
              activeDrilldownTab === PANE_ID.MULTIRELATIONSHIPS && selectedRelationships.length > 0
            "
            :relationships="selectedRelationships"
            :graph-data="graphData"
            @add-to-CAG="onAddToCAG"
            @select-edge="onRelationshipClick"
          />
        </template>
        <template #overlay-pane>
          <evidence-pane
            v-if="activeDrilldownTab === PANE_ID.EVIDENCE_OVERLAY && selectedEdge !== null"
            :selected-relationship="selectedEdge"
            :statements="selectedStatements"
            :project="project"
            :is-fetching-statements="isFetchingStatements"
          />
        </template>
      </drilldown-panel>
    </div>
    <modal-added-to-cag
      v-if="showModalAddedToCag"
      :number-of-relations-added="numberOfRelationsAdded"
      @search="onSearch"
      @close="onViewCag"
    />
  </div>
</template>

<script>
import _ from 'lodash';
import { mapActions, mapGetters } from 'vuex';

import ModalHeader from '../components/kb-explorer/modal-header.vue';
import SearchBar from '@/components/kb-explorer/search-bar';
import TabPanel from '@/components/kb-explorer/tab-panel';
import FacetsPanel from '@/components/kb-explorer/facets-panel';
import DrilldownPanel from '@/components/drilldown-panel';
import EvidencePane from '@/components/drilldown-panel/evidence-pane';
import MultiRelationshipsPane from '@/components/drilldown-panel/multi-relationships-pane';
import RelationshipsPane from '@/components/drilldown-panel/relationships-pane';
import FactorsPane from '@/components/drilldown-panel/factors-pane';
import ModalAddedToCag from '@/components/modals/modal-added-to-cag';
import filtersUtil from '@/utils/filters-util';
import projectService from '@/services/project-service';
import modelService from '@/services/model-service';
import * as curationService from '@/services/curation-service';
import { TYPE } from 'vue-toastification';

import messagesUtil from '@/utils/messages-util';

import { ProjectType } from '@/types/Enums';

const CORRECTIONS = messagesUtil.CORRECTIONS;

const PANE_ID = {
  FACTORS: 'factors',
  RELATIONSHIPS: 'relationships',
  EVIDENCE: 'evidence',
  MULTIRELATIONSHIPS: 'multirelationships',
  EVIDENCE_OVERLAY: 'evidence_overlay',
};

const NODE_DRILLDOWN_TABS = [
  {
    name: 'Factors',
    id: PANE_ID.FACTORS,
    icon: 'fa-sitemap',
  },
  {
    name: 'Relationships',
    id: PANE_ID.RELATIONSHIPS,
    icon: 'fa-long-arrow-right',
  },
];

const EDGE_DRILLDOWN_TABS = [
  {
    name: 'Relationship',
    id: PANE_ID.EVIDENCE,
  },
];

const RELATIONSHIPS_DRILLDOWN_TABS = [
  {
    name: 'Selected Relationships',
    id: PANE_ID.MULTIRELATIONSHIPS,
  },
];

export default {
  name: 'KnowledgeBaseExplorer',
  components: {
    SearchBar,
    FacetsPanel,
    TabPanel,
    DrilldownPanel,
    EvidencePane,
    MultiRelationshipsPane,
    RelationshipsPane,
    FactorsPane,
    ModalAddedToCag,
    ModalHeader,
  },
  data: () => ({
    isDrilldownOpen: false,
    drilldownTabs: [],
    activeDrilldownTab: '',
    isDrilldownOverlayOpen: false,
    selectedStatements: [],
    isFetchingStatements: false,
    mostRecentFetchParameters: null,
    showModalAddedToCag: false,
    showEvidenceOverlay: false,
    numberOfRelationsAdded: 0,
    graphData: {},
    navBackLabel: 'Knowledge Space',
  }),
  computed: {
    ...mapGetters({
      filters: 'query/filters',
      project: 'app/project',
      updateToken: 'app/updateToken',
      layout: 'query/layout',
      selectedSubgraphEdges: 'graph/selectedSubgraphEdges',
      cag: 'query/cag',
      selectedNode: 'graph/selectedNode',
      selectedEdge: 'graph/selectedEdge',
      selectedRelationships: 'graph/selectedRelationships',
      view: 'query/view',
    }),
    restructuredNode() {
      // Massages the structure of selectedEdge to line up with the format used by
      //  the relationships pane and factors pane
      const result = this.selectedNode.node;
      result.concept = result.id;
      return result;
    },
    showDrilldownPanel() {
      return this.view === 'graphs' && this.isDrilldownOpen;
    },
  },
  watch: {
    filters(n, o) {
      if (filtersUtil.isEqual(n, o)) return;

      // Reset edge-selection as filters can make them invalid
      this.setSelectedSubgraphEdges([]);
      this.setSelectedRelationships([]);
      this.refresh();

      if (this.mostRecentFetchParameters === null) return;
      // Take updated filters into account and re-fetch statements
      //  to be used in the drilldown panes
      const { field, term } = this.mostRecentFetchParameters;
      this.loadStatements(field, term);
    },
    updateToken(n, o) {
      if (_.isEqual(n, o)) return;
      this.refresh();
    },
    selectedNode(n) {
      if (_.isEmpty(n.node)) {
        this.closeDrilldown();
      } else {
        this.switchToTab(PANE_ID.FACTORS);
      }
    },
    selectedEdge(n) {
      if (_.isEmpty(n.source) && _.isEmpty(n.target)) {
        this.closeDrilldown();
      } else {
        if (this.showEvidenceOverlay) {
          this.switchToTab(PANE_ID.EVIDENCE_OVERLAY);
        } else {
          this.isDrilldownOverlayOpen = false;
          this.switchToTab(PANE_ID.EVIDENCE);
        }
        this.showEvidenceOverlay = false;
      }
    },
    selectedRelationships(n) {
      if (_.isEmpty(n)) {
        this.closeDrilldown();
      } else {
        if (this.isDrilldownOverlayOpen) {
          this.onDrilldownOverlayBack();
        }
        this.switchToTab(PANE_ID.MULTIRELATIONSHIPS);
      }
    },
  },
  async created() {
    this.PANE_ID = PANE_ID;
    this.leavingComponent = false; // A flag to not trigger refresh when route change

    // NOTEL this might be simplified using async computed properties
    // https://github.com/foxbenjaminfox/vue-async-computed
    const currentCAG = await modelService.getComponents(this.cag);
    this.navBackLabel = 'Knowledge Space (' + currentCAG.name + ')';
  },
  mounted() {
    this.refresh();
  },
  methods: {
    ...mapActions({
      setFilteredStatementCount: 'kb/setFilteredStatementCount',
      setDocumentsCount: 'kb/setDocumentsCount',
      setEvidencesCount: 'kb/setEvidencesCount',
      setSelectedSubgraphEdges: 'graph/setSelectedSubgraphEdges',
      setSelectedEdge: 'graph/setSelectedEdge',
      setSelectedRelationships: 'graph/setSelectedRelationships',
    }),
    async refresh() {
      if (this.leavingComponent) return;
      this.graphData = await modelService.getComponents(this.cag);

      const counts = await projectService.getProjectStats(this.project, this.filters);
      this.setDocumentsCount(counts.documentsCount);
      this.setEvidencesCount(counts.evidenceCount);
      this.setFilteredStatementCount(counts.statementsCount);
    },
    async onAddToCAG() {
      const currentCAG = await modelService.getComponents(this.cag);

      const selectedEdges = this.selectedSubgraphEdges;

      // all 'selected' nodes
      const edgeSources = selectedEdges.map((edge) => {
        return { id: edge.source };
      });
      const edgeTargets = selectedEdges.map((edge) => {
        return { id: edge.target };
      });
      let selectedNodes = [];

      selectedNodes = selectedNodes.concat(edgeSources, edgeTargets);
      selectedNodes = _.uniqBy(selectedNodes, 'id');

      const nodesToAdd = _.differenceWith(selectedNodes, currentCAG.nodes, (selected, current) => {
        return selected.id === current.concept;
      });

      // Retrieve reference ids for the selected edges to be able to compare statement ids with the existing CAG
      const selectedEdgesData = await projectService.getProjectStatementIdsByEdges(
        this.project,
        selectedEdges.map((e) => ({ source: e.source, target: e.target })),
        this.filters
      );

      const formattedNodes = nodesToAdd.map((node) => {
        return {
          id: '',
          concept: node.id,
          label: this.ontologyFormatter(node.id),
          components: [node.id],
        };
      });

      const formattedEdges = selectedEdges.map((selectedEdge) => {
        const existingEdge = currentCAG.edges.find(
          (e) => e.source === selectedEdge.source && e.target === selectedEdge.target
        );
        const edgeId = selectedEdge.source + '///' + selectedEdge.target;

        if (_.isEmpty(existingEdge)) {
          // New edge
          return {
            id: '',
            source: selectedEdge.source,
            target: selectedEdge.target,
            reference_ids: selectedEdgesData[edgeId],
            parameter: {
              // weights: [0.0, 0.5]
            },
          };
        } else {
          // Existing edge, merge reference_ids
          return {
            id: existingEdge.id,
            source: selectedEdge.source,
            target: selectedEdge.target,
            reference_ids: _.uniq(existingEdge.reference_ids.concat(selectedEdgesData[edgeId])),
          };
        }
      });
      await modelService.addComponents(this.cag, formattedNodes, formattedEdges, 'add:kb');

      this.numberOfRelationsAdded = formattedEdges.length;
      this.showModalAddedToCag = true;
    },
    async onRemoveRelationship(edges) {
      // Get edge ids from CAG to be able to remove them
      let statementIds = [];
      for (let i = 0; i < edges.length; i++) {
        const statement = this.selectedStatements.find((s) => {
          return s.subj.concept === edges[i].source && s.obj.concept === edges[i].target;
        });
        if (!_.isNil(statement)) {
          statementIds.push(statement.id);
        }
      }
      statementIds = _.uniq(statementIds);

      const updateResult = await curationService.discardStatements(this.project, statementIds);
      if (updateResult.status === 200) {
        this.toaster(CORRECTIONS.SUCCESSFUL_CORRECTION, TYPE.SUCCESS, false);
      } else {
        this.toaster(CORRECTIONS.ERRONEOUS_CORRECTION, TYPE.INFO, true);
      }
    },
    onSearch() {
      this.showModalAddedToCag = false;
    },
    onViewCag() {
      this.showModalAddedToCag = false;
      this.setSelectedSubgraphEdges([]);
      this.leavingComponent = true;
      this.$router.push({
        name: 'qualitative',
        params: { project: this.project, currentCAG: this.cag, projectType: ProjectType.Analysis },
      });
    },
    onCancel() {
      this.setSelectedSubgraphEdges([]);
      this.leavingComponent = true;
      this.$router.push({
        name: 'qualitative',
        params: { project: this.project, currentCAG: this.cag, projectType: ProjectType.Analysis },
      });
    },
    onRelationshipClick(relationship) {
      this.showEvidenceOverlay = true;
      this.setSelectedEdge({ source: relationship.source, target: relationship.target });
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
    openDrilldownOverlay() {
      this.isDrilldownOverlayOpen = true;
    },
    onDrilldownOverlayBack() {
      this.isDrilldownOverlayOpen = false;
      this.switchToTab(PANE_ID.MULTIRELATIONSHIPS);
    },
    switchToTab(tab) {
      switch (tab) {
        case PANE_ID.EVIDENCE:
          this.drilldownTabs = EDGE_DRILLDOWN_TABS;
          this.activeDrilldownTab = PANE_ID.EVIDENCE;
          this.loadStatements('edge', this.selectedEdge.source + '///' + this.selectedEdge.target);
          this.openDrilldown();
          break;
        case PANE_ID.RELATIONSHIPS:
          this.drilldownTabs = NODE_DRILLDOWN_TABS;
          this.activeDrilldownTab = PANE_ID.RELATIONSHIPS;
          this.loadStatements('topic', this.restructuredNode.concept);
          this.openDrilldown();
          break;
        case PANE_ID.FACTORS:
          this.drilldownTabs = NODE_DRILLDOWN_TABS;
          this.activeDrilldownTab = PANE_ID.FACTORS;
          this.loadStatements('topic', this.restructuredNode.concept);
          this.openDrilldown();
          break;
        case PANE_ID.MULTIRELATIONSHIPS:
          this.drilldownTabs = RELATIONSHIPS_DRILLDOWN_TABS;
          this.activeDrilldownTab = PANE_ID.MULTIRELATIONSHIPS;
          this.openDrilldown();
          break;
        case PANE_ID.EVIDENCE_OVERLAY:
          this.activeDrilldownTab = PANE_ID.EVIDENCE_OVERLAY;
          this.loadStatements('edge', this.selectedEdge.source + '///' + this.selectedEdge.target);
          this.openDrilldownOverlay();
          break;
        default:
          console.error('Switching to invalid tab: ' + tab);
          break;
      }
    },
    loadStatements(field, term) {
      this.isFetchingStatements = true;
      this.selectedStatements = [];
      // Cache parameters in case an updateToken change triggers a reload
      this.mostRecentFetchParameters = { field, term };
      const searchFilters = _.cloneDeep(this.filters);
      filtersUtil.addSearchTerm(searchFilters, field, term, 'or', false);

      projectService
        .getProjectStatements(this.project, searchFilters, {
          size: projectService.STATEMENT_LIMIT,
          documents: true,
        })
        .then((result) => {
          this.selectedStatements = result;
          this.isFetchingStatements = false;
        });
    },
  },
};
</script>

<style lang="scss" scoped>
@import '~styles/variables';

.knowledge-base-explorer-container {
  height: 100vh;
  position: relative;
  box-sizing: border-box;
  overflow: hidden;
  display: flex;
  flex-direction: column;
  z-index: 0;
}

.search {
  margin-top: 5px;
  padding: 0 8px;
}

.body {
  flex: 1;
  min-height: 0;
  background: $background-light-3;

  .body-main-content {
    flex: 1;
    min-width: 0;
    isolation: isolate;
  }
}

.kb-drilldown-panel {
  z-index: 1;
}
</style>
