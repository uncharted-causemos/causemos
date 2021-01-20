<template>
  <div
    ref="container"
    class="model-graph-container"
  />
</template>

<script>
import _ from 'lodash';

import { mapGetters } from 'vuex';
import ModelRenderer from '@/graphs/elk/model-renderer';
import Adapter from '@/graphs/elk/adapter';
import { layered } from '@/graphs/elk/layouts';
import { calculateNeighborhood } from '@/utils/graphs-util';
import { highlight, nodeDrag, panZoom } from 'svg-flowgraph';

export default {
  name: 'ModelGraph',
  props: {
    data: {
      type: Object,
      default: () => ({})
    },
    scenarioData: {
      type: Object,
      required: true
    }
  },
  computed: {
    ...mapGetters({
      selectedScenarioId: 'model/selectedScenarioId'
    })
  },
  watch: {
    data() {
      this.renderer.setData(this.data.graph);
      this.refresh();
    },
    scenarioData() {
      this.renderer.renderHistoricalAndProjections(this.selectedScenarioId);
    },
    selectedScenarioId() {
      this.renderer.renderHistoricalAndProjections(this.selectedScenarioId);
    }
  },
  created() {
    this.renderer = null;
  },
  mounted() {
    this.renderer = new ModelRenderer({
      el: this.$refs.container,
      adapter: new Adapter({ nodeWidth: 120, nodeHeight: 60, layout: layered }),
      renderMode: 'delta',
      useEdgeControl: true,
      addons: [highlight, nodeDrag, panZoom]
    });

    this.renderer.setCallback('nodeClick', (evt, node) => {
      const concept = node.datum().concept;
      const neighborhood = calculateNeighborhood(this.data.graph, concept);
      this.renderer.hideNeighbourhood();
      this.renderer.clearSelections();
      this.renderer.showNeighborhood(neighborhood);
      this.renderer.selectNode(node);

      if (node.classed('projection-edit-icon')) {
        this.$emit('node-body-click', node.datum().data);
      } else if (node.classed('indicator-edit-icon')) {
        this.$emit('node-header-click', node.datum().data);
      }
    });
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
    async refresh() {
      if (_.isEmpty(this.data)) return;
      this.renderer.setData(this.data.graph);
      /*
      this.renderer.setData({
        nodes: [
          {
            id: 'abc',
            label: 'abc'
          },
          {
            id: 'def',
            label: 'def'
          }
        ],
        edges: [
          { id: 'abc-def', source: 'abc', target: 'def', polarity: 1, parameter: { weight: 0.2  } }
        ]
      });
      */
      this.renderer.setScenarioData(this.scenarioData);
      await this.renderer.render();
      this.renderer.hideNeighbourhood();
      this.renderer.enableDrag();
      this.renderer.enableSubInteractions();
      this.renderer.renderHistoricalAndProjections(this.selectedScenarioId);
    }
  }
};

</script>

<style lang="scss" scoped>
@import "~styles/variables";

.model-graph-container {
  width: 100%;
  height: 100%;
  background-color: #ffffff;
  overflow: hidden;
}
</style>
