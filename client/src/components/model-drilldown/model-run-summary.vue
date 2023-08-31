<template>
  <div class="model-run-summary-container">
    <div class="run-header">
      <div class="run-color" :style="{ background: color }" />
      <p :style="{ color: color }">{{ run.name }}</p>
    </div>
    <div class="run-parameter-rows">
      <model-run-summary-row
        v-for="parameter of parametersToDisplay"
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
import { ModelRun, ModelRunParameter } from '@/types/ModelRun';
import { computed } from 'vue';
import ModelRunSummaryRow from '@/components/model-drilldown/model-run-summary-row.vue';
import { getParameterTooltip } from '@/utils/model-run-util';

const props = defineProps<{
  metadata: Model;
  run: ModelRun;
  color: string;
  parametersToOmit: ModelRunParameter[];
}>();

const parametersToDisplay = computed(() =>
  props.run.parameters.filter(
    (parameter) => props.parametersToOmit.find((p) => p.name === parameter.name) === undefined
  )
);
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
