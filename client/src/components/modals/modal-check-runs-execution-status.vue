<template>
  <modal @close="close()">
    <template #header>
      <div class="modal-header">
        <h4><i class="fa fa-fw fa-book" /> Model Execution Status</h4>
      </div>
    </template>
    <template #body>
      <a href="https://dojo-test.com/runs/{run_id}/logs">Execution Logs</a>
      <table class="table">
        <tr>
          <td class="params-header">ID</td>
          <td
            v-for="(dim, idx) in potentialRunsParameters"
            :key="idx">
            <div class="params-header">{{ dim }}</div>
          </td>
          <td class="params-header">execution logs</td>
          <td class="params-header">retry</td>
          <td class="params-header">delete</td>
          <td class="params-header">status</td>
        </tr>
        <tr
          v-for="(run, sidx) in potentialRuns"
          :key="sidx">
          <td class="params-value">{{ sidx }}</td>
          <td v-for="(dimName, idx) in withoutOmittedColumns(Object.keys(run))"
            :key="idx"
            class="params-value">
            <label>{{ run[dimName] }}</label>
          </td>
          <td class="params-value">
            <a :href=dojoExecutionLink(run.runId)>See Logs</a>
          </td>
          <td class="params-value">
            <i class="fa fa-repeat" @click="retryRun(run.run_id)"/>
          </td>
          <td class="params-value">
            <i class="fa fa-trash" @click="deleteRun(run.run_id)"/>
          </td>
          <td class="params-value">
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

const OmittedColumns = ['run_id'];

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
    ModelRunStatus
  }),
  mounted() {
  },
  methods: {
    close() {
      this.$emit('close');
    },
    dojoExecutionLink(runId: string) {
      return `https://dojo-test.com/runs/${runId}/logs`;
    },
    withoutOmittedColumns(columns: string[]) {
      return columns.filter(column => !_.includes(OmittedColumns, column));
    },
    deleteRun(runId: string) {
      this.$emit('delete', runId);
    },
    retryRun(runId: string) {
      this.$emit('retry', runId);
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
