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
      @suggestion-selected="onSuggestionSelected"
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
import * as d3 from 'd3';
import Mousetrap from 'mousetrap';
import { defineComponent, ref, Ref } from 'vue';
import NewNodeConceptSelect from '@/components/qualitative/new-node-concept-select.vue';
import ModalCustomConcept from '@/components/modals/modal-custom-concept.vue';
import GraphSearch from '@/components/widgets/graph-search.vue';

import { QualitativeRenderer } from '@/graphs/qualitative-renderer';
import { buildInitialGraph, runLayout } from '@/graphs/cag-adapter';
import { overlap } from '@/utils/dom-util';
import svgUtil from '@/utils/svg-util';

import { INode } from 'svg-flowgraph2';
import { NodeParameter } from '@/types/CAG';

type D3SelectionINode<T> = d3.Selection<d3.BaseType, INode<T>, null, any>;

// FIXME: repeat in renderer
const DEFAULT_STYLE = {
  edge: {
    fill: 'none',
    strokeWidth: 5,
    controlRadius: 6,
    strokeDash: '3,2'
  },
  edgeBg: {
    fill: 'none',
    stroke: '#F2F2F2'
  },
  nodeHeader: {
    iconRadius: 6,
    fill: '#FFFFFF',
    stroke: '#999',
    strokeWidth: 0.5,
    borderRadius: 4,
    highlighted: {
      stroke: '#60B5E2',
      borderRadius: 4,
      strokeWidth: 2
    }
  },
  nodeHandles: {
    width: 15
  }
};

const mergeNodeColor = 'rgb(136, 255, 136)';

export default defineComponent({
  name: 'CAGGraph',
  components: {
    NewNodeConceptSelect,
    GraphSearch,
    ModalCustomConcept
  },
  props: {
    data: {
      type: Object,
      default: () => ({ })
    },
    showNewNode: {
      type: Boolean,
      default: false
    }
  },
  emits: [
    'edge-click', 'node-click', 'background-click', 'background-dbl-click',

    // Custom
    'new-edge', 'delete', 'rename-node', 'merge-nodes',
    'suggestion-selected', 'suggestion-duplicated'
  ],
  setup() {
    const renderer = ref(null) as Ref<QualitativeRenderer | null>;
    const selectedNode = ref('');

    const svgX = ref(0);
    const svgY = ref(0);
    const newNodeX = ref(0);
    const newNodeY = ref(0);

    const showCustomConcept = ref(false);
    const mouseTrap = new Mousetrap(document as any);

    return {
      renderer,
      mouseTrap,

      showCustomConcept,

      // Tracking new node
      svgX,
      svgY,
      newNodeX,
      newNodeY,

      selectedNode
    };
  },
  watch: {
    data() {
      this.refresh();
    }
  },
  mounted() {
    const containerEl = this.$refs.container;
    this.renderer = new QualitativeRenderer({
      el: containerEl,
      useAStarRouting: true,
      useStableLayout: true,
      useStableZoomPan: true,
      runLayout: runLayout
    });
    this.mouseTrap.bind(['backspace', 'del'], () => {
      this.$emit('delete');
    });


    // Temporary tracker
    let mergeTargetNode: D3SelectionINode<NodeParameter> | null = null;

    // Native messages
    this.renderer.on('node-click', (_evtName, _event: PointerEvent, nodeSelection, renderer: QualitativeRenderer) => {
      renderer.selectNode(nodeSelection);

      nodeSelection.select('.node-header').classed('node-selected', true);
      this.selectedNode = nodeSelection.datum().data.concept;
      this.$emit('node-click', nodeSelection.datum().data);
    });
    this.renderer.on('edge-click', (_evtName, event: PointerEvent, edgeSelection, renderer: QualitativeRenderer) => {
      renderer.selectEdge(event, edgeSelection);

      this.$emit('edge-click', edgeSelection.datum().data);
    });

    this.renderer.on('background-click', () => {
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
      const rect = nodeUI.select('rect');
      const nodeUIRect = rect.node();

      const others = renderer.chart.selectAll('.node-ui')
        .filter((d: any) => {
          return !d.nodes || d.nodes.length === 0;
        })
        .filter((d: any) => d.id !== nodeUI.datum().id);

      others.selectAll('rect')
        .style('stroke', DEFAULT_STYLE.nodeHeader.stroke)
        .style('stroke-width', DEFAULT_STYLE.nodeHeader.strokeWidth);

      others.each(function () {
        const otherNodeUI = d3.select(this);
        const otherRect = otherNodeUI.select('rect');
        const otherNodeUIRect = otherRect.node();

        if (overlap(otherNodeUIRect as HTMLElement, nodeUIRect as HTMLElement, 0.5)) {
          mergeTargetNode = otherNodeUI as D3SelectionINode<NodeParameter>;
          otherRect
            .style('stroke', mergeNodeColor)
            .style('stroke-width', 12);
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
      }
    },
    deselectNodeAndEdge() {
      // FIXME: todo
    },
    onSuggestionSelected(suggestion: any) {
      if (this.data.nodes.filter((node: any) => node.concept === suggestion.concept).length > 0) {
        this.$emit('suggestion-duplicated', suggestion);
        return;
      }

      // HACK This is leveraing the svg-flowgraph internals.
      //
      // We inject the node-blueprint into the DOM with createNewNode, then when the
      // graph itself re-renders it will detect the node-blueprint, rebinds the data and
      // thus retaining the original layout.
      // this.renderer?.createNewNode(this.svgX, this.svgY, {
      //   concept: suggestion.concept,
      //   label: suggestion.label
      // });

      this.$emit('suggestion-selected', suggestion);
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
