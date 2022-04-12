<template>
  <modal @close="close()">
    <template #header>
      <div class="modal-header">
        <h4><i class="fa fa-fw fa-book" /> Model Execution Status</h4>
      </div>
    </template>
    <template #body>
      <table class="table">
        <tr>
          <td class="params-header">ID</td>
          <td class="params-header">status</td>
          <td
            v-for="(dim, idx) in potentialRunsParameters"
            :key="idx">
            <div class="params-header">{{ dim }}</div>
          </td>
          <td class="params-header">time requested</td>
          <td class="params-header">execution logs</td>
          <td class="params-header">processing logs</td>
          <td class="params-header">retry</td>
          <td class="params-header">delete</td>
        </tr>
        <tr
          v-for="(run, sidx) in potentialRuns"
          :key="run.run_id">
          <td class="params-value">{{ sidx }}</td>
          <td class="params-value">
            <div class="status-contents">
              <div
                class="run-status"
                :style="{color: run['status'] === ModelRunStatus.ExecutionFailed ? 'red' : 'blue'}"
              >
                <i
                  v-if="run['status'] === ModelRunStatus.Submitted"
                  class="fa fa-fw fa-spinner"
                />
                <i
                  v-else
                  class="fa fa-fw fa-times-circle"
                />
              </div>
              <label>{{ run.status }}</label>
            </div>
          </td>
          <td v-for="(dimName, idx) in withoutOmittedColumns(Object.keys(run))"
            :key="idx"
            class="params-value">
            <label>{{ run[dimName] }}</label>
          </td>
          <td class="params-value">
            {{ timeSinceExecutionFormatted(run) }}
          </td>
          <td class="params-value">
            <a :href=dojoExecutionLink(run.run_id)>Dojo Logs</a>
          </td>
          <td class="params-value">
            <button
              type="button"
              class="btn btn-xs btn-primary"
              :disabled="!run.flow_id"
              @click="viewCausemosLogs(run.flow_id)">Causemos Logs</button>
          </td>
          <td class="params-value">
            <i v-if="canRetryDelete(run)" class="fa fa-repeat" @click="retryRun(run.run_id)"/>
          </td>
          <td class="params-value">
            <i v-if="canRetryDelete(run)" class="fa fa-trash" @click="deleteRun(run.run_id)"/>
          </td>
        </tr>
      </table>
    </template>
    <template #footer>
      <ul class="unstyled-list">
        <button
          type="button"
          class="btn first-button"
          @click.stop="close()">
            Close
        </button>
      </ul>
    </template>
  </modal>
</template>

<script lang="ts">

import { defineComponent, PropType } from 'vue';
import Modal from '@/components/modals/modal.vue';
import { ScenarioData } from '@/types/Common';
import { Model } from '@/types/Datacube';
import _ from 'lodash';
import { ModelRunStatus } from '@/types/Enums';
import DurationFormatter from '@/formatters/duration-formatter';
import { ModelRun } from '@/types/ModelRun';

const OmittedColumns = ['run_id', 'created_at', 'status', 'is_default_run', 'flow_id'];

// TODO: add table header with interactivity to rank/re-order

// allow the user to review potential mode runs before kicking off execution
export default defineComponent({
  name: 'ModalCheckRunsExecutionStatus',
  components: {
    Modal
  },
  emits: [
    'close',
    'delete',
    'retry'
  ],
  props: {
    potentialScenarios: {
      type: Array as PropType<ScenarioData[]>,
      default: []
    },
    metadata: {
      type: Object as PropType<Model>,
      default: null
    }
  },
  computed: {
    potentialRunsParameters(): Array<any> {
      return this.potentialRuns.length > 0 ? this.withoutOmittedColumns(Object.keys(this.potentialRuns[0])) : [];
    },
    potentialRuns(): Array<any> {
      const runs = this.potentialScenarios.filter(r => r.status !== ModelRunStatus.Ready);
      const drilldownParamNames = this.metadata.parameters.filter((p: any) => p.is_drilldown).map(p => p.name);
      const sortedRuns = _.sortBy(runs, r => r.status);
      const newArray = _.map(sortedRuns, function (row) {
        return _.omit(row, [...drilldownParamNames]);
      });
      return newArray;
    }
  },
  data: () => ({
    currentTime: Date.now(),
    ModelRunStatus
  }),
  methods: {
    canRetryDelete(run: any) {
      return run.status === ModelRunStatus.ExecutionFailed ||
        run.status === ModelRunStatus.ProcessingFailed ||
        (run.created_at && this.timeSinceExecution(run) > 1000 * 60 * 60 * 48);
    },
    close() {
      this.$emit('close');
    },
    dojoExecutionLink(runId: string) {
      return `https://phantom.dojo-test.com/runlogs/${runId}`;
    },
    timeSinceExecutionFormatted(run: ModelRun) {
      return `${DurationFormatter(this.timeSinceExecution(run))} ago`;
    },
    timeSinceExecution(run: ModelRun) {
      return this.currentTime - run.created_at;
    },
    withoutOmittedColumns(columns: string[]) {
      return columns.filter(column => !_.includes(OmittedColumns, column));
    },
    deleteRun(runId: string) {
      this.$emit('delete', runId);
    },
    retryRun(runId: string) {
      this.$emit('retry', runId);
    },
    viewCausemosLogs(flowId: string) {
      this.$router.push({
        name: 'prefectFlowLogs',
        params: {
          flowId: flowId as string
        }
      });
    }
  }
});
</script>

<style lang="scss" scoped>
@import "~styles/variables";

::v-deep(.modal-container) {
  max-width: 80vw;
  width: max-content;
  .modal-body {
    height: 300px;
    overflow-y: scroll;
  }
}

.status-contents {
  display: flex;
  label {
    margin: auto 0;
  }
}

.run-status {
  font-size: $font-size-large;
  width: 32px;
  height: 32px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 3px;
}

.params-header {
  font-weight: bold;
  padding-left: 1rem;
  padding-right: 1rem;
  text-align: center;
}

.params-value {
  padding-left: 1rem;
  padding-right: 1rem;
  align-content: center;
  text-align: center;
  .fa-repeat, .fa-trash {
    cursor: pointer;
  }
}
</style>
