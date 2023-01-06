<template>
  <div id="graph-action-bar" class="action-bar">
    <div class="graph-setting graph-setting-border-right layouts">
      <select v-tooltip="nodeButtonTitles.layout" @change="setLayoutAlgorithm">
        <option disabled value="">Please select one layout</option>
        <option
          v-for="item in selectableLayouts"
          :key="item"
          :value="item"
          :selected="layout.layoutOption === item"
        >
          {{ LAYOUT_LABELS[item] }}
        </option>
      </select>
      <select v-if="layout.layoutOption === LAYOUTS.COLA" @change="setLayoutDirection">
        <option
          v-for="item in COLA_FLOWS"
          :key="item.id"
          :value="item.value"
          :selected="layout.direction === item.value"
        >
          {{ item.name }}
        </option>
      </select>
      <button class="btn btn-sm btn-primary" @click="setFit">
        <i class="fa fa-fw fa-arrows" />
        Fit
      </button>
    </div>
    <div class="graph-setting graph-setting-border-right">
      <toggle-button
        v-if="showEdges"
        v-tooltip="nodeButtonTitles.edges"
        :value="layout.showEdges"
        :label="'Edges'"
        @change="setShowEdges"
      />
      <toggle-button
        v-tooltip="nodeButtonTitles.labels"
        :value="layout.showLabels"
        :label="'Labels'"
        @change="setShowLabels"
      />
      <div v-if="showEdges" class="slider">
        <span for="edges-opacity">Edge Opacity</span>
        <input
          type="range"
          name="edges-opacity"
          min="0"
          max="1"
          step="0.01"
          :value="layout.edgeOpacity"
          @change="setEdgeOpacity"
        />
      </div>
    </div>
    <div class="graph-setting">
      <!--
      <button
        v-tooltip="nodeButtonTitles.expandSelection"
        type="button"
        class="btn btn-primary btn-sm"
        :class="[showExpandControls === false ? 'disabled' : '']"
        @click="expandSelection()"
      ><i class="fa fa-expand" /></button>
      <button
        v-tooltip="nodeButtonTitles.collapseSelection"
        type="button"
        class="btn btn-primary btn-sm"
        :class="[showCollapseControls === false ? 'disabled' : '']"
        @click="collapseSelection()"
      ><i class="fa fa-compress" /></button>
      <button
        v-tooltip.top="nodeButtonTitles.expand"
        type="button"
        class="btn btn-primary btn-sm"
        :class="[showAllExpandControls === false ? 'disabled' : '']"
        @click="expandAll()"
      ><i class="fa fa-expand" /><i class="fa fa-connectdevelop" /></button>
      -->
      <div v-if="showNodeDepth" class="slider">
        <span>Node Depth</span>
        <input
          class="node-depth-slider"
          type="range"
          min="1"
          :max="maxNodeDepth"
          step="1"
          :value="minimumNodeDepth"
          @change="setNodeDepth"
        />
      </div>
      <div v-if="showSearchControls" class="graph-setting search-buttons">
        <button
          v-tooltip="nodeButtonTitles.search"
          type="button"
          class="btn btn-primary btn-sm"
          @click="addToSearch()"
        >
          <i class="fa fa-plus-circle" /><i class="fa fa-search" />
        </button>
        <button
          v-tooltip="nodeButtonTitles.exclude"
          type="button"
          class="btn btn-primary btn-sm"
          @click="removeFromSearch()"
        >
          <i class="fa fa-minus-circle" /><i class="fa fa-search" />
        </button>
      </div>
    </div>
  </div>
</template>

<script>
import { mapGetters, mapActions } from 'vuex';
import ToggleButton from '@/components/widgets/toggle-button';
import { LAYOUTS, LAYOUT_LABELS, COLA_FLOWS } from '@/graphs/cytoscape/cytoscape-layouts';

export default {
  name: 'Controls',
  components: {
    ToggleButton,
  },
  props: {
    nodesCount: {
      type: Number,
      default: 0,
    },
    maxNodeDepth: {
      type: Number,
      default: 0,
    },
    minimumNodeDepth: {
      type: Number,
      default: 1,
    },
    showSearchControls: {
      type: Boolean,
      default: false,
    },
    showAllExpandControls: {
      type: Boolean,
      default: false,
    },
    showCollapseControls: {
      type: Boolean,
      default: false,
    },
    showExpandControls: {
      type: Boolean,
      default: false,
    },
    showNodeDepth: {
      type: Boolean,
      default: true,
    },
    showEdges: {
      type: Boolean,
      default: true,
    },
  },
  emits: ['fit', 'setNodeDepth', 'addToSearch', 'removeFromSearch'],
  data: () => ({
    hops: 1,
    nodeButtonTitles: {
      collapseSelection: 'Collapse Selected Node',
      expand: 'Expand All Nodes',
      expandSelection: 'Expand Selected Node',
      labels: 'Show/hide Node Labels',
      layout: 'Layout Options',
      edges: 'Show/hide Edges',
      search: 'Add to Search',
      exclude: 'Exclude from Search',
    },
    LAYOUTS: LAYOUTS,
    LAYOUT_LABELS: LAYOUT_LABELS,
    COLA_FLOWS: COLA_FLOWS,
  }),

  computed: {
    ...mapGetters({
      layout: 'query/layout',
    }),
    selectableLayouts: () => {
      const selectableLayouts = Object.assign({}, LAYOUTS);
      delete selectableLayouts.SPREAD;
      delete selectableLayouts.COSE;
      return selectableLayouts;
    },
  },
  methods: {
    ...mapActions({
      setLayout: 'query/setLayout',
    }),
    setFit() {
      this.$emit('fit');
    },
    expandAll: function () {
      this.$emit('expandAll');
    },
    setLayoutAlgorithm(e) {
      const alg = e.target.value;
      this.setLayout(Object.assign({}, this.layout, { layoutOption: alg }));
    },
    setLayoutDirection(e) {
      this.setLayout(Object.assign({}, this.layout, { direction: e.target.value }));
    },
    setEdgeOpacity(e) {
      this.setLayout(Object.assign({}, this.layout, { edgeOpacity: e.target.value }));
    },
    setShowEdges(e) {
      this.setLayout(Object.assign({}, this.layout, { showEdges: e }));
    },
    setShowLabels(e) {
      this.setLayout(Object.assign({}, this.layout, { showLabels: e }));
    },
    setNodeDepth(e) {
      this.$emit('setNodeDepth', +e.target.value);
    },
    expandSelection() {
      this.$emit('expandSelection');
    },
    collapseSelection() {
      this.$emit('collapseSelection');
    },
    addToSearch() {
      this.$emit('addToSearch');
    },
    removeFromSearch() {
      this.$emit('removeFromSearch');
    },
  },
};
</script>

<style lang="scss">
#graph-action-bar {
  display: flex;
  .graph-setting-border-right {
    border-right: 1px solid #ccc;
  }
  .graph-setting {
    display: flex;
    align-items: center;
    flex-direction: row;
    box-sizing: border-box;
    padding: 3px 6px;
    overflow: visible;
    span {
      font-size: 11px;
    }
    &.disabled {
      pointer-events: none;
      color: #888;
    }
    .btn-primary {
      display: inline-block;
      margin: 0.2rem;
    }
    .slider {
      align-self: flex-start;
    }
    .slider > * {
      display: block;
      width: 100px;
      height: 100%;
      margin: 0rem 1rem;
      text-align: center;
    }
    .slider span {
      padding: 5px;
    }
  }
}

.node-depth-slider {
  direction: rtl;
}
</style>
