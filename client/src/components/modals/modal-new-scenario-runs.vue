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
            <div class="params-header">{{ dim.name }}</div>
          </td>
          <td>&nbsp;</td>
        </tr>
        <tr
          v-for="(run, sidx) in potentialRuns"
          :key="sidx">
          <td>{{ sidx }}</td>
          <td v-for="(dim, idx) in inputParameters"
            :key="idx"
            class="params-value">
            <label>{{ run[dim.name] }}</label>
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
      <div class="row estimated-runtime">
        Estimated execution time: {{ potentialScenarios.length * 2 }} {{ metadata.name.toLowerCase().includes('wash') ? 'hours' : 'minutes' }}
      </div>
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
import { DimensionInfo, Model, ModelParameter } from '@/types/Datacube';
import _ from 'lodash';
import { mapGetters } from 'vuex';
import datacubeService from '@/services/new-datacube-service';

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
    },
    selectedDimensions: {
      type: Array as PropType<DimensionInfo[]>,
      default: null
    }
  },
  computed: {
    inputParameters(): Array<ModelParameter> {
      return this.metadata.parameters.filter((p: any) => !p.is_drilldown);
    },
    ...mapGetters({
      datacubeCurrentOutputsMap: 'app/datacubeCurrentOutputsMap'
    }),
    currentOutputIndex(): number {
      return this.metadata.id !== undefined ? this.datacubeCurrentOutputsMap[this.metadata.id] : 0;
    }
  },
  data: () => ({
    potentialRuns: [] as Array<ScenarioData>
  }),
  mounted() {
    // potentialScenarios won't have values for the invisible input knobs
    //  so we need to add them to explicitly highlight ALL potential run values
    const potentialRuns = _.cloneDeep(this.potentialScenarios);
    // for each requested new run, review if there were any invisible input knobs
    potentialRuns.forEach(potentialRun => {
      this.inputParameters.forEach(input => {
        if (input.is_visible === false) {
          potentialRun[input.name] = input.default;
        }
      });
    });
    // FIXME:
    // also, when rendering potential run(s) values, use label choices if available
    this.potentialRuns = potentialRuns;
  },
  methods: {
    async startExecution() {
      // FIXME: cast to 'any' since typescript cannot see mixins yet!
      (this as any).toaster('New runs requested\nPlease check back later!');

      const outputs = this.metadata.validatedOutputs ? this.metadata.validatedOutputs : this.metadata.outputs;
      const drilldownParams = this.metadata.parameters.filter(d => d.is_drilldown);

      //
      // ensure that any choice label is mapped back to its underlying value
      //
      this.selectedDimensions.forEach(d => {
        if (d.choices_labels && d.choices !== undefined && d.is_visible) {
          // update all generatedLines accordingly
          this.potentialRuns.forEach(gl => {
            const currLabelValue = (gl[d.name]).toString();
            const labelIndex = d.choices_labels?.findIndex(l => l === currLabelValue) ?? 0;
            if (d.choices !== undefined) {
              gl[d.name] = d.choices[labelIndex];
            }
          });
        }
      });

      const promises = this.potentialRuns.map(async (modelRun) => {
        const paramArray: any[] = [];
        Object.keys(modelRun).forEach(key => {
          // exclude output variable values since they will be undefined for potential runs
          if (key !== outputs[this.currentOutputIndex].name) {
            paramArray.push({
              name: key,
              value: modelRun[key]
            });
          }
        });
        // add drilldown/freeform params since they are still inputs
        //  although hidden in the parallel coordinates
        drilldownParams.forEach(p => {
          paramArray.push({
            name: p.name,
            value: p.default
          });
        });
        datacubeService.createModelRun(this.metadata.data_id, this.metadata?.name, paramArray);
      });
      // wait until all promises are resolved
      await Promise.all(promises);

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
  width: max-content;
  max-width: 80vw;
  .modal-body {
    height: 300px;
    overflow-y: scroll;
  }
}

.params-header {
  font-weight: bold;
  padding-left: 1rem;
  padding-right: 1rem;
}

.params-value {
  padding-left: 1rem;
  padding-right: 1rem;
  align-content: center;
}

.estimated-runtime {
  display: flex;
  padding: 1rem;
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
