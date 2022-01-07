<template>
  <graph-search
    :nodes="data.graph.nodes"
    @search="search"
  />
  <div
    ref="container"
    class="model-graph-container"
  />
</template>

<script lang="ts">

import { defineComponent, ref, Ref, computed } from 'vue';
import { useStore } from 'vuex';
import { QuantitativeRenderer, D3SelectionINode } from '@/graphs/quantitative-renderer';
import { buildInitialGraph, runELKLayout } from '@/graphs/cag-adapter';
import GraphSearch from '@/components/widgets/graph-search.vue';
import { IGraph } from 'svg-flowgraph2';
import { NodeParameter, EdgeParameter } from '@/types/CAG';

export default defineComponent({
  name: 'ModelGraph',
  components: {
    GraphSearch
  },
  props: {
    data: {
      type: Object,
      default: () => ({})
    },
    scenarioData: {
      type: Object,
      required: true
    },
    visualState: {
      // selected.nodes
      // selected.edges
      // highlighted.nodes
      // highlighted.edges
      type: Object,
      default: () => ({})
    }
  },
  emits: [
    'node-enter', 'node-leave', 'node-body-click', 'node-header-click', 'edge-click', 'background-click', 'node-sensitivity', 'node-drilldown'
  ],
  setup(props) {
    const store = useStore();
    const renderer = ref(null) as Ref<QuantitativeRenderer | null>;
    const selectedScenarioId = computed(() => store.getters['model/selectedScenarioId']);
    const scenarioProxy = computed(() => {
      return { scenarioData: props.scenarioData, selectedScenarioId: selectedScenarioId.value };
    });

    return {
      renderer,

      selectedScenarioId,
      scenarioProxy
    };
  },
  watch: {
  },
  mounted() {
    const containerEl = this.$refs.container;
    this.renderer = new QuantitativeRenderer({
      el: containerEl,
      useAStarRouting: true,
      useStableLayout: true,
      useStableZoomPan: true,
      runLayout: (graphData: IGraph<NodeParameter, EdgeParameter>) => {
        return runELKLayout(graphData, { width: 120, height: 80 });
      }
    });

    this.renderer.on('node-click', (_evtName, _event: PointerEvent, nodeSelection: D3SelectionINode<NodeParameter>) => {
      this.$emit('node-sensitivity', nodeSelection.datum().data);
    });
    this.renderer.on('node-dbl-click', (_evtName, _event: PointerEvent, nodeSelection: D3SelectionINode<NodeParameter>) => {
      this.$emit('node-drilldown', nodeSelection.datum().data);
    });


    this.refresh();
  },
  methods: {
    async refresh() {
      const d = buildInitialGraph(this.data.graph as any);
      if (this.renderer) {
        this.renderer.isGraphDirty = true;
        await this.renderer.setData(d);
        await this.renderer.render();
      }
    }
  }
});


/*
import _ from 'lodash';

import { mapGetters } from 'vuex';
import GraphSearch from '@/components/widgets/graph-search.vue';
import ModelRenderer from '@/graphs/model-renderer';
import Adapter from '@/graphs/elk/adapter';
import { layered } from '@/graphs/elk/layouts';
// import { calculateNeighborhood } from '@/utils/graphs-util';
import { highlightOptions } from '@/utils/graphs-util';
import { highlight, nodeDrag, panZoom } from 'svg-flowgraph';

export default {
  name: 'ModelGraph',
  components: {
    GraphSearch
  },
  props: {
    data: {
      type: Object,
      default: () => ({})
    },
    scenarioData: {
      type: Object,
      required: true
    },
    visualState: {
      // selected.nodes
      // selected.edges
      // highlighted.nodes
      // highlighted.edges
      type: Object,
      default: () => ({})
    }
  },
  emits: [
    'node-enter', 'node-leave', 'node-body-click', 'node-header-click', 'edge-click', 'background-click', 'node-sensitivity', 'node-drilldown'
  ],
  computed: {
  },
  watch: {
    data() {
      this.renderer.setData(this.data.graph);
      this.refresh();
    },
    scenarioProxy() {
      // sanity check
      const nodeScenarios = Object.values(this.scenarioData)[0].scenarios;
      if (!_.some(nodeScenarios, d => d.id === this.selectedScenarioId)) return;
      this.renderer.renderHistoricalAndProjections(this.selectedScenarioId);
    },
    visualState() {
      this.applyVisualState();
    }
  },
  created() {
    this.renderer = null;
  },
  mounted() {
    this.renderer = new ModelRenderer({
      el: this.$refs.container,
      adapter: new Adapter({ nodeWidth: 120, nodeHeight: 80, layout: layered }),
      renderMode: 'delta',
      useEdgeControl: true,
      useStableZoomPan: true,
      useStableLayout: true,
      addons: [highlight, nodeDrag, panZoom]
    });

    // this.renderer.setCallback('nodeClick', (evt, node) => {
    //   const concept = node.datum().concept;
    //   const neighborhood = calculateNeighborhood(this.data.graph, concept);
    //   this.renderer.hideNeighbourhood();
    //   this.renderer.clearSelections();
    //   this.renderer.showNeighborhood(neighborhood);
    //   this.renderer.selectNode(node);
    // });

    this.renderer.setCallback('nodeMouseEnter', (evt, node, g) => {
      this.$emit('node-enter', node, g);
    });
    this.renderer.setCallback('nodeMouseLeave', (evt, node, g) => {
      this.$emit('node-leave', node, g);
    });
    this.renderer.setCallback('backgroundClick', (evt, e, g) => {
      this.$emit('background-click', e, g);
      this.renderer.clearSelections();
      this.renderer.hideNeighbourhood();
    });
    this.renderer.setCallback('edgeClick', (evt, edge) => {
      this.$emit('edge-click', edge.datum().data);
      const source = edge.datum().data.source;
      const target = edge.datum().data.target;
      const neighborhood = { nodes: [{ concept: source }, { concept: target }], edges: [{ source, target }] };

      this.renderer.hideNeighbourhood();
      this.renderer.clearSelections();
      this.renderer.showNeighborhood(neighborhood);
      this.renderer.selectEdge(evt, edge);
    });
    this.renderer.setCallback('edgeMouseEnter', (evt, edge) => {
      this.renderer.mouseEnterEdge(evt, edge);
    });
    this.renderer.setCallback('edgeMouseLeave', (evt, edge) => {
      this.renderer.mouseLeaveEdge(evt, edge);
    });

    this.refresh();
  },
  methods: {
    search(nodeId) {
      this.renderer.moveTo(nodeId, 1500);
      this.renderer.highlight({
        nodes: [nodeId]
      }, highlightOptions);
    },
    async refresh() {
      if (_.isEmpty(this.data)) return;
      this.renderer.setData(this.data.graph);
      this.renderer.setScenarioData(this.scenarioData);
      await this.renderer.render();

      this.renderer.hideNeighbourhood();
      this.renderer.enableDrag(true);
      this.renderer.enableSubInteractions();
      this.renderer.renderHistoricalAndProjections(this.selectedScenarioId);

      // apply visual state
      this.applyVisualState();
    },
    applyVisualState() {
      // reset
      this.renderer.hideNeighbourhood();
      this.renderer.clearSelections();

      // apply changes
      const visualState = this.visualState;
      if (visualState.selected && visualState.selected.nodes) {
        visualState.selected.nodes.forEach(node => {
          this.renderer.selectNodeById(node.concept);
        });
      }
      if (visualState.highlighted) {
        this.renderer.showNeighborhood(visualState.highlighted);
      }
      if (visualState.annotated) {
        // FIXME: Need to be more flexible
        if (visualState.annotated.nodes) {
          visualState.annotated.nodes.forEach(node => {
            this.renderer.selectNodeById(node.concept, '#8767c8');
          });
        }
      }
    }
  }
};
*/

</script>

<style lang="scss" scoped>
@import "~styles/variables";

.model-graph-container {
  width: 100%;
  height: 100%;
  overflow: hidden;
  background-color: rgb(242, 242, 242);
}
</style>
