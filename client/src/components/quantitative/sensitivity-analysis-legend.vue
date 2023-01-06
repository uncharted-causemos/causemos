<template>
  <hideable-legend class="sensitivity-analysis-legend-container">
    <div class="content">
      <div class="color-scale" />
      <div class="labels">
        <span class="no-influence">No Influence</span>
        <span class="major-influence">Major Influence</span>
      </div>
    </div>
  </hideable-legend>
</template>

<script lang="ts">
import { defineComponent } from 'vue';
import HideableLegend from '../widgets/hideable-legend.vue';

export default defineComponent({
  name: 'SensitivityAnalysisLegend',
  components: {
    HideableLegend,
  },
});
</script>

<style lang="scss" scoped>
.sensitivity-analysis-legend-container.hideable-legend-container {
  position: absolute;
  bottom: 0;
  right: 10px;
}

.content {
  display: flex;
  flex-direction: column;
}

.labels {
  display: flex;
}

.no-influence {
  margin-right: 20px;
}

.color-scale {
  background: linear-gradient(90deg, white 0%, black 100%);
  width: 100%;
  height: 20px;
  margin-bottom: 10px;
}
</style>
