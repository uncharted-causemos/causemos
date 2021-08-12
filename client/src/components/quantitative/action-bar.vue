<template>
  <div class="action-bar-container">
    <ul class="unstyled-list">
      <li class="nav-item">
        <button
          v-tooltip.top-center="'reset CAG positioning'"
          type="button"
          class="btn btn-primary"
          @click="resetCAG"
        ><i class="fa fa-fw fa-undo" />Reset Layout</button>
      </li>
      <li class="nav-item">
        Scenario:
        <button
          v-if="isInDraftState"
          class="btn btn-primary scenario-button"
          @click="openModal"
        >
          <i class="fa fa-fw fa-save" />
          Save As
        </button>
        <button
          v-else
          class="btn btn-primary scenario-button"
          @click="toggleScenarioDropdownOpen"
        >
          <i class="fa fa-fw fa-sign-in" />
          {{ selectedScenario.name }}
          <i class="fa fa-fw fa-angle-down" />
          <dropdown-control
            v-if="isScendarioDropdownOpen"
            class="scenario-dropdown">
            <template #content>
              <div
                v-for="scenario of scenarios"
                :key="scenario.id"
                class="dropdown-option"
                :class="{'selected': scenario.id === selectedScenarioId}"
                @click.stop="onClickScenario(scenario.id)">
                {{ scenario.is_valid ? scenario.name : scenario.name + " (Stale - rerun scenario) " }}
              </div>
            </template>
          </dropdown-control>
        </button>
      </li>
      <li
        v-if="isInDraftState"
        class="nav-item"
      >
        <button
          v-tooltip="'Revert all unsaved changes'"
          class="btn btn-default"
          @click="revertDraftChanges"
        >
          <i class="fa fa-fw fa-refresh" />
        </button>
      </li>
      <li class="nav-item">
        <button
          class="btn btn-primary"
          :style="{background: isModelDirty? '#2A5': '#222'}"
          @click="runModel">
          Run
        </button>
      </li>
    </ul>

    <save-scenario-modal
      v-if="isModalOpen"
      :scenarios="scenarios"
      @close="closeModal"
      @overwrite-scenario="overwriteScenario"
      @save-new-scenario="saveNewScenario"
    />
  </div>
</template>

<script>
import { mapGetters, mapActions } from 'vuex';

import SaveScenarioModal from '../modals/modal-save-scenario';
import DropdownControl from '../dropdown-control';

export default {
  name: 'QuantitativeActionBar',
  components: {
    SaveScenarioModal,
    DropdownControl
  },
  props: {
    modelSummary: {
      type: Object,
      required: true
    },
    scenarios: {
      type: Array,
      default: () => []
    }
  },
  emits: [
    'run-model', 'revert-draft-changes', 'overwrite-scenario', 'save-new-scenario', 'reset-cag'
  ],
  data: () => ({
    isModalOpen: false,
    isScendarioDropdownOpen: false
  }),
  computed: {
    ...mapGetters({
      selectedScenarioId: 'model/selectedScenarioId',
      draftScenarioDirty: 'model/draftScenarioDirty'
    }),
    isInDraftState() {
      return this.selectedScenarioId === 'draft';
    },
    selectedScenario() {
      if (this.isInDraftState) return null;
      const found = this.scenarios.find(scenario => scenario.id === this.selectedScenarioId);
      if (found !== undefined) return found;

      console.error(
        'Quantitative action bar: selected scenario not found.',
        `Selected scenario ID: ${this.selectedScenarioId}`,
        `Scenarios: ${this.scenarios}`
      );
      return {
        name: '[No Scenarios Exist]'
      };
    },
    isModelDirty() {
      return this.modelSummary.status === 0 || this.draftScenarioDirty === true;
    }
  },
  methods: {
    ...mapActions({
      setSelectedScenarioId: 'model/setSelectedScenarioId'
    }),
    runModel() {
      this.$emit('run-model');
    },
    revertDraftChanges() {
      this.$emit('revert-draft-changes');
    },
    openModal() {
      this.isModalOpen = true;
    },
    closeModal() {
      this.isModalOpen = false;
    },
    resetCAG() {
      this.$emit('reset-cag');
    },
    toggleScenarioDropdownOpen() {
      this.isScendarioDropdownOpen = !this.isScendarioDropdownOpen;
    },
    onClickScenario(scenarioId) {
      if (scenarioId === this.selectedScenarioId) return;
      this.isScendarioDropdownOpen = false;
      this.setSelectedScenarioId(scenarioId);
    },
    overwriteScenario(id) {
      this.$emit('overwrite-scenario', id);
    },
    saveNewScenario(metadata) {
      this.$emit('save-new-scenario', metadata);
    }
  }
};
</script>

<style lang="scss" scoped>
@import '@/styles/variables';
  .action-bar-container {
    margin-left: 20px;
  }

  .scenario-dropdown {
    position: absolute;
    top: calc(100% + 5px);
    left: 0;
    text-align: left;
    font-weight: normal;

    .selected {
      color: $selected-dark;
      cursor: not-allowed;

      &:hover {
        background: transparent;
      }
    }
  }

  li.nav-item, .scenario-button {
    margin-left: 5px;
    position: relative;
  }
</style>
