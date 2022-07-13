<template>
  <full-screen-modal-header
    icon="angle-left"
    :nav-back-label="navBackLabel"
    @close="onClose"
  >
    <button
      v-tooltip.top-center="addToCagTooltip"
      type="button"
      class="btn btn-call-to-action"
      :disabled="!canAddToCAG"
      @click="addToCAG"
    >
      <i class="fa fa-fw fa-plus-circle" />
      Add to CAG
    </button>
    <span>
      <span class="selected">
        {{ numberFormatter(selectedSubgraphEdges.length) }} selected
      </span>
      of {{ numberFormatter(filteredEdgesCount) }}
      {{ areEdgesDrawn ? '': '(hidden) ' }} relationships
    </span>
  </full-screen-modal-header>
</template>

<script lang="ts">
import { useStore } from 'vuex';
import { defineComponent, computed } from 'vue';
import { EDGE_THRESHOLD } from '@/components/graph/cyto-graph.vue';
import { SUBGRAPH, ADD_TO_CAG_THRESHOLD } from '@/utils/messages-util';
import fullScreenModalHeader from '../widgets/full-screen-modal-header.vue';
import numberFormatter from '@/formatters/number-formatter';

export default defineComponent({
  name: 'KbExplorerModalHeader',
  components: {
    fullScreenModalHeader
  },
  props: {
    navBackLabel: {
      type: String,
      default: ''
    }
  },
  emits: ['add-to-CAG', 'close'],
  setup() {
    const store = useStore();

    const selectedSubgraphEdges = computed(() => store.getters['graph/selectedSubgraphEdges']);
    const filteredEdgesCount = computed(() => store.getters['graph/filteredEdgesCount']);
    const areEdgesDrawn = computed(() => filteredEdgesCount.value <= EDGE_THRESHOLD);
    const canAddToCAG = computed(() => selectedSubgraphEdges.value.length <= ADD_TO_CAG_THRESHOLD);
    const addToCagTooltip = computed(() => canAddToCAG.value ? 'Add to workspace' : SUBGRAPH.TOO_MANY_EDGES);

    return {
      selectedSubgraphEdges,
      filteredEdgesCount,
      areEdgesDrawn,
      canAddToCAG,
      addToCagTooltip
    };
  },
  methods: {
    numberFormatter,
    addToCAG() {
      this.$emit('add-to-CAG');
    },
    onClose() {
      this.$emit('close');
    }
  }
});
</script>

<style lang="scss" scoped>
  .selected {
    font-weight: bold;
    margin-left: 5px;
  }
</style>
