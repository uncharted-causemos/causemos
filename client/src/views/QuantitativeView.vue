<template>
  <div class="quantitative-view-container">
    <analytical-questions-and-insights-panel />
    <div class="graph-container">
      <tab-panel
        v-if="ready"
        :model-summary="modelSummary"
        :model-components="modelComponents"
        :sensitivity-matrix-data="sensitivityMatrixData"
        :sensitivity-analysis-type="sensitivityAnalysisType"
        :scenarios="scenarios"
        :current-engine="currentEngine"
        @show-model-parameters="showModelParameters"
        @set-sensitivity-analysis-type="setSensitivityAnalysisType"
        @refresh-model="refreshModel"
        @tab-click="tabClick"
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
import ModalEditParameters from '@/components/modals/modal-edit-parameters';
import AnalyticalQuestionsAndInsightsPanel from '@/components/analytical-questions/analytical-questions-and-insights-panel.vue';

const DRAFT_SCENARIO_ID = 'draft';

export default {
  name: 'QuantitativeView',
  components: {
    TabPanel,
    ActionBar,
    ModalEditParameters,
    AnalyticalQuestionsAndInsightsPanel
  },
  data: () => ({
    // States
    isEditIndicatorModalOpen: false,
    isEditConstraintsOpen: false,
    isModelParametersOpen: false,

    // Data for drilldown
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
      updateDraftScenarioConstraints: 'model/updateDraftScenarioConstraints',
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
    revertDraftChanges() {
      if (!_.isNil(this.previousScenarioId)) {
        this.setSelectedScenarioId(this.previousScenarioId);
      } else {
        const id = this.scenarios.find(s => s.is_baseline === true).id;
        this.setSelectedScenarioId(id);
      }
      const temp = this.scenarios.filter(s => s.id !== DRAFT_SCENARIO_ID);

      this.setDraftScenario(null);
      this.scenarios = temp;
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
      this.setDraftScenario(null);
      this.setSelectedScenarioId(response.id);
      this.disableOverlay();
    },
    closeEditIndicatorModal() {
      this.isEditIndicatorModalOpen = false;
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
      await this.updateDraftScenarioConstraints({ concept, values });

      // Cycle the scenarios to force reactive to trigger
      const temp = this.scenarios.filter(s => s.id !== DRAFT_SCENARIO_ID);
      temp.push(this.draftScenario);
      this.scenarios = temp;
    },
    async runScenario() {
      const selectedScenario = this.scenarios.find(s => s.id === this.selectedScenarioId);

      if (_.isEmpty(selectedScenario)) return;

      this.enableOverlay('Running experiment');

      // 0. Refresh
      if (this.modelSummary.status === 0) {
        await modelService.initializeModel(this.currentCAG);
        await this.refreshModel();
      }

      // 1. Adjust unmatched constraints, if any
      if (selectedScenario.is_valid === false) {
        modelService.resetScenarioParameter(selectedScenario, this.modelSummary, this.modelComponents.nodes);
      }

      // 2. Run experiment and wait for results
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
      this.setDraftScenarioDirty(false);

      // FIXME: Not great to directly write into draft
      selectedScenario.experimentId = experimentId;
      selectedScenario.result = result.results.data;
      selectedScenario.is_valid = true;

      // 3. We have rerun an existing scenario, need to update
      if (this.selectedScenarioId !== DRAFT_SCENARIO_ID) {
        this.enableOverlay('Writing result');
        await modelService.updateScenario({
          id: selectedScenario.id,
          model_id: this.currentCAG,
          is_valid: true,
          experiment_id: selectedScenario.experimentId,
          parameter: selectedScenario.parameter,
          result: selectedScenario.result
        });
      }

      this.disableOverlay();

      // 4. Cycle the scenarios to force reactive to trigger
      this.scenarios = [...this.scenarios];
    },
    closeEditConstraints() {
      this.isEditConstraintsOpen = false;
    },
    async fetchSensitivityAnalysisResults() {
      if (this.currentEngine !== 'dyse' || _.isNil(this.scenarios) || this.scenarios.length === 0) return;

      const selectedScenario = this.scenarios.find(scenario => scenario.id === this.selectedScenarioId);

      // Ensure we are ready to run, sync up with engines if necessary
      if (this.modelSummary.status === 0) {
        await modelService.initializeModel(this.currentCAG);
        await this.refreshModel();
      }
      if (selectedScenario.is_valid === false) {
        modelService.resetScenarioParameter(selectedScenario, this.modelSummary, this.modelComponents.nodes);
      }

      this.sensitivityMatrixData = null;
      const now = Date.now();
      this.sensitivityDataTimestamp = now;
      const constraints = modelService.injectStepZero(this.modelComponents.nodes, selectedScenario.parameter.constraints);

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
    tabClick(tab) {
      if (tab === 'matrix') {
        this.fetchSensitivityAnalysisResults();
      }
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
