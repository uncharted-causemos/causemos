<template>
  <div class="edge-weight-slider-container">
    <h5>Weights</h5>
    Driver level {{ selectedRelationship.parameter.weights[0] }}
    <input
      class="edge-weight-slider"
      type="range"
      min="0"
      max="1"
      step="0.1"
      ref="first-order-weight-slider"
      :value="selectedRelationship.parameter.weights[0]"
      @change="changeEdgeWeights"
    />
    Driver trend {{ selectedRelationship.parameter.weights[1] }}
    <input
      class="edge-weight-slider"
      type="range"
      min="0"
      max="1"
      step="0.1"
      ref="second-order-weight-slider"
      :value="selectedRelationship.parameter.weights[1]"
      @change="changeEdgeWeights"
    />
  </div>
</template>

<script lang="ts">
import { defineComponent } from 'vue';

export default defineComponent({
  name: 'EdgeWeightSlider',
  emits: ['set-edge-weights'],
  props: {
    selectedRelationship: {
      type: Object,
      required: true
    }
  },
  methods: {
    changeEdgeWeights() {
      const weights = [
        parseFloat(
          (this.$refs['first-order-weight-slider'] as HTMLInputElement).value
        ),
        parseFloat(
          (this.$refs['second-order-weight-slider'] as HTMLInputElement).value
        )
      ];
      this.$emit('set-edge-weights', {
        id: this.selectedRelationship.id,
        source: this.selectedRelationship.source,
        target: this.selectedRelationship.target,
        parameter: {
          weights
        }
      });
    }
  }
});
</script>

<style lang="scss" scoped>
@import '~styles/variables';

.edge-weight-slider-container {
  display: block;
  height: 100%;

  .edge-weight-slider {
    padding-top: 8px;
    padding-bottom: 24px;
  }
}

h5 {
  font-size: $font-size-large;
  font-weight: 600;
}
</style>
