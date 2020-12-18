<template>
  <div class="sensitivity-analysis-legend-container">
    <div class="color-scale" />
    <span class="no-influence">No Influence</span>
    <span class="major-influence">Major Influence</span>
  </div>
</template>

<script>
export default {
  name: 'SensitivityAnalysisLegend'
};
</script>

<style lang="scss" scoped>
  $scaleHeight: 20px;
  $padding: 10px;

  .sensitivity-analysis-legend-container {
    position: absolute;
    background: white;
    padding: $padding;
    padding-top: $padding + $scaleHeight + $padding;
    bottom: 10px;
    right: 10px;
    box-shadow: 0 4px 8px 0 rgba(0,0,0,0.2);
    z-index: 1;
  }

  .no-influence {
    margin-right: 20px;
  }

  .color-scale {
    position: absolute;
    background: linear-gradient(90deg, white 0%, black 100%);
    width: calc(100% - #{2 * $padding});
    height: $scaleHeight;
    top: $padding;
    left: $padding;
  }

</style>
