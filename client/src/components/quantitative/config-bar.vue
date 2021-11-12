<template>
  <div class="config-bar-container">
    <p>
      <strong>Projection:</strong>
      <a
        @click.stop="editParameters"
      >{{ projectionSteps }} Months ({{ currentEngine }})
      </a>
    </p>
  </div>
</template>

<script lang="ts">
import { defineComponent } from 'vue';

export default defineComponent({
  name: 'QuantitativeConfigBar',
  props: {
    modelSummary: {
      type: Object,
      required: true
    }
  },
  emits: [
    'edit-parameters'
  ],
  computed: {
    projectionSteps(): number {
      return this.modelSummary.parameter.num_steps;
    },
    currentEngine(): string {
      return this.modelSummary.parameter.engine;
    }
  },
  methods: {
    async editParameters() {
      this.$emit('edit-parameters');
    }
  }
});
</script>

<style lang="scss" scoped>

@import "~styles/variables";

.config-bar-container {
  height: $navbar-outer-height;
  display: flex;
  align-items: center;
  padding: 0 10px;
  z-index: 1;

  p {
    margin: 0;
  }

  .label-icon {
    margin-right: 5px;
  }

  a {
    padding-left: 5px;
    cursor: pointer;
  }
}
</style>
