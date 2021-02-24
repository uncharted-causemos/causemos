<template>
  <full-screen-modal-header
    :title="title"
    @close="onClose"
  >
    <button
      v-tooltip.top-center="addToCagTooltip"
      type="button"
      class="btn btn-primary btn-call-for-action"
      :disabled="!canAddToCAG"
      @click="addToCAG"
    >
      <i class="fa fa-fw fa-plus-circle" />
      Add to CAG
    </button>
    <span>
      <span class="selected">
        {{ selectedSubgraphEdges.length | number-formatter }} selected
      </span>
      of {{ filteredEdgesCount | number-formatter }}
      {{ areEdgesDrawn ? '': '(hidden) ' }} relationships
    </span>
    <bookmark-controls slot="trailing" />
  </full-screen-modal-header>
</template>

<script>
import { mapGetters } from 'vuex';
import { EDGE_THRESHOLD } from '@/components/graph/cyto-graph';
import { SUBGRAPH, ADD_TO_CAG_THRESHOLD } from '@/utils/messages-util';
import fullScreenModalHeader from '../widgets/full-screen-modal-header.vue';
import BookmarkControls from '@/components/bookmark-panel/bookmark-controls';

export default {
  name: 'KbExplorerModalHeader',
  components: {
    fullScreenModalHeader,
    BookmarkControls
  },
  props: {
    title: {
      type: String,
      default: ''
    }
  },
  computed: {
    ...mapGetters({
      selectedSubgraphEdges: 'graph/selectedSubgraphEdges',
      filteredEdgesCount: 'graph/filteredEdgesCount'
    }),
    areEdgesDrawn() {
      return this.filteredEdgesCount <= EDGE_THRESHOLD;
    },
    canAddToCAG() {
      return this.selectedSubgraphEdges.length <= ADD_TO_CAG_THRESHOLD;
    },
    addToCagTooltip() {
      return this.canAddToCAG ? 'Add to workspace' : SUBGRAPH.TOO_MANY_EDGES;
    }
  },
  methods: {
    addToCAG() {
      this.$emit('add-to-CAG');
    },
    onClose() {
      this.$emit('close');
    }
  }
};
</script>

<style lang="scss" scoped>
  .selected {
    font-weight: bold;
    margin-left: 5px;
  }
</style>
