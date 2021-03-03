<template>
  <div class="counters-container">
    <div
      v-if="miscMessage.length > 0"
      class="message">
      {{ miscMessage }}
    </div>
    <div v-if="!isVisible">
      {{ numberFormatter(documentsCount) }} Documents
    </div>
    <div v-if="!isVisible">
      {{ numberFormatter(evidencesCount) }} Evidence
    </div>
    <div>
      {{ numberFormatter(statementsCount) }} Statements
    </div>
    <div v-if="isVisible">
      {{ numberFormatter(nodesCount) }} Grounded Concepts
    </div>
    <div v-if="isVisible">
      {{ numberFormatter(edgesCount) }} {{ areEdgesDrawn ? '': '(Disabled) ' }} Relationships
    </div>
    <div v-if="isVisible && selectedNodesCount">
      {{ numberFormatter(selectedNodesCount) }} Selected Nodes
    </div>
  </div>
</template>

<script>
import { EDGE_THRESHOLD } from '@/components/graph/cyto-graph';
import numberFormatter from '@/formatters/number-formatter';

export default {
  name: 'Counters',
  props: {
    documentsCount: {
      type: Number,
      default: 0
    },
    evidencesCount: {
      type: Number,
      default: 0
    },
    statementsCount: {
      type: Number,
      default: 0
    },
    nodesCount: {
      type: Number,
      default: 0
    },
    edgesCount: {
      type: Number,
      default: 0
    },
    selectedNodesCount: {
      type: Number,
      default: 0
    },
    view: {
      type: String,
      default: ''
    },
    miscMessage: {
      type: String,
      default: ''
    }
  },
  computed: {
    isVisible() {
      return this.view === 'graphs' || this.view === 'modelConcepts' | this.view === 'modelVariables';
    },
    areEdgesDrawn() {
      return this.edgesCount <= EDGE_THRESHOLD;
    }
  },
  methods: {
    numberFormatter
  }
};
</script>

<style scoped lang="scss">
@import "~styles/wm-theme/wm-theme";

.counters-container {
  padding: 5px;
  margin-left: 15px;
  color: $color-text-second-dark;
  display: flex;
  align-items: center;
  div:not(:first-child)::before {
    content: "|";
    margin: 5px;
  }
  .message {
    font-style: italic;
  }
}

</style>
