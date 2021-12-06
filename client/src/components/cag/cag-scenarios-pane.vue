<template>
  <div class="scenarios-panel-container">
    <template v-if="showNewOrEditScenario">
      <h5 class="title">{{ editingScenarioId !== '' ? 'Edit ' : 'New '}} Scenario</h5>
      <textarea
        v-model="scenarioName"
        v-focus
        type="text"
        placeholder="name"
        rows="1"
        class="scenario-text"
      />
      <span v-if="showError" style="color: red">
        please use a valid unique scenario name
      </span>
      <textarea
        v-model="scenarioDesc"
        type="text"
        placeholder="description"
        rows="10"
        class="scenario-text"
      />
      <ul class="unstyled-list">
        <button
          type="button"
          class="btn"
          style="width: 50%"
          @click.stop="showNewOrEditScenario = false">
            Cancel
        </button>
        <button
          type="button"
          class="btn btn-primary btn-call-for-action"
          style="width: 50%"
          :disabled="scenarioName.length == 0"
          @click.stop="saveScenario">
            Save
        </button>
      </ul>
    </template>
    <div v-else class="scenarios-container">
      <div
        v-for="scenario in scenarioList"
        :key="scenario.id"
        class="checklist-item"
      >
          <!-- first row display the scenario title/name -->
          <div class="checklist-item-scenario">
            <div class="checklist-item-scenario-title-and-icon" @click="selectScenario(scenario)">
              <i v-if="selectedScenario && selectedScenario.id === scenario.id" class="fa fa-circle" />
              <i v-else class="fa fa-circle-o" />
              <span class="scenario-title"> {{ scenario.name }}</span>
            </div>
            <options-button
              :dropdown-below="true"
              :wider-dropdown-options="true"
              class="options-button"
            >
              <template #content>
                <div
                  class="dropdown-option"
                  @click="editScenario(scenario)"
                >
                  <i class="fa fa-pencil" />
                  Edit
                </div>
                <div
                  class="dropdown-option"
                  :class="{ disabled: scenario.is_baseline }"
                  @click="deleteScenario(scenario)"
                >
                  <i class="fa fa-trash" />
                  Delete
                </div>
              </template>
            </options-button>
          </div>
          <div class="scenario-desc"> {{ scenario.description }}</div>
          <!-- second row display a list of scenario clamps -->
          <message-display
            v-if="!scenario.is_baseline && getScenarioClamps(scenario).length === 0"
            class="no-clamps-warning"
            :message-type="'alert-warning'"
            :message="'Select a node to define what-if conditions.'"
          />
          <div
            v-for="clamp in getScenarioClamps(scenario)"
            :key="clamp.id"
            class="checklist-item-clamp">
              <i @mousedown.stop.prevent class="fa fa-star" />
              <span
                @mousedown.stop.prevent
                class="scenario-clamp-name">
                {{ clamp.concept }}
              </span>
              <i class="fa fa-fw fa-close"
                style="pointer-events: all; cursor: pointer; margin-left: auto;"
                @click="deleteScenarioClamp(scenario, clamp)" />
          </div>
        </div>
        <button
          v-tooltip.top-center="'Add a new model scenario'"
          type="button"
          class="btn btn-primary btn-call-for-action new-scenario-button"
          @click="addNewScenario">
            <i class="fa fa-plus-circle" />
            Add new scenario
        </button>
    </div>
  </div>
</template>

<script lang="ts">
import { defineComponent, PropType } from 'vue';
import MessageDisplay from '@/components/widgets/message-display.vue';
import OptionsButton from '@/components/widgets/options-button.vue';
import { Scenario } from '@/types/CAG';
import { mapActions } from 'vuex';

export default defineComponent({
  name: 'CAGScenariosPane',
  components: {
    MessageDisplay,
    OptionsButton
  },
  emits: ['new-scenario', 'update-scenario', 'delete-scenario'],
  props: {
    scenarios: {
      type: Array as PropType<Scenario[]>,
      default: () => []
    }
  },
  data: () => ({
    scenarioName: '',
    scenarioDesc: '',
    showNewOrEditScenario: false,
    editingScenarioId: '',
    selectedScenario: null as Scenario | null,
    showError: false
  }),
  watch: {
    scenarioName() {
      this.showError = false;
    }
  },
  computed: {
    scenarioList(): Scenario[] {
      // ensure the baseline is on the top of the list
      const updatedBaselineScenario = this.scenarios.find(s => s.is_baseline);
      if (updatedBaselineScenario !== undefined) {
        const updatedScenarios = this.scenarios.filter(s => !s.is_baseline);
        updatedScenarios.unshift(updatedBaselineScenario);
        return updatedScenarios;
      }
      return this.scenarios;
    }
  },
  mounted() {
    if (this.scenarios.length > 0) {
      const baselineScenario = this.scenarios.find(s => s.is_baseline);
      if (baselineScenario !== undefined) {
        this.selectedScenario = baselineScenario;
      }
    }
  },
  methods: {
    ...mapActions({
      setSelectedScenarioId: 'model/setSelectedScenarioId'
    }),
    addNewScenario() {
      this.scenarioName = '';
      this.scenarioDesc = '';
      this.showNewOrEditScenario = true;
      this.editingScenarioId = '';
      this.showError = false;
    },
    saveScenario() {
      //
      // update the list of scenarios using scenarioName and scenarioDesc
      //
      // do not save a scenario with the same name as an existing one
      if (this.scenarios.map(s => s.name).includes(this.scenarioName)) {
        this.showError = true;
        return;
      }
      this.showError = false;
      // hide the scenario edit UI
      this.showNewOrEditScenario = false;
      // emit an event create a new scenario or update an existing one
      if (this.editingScenarioId === '') {
        this.$emit('new-scenario', {
          name: this.scenarioName,
          description: this.scenarioDesc
        });
      } else {
        this.$emit('update-scenario', {
          name: this.scenarioName,
          description: this.scenarioDesc,
          id: this.editingScenarioId
        });
      }
      // clear the variable that is used to track whether
      //  we are adding a new scenario or updating an existing one
      this.editingScenarioId = '';

      // TODO: after adding a new scenario or updating an existing one,
      //       ensure that such scenario is the selected one
    },
    deleteScenario(scenario: Scenario) {
      // do not delete baseline scenario
      // emit an event to delete a scenario
      this.$emit('delete-scenario', scenario.id);
    },
    editScenario(scenario: Scenario) {
      this.scenarioName = scenario.name;
      this.scenarioDesc = scenario.description;
      this.showNewOrEditScenario = true;
      this.editingScenarioId = scenario.id;
      this.showError = false;
    },
    deleteScenarioClamp(scenario: Scenario, clamp: any) {
      // TODO: emit an event to update the scenario and delete the relevant clamp
      console.log(scenario, clamp);
    },
    getScenarioClamps(scenario: Scenario) {
      return scenario.parameter.constraints;
    },
    selectScenario(scenario: Scenario) {
      if (this.selectedScenario && this.selectedScenario.id === scenario.id) {
        return;
      }
      this.selectedScenario = scenario;
      this.setSelectedScenarioId(scenario.id);
    }
  }
});
</script>

<style lang="scss" scoped>
  @import "~styles/variables";

  .scenario-text {
    margin-bottom: 1rem;
    border-color: gray;
    border-width: thin;
  }

  .scenarios-panel-container {
    display: flex;
    flex-direction: column;

    .scenarios-container {
      overflow-y: auto;

      .checklist-item {
        flex-direction: column;
        display: flex;
        font-size: $font-size-medium;
        margin-bottom: 25px;
        margin-top: 5px;

        .checklist-item-scenario {
          flex-direction: row;
          display: flex;
          align-items: baseline;

          .checklist-item-scenario-title-and-icon {
            width: 100%;
            cursor: pointer;
          }

          .checklist-item-menu {
            cursor: move;
            margin-right: 5px;
          }

          .scenario-title {
            user-select: none;
            flex: 1;
            min-width: 0;
            margin-right: 5px;
            margin-left: 8px;
            font-size: $font-size-extra-large;
            cursor: pointer;
          }
        }
        .scenario-desc {
            user-select: none;
            flex: 1;
            min-width: 0;
            margin-right: 5px;
            font-size: $font-size-medium;
            font-style: italic;
            margin-left: 20px;
            margin-top: 5px;
            color: $text-color-medium;
          }
        .checklist-item-clamp {
          display: flex;
          justify-content: space-between;
          align-items: center;
          user-select: none;
          margin-left: 20px;
          margin-top: 5px;
          .scenario-clamp-name {
            padding-left: 1rem;
            padding-right: 1rem;
            color: gray;
            font-style: italic;
            flex: 1;
            min-width: 0;
          }
        }
      }
    }
  }

  .no-clamps-warning {
    margin-top: 5px;
    margin-left: 20px;
    background-color: lavender;
  }

  .delete-confirm-alert {
    margin-bottom: 10px;
  }

  .new-scenario-button {
    margin: 10px 0;
    width: 100%;
  }

  .options-button {
    align-self: flex-start;
    position: relative;
    bottom: 5px;
  }

  .unstyled-list {
    display: flex;
  }
</style>
