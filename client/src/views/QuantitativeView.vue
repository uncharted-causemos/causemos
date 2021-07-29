<template>
  <div class="quantitative-view-container">
    <analytical-questions-and-insights-panel />
    <div>
      <button @click="testDraft1()">1</button>
      <button @click="testDraft2()">2</button>
      <button @click="testDraft3()">3</button>
    </div>
    <div class="graph-container">
      <tab-panel
        v-if="ready"
        :model-summary="modelSummary"
        :model-components="modelComponents"
        :sensitivity-matrix-data="sensitivityMatrixData"
        :sensitivity-analysis-type="sensitivityAnalysisType"
        :scenarios="scenarios"
        :selected-node="selectedNode"
        :current-engine="currentEngine"
        @background-click="onBackgroundClick"
        @show-indicator="showIndicator"
        @show-constraints="showConstraints"
        @show-model-parameters="showModelParameters"
        @edit-indicator="editIndicator"
        @save-indicator-edits="saveIndicatorEdits"
        @set-sensitivity-analysis-type="setSensitivityAnalysisType"
        @refresh-model="refreshModel"
      >
        <template #action-bar>
          <action-bar
            :model-summary="modelSummary"
            :scenarios="scenarios"
            @revert-draft-changes="revertDraftChanges"
            @overwrite-scenario="overwriteScenario"
            @save-new-scenario="saveNewScenario"
            @run-model="runScenario"
          />
        </template>
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
      :node-scenarios="scenariosForSelectedNode"
      :projection-steps="projectionSteps"
      @close="closeEditConstraints"
      @run-projection="saveDraft"
    />
    <modal-edit-parameters
      v-if="isModelParametersOpen"
      :model-summary="modelSummary"
      @close="closeModelParameters"
      @save="saveModelParameter"
    />
  </div>
</template>

<script>
import _ from 'lodash';
import { mapGetters, mapActions } from 'vuex';
import TabPanel from '@/components/quantitative/tab-panel';
import modelService from '@/services/model-service';
import csrUtil from '@/utils/csr-util';
import ActionBar from '@/components/quantitative/action-bar';
import EditIndicatorModal from '@/components/indicator/modal-edit-indicator';
import ModalEditConstraints from '@/components/modals/modal-edit-constraints';
import ModalEditParameters from '@/components/modals/modal-edit-parameters';
import AnalyticalQuestionsAndInsightsPanel from '@/components/analytical-questions/analytical-questions-and-insights-panel.vue';

const DRAFT_SCENARIO_ID = 'draft';

const isIndicatorChanged = (n, o) => {
  if (o.indicator_name !== n.indicator_name ||
    o.initial_value_parameter.func !== n.initial_value_parameter.func ||
    !_.isEqual(o.indicator_time_series_parameter, n.indicator_time_series_parameter)) {
    return true;
  }
  return false;
};

export default {
  name: 'QuantitativeView',
  components: {
    TabPanel,
    ActionBar,
    EditIndicatorModal,
    ModalEditConstraints,
    ModalEditParameters,
    AnalyticalQuestionsAndInsightsPanel
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
    previousScenarioId: null
  }),
  computed: {
    ...mapGetters({
      project: 'app/project',
      currentCAG: 'app/currentCAG',
      selectedScenarioId: 'model/selectedScenarioId',
      draftScenario: 'model/draftScenario',
      draftScenarioDirty: 'model/draftScenarioDirty'
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
    // selectedScenarioId() {
    //   if (_.isNil(this.scenarios)) return;
    //   this.fetchSensitivityAnalysisResults();
    //   const scenario = this.scenarios.find(s => s.id === this.selectedScenarioId);
    //   if (scenario && scenario.is_valid === false) {
    //     this.recalculateScenario(scenario);
    //   }
    // },
    sensitivityAnalysisType() {
      this.fetchSensitivityAnalysisResults();
    }
    // scenarios() {
    //   this.fetchSensitivityAnalysisResults();
    // }
  },
  created() {
    // update insight related state
    // use contextId to store cag-id
    this.setContextId([this.currentCAG]);
  },
  mounted() {
    this.refresh();
  },
  methods: {
    ...mapActions({
      enableOverlay: 'app/enableOverlay',
      disableOverlay: 'app/disableOverlay',
      setSelectedScenarioId: 'model/setSelectedScenarioId',
      setDraftScenario: 'model/setDraftScenario',
      updateDrafScenariotConstraints: 'model/updateDrafScenariotConstraints',
      setDraftScenarioDirty: 'model/setDraftScenarioDirty',
      setContextId: 'insightPanel/setContextId'
    }),
    async refreshModel() {
      this.enableOverlay();
      this.modelSummary = await modelService.getSummary(this.currentCAG);
      this.modelComponents = await modelService.getComponents(this.currentCAG);
      this.disableOverlay();
    },
    async refresh() {
      // Basic model data
      this.modelSummary = await modelService.getSummary(this.currentCAG);

      let scenarios = await modelService.getScenarios(this.currentCAG, this.currentEngine);

      console.log('check quantified', this.modelSummary.is_quantified);
      // 1. If we have no scenarios at all, then we must sync with inference engines
      // 2. If we have topology changes, then we should sync with inference engines
      if (scenarios.length === 0 || this.modelSummary.is_quantified === false) {
        // Check model is ready to be used for experiments
        const errors = await modelService.initializeModel(this.currentCAG);
        if (errors.length) {
          this.disableOverlay();
          this.toaster(errors[0], 'error', true);
          console.error(errors);
          return;
        }
      }
      await this.refreshModel();


      if (scenarios.length === 0) {
        // Now we are up to date, create base scenario
        await modelService.createBaselineScenario(this.modelSummary, this.modelComponents.nodes);
        scenarios = await modelService.getScenarios(this.currentCAG, this.currentEngine);
      }

      // Check if draft scenario is in play
      if (!_.isNil(this.draftScenario) && this.draftScenario.model_id === this.currentCAG) {
        console.log('restoring draft');
        scenarios.push(this.draftScenario);
      } else {
        this.setDraftScenario(null);
      }

      this.scenarios = scenarios;

      let scenarioId = this.selectedScenarioId;
      if (_.isNil(this.selectedScenarioId) || scenarios.filter(d => d.id === this.selectedScenarioId).length === 0) {
        scenarioId = scenarios.find(d => d.is_baseline).id;
      }
      this.setSelectedScenarioId(scenarioId);
    },
    async refreshX() {
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
        await modelService.createBaselineScenario(this.modelSummary, this.modelComponents.nodes);
        scenarios = await modelService.getScenarios(this.currentCAG, this.currentEngine);
      }

      // Set selected scenario if necessary
      let scenarioId = this.selectedScenarioId;
      if (_.isNil(this.selectedScenarioId) || scenarios.filter(d => d.id === this.selectedScenarioId).length === 0) {
        scenarioId = scenarios.find(d => d.is_baseline).id;
      }

      // Check if scenario is still valid
      // Fixme: This is awkward wiring, we need to force a scenario recalculation, but the
      // watcher won't fire if there is not change to the selectedScenarioId.
      const scenario = scenarios.find(d => d.id === scenarioId);
      if (scenario && scenario.is_valid === false) {
        this.recalculateScenario(scenario);
      } else {
        this.scenarios = scenarios;
        this.disableOverlay();
      }
      this.setSelectedScenarioId(scenarioId);

      // Cache sensitivity in the background
      if (this.currentEngine === 'dyse') {
        this.fetchSensitivityAnalysisResults();
      }
    },
    revertDraftChanges() {
      this.setSelectedScenarioId(this.previousScenarioId);
      const temp = this.scenarios.filter(s => s.id !== DRAFT_SCENARIO_ID);

      this.setDraftScenario(null);
      this.scenarios = temp;
    },
    async recalculateScenario(scenario) {
      this.enableOverlay(`Rerunning: ${scenario.name}`);

      // 1. Adjust constraints, if any
      modelService.resetScenarioParameter(scenario, this.modelSummary, this.modelComponents.nodes);

      // 2. Run experiment
      let experimentId = 0;
      let result = null;
      try {
        experimentId = await modelService.runProjectionExperiment(this.currentCAG, this.projectionSteps, modelService.injectStepZero(this.modelComponents.nodes, scenario.parameter.constraints));
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
        model_id: this.currentCAG,
        experiment_id: draft.experimentId,
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
      this.selectedNode = nodeData;
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
      this.refreshModel();
    },
    showConstraints(nodeData, scenarios) {
      this.selectedNode = nodeData;
      this.scenariosForSelectedNode = scenarios;
      this.isEditConstraintsOpen = true;
    },
    showModelParameters() {
      this.isModelParametersOpen = true;
    },
    async saveModelParameter(newParameter) {
      this.isModelParametersOpen = false;
      await modelService.updateModelParameter(this.currentCAG, newParameter);
      this.refresh();
    },
    closeModelParameters() {
      this.isModelParametersOpen = false;
    },
    async saveDraft({ concept, values }) {
      this.isEditConstraintsOpen = false;

      // 1. If no draft scenario we need to create one
      if (_.isNil(this.draftScenario)) {
        const selectedScenario = this.scenarios.find(s => s.id === this.selectedScenarioId);
        const draft = {
          id: 'draft',
          name: 'Draft',
          model_id: this.currentCAG,
          description: '',
          is_valid: true,
          is_baseline: false,
          parameter: {
            constraints: _.cloneDeep(selectedScenario.parameter.constraints),
            num_steps: this.projectionSteps,
            indicator_time_series_range: this.modelSummary.parameter.indicator_time_series_range,
            projection_start: this.modelSummary.parameter.projection_start
          },
          engine: this.currentEngine
        };
        await this.setDraftScenario(draft);
      }

      // Switch to draft
      if (this.selectedScenarioId !== DRAFT_SCENARIO_ID) {
        this.previousScenarioId = this.selectedScenarioId;
      }
      await this.setSelectedScenarioId(DRAFT_SCENARIO_ID);

      // 2. Update
      await this.updateDrafScenariotConstraints({ concept, values });

      // Cycle the scenarios to force reactive to trigger
      const temp = this.scenarios.filter(s => s.id !== DRAFT_SCENARIO_ID);
      temp.push(this.draftScenario);
      this.scenarios = temp;
    },
    async runScenario() {
      const selectedScenario = this.scenarios.find(s => s.id === this.selectedScenarioId);

      if (_.isEmpty(selectedScenario)) return;

      if (this.modelSummary.status === 0) {
        await modelService.initializeModel(this.currentCAG);
        await this.refreshModel();
      }

      this.enableOverlay('Running experiment');
      // Run experiment
      let experimentId = 0;
      let result = null;
      try {
        experimentId = await modelService.runProjectionExperiment(this.currentCAG, this.projectionSteps, modelService.injectStepZero(this.modelComponents.nodes, selectedScenario.parameter.constraints));
        result = await modelService.getExperimentResult(this.currentCAG, experimentId);
      } catch (error) {
        console.error(error);
        this.toaster(error, 'error', true);
        this.disableOverlay();
        return;
      }
      this.disableOverlay();
      this.setDraftScenarioDirty(false);

      // FIXME: draft
      selectedScenario.experimentId = experimentId;
      selectedScenario.result = result.results.data;

      // Cycle the scenarios to force reactive to trigger
      this.scenarios = [...this.scenarios];
    },
    closeEditConstraints() {
      this.isEditConstraintsOpen = false;
    },
    async fetchSensitivityAnalysisResults() {
      if (this.currentEngine !== 'dyse' || _.isNil(this.scenarios) || this.scenarios.length === 0) return;
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
      csrResults.rows = csrResults.rows.map(this.ontologyFormatter);
      csrResults.columns = csrResults.columns.map(this.ontologyFormatter);
      this.sensitivityMatrixData = csrResults;
    },
    setSensitivityAnalysisType(newValue) {
      this.sensitivityAnalysisType = newValue;
    },
    async testDraft1() {
      await this.saveDraft({
        concept: 'wm/process/conflict/attack',
        values: [
          { step: 0, value: 50 },
          { step: 2, value: 140 },
          { step: 7, value: 240 },
          { step: 10, value: -240 }
        ]
      });
    },
    async testDraft3() {
      await this.saveDraft({
        concept: 'wm/process/conflict/attack',
        values: [
          { step: 0, value: 50 },
          { step: 4, value: 900 }
        ]
      });
    },
    async testDraft2() {
      await this.saveDraft({
        concept: 'wm/concept/crisis_or_disaster/environmental/flood',
        values: [
          { step: 0, value: 50 },
          { step: 5, value: 20 }
        ]
      });
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
