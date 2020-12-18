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
import { layered } from '@/graphs/elk/elk-strategies';
import { calculateNeighborhood } from '@/utils/graphs-util';

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
      nodeWidth: 120,
      nodeHeight: 60,
      useEdgeControl: true,
      strategy: layered
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
      this.renderer.setData(this.data.graph, []);
      this.renderer.setScenarioData(this.scenarioData);

      await this.renderer.render();
      this.renderer.centerGraphInViewbox();
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
