<template>
  <div class="quantitative-view-container">
    <teleport to="#navbar-trailing-teleport-destination">
      <cag-analysis-options-button
        :model-summary="modelSummary"
        :view-after-deletion="'overview'"
      />
    </teleport>
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
            @run-model="runScenariosWrapper()"
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

<script lang="ts">
// TODO
// - Need one more status for tracking node-parameter changes (since it is a new view) so we don't constantly
//   recreate the model.
//
// NOT_REGISTERED, READY, TRAINING
//
// NOT_REGISTERED, NOT_REGISTERED_DEFERRED, READY, TRAINING
//
// OR use the presence of whether we have scenarios
// - if have scenarios then it is implied to be defferred
// - else must re-register


import _ from 'lodash';
import { mapGetters, mapActions } from 'vuex';
import TabPanel from '@/components/quantitative/tab-panel.vue';
import modelService from '@/services/model-service';
import csrUtil from '@/utils/csr-util';
import ActionBar from '@/components/quantitative/action-bar.vue';
import ModalEditParameters from '@/components/modals/modal-edit-parameters.vue';
import { getInsightById } from '@/services/insight-service';
import { defineComponent } from '@vue/runtime-core';
import useToaster from '@/services/composables/useToaster';
import { CsrMatrix } from '@/types/CsrMatrix';
import { CAGGraph, CAGModelSummary, CAGModelParameter, Scenario } from '@/types/CAG';
import useOntologyFormatter from '@/services/composables/useOntologyFormatter';
import CagAnalysisOptionsButton from '@/components/cag/cag-analysis-options-button.vue';

const DRAFT_SCENARIO_ID = 'draft';
const MODEL_MSGS = modelService.MODEL_MSGS;
const MODEL_STATUS = modelService.MODEL_STATUS;

export default defineComponent({
  name: 'QuantitativeView',
  components: {
    TabPanel,
    ActionBar,
    ModalEditParameters,
    CagAnalysisOptionsButton
  },
  setup() {
    return {
      toaster: useToaster(),
      ontologyFormatter: useOntologyFormatter()
    };
  },
  data: () => ({
    // States
    isEditIndicatorModalOpen: false,
    isEditConstraintsOpen: false,
    isModelParametersOpen: false,

    // Data for drilldown
    selectedStatements: [],

    // Core data relating to model and projections
    modelSummary: null as CAGModelSummary | null,
    modelComponents: null as CAGGraph | null,
    scenarios: null as Scenario[] | null,

    sensitivityMatrixData: null as CsrMatrix | null,
    sensitivityAnalysisType: 'GLOBAL',
    sensitivityDataTimestamp: null as number | null,

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
    ready(): boolean {
      return (
        this.modelSummary !== null &&
        this.modelComponents !== null &&
        this.scenarios !== null
      );
    },
    currentEngine(): string {
      return this.modelSummary?.parameter?.engine ?? 'dyse';
    },
    projectionSteps(): number | undefined {
      return this.modelSummary?.parameter.num_steps;
    },
    onMatrixTab(): boolean {
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
          if (typeof insight_id === 'string') {
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
    async updateStateFromInsight(insight_id: string) {
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
      this.enableOverlay('Loading');
      this.modelSummary = await modelService.getSummary(this.currentCAG);

      if (this.modelSummary === null) {
        console.error(`Failed to fetch model summary for "currentCAG" id: ${this.currentCAG}`);
        return;
      }

      const engineStatus = this.modelSummary.engine_status[this.currentEngine];

      // 1. If we have topology changes, then we should resync with inference engines
      if (engineStatus === MODEL_STATUS.NOT_REGISTERED) {
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

      // 2. Check if model is still training status
      if (engineStatus === MODEL_STATUS.TRAINING) {
        const r = await modelService.checkAndUpdateRegisteredStatus(
          this.modelSummary.id,
          this.currentEngine
        );
        // FIXME: use status code
        if (r.status === 'training') {
          this.enableOverlay(MODEL_MSGS.MODEL_TRAINING);
          this.toaster(MODEL_MSGS.MODEL_TRAINING, 'error', true);
          return;
        }
      }

      // 3. Check if we have scenarios, if not generate one
      let scenarios: Scenario[] = await modelService.getScenarios(this.currentCAG, this.currentEngine);

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

      // 4. Check if draft scenario is in play
      if (!_.isNil(this.draftScenario) && this.draftScenario.model_id === this.currentCAG) {
        scenarios.push(this.draftScenario);
      } else {
        this.setDraftScenario(null);
      }


      // 5. Figure out the current selected scenario
      let scenarioId = this.selectedScenarioId;
      if (_.isNil(this.selectedScenarioId) || scenarios.filter(d => d.id === this.selectedScenarioId).length === 0) {
        const baselineScenario = scenarios.find(d => d.is_baseline);
        if (baselineScenario === undefined) {
          console.error('No scenario is flagged as baseline.', scenarios);
        } else {
          scenarioId = baselineScenario.id;
        }
      }

      // 6. Rebuild scenarios' result if necessary
      for (const scenario of scenarios) {
        console.log(scenario.id, scenario.is_valid);
      }
      scenarios = await this.runScenarios(scenarios);

      // 7. Finally we are done and kick off the relevant events
      this.setSelectedScenarioId(scenarioId);
      this.scenarios = scenarios;


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
      if (this.modelSummary === null) {
        console.error('Trying to update data state while modelSummary is null.');
        return;
      }
      if (this.modelComponents === null) {
        console.error('Trying to update data state while modelComponents is null.');
        return;
      }
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
      if (this.scenarios === null) {
        console.error('Failed to revert draft changes because scenarios list is null.');
        return;
      }
      if (!_.isNil(this.previousScenarioId)) {
        this.setSelectedScenarioId(this.previousScenarioId);
      } else {
        const baselineScenario = this.scenarios.find(s => s.is_baseline === true);
        if (baselineScenario === undefined) {
          console.error('Failed to revert draft changes because no scenario is flagged as baseline.', this.scenarios);
        } else {
          const id = baselineScenario.id;
          this.setSelectedScenarioId(id);
        }
      }
      const temp = this.scenarios.filter(s => s.id !== DRAFT_SCENARIO_ID);

      this.setDraftScenario(null);
      this.scenarios = temp;
    },
    async overwriteScenario(id: string) {
      if (this.scenarios === null) {
        console.error('Failed to overwrite scenario, scenarios list is null.');
        return;
      }
      // Transfer draft data to overwrite existing scenario
      const draft = this.scenarios.find(s => s.id === DRAFT_SCENARIO_ID);
      if (draft === undefined) {
        console.error(
        `Failed to overwrite scenario, unable to find scenario with draft ID '${DRAFT_SCENARIO_ID}'.`
        );
        return;
      }
      const existingScenario = {
        id: id,
        model_id: this.currentCAG,
        parameter: draft.parameter
      };

      // Save and reload scenarios
      this.enableOverlay('Saving Scenario');

      await modelService.updateScenario(existingScenario);
      if (draft.experiment_id) {
        console.log('!! Draft', draft);
        await modelService.createScenarioResult(
          this.currentCAG,
          id,
          this.currentEngine,
          draft.experiment_id,
          draft.result
        );
      }

      const scenarios = await modelService.getScenarios(this.currentCAG, this.currentEngine);

      this.scenarios = scenarios;
      this.previousScenarioId = null;
      this.setSelectedScenarioId(id);
      this.disableOverlay();
    },
    async saveNewScenario({
      name,
      description
    }: {
      name: string;
      description: string;
    }) {
      if (this.scenarios === null) {
        console.error('Failed to save new scenario, scenarios list is null.');
        return;
      }
      // Transfer draft data
      const draft = this.scenarios.find(s => s.id === DRAFT_SCENARIO_ID);
      if (draft === undefined) {
        console.error(
          `Failed to save new scenario, unable to find scenario with draft ID '${DRAFT_SCENARIO_ID}'.`
        );
        return;
      }
      const newScenario = {
        model_id: this.currentCAG,
        name: name,
        description: description,
        parameter: draft.parameter,
        is_baseline: false
      };

      // Save and reload scenarios
      this.enableOverlay('Creating Scenario');
      const response = await modelService.createScenario(newScenario);
      if (draft.experiment_id) {
        await modelService.createScenarioResult(
          this.currentCAG,
          response.id,
          this.currentEngine,
          draft.experiment_id,
          draft.result
        );
      }
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
    async saveModelParameter(newParameter: Partial<CAGModelParameter>) {
      this.isModelParametersOpen = false;
      await modelService.updateModelParameter(this.currentCAG, newParameter);
      this.refresh();
    },
    closeModelParameters() {
      this.isModelParametersOpen = false;
    },
    async saveDraft({ concept, values }: { concept: string; values: any[] }) {
      this.isEditConstraintsOpen = false;
      if (this.scenarios === null) {
        console.error('Failed to save draft, scenarios list is null.');
        return;
      }
      if (this.modelSummary === null) {
        console.error('Failed to save draft, modelSummary is null.');
        return;
      }

      // 1. If no draft scenario we need to create one
      if (_.isNil(this.draftScenario)) {
        const selectedScenario = this.scenarios.find(s => s.id === this.selectedScenarioId);
        if (selectedScenario === undefined) {
          console.error(
            `Failed to save draft, unable to find scenario with selected scenario ID '${this.selectedScenarioId}'.`
          );
          return;
        }
        const draft = {
          id: 'draft',
          name: 'Draft',
          model_id: this.currentCAG,
          description: '',
          is_valid: true,
          is_baseline: false,
          parameter: {
            constraints: _.cloneDeep(selectedScenario.parameter?.constraints ?? []),
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
    async runScenariosWrapper() {
      if (!this.scenarios) return;
      const scenarios = await this.runScenarios(this.scenarios);
      // Cycle the scenarios to force reactive to trigger
      this.scenarios = [...scenarios];
    },
    async runScenarios(scenarios: Scenario[]): Promise<Scenario[]> {
      if (scenarios === null) {
        console.error('Failed to run scenario, scenarios list is null.');
        return [];
      }
      if (this.modelSummary === null) {
        console.error('Failed to run scenario, modelSummary is null.');
        return [];
      }
      if (this.modelComponents === null) {
        console.error('Failed to run scenario, modelComponents is null.');
        return [];
      }
      if (this.projectionSteps === undefined) {
        console.error('Failed to run scenario, projectionSteps is undefined.');
        return [];
      }

      const engineStatus = this.modelSummary.engine_status[this.currentEngine];

      // 0. Refresh, probably not needed ...
      this.enableOverlay('Synchronizing model');
      if (this.modelSummary && engineStatus === MODEL_STATUS.NOT_REGISTERED) {
        await modelService.initializeModel(this.currentCAG);
        await this.refreshModel();
      }

      // 1. Readjust all scenarios according to current parameters
      for (const scenario of scenarios) {
        if (scenario.is_valid === false) {
          modelService.resetScenarioParameter(scenario, this.modelSummary, this.modelComponents.nodes);
        }
      }

      this.disableOverlay();

      // 2. Run experiments where necessary
      const updateList = [];
      for (const scenario of scenarios) {
        if (scenario.is_valid === true) continue;

        try {
          this.enableOverlay(`Running ${scenario.name} on ${this.currentEngine}`);
          const experimentId = await modelService.runProjectionExperiment(this.currentCAG, this.projectionSteps, modelService.cleanConstraints(scenario.parameter?.constraints ?? []));
          const result = await modelService.getExperimentResult(this.currentCAG, experimentId);
          scenario.result = (result as any).results.data;
          scenario.experiment_id = experimentId;
          scenario.is_valid = true;
          updateList.push(scenario);
        } catch (error) {
          console.error(error);
          this.toaster(error, 'error', true);
          this.disableOverlay();
          return [];
        }
      }

      // 3. Write back if needed, we don't write draft scenario
      this.enableOverlay('Saving results');
      for (const scenario of updateList) {
        if (scenario.id === DRAFT_SCENARIO_ID) continue;
        if (!scenario.experiment_id) continue;
        await modelService.createScenarioResult(
          this.currentCAG,
          scenario.id,
          this.currentEngine,
          scenario.experiment_id,
          scenario.result
        );
      }

      // 4. Cycle the scenarios to force reactive to trigger
      this.disableOverlay();
      return scenarios;
      // this.scenarios = [...this.scenarios];

      // 2. Run experiment and wait for results
      // this.enableOverlay(`Running experiment on ${this.currentEngine}`);
      // let experimentId = '';
      // let result = null;

      // try {
      //   experimentId = await modelService.runProjectionExperiment(this.currentCAG, this.projectionSteps, modelService.cleanConstraints(selectedScenario.parameter?.constraints ?? []));
      //   result = await modelService.getExperimentResult(this.currentCAG, experimentId);
      // } catch (error) {
      //   console.error(error);
      //   this.toaster(error, 'error', true);
      //   this.disableOverlay();
      //   return;
      // }
      // this.setDraftScenarioDirty(false);

      // // FIXME: Not great to directly write into draft
      // selectedScenario.experiment_id = experimentId;
      // // FIXME: Add type for return value of modelService.getExperimentResult()
      // selectedScenario.result = (result as any).results.data;
      // selectedScenario.is_valid = true;

      // 3. We have rerun an existing scenario, need to update
      // if (this.selectedScenarioId !== DRAFT_SCENARIO_ID) {
      //   this.enableOverlay('Writing result');
      //   await modelService.updateScenario({
      //     id: selectedScenario.id,
      //     model_id: this.currentCAG,
      //     parameter: selectedScenario.parameter
      //   });
      //   await modelService.createScenarioResult(
      //     this.currentCAG,
      //     selectedScenario.id,
      //     this.currentEngine,
      //     selectedScenario.experiment_id,
      //     selectedScenario.result
      //   );
      // }

      // this.disableOverlay();

      // // 4. Cycle the scenarios to force reactive to trigger
      // this.scenarios = [...this.scenarios];
    },
    closeEditConstraints() {
      this.isEditConstraintsOpen = false;
    },
    _getGraphDensity() {
      if (_.isNil(this.modelComponents)) return 1;

      const numEdges = this.modelComponents.edges.length;
      const numNodes = this.modelComponents.nodes.length;

      return 2 * numEdges / (numNodes * (numNodes - 1));
    },
    async fetchSensitivityAnalysisResults() {
      if (
        this.currentEngine !== 'dyse' ||
        _.isNil(this.scenarios) ||
        _.isNil(this.modelSummary) ||
        _.isNil(this.modelComponents) ||
        this.scenarios.length === 0
      ) return;

      const selectedScenario = this.scenarios.find(scenario => scenario.id === this.selectedScenarioId);
      if (selectedScenario === undefined) {
        console.error(
          `Failed to fetch sensitivity analysis results, unable to find scenario with selected scenario ID '${this.selectedScenarioId}'.`
        );
        return;
      }

      // Ensure we are ready to run, sync up with engines if necessary
      const engineStatus = this.modelSummary.engine_status[this.currentEngine];
      if (engineStatus === MODEL_STATUS.NOT_REGISTERED) {
        await modelService.initializeModel(this.currentCAG);
        await this.refreshModel();
      }
      if (selectedScenario.is_valid === false) {
        modelService.resetScenarioParameter(selectedScenario, this.modelSummary, this.modelComponents.nodes);
      }

      this.sensitivityMatrixData = null;
      const now = Date.now();
      this.sensitivityDataTimestamp = now;
      const constraints = modelService.cleanConstraints(selectedScenario.parameter?.constraints ?? []);

      const experimentId = await modelService.runSensitivityAnalysis(this.modelSummary, this.sensitivityAnalysisType, 'DYNAMIC', constraints);

      // If another sensitivity analysis started running before this one returns an ID,
      //  then don't bother fetching/processing the results to avoid a race condition
      if (this.sensitivityDataTimestamp !== now) return;
      const progressFn = (current: number, max: number) => {
        if (current > 2) {
          this.enableOverlay(`Will await result for  ${(max - current) * 3} more seconds`);
        }
      };

      this.enableOverlay('Running sensitivity analysis');
      const numPolls = Math.max(10, Math.round(this._getGraphDensity() * 50));
      const results = await modelService.getExperimentResult(this.modelSummary.id, experimentId, numPolls, progressFn);
      this.disableOverlay();

      if (this.sensitivityDataTimestamp !== now) return;
      // FIXME: Add type for return value of modelService.getExperimentResult()
      const csrResults = csrUtil.resultsToCsrFormat((results as any).results[this.sensitivityAnalysisType.toLowerCase()]);
      csrResults.rows = csrResults.rows.map(this.ontologyFormatter);
      csrResults.columns = csrResults.columns.map(this.ontologyFormatter);
      this.sensitivityMatrixData = csrResults;
    },
    setSensitivityAnalysisType(newValue: string) {
      this.sensitivityAnalysisType = newValue;
    },
    tabClick(tab: string) {
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
});
</script>

<style lang="scss">
@import "~styles/variables";

.quantitative-view-container {
  height: $content-full-height;
  box-sizing: border-box;
  overflow: hidden;
  display: flex;
  isolation: isolate;

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
