<template>
  <modal @close="close()">
    <template #header>
      <h4 class="title"><i class="fa fa-fw fa-book" /> Model Execution Status</h4>
    </template>
    <template #body>
      <table class="table">
        <tr>
          <td
            v-for="(dim, idx) in potentialRunsParameters"
            :key="idx">
            <span style="font-weight: bold;">{{ dim }}</span>
          </td>
          <td>&nbsp;</td>
        </tr>
        <tr
          v-for="(run, sidx) in potentialRuns"
          :key="sidx">
          <td v-for="(dimName, idx) in Object.keys(run)"
            :key="idx">
            <label>{{ run[dimName] }}</label>
          </td>
          <td>
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

// TODO: add table header with interactivity to rank/re-order

// allow the user to review potential mode runs before kicking off execution
export default defineComponent({
  name: 'ModalCheckRunsExecutionStatus',
  components: {
    Modal
  },
  emits: [
    'close'
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
      return this.potentialRuns.length > 0 ? Object.keys(this.potentialRuns[0]) : [];
    },
    potentialRuns(): Array<any> {
      const runs = this.potentialScenarios.filter(r => r.status !== ModelRunStatus.Ready);
      const drilldownParamNames = this.metadata.parameters.filter((p: any) => p.is_drilldown).map(p => p.name);
      const newArray = _.map(runs, function (row) {
        return _.omit(row, ['run_id', ...drilldownParamNames]);
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
    }
  }
});
</script>

<style lang="scss" scoped>
@import "~styles/variables";

::v-deep(.modal-container) {
  .modal-body {
    height: 300px;
    overflow-y: scroll;
  }
}

.title {
  text-transform: initial !important;
  margin-top: 2rem;
  padding-left: 2rem;
  font-weight: bold;
  font-size: $font-size-large !important;
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
</style>
