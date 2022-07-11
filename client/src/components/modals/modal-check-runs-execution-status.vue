<template>
  <modal @close="close()">
    <template #header>
      <h4>Model Execution Status</h4>
    </template>
    <template #body>
      <div v-if="potentialRuns.length === 0" class="empty-state">
        <span>There are no pending runs.</span>
      </div>
      <table class="table" v-else>
        <thead>
          <th>Status</th>
          <th v-for="(dim, idx) in potentialRunsParameters" :key="idx">
            <div>{{ dim }}</div>
          </th>
          <th>Requested</th>
          <th></th>
        </thead>
        <tbody>
          <tr v-for="run in potentialRuns" :key="run.run_id">
            <td class="status-contents">
              <i
                class="fa fa-fw"
                :class="getStatusIcon(run)"
                :style="{ color: getStatusColor(run) }"
              />
              <span>{{ getStatusString(run) }}</span>
              <small-text-button
                v-if="canRetryDelete(run)"
                :label="'Retry'"
                @click="retryRun(run.run_id)"
              >
                <template #leading>
                  <i class="fa fa-repeat" />
                </template>
              </small-text-button>
            </td>
            <td
              v-for="(dimName, idx) in withoutOmittedColumns(Object.keys(run))"
              :key="idx"
            >
              <label>{{ run[dimName] }}</label>
            </td>
            <td>
              {{ timeSinceExecutionFormatted(run) }}
            </td>
            <td class="action-buttons">
              <a :href="dojoExecutionLink(run.run_id)">
                <small-text-button
                  :label="'View Dojo logs'"
                >
                  <template #leading>
                    <i class="fa fa-align-left" />
                  </template>
                </small-text-button>
              </a>
              <small-text-button
                :label="'View Causemos logs'"
                :disabled="!run.flow_id"
                @click="viewCausemosLogs(run.flow_id)"
              >
                <template #leading>
                  <i class="fa fa-align-left" />
                </template>
              </small-text-button>
              <small-text-button
                v-if="canRetryDelete(run)"
                :label="'Delete'"
                @click="deleteRun(run.run_id)"
              >
                <template #leading>
                  <i class="fa fa-trash" />
                </template>
              </small-text-button>
            </td>
          </tr>
        </tbody>
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
import SmallTextButton from '../widgets/small-text-button.vue';

const OmittedColumns = ['run_id', 'created_at', 'status', 'is_default_run', 'flow_id'];

// TODO: add table header with interactivity to rank/re-order

// allow the user to review potential mode runs before kicking off execution
export default defineComponent({
  name: 'ModalCheckRunsExecutionStatus',
  components: {
    Modal,
    SmallTextButton
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
    getStatusString(run: { status: ModelRunStatus }) {
      switch (run.status) {
        case ModelRunStatus.ExecutionFailed:
        case ModelRunStatus.ProcessingFailed: return 'Failed';
        case ModelRunStatus.Submitted:
        case ModelRunStatus.Processing: return 'Running';
        default: return run.status;
      }
    },
    getStatusColor(run: { status: ModelRunStatus }) {
      switch (run.status) {
        case ModelRunStatus.ExecutionFailed:
        case ModelRunStatus.ProcessingFailed: return 'red';
        case ModelRunStatus.Submitted:
        case ModelRunStatus.Processing: return 'blue';
        default: return 'grey';
      }
    },
    getStatusIcon(run: { status: ModelRunStatus }) {
      switch (run.status) {
        case ModelRunStatus.ExecutionFailed:
        case ModelRunStatus.ProcessingFailed: return 'fa-times-circle';
        case ModelRunStatus.Submitted:
        case ModelRunStatus.Processing: return 'fa-spin fa-spinner';
        default: return 'fa-ellipsis';
      }
    },
    close() {
      this.$emit('close');
    },
    dojoExecutionLink(runId: string) {
      return `https://phantom.dojo-test.com/runlogs/${runId}`;
    },
    timeSinceExecutionFormatted(run: ModelRun) {
      return `${DurationFormatter(this.timeSinceExecution(run), false)} ago`;
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

:deep(.modal-container) {
  max-width: 80vw;
  width: max-content;
  .modal-body {
    height: 300px;
    overflow-y: scroll;
  }
}

.empty-state {
  // FIXME: replace with $tinted-background;
  background: ghostwhite;
  width: 500px;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
}

tr:hover {
  background: $background-light-1-faded;
}

// Add gap between columns that won't obstruct the tr:hover color like
//  table { border-spacing } will
td:not(:last-child),
th:not(:last-child) {
  padding-right: 10px;
}

// Add gap between rows
td {
  padding: 10px 0;
}

.status-contents > *:not(:first-child) {
  margin-left: 5px;
}

.action-buttons {
  display: flex;
  flex-direction: column;
  gap: 5px;
  align-items: flex-start;
}

</style>
