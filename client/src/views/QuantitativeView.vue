<template>
  <div class="quantitative-view-container">
    <teleport to="#navbar-trailing-teleport-destination">
      <cag-analysis-options-button
        :model-summary="modelSummary"
        :view-after-deletion="'overview'"
      />
    </teleport>
    <tab-panel
      v-if="ready && isTraining === false"
      class="graph-container"
      :model-summary="modelSummary"
      :model-components="modelComponents"
      :sensitivity-matrix-data="sensitivityMatrixData"
      :sensitivity-analysis-type="sensitivityAnalysisType"
      :scenarios="scenarios"
      :current-engine="currentEngine"
      :reset-layout-token='resetLayoutToken'
      @set-sensitivity-analysis-type="setSensitivityAnalysisType"
      @refresh-model="refreshModelAndScenarios"
      @model-parameter-changed="refresh"
      @new-scenario='onCreateScenario'
      @update-scenario='onUpdateScenario'
      @delete-scenario='onDeleteScenario'
    >
      <template #action-bar>
        <action-bar
          :current-engine="currentEngine"
          :model-summary="modelSummary"
          :scenarios="scenarios"
          @reset-cag="resetCAGLayout()"
          @run-model="runScenariosWrapper"
          @tab-click="tabClick"
        />
      </template>
    </tab-panel>
    <div v-if="isTraining === true">
      <h4 style="margin-left: 15px">
        Model is currently training on the {{currentEngine}} engine, you can switch to
        <button class="btn btn-primary btn-sm" @click="switchEngine('dyse')">DySE</button> to continue running experiments.
      </h4>
    </div>
  </div>
</template>

<script lang="ts">
import _ from 'lodash';
import { defineComponent } from '@vue/runtime-core';
import { mapGetters, mapActions } from 'vuex';

import ActionBar from '@/components/quantitative/action-bar.vue';
import TabPanel from '@/components/quantitative/tab-panel.vue';
import CagAnalysisOptionsButton from '@/components/cag/cag-analysis-options-button.vue';
import modelService from '@/services/model-service';
import { getInsightById } from '@/services/insight-service';
import useToaster from '@/services/composables/useToaster';
import useOntologyFormatter from '@/services/composables/useOntologyFormatter';
import { getLastTimeStepFromTimeScale } from '@/utils/time-scale-util';
// import csrUtil from '@/utils/csr-util';
import { CsrMatrix } from '@/types/CsrMatrix';
import { CAGGraph, CAGModelSummary, NewScenario, Scenario } from '@/types/CAG';

const MODEL_MSGS = modelService.MODEL_MSGS;
const MODEL_STATUS = modelService.MODEL_STATUS;

export default defineComponent({
  name: 'QuantitativeView',
  components: {
    TabPanel,
    ActionBar,
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

    // Data for drilldown
    selectedStatements: [],

    // Core data relating to model and projections
    modelSummary: null as CAGModelSummary | null,
    modelComponents: null as CAGGraph | null,
    scenarios: null as Scenario[] | null,

    sensitivityMatrixData: null as CsrMatrix | null,
    sensitivityAnalysisType: 'GLOBAL',
    sensitivityDataTimestamp: null as number | null,

    resetLayoutToken: 0,
    isTraining: false
  }),
  computed: {
    ...mapGetters({
      project: 'app/project',
      currentCAG: 'app/currentCAG',
      selectedScenarioId: 'model/selectedScenarioId',
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
    projectionSteps(): number {
      if (this.modelSummary === null) return 12;
      return getLastTimeStepFromTimeScale(this.modelSummary.parameter.time_scale);
    },
    onMatrixTab(): boolean {
      return !!(this.$route.query && this.$route.query.activeTab === 'matrix');
    }
  },
  watch: {
    // sensitivityAnalysisType() {
    //   this.fetchSensitivityAnalysisResults();
    // },
    // selectedScenarioId() {
    //   if (this.onMatrixTab) {
    //     this.fetchSensitivityAnalysisResults();
    //   }
    // },
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
      setContextId: 'insightPanel/setContextId',
      setDataState: 'insightPanel/setDataState'
    }),
    async onCreateScenario(scenarioInfo: { name: string; description: string }) {
      if (this.scenarios === null) {
        console.error('Failed to save new scenario, scenarios list is null.');
        return;
      }
      const baselineScenario = this.scenarios.find(s => s.is_baseline);
      if (baselineScenario === undefined) {
        console.error('Failed to save new scenario, baseline scenario is null.');
        return;
      }
      // add new scenario
      const newScenario: NewScenario = {
        model_id: this.currentCAG,
        name: scenarioInfo.name,
        description: scenarioInfo.description,
        is_baseline: false,
        parameter: _.cloneDeep(baselineScenario?.parameter)
      };
      this.enableOverlay('Creating Scenario');
      const createdScenario = await modelService.createScenario(newScenario);
      this.setSelectedScenarioId(createdScenario.id);

      // Save and reload scenarios
      await this.reloadScenarios();
      this.disableOverlay();
    },
    async onUpdateScenario(scenarioInfo: { id: string; name: string; description: string }) {
      if (this.scenarios === null) {
        console.error('Failed to update scenario, scenarios list is null.');
        return;
      }
      const baselineScenario = this.scenarios.find(s => s.is_baseline);
      if (baselineScenario === undefined) {
        console.error('Failed to update scenario, baseline scenario is null.');
        return;
      }
      // updating existing scenario
      const existingScenario = {
        id: scenarioInfo.id,
        name: scenarioInfo.name,
        description: scenarioInfo.description,
        model_id: this.currentCAG
      };
      this.enableOverlay('Saving Scenario');
      await modelService.updateScenario(existingScenario);
      this.setSelectedScenarioId(scenarioInfo.id);

      // Save and reload scenarios
      await this.reloadScenarios();
      this.disableOverlay();
    },
    async onDeleteScenario(id: string) {
      if (this.scenarios === null) {
        console.error('Failed to remove scenario, scenarios list is null.');
        return;
      }
      const baselineScenario = this.scenarios.find(s => s.is_baseline);
      if (baselineScenario !== undefined && id === baselineScenario.id) {
        console.error('Failed to remove scenario, baseline scenario is not removable.');
        return;
      }
      const scenarioToRemove = this.scenarios.find(s => s.id === id);
      if (scenarioToRemove === undefined) {
        console.error('Failed to remove scenario, scenario does not exist in scenario list.');
        return;
      }
      this.enableOverlay('Removing Scenario');
      await modelService.deleteScenario(scenarioToRemove);
      // Save and reload scenarios
      await this.reloadScenarios();
      this.disableOverlay();
    },
    async reloadScenarios() {
      this.scenarios = await modelService.getScenarios(this.currentCAG, this.currentEngine);
    },
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
      this.scenarios = await modelService.getScenarios(this.currentCAG, this.currentEngine);
    },
    async refresh() {
      this.isTraining = false;
      this.enableOverlay('Loading');
      this.modelSummary = await modelService.getSummary(this.currentCAG);

      let scenarios: Scenario[] = await modelService.getScenarios(this.currentCAG, this.currentEngine);

      // This is used to denote either
      // - A fresh start, or
      // - A case where you may have 3 scenarios but less than 3 results, this happens with we switch engines
      const hasEmptyScenarioResults = _.isEmpty(scenarios) || _.some(scenarios, s => _.isEmpty(s.result));

      if (this.modelSummary === null) {
        console.error(`Failed to fetch model summary for "currentCAG" id: ${this.currentCAG}`);
        return;
      }

      const engineStatus = this.modelSummary.engine_status[this.currentEngine];

      // 1. Check if we want to run re-register against the engine
      // Topology and parameterization changes are reflected as NOT_REGISTERD, we can hold off
      // to avoid excessive waiting times. However if there are unset/empty scenario-results it
      // creates a lot of data problems downstream and we are better off kicking off the reregister
      // process.
      if (engineStatus === MODEL_STATUS.NOT_REGISTERED && hasEmptyScenarioResults) {
        // Check model is ready to be used for experiments
        const errors = await modelService.initializeModel(this.currentCAG);
        if (errors.length) {
          this.disableOverlay();
          if (errors[0] === MODEL_MSGS.MODEL_TRAINING) {
            this.isTraining = true;
          } else {
            this.toaster(errors[0], 'error', true);
          }
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
          this.isTraining = true;
          return;
        }
      }

      // 3. Check if we have scenarios, if not generate one
      await this.refreshModel();

      if (scenarios.length === 0) {
        // Now we are up to date, create base scenario
        this.enableOverlay('Creating baseline scenario');
        try {
          await modelService.createBaselineScenario(this.modelSummary);
          scenarios = await modelService.getScenarios(this.currentCAG, this.currentEngine);
        } catch (error) {
          console.error(error);
          const errorMessage: string = error && (error as any).message ? (error as any).message : error;
          this.toaster(errorMessage, 'error', true);
          this.disableOverlay();
          return;
        }
        this.disableOverlay();
      }


      // 4. Figure out the current selected scenario
      let scenarioId = this.selectedScenarioId;
      if (_.isNil(this.selectedScenarioId) || scenarios.filter(d => d.id === this.selectedScenarioId).length === 0) {
        const baselineScenario = scenarios.find(d => d.is_baseline);
        if (baselineScenario === undefined) {
          console.error('No scenario is flagged as baseline.', scenarios);
        } else {
          scenarioId = baselineScenario.id;
        }
      }

      // 5. Rebuild scenarios' result if necessary
      if (hasEmptyScenarioResults) {
        scenarios = await this.runScenarios(scenarios);
      }

      // 6. Finally we are done and kick off the relevant events
      this.setSelectedScenarioId(scenarioId);
      this.scenarios = scenarios;

      // FIXME: Restore sensitivity insight
      // if (this.onMatrixTab) {
      //   this.fetchSensitivityAnalysisResults();
      // }

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
    closeEditIndicatorModal() {
      this.isEditIndicatorModalOpen = false;
    },
    async runScenariosWrapper() {
      if (!this.scenarios) return;
      const scenarios = await this.runScenarios(this.scenarios);
      if (_.isEmpty(scenarios)) {
        return;
      }

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

      this.isTraining = false;
      const engineStatus = this.modelSummary.engine_status[this.currentEngine];

      // 0. Refresh, probably not needed ...
      this.enableOverlay('Synchronizing model');
      if (this.modelSummary && engineStatus === MODEL_STATUS.NOT_REGISTERED) {
        const errors = await modelService.initializeModel(this.currentCAG);
        if (errors.length) {
          this.disableOverlay();
          if (errors[0] === MODEL_MSGS.MODEL_TRAINING) {
            this.isTraining = true;
          } else {
            this.toaster(errors[0], 'error', true);
          }
          console.error(errors);
          return [];
        }
        await this.refreshModel();
      }

      // 1. Readjust all scenarios according to current model parameters (steps, time range), and
      // topology (if concepts still exist).
      for (const scenario of scenarios) {
        if (scenario.is_valid === false) {
          modelService.resetScenarioParameter(scenario, this.modelSummary, this.modelComponents.nodes);
        }
      }

      this.disableOverlay();

      // 2. Run experiments where necessary, run sensitivity analyses in the backround where necessary
      // 2.1 Process sensitivity analyses, these run in the background
      for (const scenario of scenarios) {
        if (scenario.is_valid === true) continue;

        const constraints = modelService.cleanConstraints(scenario.parameter?.constraints ?? []);
        const sensitivityExperimentId = await modelService.runSensitivityAnalysis(this.modelSummary, 'GLOBAL', 'DYNAMIC', constraints);
        await modelService.createScenaioSensitivityResult(this.currentCAG, scenario.id, this.modelSummary.parameter.engine, sensitivityExperimentId, null);
      }

      // 2.2 Process projection experiments
      const updateList = [];
      for (const scenario of scenarios) {
        if (scenario.is_valid === true) continue;

        try {
          this.enableOverlay(`Running ${scenario.name} on ${this.currentEngine}`);
          const experimentId = await modelService.runProjectionExperiment(
            this.currentCAG,
            this.projectionSteps,
            modelService.cleanConstraints(scenario.parameter?.constraints ?? [])
          );

          const experiment: any = await modelService.getExperimentResult(this.currentCAG, experimentId);
          // FIXME: Delphi uses .results, DySE uses .results.data
          if (!_.isEmpty(experiment.results.data)) {
            scenario.result = experiment.results.data;
          } else {
            scenario.result = experiment.results;
          }
          scenario.experiment_id = experimentId;
          scenario.is_valid = true;
          updateList.push(scenario);
        } catch (error) {
          console.error(error);
          this.toaster(error as string, 'error', true);
          this.disableOverlay();
          return [];
        }
      }

      // 3. Write back if needed
      this.enableOverlay('Saving results');
      for (const scenario of updateList) {
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
    // async fetchSensitivityAnalysisResults() {
    //   if (
    //     this.currentEngine !== 'dyse' ||
    //     _.isNil(this.scenarios) ||
    //     _.isNil(this.modelSummary) ||
    //     _.isNil(this.modelComponents) ||
    //     this.scenarios.length === 0
    //   ) return;

    //   const selectedScenario = this.scenarios.find(scenario => scenario.id === this.selectedScenarioId);
    //   if (selectedScenario === undefined) {
    //     console.error(
    //       `Failed to fetch sensitivity analysis results, unable to find scenario with selected scenario ID '${this.selectedScenarioId}'.`
    //     );
    //     return;
    //   }

    //   // Ensure we are ready to run, sync up with engines if necessary
    //   const engineStatus = this.modelSummary.engine_status[this.currentEngine];
    //   if (engineStatus === MODEL_STATUS.NOT_REGISTERED) {
    //     await modelService.initializeModel(this.currentCAG);
    //     await this.refreshModel();
    //   }
    //   if (selectedScenario.is_valid === false) {
    //     modelService.resetScenarioParameter(selectedScenario, this.modelSummary, this.modelComponents.nodes);
    //   }

    //   this.sensitivityMatrixData = null;
    //   const now = Date.now();
    //   this.sensitivityDataTimestamp = now;
    //   const constraints = modelService.cleanConstraints(selectedScenario.parameter?.constraints ?? []);

    //   const experimentId = await modelService.runSensitivityAnalysis(this.modelSummary, this.sensitivityAnalysisType, 'DYNAMIC', constraints);

    //   // If another sensitivity analysis started running before this one returns an ID,
    //   //  then don't bother fetching/processing the results to avoid a race condition
    //   if (this.sensitivityDataTimestamp !== now) return;
    //   const progressFn = (current: number, max: number) => {
    //     if (current > 2) {
    //       this.enableOverlay(`Will await result for  ${(max - current) * 3} more seconds`);
    //     }
    //   };

    //   this.enableOverlay('Running sensitivity analysis');
    //   const numPolls = Math.max(10, Math.round(this._getGraphDensity() * 50));
    //   const results = await modelService.getExperimentResult(this.modelSummary.id, experimentId, numPolls, progressFn);
    //   this.disableOverlay();

    //   if (this.sensitivityDataTimestamp !== now) return;
    //   // FIXME: Add type for return value of modelService.getExperimentResult()
    //   const csrResults = csrUtil.resultsToCsrFormat((results as any).results[this.sensitivityAnalysisType.toLowerCase()]);
    //   csrResults.rows = csrResults.rows.map(this.ontologyFormatter);
    //   csrResults.columns = csrResults.columns.map(this.ontologyFormatter);
    //   this.sensitivityMatrixData = csrResults;
    // },
    setSensitivityAnalysisType(newValue: string) {
      this.sensitivityAnalysisType = newValue;
    },
    tabClick(tab: string) {
      if (tab === 'matrix') {
        // this.fetchSensitivityAnalysisResults();
        // advance the tour if it is active
        if (this.tour && this.tour.id.startsWith('sensitivity-matrix-tour')) {
          this.tour.next();
        }
      }
    },
    resetCAGLayout() {
      this.resetLayoutToken = Date.now();
    },
    async switchEngine(engine: string) {
      await modelService.updateModelParameter(this.currentCAG, {
        engine: engine
      });
      this.refresh();
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
