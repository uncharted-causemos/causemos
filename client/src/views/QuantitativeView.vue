<template>
  <div class="quantitative-view-container">
    <div class="graph-container">
      <tab-panel
        v-if="ready"
        :model-summary="modelSummary"
        :model-components="modelComponents"
        :sensitivity-matrix-data="sensitivityMatrixData"
        :sensitivity-analysis-type="sensitivityAnalysisType"
        :scenarios="scenarios"
        :selected-node="selectedNode"
        @background-click="onBackgroundClick"
        @show-indicator="showIndicator"
        @show-constraints="showConstraints"
        @show-model-parameters="showModelParameters"
        @edit-indicator="editIndicator"
        @save-indicator-edits="saveIndicatorEdits"
        @set-sensitivity-analysis-type="setSensitivityAnalysisType"
        @refresh="refresh"
      >
        <action-bar
          slot="action-bar"
          :scenarios="scenarios"
          @revert-draft-changes="revertDraftChanges"
          @overwrite-scenario="overwriteScenario"
          @save-new-scenario="saveNewScenario"
        />
      </tab-panel>
    </div>
    <edit-indicator-modal
      v-if="isEditIndicatorModalOpen"
      :node-data="selectedNode"
      :model-summary="modelSummary"
      @close="closeEditIndicatorModal"
      @save="saveIndicatorEdits"
    />
    <modal-edit-constraints
      v-if="isEditConstraintsOpen"
      :node="selectedNode"
      :scenarios="scenariosForSelectedNode"
      :projection-steps="projectionSteps"
      @close="closeEditConstraints"
      @run-projection="runProjection"
    />
    <modal-edit-parameters
      v-if="isModelParametersOpen"
      :model-summary="modelSummary"
      @close="closeModelParameters"
      @save="saveModelParameters"
    />
  </div>
</template>

<script>
import _ from 'lodash';
import Vue from 'vue';
import { mapGetters, mapActions } from 'vuex';
import TabPanel from '@/components/quantitative/tab-panel';
import modelService from '@/services/model-service';
import { conceptShortName } from '@/utils/concept-util';
import csrUtil from '@/utils/csr-util';
import ActionBar from '@/components/quantitative/action-bar';
import EditIndicatorModal from '@/components/indicator/modal-edit-indicator';
import ModalEditConstraints from '@/components/modals/modal-edit-constraints';
import ModalEditParameters from '@/components/modals/modal-edit-parameters';

const DRAFT_SCENARIO_ID = null; // ID for draft scenario

const isIndicatorChanged = (n, o) => {
  if (o.indicator_name !== n.indicator_name ||
    o.initial_value_parameter.func !== n.initial_value_parameter.func ||
    !_.isEqual(o.indicator_time_series_parameter, n.indicator_time_series_parameter)) {
    return true;
  }
  return false;
};

// FIXME: Inject step=0 initial value constraints per node, we shouldn't need to do this,
// engine should handle this quirky case. Sep 2020
//
// @param {array} nodeParameters - nodes
// @param {array} constraints - the current scenario constraints
const injectStepZero = (nodeParameters, constraints) => {
  const result = _.cloneDeep(constraints);
  nodeParameters.forEach(n => {
    const concept = n.concept;
    const initialValue = _.isNil(n.parameter) ? 0 : n.parameter.initial_value;

    const current = result.find(c => c.concept === concept);
    if (!_.isNil(current)) {
      if (!_.some(current.values, v => v.step === 0)) {
        current.values.push({ step: 0, value: initialValue });
      }
    } else {
      result.push({
        concept: concept,
        values: [{ step: 0, value: initialValue }]
      });
    }
  });

  result.forEach(r => {
    r.values = _.orderBy(r.values, v => v.step);
  });

  return result;
};


export default {
  name: 'QuantitativeView',
  components: {
    TabPanel,
    ActionBar,
    EditIndicatorModal,
    ModalEditConstraints,
    ModalEditParameters
  },
  data: () => ({
    // States
    isEditIndicatorModalOpen: false,
    isEditConstraintsOpen: false,
    isModelParametersOpen: false,

    // Data for drilldown
    selectedNode: null,
    selectedStatements: [],

    // Core data relating to model and projections
    modelSummary: null,
    modelComponents: null,
    scenarios: null,

    sensitivityMatrixData: null,
    sensitivityAnalysisType: 'GLOBAL',
    sensitivityDataTimestamp: null,

    // Tracking draft scenario
    previousScenarioId: null,
    draftScenario: null
  }),
  computed: {
    ...mapGetters({
      project: 'app/project',
      currentCAG: 'app/currentCAG',
      selectedScenarioId: 'model/selectedScenarioId'
    }),
    ready() {
      return this.modelSummary && this.modelComponents && this.scenarios;
    },
    currentEngine() {
      return this.modelSummary.parameter.engine;
    },
    projectionSteps() {
      return this.modelSummary.parameter.num_steps;
    }
  },
  watch: {
    selectedScenarioId() {
      this.fetchSensitivityAnalysisResults();
    },
    sensitivityAnalysisType() {
      this.fetchSensitivityAnalysisResults();
    }
  },
  mounted() {
    this.refresh();
  },
  beforeUnmount() {
    this.setSelectedScenarioId(null);
  },
  methods: {
    ...mapActions({
      enableOverlay: 'app/enableOverlay',
      disableOverlay: 'app/disableOverlay',
      setSelectedScenarioId: 'model/setSelectedScenarioId'
    }),
    async refresh() {
      this.enableOverlay();

      // Check model is ready to be used for experiments
      const errors = await modelService.initializeModel(this.currentCAG);
      if (errors.length) {
        this.disableOverlay();
        this.toaster(errors[0], 'error', true);
        console.error(errors);
        return;
      }

      // Fetch core data that will run this view and children components
      this.modelSummary = await modelService.getSummary(this.currentCAG);
      this.modelComponents = await modelService.getComponents(this.currentCAG);
      let scenarios = await modelService.getScenarios(this.currentCAG, this.currentEngine);

      // Create a base scenario if none existed
      if (scenarios.length === 0) {
        let experimentId = 0;
        let result = null;
        try {
          experimentId = await modelService.runProjectionExperiment(this.currentCAG, this.projectionSteps, injectStepZero(this.modelComponents.nodes, []));
          result = await modelService.getExperimentResult(this.currentCAG, experimentId);
        } catch (error) {
          this.toaster(error.response.data, 'error', true);
          this.disableOverlay();
          return;
        }

        const scenario = {
          modelId: this.currentCAG,
          experimentId: experimentId,
          result: result.results.data,
          name: 'Baseline scenario',
          description: 'Baseline scenario',
          parameter: {
            constraints: [],
            num_steps: this.projectionSteps,
            indicator_time_series_range: this.modelSummary.parameter.indicator_time_series_range,
            projection_start: this.modelSummary.parameter.projection_start
          },
          engine: this.currentEngine,
          is_baseline: true,
          is_valid: true
        };
        await modelService.createScenario(scenario);
        scenarios = await modelService.getScenarios(this.currentCAG, this.currentEngine);
      }
      this.scenarios = scenarios;
      this.disableOverlay();

      if (_.isNil(this.selectedScenarioId)) {
        const baselineScenarioId = scenarios.find(d => d.is_baseline).id;
        this.setSelectedScenarioId(baselineScenarioId);
      } else {
        // Fixme: This is awkward wiring, we need to force a scenario recalculation, but the
        // watcher won't fire if there is not change to the selectedScenarioId.
        const scenario = scenarios.find(d => d.id === this.selectedScenarioId);
        if (scenario && scenario.is_valid === false) {
          this.recalculateScenario(scenario);
        }
      }
      this.fetchSensitivityAnalysisResults();
    },
    revertDraftChanges() {
      this.setSelectedScenarioId(this.previousScenarioId);
      const temp = this.scenarios.filter(s => s.id !== DRAFT_SCENARIO_ID);

      this.draftScenario = null;
      Vue.set(this, 'scenarios', temp);
    },
    async recalculateScenario(scenario) {
      this.enableOverlay(`Rerunning: ${scenario.name}`);

      // 1. Adjust constraints, if any
      modelService.resetScenarioParameter(scenario, this.modelSummary, this.modelComponents.nodes);

      // 2. Run experiment
      let experimentId = 0;
      let result = null;
      try {
        experimentId = await modelService.runProjectionExperiment(this.currentCAG, this.projectionSteps, injectStepZero(this.modelComponents.nodes, scenario.parameter.constraints));
        result = await modelService.getExperimentResult(this.currentCAG, experimentId);
      } catch (error) {
        this.toaster(error.response.data, 'error', true);
        this.disableOverlay();
        return;
      }

      // 3. Save and revert invalid state
      scenario.experimentId = experimentId;
      scenario.result = result.results.data;
      scenario.is_valid = true;

      await modelService.updateScenario({
        id: scenario.id,
        model_id: this.currentCAG,
        is_valid: true,
        experiment_id: scenario.experimentId,
        parameter: scenario.parameter,
        result: scenario.result
      });

      // 4.Reload scenarios data
      const scenarios = await modelService.getScenarios(this.currentCAG, this.currentEngine);
      this.scenarios = scenarios;

      this.disableOverlay();
    },
    async overwriteScenario(id) {
      // Transfer draft data to overwrite existing scenario
      const draft = this.scenarios.find(s => s.id === DRAFT_SCENARIO_ID);
      const existingScenario = {
        id: id,
        model_id: this.currentCAG,
        is_valid: true,
        experiment_id: draft.experimentId,
        parameter: draft.parameter,
        result: draft.result
      };

      // Save and reload scenarios
      this.enableOverlay('Saving Scenario');
      await modelService.updateScenario(existingScenario);
      const scenarios = await modelService.getScenarios(this.currentCAG, this.currentEngine);

      this.scenarios = scenarios;
      this.previousScenarioId = null;
      this.setSelectedScenarioId(id);
      this.disableOverlay();
    },
    async saveNewScenario({ name, description }) {
      // Transfer draft data
      const draft = this.scenarios.find(s => s.id === DRAFT_SCENARIO_ID);
      const newScenario = {
        modelId: this.currentCAG,
        experimentId: draft.experimentId,
        result: draft.result,
        name: name,
        description: description,
        parameter: draft.parameter,
        engine: this.currentEngine,
        is_baseline: false
      };

      // Save and reload scenarios
      this.enableOverlay('Creating Scenario');
      const response = await modelService.createScenario(newScenario);
      const scenarios = await modelService.getScenarios(this.currentCAG, this.currentEngine);

      this.scenarios = scenarios;
      this.previousScenarioId = null;
      this.setSelectedScenarioId(response.id);
      this.disableOverlay();
    },
    onBackgroundClick() {
      this.selectedNode = null;
    },
    showIndicator(nodeData) {
      Vue.set(this, 'selectedNode', nodeData);
    },
    editIndicator() {
      this.isEditIndicatorModalOpen = true;
    },
    closeEditIndicatorModal() {
      this.isEditIndicatorModalOpen = false;
    },
    async saveIndicatorEdits(newParameter) {
      // Check if we actually changed something
      const parameter = this.selectedNode.parameter;
      if (isIndicatorChanged(parameter, newParameter) === false) {
        return;
      }

      this.selectedNode.parameter = newParameter;

      // FIXME: Strip off month/year, ideally this should be done upstream at API (indicator-data)
      this.selectedNode.parameter.indicator_time_series.forEach(v => {
        delete v.month;
        delete v.year;
        delete v.missing;
      });

      // update and save
      // FIXME: Reset all selection state to have a clean start - we should try to preserve states when things are stable - Sept 2020.
      await modelService.updateNodeParameter(this.currentCAG, this.selectedNode);
      this.selectedNode = null;
      this.refresh();
    },
    showConstraints(nodeData, scenarios) {
      this.selectedNode = nodeData;
      this.scenariosForSelectedNode = scenarios;
      this.isEditConstraintsOpen = true;
    },
    showModelParameters() {
      this.isModelParametersOpen = true;
    },
    async saveModelParameters(newParameter) {
      this.isModelParametersOpen = false;
      await modelService.updateModelParameter(this.currentCAG, newParameter);
      this.refresh();
    },
    closeModelParameters() {
      this.isModelParametersOpen = false;
    },
    async runProjection({ concept, constraints }) {
      // FIXME: remove reliance on timestamp
      constraints.forEach(c => {
        delete c.timestamp;
      });

      this.isEditConstraintsOpen = false;
      this.enableOverlay('Running experiment');

      // Set draft scenario if none existed
      if (_.isNil(this.draftScenario)) {
        const selectedScenario = this.scenarios.find(s => s.id === this.selectedScenarioId);

        this.draftScenario = {
          id: DRAFT_SCENARIO_ID,
          modelId: this.currentCAG,
          parameter: {
            constraints: _.cloneDeep(selectedScenario.parameter.constraints),
            num_steps: this.projectionSteps,
            indicator_time_series_range: this.modelSummary.parameter.indicator_time_series_range,
            projection_start: this.modelSummary.parameter.projection_start
          },
          engine: this.currentEngine,
          is_baseline: false,
          is_valid: true
        };
      }

      // Overwrite
      _.remove(this.draftScenario.parameter.constraints, d => d.concept === concept);
      if (!_.isEmpty(constraints)) {
        this.draftScenario.parameter.constraints.push({
          concept,
          values: constraints
        });
      }

      // Run experiment
      let experimentId = 0;
      let result = null;
      try {
        experimentId = await modelService.runProjectionExperiment(this.currentCAG, this.projectionSteps, injectStepZero(this.modelComponents.nodes, this.draftScenario.parameter.constraints));
        result = await modelService.getExperimentResult(this.currentCAG, experimentId);
      } catch (error) {
        this.toaster(error.response.data, 'error', true);
        this.disableOverlay();
        return;
      }
      this.disableOverlay();

      this.draftScenario.experimentId = experimentId;
      this.draftScenario.result = result.results.data;

      // Cycle the scenarios to force reactive to trigger
      const temp = this.scenarios.filter(s => s.id !== DRAFT_SCENARIO_ID);
      temp.push(this.draftScenario);
      Vue.set(this, 'scenarios', temp);

      // Switch to draft
      if (this.selectedScenarioId !== DRAFT_SCENARIO_ID) {
        this.previousScenarioId = this.selectedScenarioId;
      }
      this.setSelectedScenarioId(DRAFT_SCENARIO_ID);
    },
    closeEditConstraints() {
      this.isEditConstraintsOpen = false;
    },
    async fetchSensitivityAnalysisResults() {
      if (_.isNil(this.scenarios) || this.scenarios.length === 0) return;
      this.sensitivityMatrixData = null;
      const now = Date.now();
      this.sensitivityDataTimestamp = now;
      const constraints = this.scenarios.find(scenario => scenario.id === this.selectedScenarioId).parameter.constraints;
      const experimentId = await modelService.runSensitivityAnalysis(this.modelSummary, this.sensitivityAnalysisType, 'DYNAMIC', constraints);
      // If another sensitivity analysis started running before this one returns an ID,
      //  then don't bother fetching/processing the results to avoid a race condition
      if (this.sensitivityDataTimestamp !== now) return;
      const results = await modelService.getExperimentResult(this.modelSummary.id, experimentId);
      if (this.sensitivityDataTimestamp !== now) return;
      const csrResults = csrUtil.resultsToCsrFormat(results.results[this.sensitivityAnalysisType.toLowerCase()]);
      csrResults.rows = csrResults.rows.map(conceptShortName);
      csrResults.columns = csrResults.columns.map(conceptShortName);
      this.sensitivityMatrixData = csrResults;
    },
    setSensitivityAnalysisType(newValue) {
      this.sensitivityAnalysisType = newValue;
    }
  }
};
</script>

<style lang="scss">
@import "~styles/variables";

.quantitative-view-container {
  height: $content-full-height;
  box-sizing: border-box;
  overflow: hidden;
  display: flex;

  .graph-container {
    width: 100%;
    height: 100%;
    min-width: 0;
  }
}

.quantitative-drilldown {
  z-index: 1;
}
</style>
