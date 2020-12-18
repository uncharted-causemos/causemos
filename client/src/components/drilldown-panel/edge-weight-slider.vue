<template>
  <div class="edge-weight-slider-container">
    Strength {{ selectedRelationship.parameter.weight }}
    <input
      class="edge-weight-slider"
      type="range"
      min="0"
      max="1"
      step="0.1"
      :value="selectedRelationship.parameter.weight"
      @change="changeEdgeWeight">
  </div>
</template>

<script>
export default {
  name: 'EdgeWeightSlider',
  props: {
    selectedRelationship: {
      type: Object,
      required: true
    }
  },
  methods: {
    changeEdgeWeight(evt) {
      this.$emit('edge-weight', {
        id: this.selectedRelationship.id,
        source: this.selectedRelationship.source,
        target: this.selectedRelationship.target,
        parameter: {
          weight: parseFloat(evt.target.value)
        }
      });
    }
  }
};
</script>

<style lang="scss" scoped>
.edge-weight-slider-container {
  display: block;
  height: 100%;

  .edge-weight-slider {
    padding-top: 8px;
    padding-bottom: 24px;
  }
}
</style>
