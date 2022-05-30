<template>
  <div class="full">
    <controls
      :max-node-depth="5"
      :minimum-node-depth="minNodeDepth"
      :show-collapse-controls="showCollapseControls"
      :show-expand-controls="showExpandControls"
      :show-search-controls="showSearchControls"
      :show-all-expand-controls="showAllExpandControls"
      :show-edges="showEdges"
      @setNodeDepth="onNodeDepth"
      @addToSearch="onAddToSearch"
      @removeFromSearch="onRemoveFromSearch"
      @fit="onFit"

    />
    <div class="layout-message">{{ layoutMessage }}</div>
    <div
      ref="graph"
      class="full" />
    <color-legend class="legend"/>
  </div>
</template>

<script>
import _ from 'lodash';

import { mapActions, mapGetters } from 'vuex';
import CytoscapeGraphRenderer from '@/graphs/cytoscape/cytoscape-graph-renderer';
import CytoscapeData from '@/graphs/cytoscape/cytoscape-data';
import { coseBilkentLayout, colaLayout } from '@/graphs/cytoscape/cytoscape-strategies';
import ColorLegend from '@/components/graph/color-legend';
import Controls from '@/components/graph/controls';
import { createLinearScale } from '@/utils/scales-util';
import { FADED_COLOR } from '@/utils/colors-util';
import { calculateNeighborhood } from '@/utils/graphs-util';
import useOntologyFormatter from '@/services/composables/useOntologyFormatter';

export const EDGE_THRESHOLD = 2000;
export const NODE_THRESHOLD = 4000;

const FADED_OPACITY = 0.3;

/**
 * A Vue compoent wrapper for cytoscape-renderer
 */
export default {
  name: 'CytoGraph',
  components: {
    ColorLegend,
    Controls
  },
  props: {
    graphData: {
      type: Object,
      default: () => ({ nodes: [], edges: [] })
    },
    layout: {
      type: Object,
      default: () => ({})
    }
  },
  emits: [
    'clear-selection'
  ],
  setup() {
    return {
      ontologyFormatter: useOntologyFormatter()
    };
  },
  data: () => ({
    showEdges: false,
    exceedNodesThreshold: false,
    showExpandControls: false,
    showAllExpandControls: false,
    showCollapseControls: false,
    minNodeDepth: 1,

    focusedNodes: []
  }),
  computed: {
    ...mapGetters({
      nodesCount: 'graph/filteredNodesCount',
      selectedNode: 'graph/selectedNode',
      selectedEdge: 'graph/selectedEdge'
    }),
    showSearchControls() {
      return !_.isEmpty(this.focusedNodes);
    },
    layoutMessage() {
      if (this.exceedNodesThreshold === true) {
        return `Number of nodes exceeds interactivity threshold of ${NODE_THRESHOLD}, please select one or more additional filters to narrow down the search criteria.`;
      } else if (this.showEdges === false) {
        return `Relationships are hidden when there are more than ${EDGE_THRESHOLD} relationships in the result.`;
      }
      return '';
    }
  },
  watch: {
    graphData() {
      this.refresh();
    },
    layout(n, o) {
      if (_.isEqual(n, o)) return;
      if (n.layoutOption !== o.layoutOption || n.direction !== o.direction) {
        if (n.layoutOption === 'cola') {
          this.graphRenderer.setStrategy(colaLayout(n.direction));
          this.currentLayout = 'cola';
        } else {
          this.graphRenderer.setStrategy(coseBilkentLayout());
          this.currentLayout = 'cose-bilkent';
        }
        this.graphRenderer._calculate(); // FIXME, need higher level API

        this.graphRenderer.render(() => {
          this.applyToggles(n);
        });
      }
      if (n.showLabels !== o.showLabels) {
        this.graphRenderer.setLabelVisibility(n.showLabels);
      }
      if (n.showedges !== o.showEdges) {
        this.graphRenderer.setEdgeVisibility(n.showEdges);
      }
      if (n.edgeOpacity !== o.edgeOpacity) {
        this.graphRenderer.setEdgeOpacity(n.edgeOpacity);
      }
    }
  },
  created() {
    this.graphRenderer = null;
    this.currentLayout = 'cose-bilkent';
  },
  mounted() {
    this.graphRenderer = new CytoscapeGraphRenderer({ formatter: this.ontologyFormatter });
    this.graphRenderer.initialize(this.$refs.graph);
    this.graphRenderer.setDepth(1);
    this.graphRenderer.setStrategy(coseBilkentLayout());

    /// /////////////////////////////////////////////////////////////////////////////
    // Set up interactions
    /// /////////////////////////////////////////////////////////////////////////////
    const cy = this.graphRenderer.cy;
    cy.boxSelectionEnabled(true); // Enabled box selection

    let nodesSelected = cy.collection();
    let edgesSelected = cy.collection();

    const nodeNeighborhoodHighlights = () => {
      const nodesSelectedArray = nodesSelected.toArray().map(node => node.id());
      this.focusedNodes = nodesSelected.toArray().map(node => node.data()); // Array of nodes to add/remove to search

      // Create edges to add when edges are not shown
      const neighborEdges = this.graphData.edges.filter(e => {
        return nodesSelectedArray.includes(e.source) || nodesSelectedArray.includes(e.target);
      });
      const edges = CytoscapeData.createEdges(neighborEdges);

      // Outer ring around nodes for selected nodes
      const counts = cy.nodes().map(d => d.data().count);
      const maxCount = Math.max(...counts);
      const minCount = Math.min(...counts);
      const sizeFn = createLinearScale([minCount, maxCount], [30, 80]); // Make the size range between 30 to 80

      // Increases the node size to be able to draw the outer ring
      nodesSelected.forEach(node => {
        const size = sizeFn(node.data().count);
        node.data().style.width = size * 1.25;
        node.data().style.height = size * 1.25;
      });
      cy.style().selector('node').update();
      cy.batch(() => {
        // Get neighborhood
        const edgeIds = _.uniq([
          ...neighborEdges.map(e => e.source),
          ...neighborEdges.map(e => e.target)
        ]);

        const neighborNodes = cy.nodes().filter(':childless').filter(n => {
          return edgeIds.includes(n.id());
        });
        const nonNeighborNodes = cy.nodes().filter(':childless').filter(n => {
          return !edgeIds.includes(n.id());
        });


        // Style for nodes
        neighborNodes.style({ opacity: 1.0 });
        nonNeighborNodes.style({ opacity: FADED_OPACITY, label: '' });

        if (this.showEdges === false) {
          cy.edges().remove();
          cy.add(edges);
        } else {
          // Style for edges: fade in neighbors, fade out the rest
          cy.edges().style({
            opacity: FADED_OPACITY,
            lineColor: FADED_COLOR,
            sourceArrowColor: FADED_COLOR,
            targetArrowColor: FADED_COLOR
          });
          cy.edges().filter(e => {
            return nodesSelectedArray.includes(e.data().source) || nodesSelectedArray.includes(e.data().target);
          }).style({
            opacity: 1.0, // Full opacity when highlighting
            lineColor: e => e.data().style.edgeColor,
            sourceArrowColor: e => e.data().style.edgeColor,
            targetArrowColor: e => e.data().style.edgeColor
          });
        }
      });
    };

    // Nodes selection - additive selection. Outline for selected node and fade in neighborhood and fade out the rest
    this.graphRenderer.setCallback('nodeClick', (element) => {
      cy.selectionType('additive');
      const node = element.target;

      // Handle neighborhood highlights in the graph
      if (!node.selected()) {
        nodesSelected = nodesSelected.union(node);
        nodeNeighborhoodHighlights();
      } else {
        nodesSelected = nodesSelected.filter(n => n.id() !== node.id());
        if (nodesSelected.length >= 1) {
          nodeNeighborhoodHighlights();
        } else {
          // Deselect the node
          clearHighlights();
        }
      }

      const nodesSelectedIds = nodesSelected.toArray().map(d => d.id());
      const neighborhood = nodesSelectedIds.map(id => calculateNeighborhood(this.graphData, id)); // Calculate neighborhood for each selected node.
      const merged = { edges: [] }; // Group neighborhood by nodes and edges
      neighborhood.forEach(n => {
        merged.edges.push(n.edges);
      });

      merged.edges = _.uniqBy(_.flatten(merged.edges), (edge) => edge.source + '///' + edge.target);

      const edges = this.graphData.edges.filter(edge => {
        const ids = merged.edges.map(edge => edge.source + '///' + edge.target);
        return ids.indexOf(edge.source + '///' + edge.target) !== -1;
      });

      if (nodesSelected.length > 1) {
        this.setSelectedRelationships(edges);
      } else if (nodesSelected.length === 1) {
        this.setSelectedNode({ node: nodesSelected.data() });
      }

      this.setSelectedSubgraphEdges(edges);
    });

    const edgeNeighborhoodHighlights = () => {
      const sources = edgesSelected.sources();
      const targets = edgesSelected.targets();
      const nodes = sources.merge(targets);

      const nodesUnselected = cy.nodes(':childless').difference(nodes).nodes();

      cy.batch(() => {
        cy.nodes().style({ opacity: 1.0 });
        nodesUnselected.style({
          opacity: FADED_OPACITY
        });

        cy.edges().style({ opacity: FADED_OPACITY, lineColor: FADED_COLOR });
        edgesSelected.style({
          opacity: 1.0,
          lineColor: e => e.data().style.edgeColor
        });
      });
    };

    const clearHighlights = () => {
      if (this.showEdges === false) {
        cy.edges().remove();
      } else {
        cy.edges().style({
          opacity: this.layout.edgeOpacity,
          lineColor: e => e.data().style.edgeColor,
          sourceArrowColor: e => e.data().style.edgeColor,
          targetArrowColor: e => e.data().style.edgeColor
        });
      }
      cy.nodes().style({ opacity: 1.0 });

      // Restore node size
      const counts = cy.nodes().map(d => d.data().count);
      const maxCount = Math.max(...counts);
      const minCount = Math.min(...counts);
      const sizeFn = createLinearScale([minCount, maxCount], [30, 80]); // Make the size range between 30 to 80
      cy.nodes().forEach(node => {
        const size = sizeFn(node.data().count);
        node.data().style.width = size;
        node.data().style.height = size;
      });
      cy.style().selector('node').update();
      nodesSelected = cy.collection();
      edgesSelected = cy.collection();
      this.focusedNodes = [];

      this.clearSelections();
    };

    // Click edge - Additive selection as a first pass
    this.graphRenderer.setCallback('edgeClick', (element) => {
      cy.selectionType('additive');
      const edge = element.target;

      // Handle neighborhood highlights
      if (!edge.selected()) {
        edgesSelected = edgesSelected.union(edge);
        edgeNeighborhoodHighlights();
      } else {
        edgesSelected = edgesSelected.filter(e => e.id() !== edge.id());
        if (edgesSelected.length >= 1) {
          edgeNeighborhoodHighlights();
        } else {
          // Deselect all edges
          clearHighlights();
        }
      }

      if (edgesSelected.length > 1) {
        const selectedRelationships = edgesSelected.toArray().map(d => d.data());
        this.setSelectedRelationships(selectedRelationships);
      } else if (edgesSelected.length === 1) {
        this.setSelectedEdge({ source: edgesSelected.data().source, target: edgesSelected.data().target });
      }
      const selectedEdges = edgesSelected.toArray().map(d => d.data());
      this.setSelectedSubgraphEdges(selectedEdges);
    });

    // Background, clear edges
    this.graphRenderer.setCallback('backgroundClick', clearHighlights);
    this.refresh();
  },
  methods: {
    ...mapActions({
      setSearchClause: 'query/setSearchClause',
      removeSearchTerm: 'query/removeSearchTerm',
      setSelectedNode: 'graph/setSelectedNode',
      setSelectedEdge: 'graph/setSelectedEdge',
      setSelectedRelationships: 'graph/setSelectedRelationships',
      setLayout: 'query/setLayout',
      setFilteredEdgesCount: 'graph/setFilteredEdgesCount',
      setFilteredNodesCount: 'graph/setFilteredNodesCount',
      setSelectedSubgraphEdges: 'graph/setSelectedSubgraphEdges'
    }),
    refresh() {
      if (_.isEmpty(this.graphData)) return;

      this.clearSelections();

      this.exceedNodesThreshold = false;
      if (this.graphData.nodes.length > NODE_THRESHOLD) {
        this.exceedNodesThreshold = true;
        return;
      }

      // Don't process edges if there are too many of them
      this.showEdges = this.graphData.edges.length <= EDGE_THRESHOLD;

      const optimizedData = {
        nodes: this.graphData.nodes,
        edges: this.showEdges ? this.graphData.edges : []
      };

      this.setFilteredNodesCount(optimizedData.nodes.length);
      this.setFilteredEdgesCount(this.graphData.edges.length);

      const layout = this.layout;
      if (layout.layoutOption === 'cola') {
        this.graphRenderer.setStrategy(colaLayout(layout.direction));
        this.currentLayout = 'cola';
      } else {
        this.graphRenderer.setStrategy(coseBilkentLayout());
        this.currentLayout = 'cose-bilkent';
      }

      this.graphRenderer.setData(optimizedData);
      this.graphRenderer.render(() => {
      // Apply effects toggles
        this.applyToggles(layout);
      });
      this.focusedNodes = [];
    },
    applyToggles(layout) {
      this.graphRenderer.setLabelVisibility(layout.showLabels);
      this.graphRenderer.setEdgeVisibility(layout.showEdges);
      this.graphRenderer.setEdgeOpacity(layout.edgeOpacity);
    },
    onNodeDepth(v) {
      const graphRenderer = this.graphRenderer;
      graphRenderer.removeAll();
      graphRenderer.setDepth(v);
      graphRenderer.render(() => {
        // Apply effects toggles
        this.applyToggles(this.layout);
        this.minNodeDepth = v;
      });
    },
    onAddToSearch() {
      const ids = this.focusedNodes.map(n => n.id);
      this.setSearchClause({ field: 'topic', operand: 'or', isNot: false, values: ids });
    },
    onRemoveFromSearch() {
      const ids = this.focusedNodes.map(n => n.id);
      ids.forEach(id => {
        this.removeSearchTerm({ field: 'topic', operand: 'or', isNot: false, term: id });
      });
    },
    onFit() {
      const cy = this.graphRenderer.cy;
      cy.fit();
    },
    clearSelections() {
      this.$emit('clear-selection');
      this.setSelectedNode({ node: null });
      this.setSelectedEdge({ source: null, target: null });
      this.setSelectedRelationships([]);
    }
  }
};
</script>

<style lang="scss" scoped>
@import "~styles/variables";

.full {
  height: 100%;
  width: 100%;
  z-index: 10;

  :deep(canvas) {
    width: 100%;
  }
}
.layout-message {
  position:absolute;
  left: 10px;
  pointer-events: none;
}

.legend {
  position: absolute;
  bottom: 0;
  left: -$navbar-outer-height;
}
</style>
