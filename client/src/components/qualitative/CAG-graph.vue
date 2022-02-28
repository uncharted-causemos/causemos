<template>
  <div class="CAG-graph-container">
    <div
      ref="container"
      class="CAG-graph"
    />
    <graph-search
      :nodes="data.nodes"
      @search="search"
    />
    <new-node-concept-select
      v-if="showNewNode"
      ref="newNode"
      :concepts-in-cag="conceptsInCag"
      :placement="{ x: newNodeX, y: newNodeY }"
      :selected-time-scale="selectedTimeScale"
      @suggestion-selected="onSuggestionSelected"
      @datacube-selected="onDatacubeSelected"
      @show-custom-concept="showCustomConcept = true"
    />
    <modal-custom-concept
      v-if="showCustomConcept"
      ref="customGrounding"
      @close="showCustomConcept = false"
      @save-custom-concept="saveCustomConcept"
    />
  </div>

</template>

<script lang="ts">
import _ from 'lodash';
import * as d3 from 'd3';
import Mousetrap from 'mousetrap';
import { defineComponent, computed, ref, Ref, PropType } from 'vue';
import { useStore } from 'vuex';
import useOntologyFormatter from '@/services/composables/useOntologyFormatter';
import NewNodeConceptSelect from '@/components/qualitative/new-node-concept-select.vue';
import ModalCustomConcept from '@/components/modals/modal-custom-concept.vue';
import GraphSearch from '@/components/widgets/graph-search.vue';

import { QualitativeRenderer } from '@/graphs/qualitative-renderer';
import { buildInitialGraph, runELKLayout } from '@/graphs/cag-adapter';
import { overlap } from '@/utils/dom-util';
import svgUtil from '@/utils/svg-util';

import { IGraph, INode, moveToLabel } from 'svg-flowgraph';
import { NodeParameter, EdgeParameter, CAGGraph } from '@/types/CAG';
import projectService from '@/services/project-service';
import { calcEdgeColor } from '@/utils/scales-util';
import { calculateNeighborhood } from '@/utils/graphs-util';
import { DEFAULT_STYLE } from '@/graphs/cag-style';
import { TimeScale } from '@/types/Enums';
import {
  calculateNewNodesAndEdges,
  EdgeSuggestion,
  extractEdgesFromStatements,
  getEdgesFromConcepts,
  sortSuggestionsByEvidenceCount
} from '@/utils/relationship-suggestion-util';
import { SELECTED_COLOR } from '@/utils/colors-util';

type D3SelectionINode<T> = d3.Selection<d3.BaseType, INode<T>, null, any>;

const mergeNodeColor = SELECTED_COLOR;

export default defineComponent({
  name: 'CAGGraph',
  components: {
    NewNodeConceptSelect,
    GraphSearch,
    ModalCustomConcept
  },
  props: {
    data: {
      type: Object as PropType<CAGGraph>,
      default: () => ({ })
    },
    showNewNode: {
      type: Boolean,
      default: false
    },
    selectedTimeScale: {
      type: String as PropType<TimeScale>,
      required: true
    },
    visualState: {
      // selected.nodes
      // selected.edges
      type: Object,
      default: () => ({})
    }
  },
  emits: [
    'edge-click', 'node-click', 'background-click', 'background-dbl-click',

    // Custom
    'refresh', 'new-edge', 'delete', 'rename-node', 'merge-nodes',
    'suggestion-selected', 'suggestion-duplicated', 'datacube-selected',
    'add-to-CAG'
  ],
  setup(props) {
    const store = useStore();
    const renderer = ref(null) as Ref<QualitativeRenderer | null>;
    const selectedNode = ref('');

    const svgX = ref(0);
    const svgY = ref(0);
    const newNodeX = ref(0);
    const newNodeY = ref(0);

    const showCustomConcept = ref(false);
    const mouseTrap = new Mousetrap(document as any);
    const project = computed(() => store.getters['app/project']);

    const conceptsInCag = computed(() => {
      return props.data.nodes.map(node => node.concept);
    });

    // The node for which we're fetching/storing suggestions, as well as a
    //  Cached copy of all of the statements related to the node, converted to
    //  `EdgeSuggestion`s.
    // Has a value of `null` when statements haven't been fetched yet.
    const allEdgeSuggestions = ref<{
      node: INode<NodeParameter> | null;
      isShowingDriverEdges: boolean;
      suggestions: EdgeSuggestion[] | null;
    }>({ node: null, isShowingDriverEdges: false, suggestions: null });
    const searchQuery = ref('');
    // The `EdgeSuggestion`s for the current search query.
    // Has a value of `null` when search text is empty or results haven't been
    //  fetched yet.
    const searchSuggestions = ref<EdgeSuggestion[] | null>(null);
    // The `EdgeSuggestion`s that have been selected to add to the CAG.
    //  We have to store the whole suggestion instead of just an ID since
    //  selected `searchSuggestions` won't appear in `allEdgeSuggestions` and
    //  vice versa.
    const selectedEdgeSuggestions = ref<EdgeSuggestion[]>([]);

    return {
      renderer,
      mouseTrap,

      showCustomConcept,

      // Tracking new node
      svgX,
      svgY,
      newNodeX,
      newNodeY,

      // Tracking edge suggestions
      allEdgeSuggestions,
      searchQuery,
      searchSuggestions,
      selectedEdgeSuggestions,

      ontologyFormatter: useOntologyFormatter(),

      project,
      selectedNode,
      conceptsInCag
    };
  },
  watch: {
    data() {
      this.refresh();
    },
    visualState() {
      this.applyVisualState();
    }
  },
  mounted() {
    const containerEl = this.$refs.container;
    this.renderer = new QualitativeRenderer({
      el: containerEl,
      useAStarRouting: true,
      useStableLayout: true,
      useStableZoomPan: true,
      runLayout: (graphData: IGraph<NodeParameter, EdgeParameter>) => {
        return runELKLayout(graphData, { width: 130, height: 30 });
      }
    });
    this.renderer.setLabelFormatter(this.ontologyFormatter);
    this.mouseTrap.bind(['backspace', 'del'], () => {
      this.$emit('delete');
    });

    const rendererRef = this.renderer;

    // Temporary tracker
    let mergeTargetNode: D3SelectionINode<NodeParameter> | null = null;

    // Native messages
    this.renderer.on('node-click', (_evtName, _event: PointerEvent, nodeSelection, renderer: QualitativeRenderer) => {
      this.exitSuggestionMode();
      renderer.selectNode(nodeSelection, '');
      nodeSelection.select('.node-container').classed('node-selected', true);

      const neighborhood = calculateNeighborhood(this.data as any, nodeSelection.datum().data.concept);
      renderer.resetAnnotations();
      renderer.neighborhoodAnnotation(neighborhood);
      // console.log(neighborhood);

      this.selectedNode = nodeSelection.datum().data.concept;
      this.$emit('node-click', nodeSelection.datum().data);
    });
    this.renderer.on('edge-click', (_evtName, _event: PointerEvent, edgeSelection, renderer: QualitativeRenderer) => {
      this.exitSuggestionMode();
      const source = edgeSelection.datum().data.source;
      const target = edgeSelection.datum().data.target;
      const neighborhood = { nodes: [{ concept: source }, { concept: target }], edges: [{ source, target }] };
      renderer.neighborhoodAnnotation(neighborhood);
      // renderer.selectEdge(event, edgeSelection);

      this.$emit('edge-click', edgeSelection.datum().data);
    });

    this.renderer.on('background-click', () => {
      rendererRef.resetAnnotations();
      this.exitSuggestionMode();
      this.$emit('background-click');
    });

    this.renderer.on('background-dbl-click', (_evtName, event: PointerEvent, _svgSelection, _renderer: QualitativeRenderer, coord: { x: number; y: number }) => {
      this.newNodeX = event.offsetX;
      this.newNodeY = event.offsetY;
      this.svgX = coord.x;
      this.svgY = coord.y;
      this.$emit('background-dbl-click');
    });

    this.renderer.on('node-drag-move', (_evtName, _event, nodeSelection: D3SelectionINode<NodeParameter>, renderer: QualitativeRenderer) => {
      const nodeUI = nodeSelection.select('.node-ui');
      const rect = nodeUI.select('.node-container');
      const nodeUIRect = rect.node();
      mergeTargetNode = null;

      const others = renderer.chart.selectAll('.node-ui')
        .filter((d: any) => {
          return !d.nodes || d.nodes.length === 0;
        })
        .filter((d: any) => d.id !== nodeUI.datum().id);

      others.selectAll('rect')
        .style('stroke', DEFAULT_STYLE.nodeHeader.stroke)
        .style('stroke-width', DEFAULT_STYLE.nodeHeader.strokeWidth);

      nodeUI.selectAll('rect')
        .style('stroke', DEFAULT_STYLE.nodeHeader.stroke)
        .style('stroke-width', DEFAULT_STYLE.nodeHeader.strokeWidth);


      others.each(function () {
        const otherNodeUI = d3.select(this);
        const otherRect = otherNodeUI.select('.node-container');
        const otherNodeUIRect = otherRect.node();

        if (overlap(otherNodeUIRect as HTMLElement, nodeUIRect as HTMLElement, 0.5)) {
          mergeTargetNode = otherNodeUI as D3SelectionINode<NodeParameter>;
          otherRect
            .style('stroke', mergeNodeColor)
            .style('stroke-width', 6);
          rect
            .style('stroke', mergeNodeColor)
            .style('stroke-width', 6);
        }
      });
    });

    this.renderer.on('node-drag-end', (_evtName, _event, nodeSelection: D3SelectionINode<NodeParameter>) => {
      if (mergeTargetNode !== null) {
        this.$emit('merge-nodes', nodeSelection.datum().data, mergeTargetNode.datum().data);
        mergeTargetNode = null;
      }
    });

    // Custom messages
    this.renderer.on('new-edge', (_evtName, payload: any) => {
      this.$emit('new-edge', payload);
    });

    this.renderer.on('delete-node', (_evtName, payload: any) => {
      this.$emit('delete', payload);
    });

    this.renderer.on('rename-node', (_evtName, payload: any) => {
      this.$emit('rename-node', payload);
    });

    this.renderer.on('node-handle-drag-start', async (_evtName, sourceNode: NodeParameter) => {
      const edges = this.data.edges as EdgeParameter[];
      const nodes = this.data.nodes as NodeParameter[];

      // 1. Find out the extra edges we can add
      const nodesToCheck = nodes
        .filter(node => node.components)
        .filter(node => {
          return !_.some(edges, edge => edge.source === sourceNode.concept && edge.target === node.concept);
        });
      const componentsInGraph = _.uniq(_.flatten(nodesToCheck.map(node => node.components)));

      const filters = {
        clauses: [
          { field: 'subjConcept', values: sourceNode.components, isNot: false, operand: 'or' },
          { field: 'objConcept', values: componentsInGraph, isNot: false, operand: 'or' }]
      };
      const projectGraph = await projectService.getProjectGraph(this.project, filters as any);

      // 2. Render potential node with markers
      const foregroundLayer = this.renderer?.chart;
      if (!foregroundLayer) return;
      const resultEdges = projectGraph.edges;
      resultEdges.forEach((edge: any) => {
        const nodes = nodesToCheck.filter(n => n.components.includes(edge.target));
        nodes.forEach(nodeData => {
          const targetNode = this.renderer?.graph.nodes.find(n => n.id === nodeData.id);
          if (!targetNode) return;
          const pointerX = targetNode.x;
          const pointerY = targetNode.y + (targetNode.height * 0.5);
          foregroundLayer
            .append('svg:path')
            .attr('d', svgUtil.ARROW)
            .classed('edge-possibility-indicator', true)
            .attr('transform', `translate(${pointerX}, ${pointerY}) scale(2.5)`)
            .attr('fill', calcEdgeColor(edge))
            .attr('opacity', 0)
            .style('pointer-events', 'none')
            .transition()
            .duration(300)
            .attr('opacity', 1);
        });
      });
    });

    this.renderer.on(
      'fetch-suggested-edges',
      async (eventName: any, node: INode<NodeParameter>, isShowingDriverEdges: boolean) => {
        // Clear up any previous suggestion state. Skipping this step means
        //  that if the suggestion search box already exists it won't be
        //  rerendered next to the newly-selected node.
        this.exitSuggestionMode();
        this.allEdgeSuggestions = { node, isShowingDriverEdges, suggestions: null };
        this.selectedEdgeSuggestions = [];
        // Load all statements that include any of the components in the
        //  selected node-container.
        this.renderer?.setSuggestionData([], [], node, isShowingDriverEdges, true);
        const statements = await projectService.getProjectStatementsForConcepts(
          node.data.components,
          this.project
        );
        const suggestions = sortSuggestionsByEvidenceCount(
          extractEdgesFromStatements(statements, node.data, this.data, isShowingDriverEdges)
        );
        // If suggestion mode is still active for `node` and the analyst hasn't
        //  clicked the other handle, store suggestions
        if (
          this.allEdgeSuggestions.node === node &&
          this.allEdgeSuggestions.isShowingDriverEdges === isShowingDriverEdges
        ) {
          this.allEdgeSuggestions = { node, isShowingDriverEdges, suggestions };
          if (this.searchQuery.length === 0) {
            // Pass them to the renderer to generate SVG elements for each one
            this.renderer?.setSuggestionData(
              suggestions,
              [],
              node,
              isShowingDriverEdges,
              false
            );
          }
        }
      }
    );

    this.renderer.on(
      'toggle-suggestion-selected',
      (eventName: any, suggestion: EdgeSuggestion) => {
        const withoutSuggestion = this.selectedEdgeSuggestions.filter(
          selectedSuggestion => selectedSuggestion !== suggestion
        );
        if (withoutSuggestion.length === this.selectedEdgeSuggestions.length) {
          // Not previously selected, so add it
          this.selectedEdgeSuggestions = [...withoutSuggestion, suggestion];
        } else {
          // Was already selected, so remove it from selected suggestions
          this.selectedEdgeSuggestions = withoutSuggestion;
        }
        // Edge case: if user searches results and selects one before
        //  `allEdgeSuggestions` is populated, UI won't update. I think this is
        //  safe to ignore.
        if (
          this.allEdgeSuggestions.node === null ||
          this.allEdgeSuggestions.suggestions === null
        ) return;
        // If searchSuggestions !== null, we're displaying search results
        const suggestionsToDisplay = this.searchSuggestions !== null
          ? this.searchSuggestions
          : this.allEdgeSuggestions.suggestions;
        this.renderer?.setSuggestionData(
          suggestionsToDisplay,
          this.selectedEdgeSuggestions,
          this.allEdgeSuggestions.node,
          this.allEdgeSuggestions.isShowingDriverEdges,
          false // Possible race condition if toggle occurs during load
        );
      }
    );

    this.renderer.on(
      'search-for-concepts',
      async (eventName: any, userInput: string) => {
        if (this.allEdgeSuggestions.node === null) return;
        // Store latest userInput for later use detecting out-of-order results
        this.searchQuery = userInput;
        const suggestionNode = this.allEdgeSuggestions.node;
        if (_.isEmpty(userInput)) {
          // Cleared search bar
          this.searchSuggestions = null;
          if (this.allEdgeSuggestions.suggestions === null) {
            // Top suggestions are still loading
            this.renderer?.setSuggestionData(
              [],
              this.selectedEdgeSuggestions,
              this.allEdgeSuggestions.node,
              this.allEdgeSuggestions.isShowingDriverEdges,
              true
            );
            return;
          }
          // Show top suggestions from `allEdgeSuggestions`
          this.renderer?.setSuggestionData(
            this.allEdgeSuggestions.suggestions,
            this.selectedEdgeSuggestions,
            this.allEdgeSuggestions.node,
            this.allEdgeSuggestions.isShowingDriverEdges,
            false
          );
        } else {
          // Show loading indicator
          this.renderer?.setSuggestionData(
            [],
            this.selectedEdgeSuggestions,
            this.allEdgeSuggestions.node,
            this.allEdgeSuggestions.isShowingDriverEdges,
            true
          );
          // Fetch concepts based on user input
          this.fetchSearchSuggestions(userInput, suggestionNode, this);
        }
      }
    );

    this.renderer.on('add-selected-suggestions', () => {
      const simplifiedSuggestions = this.selectedEdgeSuggestions.map(
        ({ source, target, statements }) => ({
          source,
          target,
          reference_ids: statements.map(statement => statement.id)
        })
      );
      const newSubgraph = calculateNewNodesAndEdges(
        simplifiedSuggestions,
        this.data,
        this.ontologyFormatter
      );
      this.exitSuggestionMode();
      this.$emit('add-to-CAG', newSubgraph);
    });

    this.refresh();
  },
  beforeUnmount() {
    this.mouseTrap.reset();
  },
  methods: {
    async refresh() {
      const d = buildInitialGraph(this.data as any);
      if (this.renderer) {
        this.renderer.isGraphDirty = true;
        await this.renderer.setData(d);
        await this.renderer.render();
        this.$emit('refresh', null);
        this.applyVisualState();
      }
    },
    applyVisualState() {
      const renderer = this.renderer;
      if (renderer) {
        // apply changes
        const visualState = this.visualState;
        if (visualState.selected) {
          if (visualState.selected.nodes) {
            visualState.selected.nodes.forEach((node: any) => {
              renderer.selectNodeByConcept(node.concept, '');
            });
          }
          if (visualState.selected.edges) {
            visualState.selected.edges.forEach((edge: any) => {
              const source = edge.source;
              const target = edge.target;
              const neighborhood = { nodes: [{ concept: source }, { concept: target }], edges: [{ source, target }] };
              renderer.neighborhoodAnnotation(neighborhood);
            });
          }
        }
      }
    },
    fetchSearchSuggestions: _.debounce(async (
      userInput: string,
      suggestionNode: INode<NodeParameter>,
      cagGraphThis: any
    ) => {
      const conceptSuggestions = await projectService.getConceptSuggestions(
        cagGraphThis.project,
        userInput
      );
      // Stop if we haven't fetched all edge suggestions yet
      //  or we're no longer looking at suggestions for suggestionNode
      //  or if the query has changed
      // FIXME: Edge case here where search results return before all edge
      //  suggestions, we currently keep showing loading indicator until user
      //  changes their query.
      if (
        cagGraphThis.allEdgeSuggestions.suggestions === null ||
        cagGraphThis.allEdgeSuggestions.node !== suggestionNode ||
        cagGraphThis.searchQuery !== userInput
      ) {
        return;
      }
      const concepts = conceptSuggestions.map(
        (suggestion: any) => suggestion.doc.key
      );
      // Convert to edge suggestions, assigning each concept to an edge
      //  suggestion that was fetched earlier if possible
      cagGraphThis.searchSuggestions = getEdgesFromConcepts(
        concepts,
        cagGraphThis.allEdgeSuggestions.suggestions,
        cagGraphThis.allEdgeSuggestions.node.data.concept,
        cagGraphThis.allEdgeSuggestions.isShowingDriverEdges
      );
      // Update the suggestions that are being rendered
      cagGraphThis.renderer?.setSuggestionData(
        cagGraphThis.searchSuggestions,
        cagGraphThis.selectedEdgeSuggestions,
        cagGraphThis.allEdgeSuggestions.node,
        cagGraphThis.allEdgeSuggestions.isShowingDriverEdges,
        false
      );
    }, 300),
    onSuggestionSelected(suggestion: any) {
      if (this.data.nodes.filter((node: any) => node.concept === suggestion.concept).length > 0) {
        this.$emit('suggestion-duplicated', suggestion);
        return;
      }
      this.$emit('suggestion-selected', suggestion);
    },
    exitSuggestionMode() {
      this.allEdgeSuggestions = { node: null, isShowingDriverEdges: false, suggestions: null };
      this.searchSuggestions = null;
      this.searchQuery = '';
      this.selectedEdgeSuggestions = [];
      this.renderer?.exitSuggestionMode();
    },
    onDatacubeSelected(datacubeParam: any) {
      this.$emit('datacube-selected', datacubeParam);
    },
    saveCustomConcept(value: { theme: string; process: string; theme_property: string; process_property: string }) {
      this.$emit('suggestion-selected', {
        concept: value.theme,
        shortName: value.theme,
        label: value.theme,
        hasEvidence: false
      });
    },
    injectNewNode(node: NodeParameter) {
      // Once in DB, create the new node at svgX/svgY, for the sake of preserving stable layout
      // 1. create node into renderer
      const newNodeDatum: INode<NodeParameter> = {
        id: node.id,
        label: node.concept,
        x: this.svgX,
        y: this.svgY,
        width: 130,
        height: 30,
        nodes: [],
        data: node
      };

      const chart = this.renderer?.chart;
      const nodeSelection = chart?.select('.nodes-layer').append('g')
        .classed('node', true)
        .attr('transform', svgUtil.translate(this.svgX, this.svgY))
        .datum(newNodeDatum);

      // 2. enable interaction on the new node
      if (this.renderer) {
        const nodeUI = nodeSelection?.append('g').classed('node-ui', true);
        this.renderer.renderNodesAdded(nodeUI as any);
        this.renderer.enableEdgeInteraction(nodeUI as any, this.renderer);
      }
    },
    search(concept: string) {
      if (this.renderer) {
        moveToLabel(this.renderer, concept, 2000);
      }
    }
  }
});
</script>

<style lang="scss" scoped>
.CAG-graph-container {
  position: relative;
}

.CAG-graph {
  width: 100%;
  height: 100%;
  overflow: hidden;
}
</style>
