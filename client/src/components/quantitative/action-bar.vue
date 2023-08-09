<template>
  <div class="action-bar-container">
    <div>
      Scenario
      <button class="btn btn-primary scenario-button" @click="toggleScenarioDropdownOpen">
        {{
          (selectedScenario as any).is_valid
            ? selectedScenario.name
            : selectedScenario.name + ' (Stale)  '
        }}
        <i class="fa fa-fw fa-angle-down" />
        <dropdown-control v-if="isScendarioDropdownOpen" class="scenario-dropdown">
          <template #content>
            <div
              v-for="scenario of scenarioOptions"
              :key="scenario.id ?? undefined"
              class="dropdown-option"
              :class="{ selected: scenario.id === selectedScenarioId }"
              @click.stop="onClickScenario(scenario.id ?? '')"
            >
              {{ scenario.is_valid ? scenario.name : scenario.name + ' (Stale - rerun scenario) ' }}
            </div>
          </template>
        </dropdown-control>
      </button>
      <button class="btn" :class="{ 'btn-call-to-action': isDirty }" @click="runModel">Run</button>
    </div>
    <div class="group">
      <button
        v-if="activeTab === 'flow'"
        v-tooltip.top-center="'reset CAG positioning'"
        type="button"
        class="btn"
        @click="resetCAG"
      >
        <i class="fa fa-fw fa-undo" />Reset Layout
      </button>
    </div>
    <div class="group">
      <button
        v-tooltip.top-center="'open data analysis with CAG indicators'"
        type="button"
        class="btn"
        style="margin-right: 1rem"
        @click="openDataAnalysis"
      >
        Data Analysis
      </button>
      <arrow-button
        :text="'Modify CAG'"
        :icon="'fa-book'"
        :is-pointing-left="true"
        @click="onAugmentCAG"
      />
    </div>
  </div>
</template>

<script lang="ts">
import _ from 'lodash';
import { defineComponent, PropType, ref, computed } from 'vue';
import { useStore } from 'vuex';

import DropdownControl from '@/components/dropdown-control.vue';
import ArrowButton from '../widgets/arrow-button.vue';
import { ProjectType } from '@/types/Enums';

import { CAGModelSummary, Scenario } from '@/types/CAG';

export default defineComponent({
  name: 'QuantitativeActionBar',
  components: {
    DropdownControl,
    ArrowButton,
  },
  props: {
    currentEngine: {
      type: String,
      default: null,
    },
    modelSummary: {
      type: Object as PropType<CAGModelSummary>,
      required: true,
    },
    scenarios: {
      type: Array as PropType<Scenario[]>,
      default: () => [],
    },
  },
  emits: ['run-model', 'reset-cag', 'open-data-analysis-for-cag'],
  setup() {
    const store = useStore();
    const isScendarioDropdownOpen = ref(false);
    const selectedScenarioId = computed(() => store.getters['model/selectedScenarioId']);
    const project = computed(() => store.getters['app/project']);
    const currentCAG = computed(() => store.getters['app/currentCAG']);

    const setSelectedScenarioId = (id: string) => {
      store.dispatch('model/setSelectedScenarioId', id);
    };

    return {
      isScendarioDropdownOpen,
      selectedScenarioId,
      project,
      currentCAG,

      // actions
      setSelectedScenarioId,
    };
  },
  computed: {
    selectedScenario() {
      const found = this.scenarioOptions.find(
        (scenario) => scenario.id === this.selectedScenarioId
      );
      if (found !== undefined) return found;

      console.error(
        'Quantitative action bar: selected scenario not found.',
        `Selected scenario ID: ${this.selectedScenarioId}`,
        `Scenarios: ${this.scenarios}`
      );
      return {
        name: '[No Scenarios Exist]',
      };
    },
    scenarioOptions() {
      return [{ id: null, name: 'Historical data', is_valid: true }, ...this.scenarios];
    },
    isDirty() {
      return _.some(this.scenarios, (s) => s.is_valid === false);
    },
    activeTab() {
      // if we ever need more state than this
      // add a query store for model
      return this.$route.query?.activeTab || 'flow';
    },
  },
  methods: {
    runModel() {
      this.$emit('run-model');
    },
    resetCAG() {
      this.$emit('reset-cag');
    },
    openDataAnalysis() {
      this.$emit('open-data-analysis-for-cag');
    },
    toggleScenarioDropdownOpen() {
      this.isScendarioDropdownOpen = !this.isScendarioDropdownOpen;
    },
    onClickScenario(scenarioId: string) {
      if (scenarioId === this.selectedScenarioId) return;
      this.isScendarioDropdownOpen = false;
      this.setSelectedScenarioId(scenarioId);
    },
    onAugmentCAG() {
      this.$router.push({
        name: 'qualitative',
        params: {
          project: this.project,
          currentCAG: this.currentCAG,
          projectType: ProjectType.Analysis,
        },
      });
    },
  },
});
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
