<template>
  <nav class="navbar navbar-default">
    <ul class="nav navbar-nav">
      <li class="nav-item">
        <a
          class="nav-link"
          @click="cancel()">
          <i class="fa fa-fw fa-times" />
        </a>
      </li>
      <li class="nav-item">
        <a><i class="fa fa-fw fa-search" /> Search Knowledge Base</a>
      </li>
    </ul>

    <div class="add-to-CAG-container">
      <div v-tooltip.top-center="addToCagTooltip">
        <button
          type="button"
          class="btn btn-primary btn-call-for-action"
          :disabled="!canAddToCAG"
          @click="addToCAG"
        >
          <i class="fa fa-fw fa-plus-circle" />
          Add to CAG
        </button>
      </div>
      <div> <span class="selected">{{ selectedSubgraphEdges.length | number-formatter }} Selected </span> / {{ filteredEdgesCount | number-formatter }} {{ areEdgesDrawn ? '': '(Disabled) ' }} Relationships</div>
    </div>
    <bookmark-controls />

  </nav>
</template>

<script>

import { mapGetters } from 'vuex';
import { EDGE_THRESHOLD } from '@/components/graph/cyto-graph';

import BookmarkControls from '@/components/bookmark-panel/bookmark-controls';
import { SUBGRAPH, ADD_TO_CAG_THRESHOLD } from '@/utils/messages-util';

export default {
  name: 'KBExplorerActionBar',
  components: {
    BookmarkControls
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
    cancel() {
      this.$emit('cancel');
    }
  }
};
</script>


<style scoped lang="scss">
@import '~styles/variables';
@import '~styles/wm-theme/custom-variables';

.nav>li>a:focus, .nav>li>a:hover {
  background-color: transparent !important;
  cursor: pointer;
}
.navbar-default {
  background-color: #0e3480;
  display: flex;
  align-items: center;
  .nav-item>a {
    color: #ffffff;
    i {
      color: #ffffff;
    }
  }

  .search-kb {
    display: flex;
    flex-grow: 1;
    box-sizing: border-box;
  }

  .add-to-CAG-container {
    display: flex;
    color: #ffffff;
    flex-grow: 1;
    justify-content: center;
    div {
        display: flex;
        align-items: center;
    }
    .selected {
      font-weight: bold;
      margin-left: 10px;
    }

  }

}

</style>
