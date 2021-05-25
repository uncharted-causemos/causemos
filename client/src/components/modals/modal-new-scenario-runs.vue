<template>
  <modal>
    <template #header>
      <h4 class="title"><i class="fa fa-fw fa-book" /> Potential Model Runs</h4>
    </template>
    <template #body>
      <table class="table">
        <tr>
          <td>ID&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;</td>
          <td
            v-for="(dim, idx) in inputParameters"
            :key="idx">
            <span style="font-weight: bold;">{{ dim.name }}</span>
          </td>
          <td>&nbsp;</td>
        </tr>
        <tr
          v-for="(run, sidx) in potentialRuns"
          :key="sidx">
          <td>{{ sidx }}</td>
          <td v-for="(dimName, idx) in Object.keys(run)"
            :key="idx">
            <label>{{ run[dimName] }}</label>
          </td>
          <td>
            <div
              class="delete-run"
              @click="deleteRun(sidx)"
            >
              <i
                class="fa fa-fw fa-close"
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
            Cancel
        </button>
        <button
          type="button"
          class="btn btn-primary btn-call-for-action"
          :disabled="potentialRuns.length == 0"
          @click.stop="startExecution()">
            Start Execution
        </button>
      </ul>
    </template>
  </modal>
</template>

<script lang="ts">
import { defineComponent, PropType } from 'vue';
import Modal from '@/components/modals/modal.vue';
import { ScenarioData } from '@/types/Common';
import { Model } from '@/types/Model';
import _ from 'lodash';
import API from '@/api/api';

// allow the user to review potential mode runs before kicking off execution
export default defineComponent({
  name: 'ModalNewScenarioRuns',
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
    inputParameters(): Array<any> {
      return this.metadata.parameters.filter((p: any) => !p.is_drilldown);
    }
  },
  data: () => ({
    potentialRuns: [] as Array<ScenarioData>
  }),
  mounted() {
    this.potentialRuns = _.cloneDeep(this.potentialScenarios);
  },
  methods: {
    startExecution() {
      // FIXME: cast to 'any' since typescript cannot see mixins yet!
      (this as any).toaster('New runs requested\nPlease check back later!');

      // FIXME: only submitting ONE sceanrio is supported at this time
      const firstScenario = this.potentialRuns[0];
      const paramArray: any[] = [];
      Object.keys(firstScenario).forEach(key => {
        // exclude output variable values since they will be undefined for potential runs
        if (key !== this.metadata.outputs[0].name) {
          paramArray.push({
            name: key,
            value: firstScenario[key]
          });
        }
      });
      const drilldownParams = this.metadata.parameters.filter(d => d.is_drilldown);
      drilldownParams.forEach(p => {
        paramArray.push({
          name: p.name,
          value: p.default
        });
      });
      const modelId = this.metadata.id;
      // FIXME: only max-hop model is executable at this time
      if (modelId.includes('maxhop')) {
        API.post('maas/model-runs', {
          model_id: modelId,
          model_name: this.metadata?.name,
          parameters: paramArray
        });
      } else {
        // FIXME: currently other models are not executable
        console.warn('Current model is not executable!');
      }

      this.close(false);
    },
    close(cancel = true) {
      this.$emit('close', { cancel });
    },
    deleteRun(runIndex: number) {
      this.potentialRuns.splice(runIndex, 1);
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
  font-size: x-large !important;
}

.delete-run {
  font-size: $font-size-large;
  width: 32px;
  height: 32px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 3px;
  color: #ff6955;
  cursor: pointer;

  &:hover {
    color: #850f00;
  }
}
</style>
