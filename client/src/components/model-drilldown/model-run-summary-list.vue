<template>
  <div class="model-run-summary-list-container">
    <model-run-summary
      v-for="(run, index) of modelRuns"
      :key="run.id"
      :metadata="metadata"
      :run="run"
      :parameters-to-omit="sharedParameters"
      :color="colorFromIndex(index)"
    />
    <shared-parameters-component
      v-if="sharedParameters.length > 0"
      :metadata="metadata"
      :shared-parameters="sharedParameters"
    />
  </div>
</template>

<script setup lang="ts">
import { Model } from '@/types/Datacube';
import { ModelRun } from '@/types/ModelRun';
import { computed, toRefs } from 'vue';
import ModelRunSummary from '@/components/model-drilldown/model-run-summary.vue';
import SharedParametersComponent from '@/components/model-drilldown/shared-parameters.vue';
import { colorFromIndex } from '@/utils/colors-util';
import { getSharedParametersFromModelRuns } from '@/utils/model-run-util';

const props = defineProps<{ metadata: Model; modelRuns: ModelRun[] }>();
const { modelRuns } = toRefs(props);
const sharedParameters = computed(() => getSharedParametersFromModelRuns(modelRuns.value));
</script>

<style lang="scss" scoped>
.model-run-summary-list-container {
  display: flex;
  flex-direction: column;
  gap: 20px;
}
</style>
