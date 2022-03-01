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

import _ from 'lodash';
import { defineComponent, ref, Ref, PropType, computed } from 'vue';
import { useStore } from 'vuex';
import useOntologyFormatter from '@/services/composables/useOntologyFormatter';
import { D3SelectionINode, D3SelectionIEdge } from '@/graphs/abstract-cag-renderer';
import { QuantitativeRenderer } from '@/graphs/quantitative-renderer';
import { buildInitialGraph, runELKLayout } from '@/graphs/cag-adapter';
import GraphSearch from '@/components/widgets/graph-search.vue';
import { IGraph, moveToLabel } from 'svg-flowgraph';
import { calculateNeighborhood } from '@/utils/graphs-util';
import { NodeParameter, EdgeParameter, CAGModelSummary, CAGVisualState } from '@/types/CAG';

export default defineComponent({
  name: 'ModelGraph',
  components: {
    GraphSearch
  },
  props: {
    modelSummary: {
      type: Object as PropType<CAGModelSummary>,
      required: true
    },
    data: {
      type: Object,
      default: () => ({})
    },
    scenarioData: {
      type: Object,
      required: true
    },
    visualState: {
      type: Object as PropType<CAGVisualState>,
      default: () => ({
        outline: { nodes: [], edges: [] },
        focus: { nodes: [], edges: [] }
      })
    }
  },
  emits: [
    'node-body-click', 'node-header-click', 'edge-click', 'background-click', 'node-sensitivity', 'node-drilldown'
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
      ontologyFormatter: useOntologyFormatter(),

      selectedScenarioId,
      scenarioProxy
    };
  },
  watch: {
    data() {
      this.refresh();
    },
    scenarioProxy() {
      // sanity check
      const nodeScenarios = Object.values(this.scenarioData)[0].scenarios;
      if (!_.some(nodeScenarios, d => d.id === this.selectedScenarioId)) return;
      if (this.renderer) {
        this.renderer.renderHistoricalAndProjections(this.selectedScenarioId);
      }
    },
    visualState() {
      this.applyVisualState();
    }
  },
  mounted() {
    const containerEl = this.$refs.container;
    this.renderer = new QuantitativeRenderer({
      el: containerEl,
      useEdgeControl: true,
      edgeControlOffsetType: 'percentage',
      edgeControlOffset: 0.5,
      useAStarRouting: true,
      useStableLayout: true,
      useStableZoomPan: true,
      runLayout: (graphData: IGraph<NodeParameter, EdgeParameter>) => {
        return runELKLayout(graphData, { width: 160, height: 80 });
      }
    });
    this.renderer.setLabelFormatter(this.ontologyFormatter);

    this.renderer.on('node-click', (_evtName, _event: PointerEvent, nodeSelection: D3SelectionINode<NodeParameter>, renderer: QuantitativeRenderer) => {
      const neighborhood = calculateNeighborhood(this.data.graph as any, nodeSelection.datum().data.concept);
      renderer.resetAnnotations();
      renderer.neighborhoodAnnotation(neighborhood);
      renderer.selectNode(nodeSelection, '');
      this.$emit('node-sensitivity', nodeSelection.datum().data);
    });
    this.renderer.on('node-dbl-click', (_evtName, _event: PointerEvent, nodeSelection: D3SelectionINode<NodeParameter>) => {
      this.$emit('node-drilldown', nodeSelection.datum().data);
    });

    this.renderer.on('edge-click', (_evtName, event: PointerEvent, edgeSelection: D3SelectionIEdge<EdgeParameter>, renderer: QuantitativeRenderer) => {
      const source = edgeSelection.datum().data.source;
      const target = edgeSelection.datum().data.target;
      const neighborhood = { nodes: [{ concept: source }, { concept: target }], edges: [{ source, target }] };

      renderer.resetAnnotations();
      renderer.neighborhoodAnnotation(neighborhood);
      renderer.selectEdge(edgeSelection);
      this.$emit('edge-click', edgeSelection.datum().data);
    });

    this.renderer.on('background-click', (_evtName, _event: PointerEvent, _svgSelection, renderer: QuantitativeRenderer) => {
      renderer.resetAnnotations();
      this.$emit('background-click');
    });

    this.refresh();
  },
  methods: {
    async refresh() {
      const d = buildInitialGraph(this.data.graph as any);
      if (this.renderer) {
        this.renderer.isGraphDirty = true;
        await this.renderer.setData(d);
        this.renderer.setEngine(this.modelSummary.parameter.engine);
        this.renderer.setScenarioData(this.scenarioData);
        await this.renderer.render();
        this.renderer.renderHistoricalAndProjections(this.selectedScenarioId);
        this.applyVisualState();
      }
    },
    applyVisualState() {
      const renderer = this.renderer;
      if (renderer) {
        renderer.applyVisualState(this.visualState);
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
@import "~styles/variables";

.model-graph-container {
  width: 100%;
  height: 100%;
  overflow: hidden;
  background-color: rgb(242, 242, 242);
}
</style>
