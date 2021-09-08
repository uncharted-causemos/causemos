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
        :reset-layout-token='resetLayoutToken'
        @show-model-parameters="showModelParameters"
        @set-sensitivity-analysis-type="setSensitivityAnalysisType"
        @refresh-model="refreshModelAndScenarios"
        @tab-click="tabClick"
      >
        <template #action-bar>
          <action-bar
            :model-summary="modelSummary"
            :scenarios="scenarios"
            @reset-cag="resetCAGLayout()"
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
import { getInsightById } from '@/services/insight-service';

const DRAFT_SCENARIO_ID = 'draft';
const MODEL_MSGS = modelService.MODEL_MSGS;

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
    previousScenarioId: null,

    resetLayoutToken: 0
  }),
  computed: {
    ...mapGetters({
      project: 'app/project',
      currentCAG: 'app/currentCAG',
      selectedScenarioId: 'model/selectedScenarioId',
      draftScenario: 'model/draftScenario',
      draftScenarioDirty: 'model/draftScenarioDirty',
      tour: 'tour/tour'
    }),
    ready() {
      return this.modelSummary && this.modelComponents && this.scenarios;
    },
    currentEngine() {
      return this.modelSummary.parameter.engine;
    },
    projectionSteps() {
      return this.modelSummary.parameter.num_steps;
    },
    onMatrixTab() {
      return !!(this.$route.query && this.$route.query.activeTab === 'matrix');
    }
  },
  watch: {
    sensitivityAnalysisType() {
      this.fetchSensitivityAnalysisResults();
    },
    selectedScenarioId() {
      if (this.onMatrixTab) {
        this.fetchSensitivityAnalysisResults();
      }
    },
    currentCAG() {
      this.refresh();
    },
    $route: {
      handler(/* newValue, oldValue */) {
        // NOTE:  this is only valid when the route is focused on the 'data' space
        if (this.$route.name === 'quantitative' && this.$route.query) {
          const insight_id = this.$route.query.insight_id;
          if (insight_id !== undefined) {
            this.updateStateFromInsight(insight_id);
            this.$router.push({
              query: {
                insight_id: undefined,
                activeTab: this.$route.query.activeTab || undefined
              }
            });
          }
        }
      },
      immediate: true
    }
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
      setAnalysisName: 'app/setAnalysisName',
      setSelectedScenarioId: 'model/setSelectedScenarioId',
      setDraftScenario: 'model/setDraftScenario',
      updateDraftScenarioConstraints: 'model/updateDraftScenarioConstraints',
      setDraftScenarioDirty: 'model/setDraftScenarioDirty',
      setContextId: 'insightPanel/setContextId',
      setDataState: 'insightPanel/setDataState'
    }),
    async updateStateFromInsight(insight_id) {
      const loadedInsight = await getInsightById(insight_id);
      // FIXME: before applying the insight, which will overwrite current state,
      //  consider pushing current state to the url to support browser hsitory
      //  in case the user wants to navigate to the original state using back button
      if (loadedInsight) {
        //
        // insight was found and loaded
        //
        // data state
        // FIXME: the order of resetting the state is important
        if (loadedInsight.data_state?.selectedScenarioId) {
          // this will reload datacube metadata as well as scenario runs
          this.setSelectedScenarioId(loadedInsight.data_state?.selectedScenarioId);
        }
      }
    },
    async refreshModel() {
      this.enableOverlay('Getting model data');
      this.setAnalysisName('');
      this.modelSummary = await modelService.getSummary(this.currentCAG);
      this.setAnalysisName(this.modelSummary?.name ?? '');
      this.modelComponents = await modelService.getComponents(this.currentCAG);
      this.disableOverlay();
    },
    async refreshModelAndScenarios() {
      this.refreshModel();
      const scenarios = await modelService.getScenarios(this.currentCAG, this.currentEngine);
      if (this.draftScenario) {
        this.scenarios = [this.draftScenario, ...scenarios];
      } else {
        this.scenarios = scenarios;
      }
    },
    async refresh() {
      // Basic model data
      this.enableOverlay('Loading');
      this.modelSummary = await modelService.getSummary(this.currentCAG);

      // If we have topology changes, then we should sync with inference engines
      if (this.modelSummary.is_quantified === false) {
        // Check model is ready to be used for experiments
        const errors = await modelService.initializeModel(this.currentCAG);
        if (errors.length) {
          this.disableOverlay();
          if (errors[0] === MODEL_MSGS.MODEL_TRAINING) {
            this.enableOverlay(errors[0]);
          }
          this.toaster(errors[0], 'error', true);
          console.error(errors);
          return;
        }
      }
      this.disableOverlay();

      // Check if model is still training
      if (this.modelSummary.status === modelService.MODEL_STATUS.TRAINING) {
        const r = await modelService.checkAndUpdateRegisteredStatus(this.modelSummary.id, this.currentEngine);
        // FIXME: use status code
        if (r.status === 'training') {
          this.enableOverlay(MODEL_MSGS.MODEL_TRAINING);
          this.toaster(MODEL_MSGS.MODEL_TRAINING, 'error', true);
          return;
        }
      }

      let scenarios = await modelService.getScenarios(this.currentCAG, this.currentEngine);

      await this.refreshModel();

      if (scenarios.length === 0) {
        // Now we are up to date, create base scenario
        this.enableOverlay('Creating baseline scenario');
        try {
          await modelService.createBaselineScenario(this.modelSummary);
          scenarios = await modelService.getScenarios(this.currentCAG, this.currentEngine);
        } catch (error) {
          console.error(error);
          this.toaster(error && error.message ? error.message : error, 'error', true);
          this.disableOverlay();
          return;
        }
        this.disableOverlay();
      }

      // Check if draft scenario is in play
      if (!_.isNil(this.draftScenario) && this.draftScenario.model_id === this.currentCAG) {
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


      // const selectedScenario = this.scenarios.find(s => s.id === this.selectedScenarioId);
      // if (selectedScenario && selectedScenario.is_valid === false) {
      //   this.runScenario();
      // }

      if (this.onMatrixTab) {
        this.fetchSensitivityAnalysisResults();
      }

      this.updateDataState();
    },
    updateDataState() {
      // save the scenario-id in the insight store so that it will be part of any insight captured from this view
      const dataState = {
        selectedScenarioId: this.selectedScenarioId,
        currentEngine: this.currentEngine,
        modelName: this.modelSummary.name,
        nodesCount: this.modelComponents.nodes.length
      };
      this.setDataState(dataState);
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


      // 0. Refresh
      this.enableOverlay('Synchronizing model');
      if (this.modelSummary.status === 0) {
        await modelService.initializeModel(this.currentCAG);
        await this.refreshModel();
      }

      // 1. Adjust unmatched constraints, if any
      if (selectedScenario.is_valid === false) {
        modelService.resetScenarioParameter(selectedScenario, this.modelSummary, this.modelComponents.nodes);
      }
      this.disableOverlay();

      // 2. Run experiment and wait for results
      this.enableOverlay(`Running experiment on ${this.currentEngine}`);
      let experimentId = 0;
      let result = null;

      try {
        experimentId = await modelService.runProjectionExperiment(this.currentCAG, this.projectionSteps, modelService.cleanConstraints(selectedScenario.parameter.constraints));
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
      const constraints = modelService.cleanConstraints(selectedScenario.parameter.constraints);

      const experimentId = await modelService.runSensitivityAnalysis(this.modelSummary, this.sensitivityAnalysisType, 'DYNAMIC', constraints);

      // If another sensitivity analysis started running before this one returns an ID,
      //  then don't bother fetching/processing the results to avoid a race condition
      if (this.sensitivityDataTimestamp !== now) return;
      const results = await modelService.getExperimentResult(this.modelSummary.id, experimentId, 50);

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
        // advance the tour if it is active
        if (this.tour && this.tour.id.startsWith('sensitivity-matrix-tour')) {
          this.tour.next();
        }
      }
    },
    resetCAGLayout() {
      this.resetLayoutToken = Date.now();
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
