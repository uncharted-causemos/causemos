<template>
  <div class="shared-parameters-container">
    <div class="run-header">
      <p :style="{ color: color }">Shared parameters</p>
    </div>
    <div class="run-parameter-rows">
      <model-run-summary-row
        v-for="parameter of sharedParameters"
        :key="parameter.name"
        v-tooltip="{ content: getParameterTooltip(metadata, parameter.name), html: true }"
        :parameter="parameter"
        :color="color"
      />
    </div>
  </div>
</template>

<script setup lang="ts">
import { Model } from '@/types/Datacube';
import { ModelRunParameter } from '@/types/ModelRun';
import ModelRunSummaryRow from '@/components/model-drilldown/model-run-summary-row.vue';
import { UN_COLOR_BLACK_60 } from '@/utils/colors-util';
import { getParameterTooltip } from '@/utils/model-run-util';

defineProps<{
  metadata: Model;
  sharedParameters: ModelRunParameter[];
}>();

const color = UN_COLOR_BLACK_60;
</script>

<style lang="scss" scoped>
@import '@/styles/uncharted-design-tokens';
.run-header {
  display: flex;
  align-items: center;
  gap: 5px;
}

.run-color {
  width: 10px;
  height: 10px;
}
</style>
