<template>
  <modal @close="close">
    <template #header>
      <h4>
        <i class="fa fa-fw fa-save" /> Save Scenario As
      </h4>
    </template>

    <template #body>
      <div class="modal-body">
        <label class="one-line">
          Scenario name*:
          <input
            v-model="newScenarioName"
            type="text"
            class="form-control"
            :disabled="scenarioToOverwriteId !== null">
        </label>
        <label class="one-line">
          Description:
          <input
            v-model="newScenarioDescription"
            type="text"
            class="form-control"
            :disabled="scenarioToOverwriteId !== null">
        </label>

        <p
          v-if="hasScenarios"
          class="overwrite-description">
          Or, select a scenario to overwrite:
        </p>

        <ul class="unstyled-list scenario-list">
          <li
            v-for="scenario of overwritableScenarios"
            :key="scenario.id">
            <label @click="toggleSelectedToOverwrite(scenario.id)">
              <i
                class="fa fa-lg fa-fw"
                :class="{
                  'fa-check-square-o': scenario.id === scenarioToOverwriteId,
                  'fa-square-o': scenario.id !== scenarioToOverwriteId
                }"
              />
              <b>{{ scenario.name }}</b> {{ scenario.description }}
            </label>
          </li>
        </ul>
      </div>
    </template>

    <template #footer>
      <ul class="unstyled-list">
        <button
          type="button"
          class="btn first-button"
          @click.stop="close()">Cancel
        </button>
        <button
          ref="confirm"
          type="button"
          class="btn btn-primary btn-call-for-action"
          @click.stop="save()">
          <i class="fa fa-fw fa-save" />
          Save
        </button>
      </ul>
    </template>
  </modal>
</template>

<script lang="ts">
import _ from 'lodash';

import { defineComponent, PropType } from 'vue';
import Modal from '@/components/modals/modal.vue';
import { Scenario } from '@/types/CAG';

export default defineComponent({
  name: 'SaveScenarioModal',
  components: {
    Modal
  },
  props: {
    scenarios: {
      type: Array as PropType<Scenario[]>,
      default: () => []
    }
  },
  emits: ['close', 'overwrite-scenario', 'save-new-scenario'],
  data: () => ({
    scenarioToOverwriteId: null as string | null,
    newScenarioName: '',
    newScenarioDescription: ''
  }),
  computed: {
    hasScenarios(): boolean {
      const nonBaselineScenarios = this.scenarios.filter(s => !s.is_baseline && s.id);
      return !_.isEmpty(nonBaselineScenarios);
    },
    overwritableScenarios(): Scenario[] {
      return this.scenarios.filter(scenario => !scenario.is_baseline && scenario.id !== 'draft');
    }
  },
  methods: {
    close() {
      this.$emit('close');
    },
    save() {
      if (this.scenarioToOverwriteId !== null) {
        this.$emit('overwrite-scenario', this.scenarioToOverwriteId);
      } else {
        this.$emit('save-new-scenario', {
          name: this.newScenarioName,
          description: this.newScenarioDescription
        });
      }
      this.close();
    },
    toggleSelectedToOverwrite(scenarioId: string) {
      if (this.scenarioToOverwriteId === scenarioId) {
        this.scenarioToOverwriteId = null;
      } else {
        this.scenarioToOverwriteId = scenarioId;
      }
    }
  }
});
</script>

<style lang="scss" scoped>
.modal-body {
  padding: 10px;
}

.first-button {
  margin-right: 10px;
}

.one-line {
  display: flex;
  align-items: center;

  .form-control {
    flex: 1;
    margin-left: 10px;
    font-weight: normal;

    // Hide text that the user has typed if it's not going to be
    //  used when they click Save
    &:disabled {
      color: transparent;
    }
  }
}

.overwrite-description {
  margin: 20px 0 10px;
}

.scenario-list {
  li {
    display: block;
    label {
      font-weight: normal;
      cursor: pointer;
    }
  }
}

</style>
