<template>
  <div class="model-run-in-progress-container">
    <div class="run-header">
      <i v-if="isFailed" class="fa fa-fw fa-exclamation-circle danger" />
      <i v-else class="fa fa-fw fa-spinner fa-spin" />
      <div class="label">
        <p v-if="isFailed">Failed</p>
        <p v-else>Running</p>
        <span class="subdued un-font-small">Requested {{ timeSinceExecutionFormatted }}</span>
      </div>
      <button
        :disabled="!canRetryOrDelete"
        @click="emit('retry-run', run.run_id.toString())"
        class="btn btn-default"
      >
        <i class="fa fa-fw fa-refresh" /> Retry
      </button>
      <options-button :dropdown-below="true" :wider-dropdown-options="true">
        <template #content>
          <a target="_blank" :href="dojoExecutionLink"
            ><div class="dropdown-option">View Dojo logs</div>
          </a>
          <div
            :class="[!run.flow_id ? 'disabled' : '']"
            class="dropdown-option"
            @click="viewCausemosLogs"
          >
            View Causemos logs
          </div>
          <div
            :class="[!canRetryOrDelete ? 'disabled' : '']"
            class="dropdown-option danger"
            @click="emit('delete-run', run.run_id.toString())"
          >
            Delete run
          </div>
        </template>
      </options-button>
    </div>
    <div class="run-parameter-rows">
      <model-run-summary-row
        v-for="parameter of metadata.parameters"
        :key="parameter.name"
        v-tooltip="{ content: getParameterTooltip(metadata, getParameterTooltip.name), html: true }"
        :parameter="{ name: parameter.name, value: run[parameter.name].toString() }"
        :color="'#000'"
      />
    </div>
  </div>
</template>

<script setup lang="ts">
import { Model } from '@/types/Datacube';
import { computed, toRefs } from 'vue';
import ModelRunSummaryRow from '@/components/model-drilldown/model-run-summary-row.vue';
import { getParameterTooltip } from '@/utils/model-run-util';
import { ModelRunStatus } from '@/types/Enums';
import OptionsButton from '../widgets/options-button.vue';
import { ScenarioData } from '@/types/Common';
import useApplicationConfiguration from '@/composables/useApplicationConfiguration';
import durationFormatter from '@/formatters/duration-formatter';
import { useRouter } from 'vue-router';

const props = defineProps<{
  metadata: Model;
  run: ScenarioData;
}>();
const { run } = toRefs(props);
const emit = defineEmits<{
  (e: 'delete-run', runId: string): void;
  (e: 'retry-run', runId: string): void;
}>();

const isFailed = computed(
  () =>
    props.run.status === ModelRunStatus.ExecutionFailed ||
    props.run.status === ModelRunStatus.ProcessingFailed
);

const timeSinceExecution = computed(() => Date.now() - (run.value.created_at as number));
const timeSinceExecutionFormatted = computed(
  () => `${durationFormatter(timeSinceExecution.value, false)} ago`
);
const canRetryOrDelete = computed(
  () => isFailed.value || (run.value.created_at && timeSinceExecution.value > 1000 * 60 * 60)
);

const { applicationConfiguration } = useApplicationConfiguration();
const dojoExecutionLink = computed(
  () => `${applicationConfiguration.value.CLIENT__DOJO_LOG_API_URL}/runlogs/${run.value.run_id}`
);

const router = useRouter();
const viewCausemosLogs = () => {
  router.push({
    name: 'prefectFlowLogs',
    params: {
      flowId: run.value.flow_id as string,
    },
  });
};
</script>

<style lang="scss" scoped>
@import '@/styles/common';
@import '@/styles/uncharted-design-tokens';
.run-header {
  display: flex;
  align-items: center;
  gap: 5px;

  > i {
    margin-bottom: 20px;
  }
}

.danger {
  color: $un-color-feedback-warning;
}

.label {
  flex: 1;
  min-width: 0;
}

.dropdown-option.disabled {
  pointer-events: none;
  color: $subdued;
  cursor: default;
}
</style>
