<template>
  <div class="action-bar-container">
    <div>
      Scenario
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
        {{
          selectedScenario.is_valid
            ? selectedScenario.name
            : selectedScenario.name + ' (Stale)  '
        }}
        <i class="fa fa-fw fa-angle-down" />
        <dropdown-control
          v-if="isScendarioDropdownOpen"
          class="scenario-dropdown"
        >
          <template #content>
            <div
              v-for="scenario of scenarios"
              :key="scenario.id"
              class="dropdown-option"
              :class="{ selected: scenario.id === selectedScenarioId }"
              @click.stop="onClickScenario(scenario.id)"
            >
              {{
                scenario.is_valid
                  ? scenario.name
                  : scenario.name + ' (Stale - rerun scenario) '
              }}
            </div>
          </template>
        </dropdown-control>
      </button>
      <button
        v-if="isInDraftState"
        v-tooltip="'Discard all unsaved changes'"
        class="btn btn-default"
        @click="revertDraftChanges"
      >
        <i class="fa fa-fw fa-trash" />Discard
      </button>
      <button
        class="btn btn-default"
        :class="{ 'btn-primary btn-call-for-action': isDirty }"
        @click="runModel"
      >
        Run
      </button>
    </div>
    <div class="group">
      <radio-button-group
        v-if="isSensitivityAnalysisSupported"
        class="tour-matrix-tab"
        :buttons="[
          { label: 'Causal Flow', value: 'flow' },
          { label: 'Matrix', value: 'matrix' }
        ]"
        :selected-button-value="activeTab"
        @button-clicked="setActive"
      />
      <button
        v-if="activeTab === 'flow'"
        v-tooltip.top-center="'reset CAG positioning'"
        type="button"
        class="btn btn-default"
        @click="resetCAG"
      >
        <i class="fa fa-fw fa-undo" />Reset Layout
      </button>
    </div>
    <div>
      <div class="augment-model">
        <arrow-button
          :text="'Modify CAG'"
          :icon="'fa-book'"
          :is-pointing-left="true"
          @click="onAugmentCAG"
        />
      </div>
    </div>
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
import _ from 'lodash';
import { mapGetters, mapActions } from 'vuex';

import SaveScenarioModal from '../modals/modal-save-scenario';
import DropdownControl from '../dropdown-control';
import ArrowButton from '../widgets/arrow-button.vue';
import { ProjectType } from '@/types/Enums';
import RadioButtonGroup from '../widgets/radio-button-group.vue';

const PROJECTION_ENGINES = {
  DELPHI: 'delphi',
  DYSE: 'dyse'
};

export default {
  name: 'QuantitativeActionBar',
  components: {
    SaveScenarioModal,
    DropdownControl,
    ArrowButton,
    RadioButtonGroup
  },
  props: {
    currentEngine: {
      type: String,
      default: null
    },
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
    'run-model',
    'revert-draft-changes',
    'overwrite-scenario',
    'save-new-scenario',
    'reset-cag'
  ],
  data: () => ({
    isModalOpen: false,
    isScendarioDropdownOpen: false
  }),
  computed: {
    ...mapGetters({
      selectedScenarioId: 'model/selectedScenarioId',
      draftScenarioDirty: 'model/draftScenarioDirty',
      project: 'app/project',
      currentCAG: 'app/currentCAG'
    }),
    isInDraftState() {
      return this.selectedScenarioId === 'draft';
    },
    selectedScenario() {
      if (this.isInDraftState) return null;
      const found = this.scenarios.find(
        scenario => scenario.id === this.selectedScenarioId
      );
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
    isDirty() {
      return _.some(this.scenarios, s => s.is_valid === false);
    },
    isSensitivityAnalysisSupported() {
      return this.currentEngine === PROJECTION_ENGINES.DYSE;
    },
    activeTab() {
      // if we ever need more state than this
      // add a query store for model
      return this.$route.query?.activeTab || 'flow';
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
    },
    onAugmentCAG() {
      this.$router.push({
        name: 'qualitative',
        params: {
          project: this.project,
          currentCAG: this.currentCAG,
          projectType: ProjectType.Analysis
        }
      });
    },
    setActive(activeTab) {
      this.$router.push({ query: { activeTab } }).catch(() => {});
      this.$emit('tab-click', activeTab);
    }
  }
};
</script>

<style lang="scss" scoped>
@import '@/styles/variables';
.action-bar-container {
  margin-left: $navbar-outer-height;
  padding: 0 10px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  height: $navbar-outer-height;
}

.group {
  display: flex;

  & > *:not(:first-child) {
    margin-left: 5px;
  }
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

.scenario-button {
  position: relative;
}
</style>
