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
import { defineComponent, ref, Ref } from 'vue';
import NewNodeConceptSelect from '@/components/qualitative/new-node-concept-select.vue';
import ModalCustomConcept from '@/components/modals/modal-custom-concept.vue';
import GraphSearch from '@/components/widgets/graph-search.vue';

import { QualitativeRenderer } from '@/graphs/qualitative-renderer';
import { buildInitialGraph, runLayout } from '@/graphs/cag-adapter';

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
    'edge-click', 'node-click', 'background-click',
    'new-edge', 'delete', 'rename-node'
  ],
  setup() {
    const renderer = ref(null) as Ref<QualitativeRenderer | null>;
    const selectedNode = ref('');

    const svgX = ref(0);
    const svgY = ref(0);
    const newNodeX = ref(0);
    const newNodeY = ref(0);

    const showCustomConcept = ref(false);

    return {
      renderer,
      showCustomConcept,

      // Tracking new node
      svgX,
      svgY,
      newNodeX,
      newNodeY,

      selectedNode
    };
  },
  mounted() {
    const containerEl = this.$refs.container;
    this.renderer = new QualitativeRenderer({
      el: containerEl,
      useAStarRouting: true,
      runLayout: runLayout
    });

    this.renderer.on('node-click', (evtName, event: PointerEvent, nodeSelection, renderer: QualitativeRenderer) => {
      renderer.selectNode(nodeSelection);

      nodeSelection.select('.node-header').classed('node-selected', true);
      this.selectedNode = nodeSelection.datum().data.concept;
      this.$emit('node-click', nodeSelection.datum().data);
    });
    this.renderer.on('edge-click', (evtName, event: PointerEvent, edgeSelection, renderer: QualitativeRenderer) => {
      renderer.selectEdge(event, edgeSelection);

      this.$emit('edge-click', edgeSelection.datum().data);
    });

    this.renderer.on('background-click', () => {
      this.$emit('background-click');
    });

    this.renderer.on('background-dbl-click', (evtName, event: PointerEvent, svgSelection, renderer: QualitativeRenderer, coord: { x: number; y: number }) => {
      // FIXME:
      this.newNodeX = event.offsetX;
      this.newNodeY = event.offsetY;
      this.svgX = coord.x;
      this.svgY = coord.y;
      this.$emit('background-dbl-click');
    });

    // Custom messages
    this.renderer.on('new-edge', (evtName, payload: any) => {
      this.$emit('new-edge', payload);
    });

    this.renderer.on('delete-node', (evtName, payload: any) => {
      console.log('delete emi', payload);
      this.$emit('delete', payload);
    });

    this.renderer.on('rename-node', (evtName, payload: any) => {
      this.$emit('rename-node', payload);
    });


    this.refresh();
  },
  methods: {
    async refresh() {
      const d = buildInitialGraph(this.data as any);
      if (this.renderer) {
        this.renderer.isGraphDirty = true;
        await this.renderer.setData(d);
        await this.renderer.render();
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
