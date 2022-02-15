<template>
  <div class="node-drilldown-container">
    <analytical-questions-and-insights-panel />
    <main>
      <div class="drivers">
        <h5 v-if="drivers.length > 0">Top Drivers</h5>
        <template v-if="scenarioData">
          <neighbor-node
            v-for="driver in drivers"
            :key="driver.edge.id"
            :node="driver.node"
            :edge="driver.edge"
            :is-driver="true"
            :neighborhood-chart-data="scenarioData"
            :selected-scenario-id="selectedScenarioId"
            @click="openNeighborDrilldown(driver.node)"
            class="neighbor-node"
          />
        </template>
      </div>
      <div class="selected-node-column">
        <div class="expanded-node insight-capture">
          <div class="expanded-node-header">
            {{ nodeConceptName }}
            <div class="button-group">
              <button
                class="btn btn-primary"
                @click="scheduleRun()">
                Run
              </button>
              <button
                v-if="areParameterValuesChanged"
                class="btn btn-primary btn-call-for-action save-parameter-button"
                @click="saveParameterValueChanges"
              >
                Save parameterization changes
              </button>
              <button
                v-tooltip="'Collapse node'"
                class="btn btn-default"
                @click="collapseNode"
              >
                <i class="fa fa-fw fa-compress" />
              </button>
              <!-- TODO: Set goal button -->
            </div>
          </div>
          <div class="expanded-node-body">
            <td-node-chart
              v-if="selectedNodeScenarioData !== null"
              class="scenario-chart"
              :historical-timeseries="historicalTimeseries"
              :projections="selectedNodeScenarioData.projections"
              :unit="selectedNodeScenarioData.unit"
              :min-value="indicatorMin"
              :max-value="indicatorMax"
              :constraints="constraints"
              :model-summary="modelSummary"
              :viewing-extent="viewingExtent"
              :is-clamp-area-hidden="selectedScenarioId === null"
              @set-constraints="modifyConstraints"
              @set-historical-timeseries="setHistoricalTimeseries"
            />
            <div class="indicator-config">
              <strong
                class="indicator-name"
                v-tooltip.top="selectedNodeScenarioData?.indicatorName ?? ''"
              >
                {{ selectedNodeScenarioData?.indicatorName ?? '' }}
              </strong>
              <span
                v-if="indicatorDescription.length > 0"
                class="description"
                v-tooltip.top="indicatorDescription"
              > - {{ indicatorDescription }}</span>
              <span
                v-if="indicatorRegions.length > 0"
                class="description"
                v-tooltip.top="indicatorRegions"
              > - {{ indicatorRegions }}.</span>
              <span> Data shows</span>
              <dropdown-button
                :items="SEASONALITY_OPTIONS"
                :selected-item="indicatorPeriod"
                @item-selected="(period) => { indicatorPeriod = period; }"
              />
              <span>seasonal trends. </span>
              <button
                v-if="indicatorId === null"
                class="btn btn-sm btn-primary btn-call-for-action"
                @click="openDataExplorer"
              >
                <i class="fa fa-fw fa-search" />
                Choose a datacube
              </button>
              <div class="configure-dropdown-container" v-else>
                <button
                  class="btn btn-sm btn-default"
                  @click="isDatacubeConfigDropdownOpen = !isDatacubeConfigDropdownOpen"
                >
                  <i class="fa fa-fw fa-pencil" />
                  Configure
                </button>
                <dropdown-control
                  v-if="isDatacubeConfigDropdownOpen && indicatorId !== null"
                  class="configure-dropdown"
                >
                  <template #content>
                    <div
                      class="dropdown-option"
                      @click="openDataDrilldown"
                    >Edit datacube settings</div>
                    <div
                      class="dropdown-option"
                      @click="openDataExplorer"
                    ><i class="fa fa-fw fa-search" />Choose a different datacube</div>
                    <div
                      class="dropdown-option danger"
                      @click="clearParameterization"
                    ><i class="fa fa-fw fa-times" />Remove datacube</div>
                  </template>
                </dropdown-control>
                <!-- <button
                  v-if="hasConstraints"
                  v-tooltip.top-center="'Clear constraints'"
                  type="button"
                  class="btn btn-danger btn-sm"
                  @click="clearConstraints">
                  Clear constraints
                </button> -->
              </div>
              <span>Min. value:</span>
              <input class="form-control input-sm" v-model.number="indicatorMin"/>
              <span>Max. value:</span>
              <input class="form-control input-sm" v-model.number="indicatorMax"/>
            </div>
            <projection-ridgelines
              v-if="
                selectedScenarioId !== null &&
                selectedNodeScenarioData !== null
              "
              class="projection-ridgelines"
              :model-summary="modelSummary"
              :comparison-baseline-id="comparisonBaselineIdWithFallback"
              :baseline-scenario-id="baselineScenarioId"
              :projections="selectedNodeScenarioData.projections"
              :indicator-min="indicatorMin"
              :indicator-max="indicatorMax"
              :historical-timeseries="historicalTimeseries"
              @new-scenario='onCreateScenario'
              @set-comparison-baseline-id='(value) => comparisonBaselineId = value'
            />
            <button
              v-if="
                selectedScenarioId === null &&
                selectedNodeScenarioData !== null
              "
              class="btn btn-default"
              style="align-self: flex-start"
              @click="switchToBaselineScenario"
            >View scenarios</button>
          </div>
        </div>
      </div>
      <div class="impacts">
        <h5 v-if="impacts.length > 0">Top Impacts</h5>
        <template v-if="scenarioData">
          <neighbor-node
            v-for="impact in impacts"
            :key="impact.edge.id"
            :node="impact.node"
            :edge="impact.edge"
            :is-driver="false"
            class="neighbor-node"
            :neighborhood-chart-data="scenarioData"
            :selected-scenario-id="selectedScenarioId"
            @click="openNeighborDrilldown(impact.node)"
          />
        </template>
      </div>
    </main>
  </div>
</template>

<script lang="ts">
import _ from 'lodash';
import { computed, defineComponent, ref, watchEffect, watch } from 'vue';
import { useStore } from 'vuex';

import { AggregationOption, ProjectType, TemporalResolutionOption } from '@/types/Enums';
import NeighborNode from '@/components/node-drilldown/neighbor-node.vue';
import TdNodeChart from '@/components/widgets/charts/td-node-chart.vue';
import router from '@/router';
import modelService from '@/services/model-service';
import { NewScenario, ProjectionConstraint, Scenario, ScenarioProjection } from '@/types/CAG';
import DropdownButton, { DropdownItem } from '@/components/dropdown-button.vue';
import { TimeseriesPoint } from '@/types/Timeseries';
import useModelMetadata from '@/services/composables/useModelMetadata';
import useQualitativeModel from '@/services/composables/useQualitativeModel';
import AnalyticalQuestionsAndInsightsPanel from '@/components/analytical-questions/analytical-questions-and-insights-panel.vue';
import useToaster from '@/services/composables/useToaster';
import { ViewState } from '@/types/Insight';
import { QUANTIFICATION } from '@/utils/messages-util';
import ProjectionRidgelines from '@/components/node-drilldown/projection-ridgelines.vue';
import moment from 'moment';
import { getStepCountFromTimeScale } from '@/utils/time-scale-util';
import DropdownControl from '@/components/dropdown-control.vue';
import filtersUtil from '@/utils/filters-util';
import { STATUS } from '@/utils/datacube-util';

const SEASONALITY_OPTIONS: DropdownItem[] = [
  {
    displayName: 'no',
    value: 1
  },
  {
    displayName: '12-month',
    value: 12
  }
];

export default defineComponent({
  name: 'NodeDrilldown',
  components: {
    NeighborNode,
    TdNodeChart,
    DropdownButton,
    AnalyticalQuestionsAndInsightsPanel,
    ProjectionRidgelines,
    DropdownControl
  },
  props: {},
  setup() {
    // Get CAG and selected node from route
    const store = useStore();
    const toaster = useToaster();
    const project = computed(() => store.getters['app/project']);
    const nodeId = computed(() => store.getters['app/nodeId']);

    const setRunImmediately = async (val: boolean) => {
      await store.dispatch('model/setRunImmediately', val);
    };

    const {
      modelSummary,
      modelComponents,
      currentCAG,
      refreshModelData
    } = useQualitativeModel();

    const currentEngine = computed(
      () => modelSummary.value?.parameter?.engine ?? null
    );

    // TODO: to properly apply an insight to this view,
    //  one may need to utilize view-state and/or data-state
    //  similarly to how they are being utilied in the data (quantitative analyses)
    // The same comment applies also to both the TD qualitative/quantitative views

    watchEffect(() => {
      // Fetch model summary and components
      if (currentCAG.value === null) return;
      store.dispatch('insightPanel/setContextId', [currentCAG.value]);
    });

    const scenarios = ref<Scenario[]>([]);

    watchEffect(async onInvalidate => {
      // Fetch scenarios
      if (currentCAG.value === null || currentEngine.value === null) return;
      let isCancelled = false;
      onInvalidate(() => {
        isCancelled = true;
      });
      const _scenarios = await modelService.getScenarios(
        currentCAG.value,
        currentEngine.value
      );
      if (isCancelled) return;
      scenarios.value = _scenarios;
    });

    const baselineScenarioId = computed(() => {
      return scenarios.value.find(scenario => scenario.is_baseline)?.id ?? null;
    });

    const saveConstraints = async (updatedConstraints: ProjectionConstraint[]) => {
      if (
        selectedScenarioId.value === null ||
        currentCAG.value === null ||
        currentEngine.value === null ||
        modelSummary.value === null ||
        selectedNode.value === null
      ) {
        return;
      }
      const selectedScenario = scenarios.value.find(
        scenario => scenario.id === selectedScenarioId.value
      );
      if (selectedScenario === undefined) {
        console.error(
          'Unable to find selected scenario with ID',
          selectedScenarioId.value,
          'in scenario list',
          scenarios.value
        );
        return;
      }
      if (selectedScenario.is_baseline) {
        toaster(
          'Please select a non-baseline scenario to place constraints.',
          'error',
          true
        );
        // Remove constraints from the chart renderer
        constraints.value = [];
        return;
      }
      const selectedConcept = selectedNode.value.concept;
      const constraintsParameter = [
        ...selectedScenario.parameter.constraints.filter(
          conceptConstraints => conceptConstraints.concept !== selectedConcept
        ),
        { concept: selectedConcept, values: updatedConstraints }
      ];
      const {
        time_scale,
        projection_start
      } = modelSummary.value.parameter;
      const numSteps = getStepCountFromTimeScale(time_scale);
      const updatedScenario = {
        id: selectedScenarioId.value,
        model_id: currentCAG.value,
        parameter: {
          constraints: constraintsParameter,
          num_steps: numSteps,
          projection_start
        }
      };
      // Save and reload scenarios
      await modelService.updateScenario(updatedScenario);
      // REFACTOR: We shouldn't set scenarios from so many places.
      // trigger a scenario refresh
      const _scenarios = await modelService.getScenarios(currentCAG.value, currentEngine.value);
      scenarios.value = _scenarios;
    };

    const selectedNode = computed(() => {
      if (nodeId.value === undefined || modelComponents.value === null) {
        return null;
      }
      return (
        modelComponents.value.nodes.find(node => node.id === nodeId.value) ??
        null
      );
    });
    const nodeConceptName = computed(() => selectedNode.value?.label);

    const scenarioData = computed(() => {
      if (modelSummary.value === null || modelComponents.value === null || scenarios.value.length === 0) {
        return null;
      }
      return modelService.buildNodeChartData(
        modelSummary.value,
        modelComponents.value.nodes,
        scenarios.value
      );
    });

    const selectedNodeScenarioData = computed(() => {
      if (
        scenarioData.value === null ||
        selectedNode.value === null
      ) {
        return null;
      }
      const selectedNodeScenarioData = scenarioData.value[selectedNode.value.concept] ?? null;
      if (selectedNodeScenarioData === null) return null;

      const unit = selectedNode.value.parameter?.unit;

      const projections: ScenarioProjection[] = [];
      // sort node scenarios before providing them
      //  (selected scenario first, followed other scenarios sorted from oldest to newest)
      const selectedScenario = selectedNodeScenarioData.scenarios.find(s => s.id === selectedScenarioId.value);
      const allOtherScenarios = selectedNodeScenarioData.scenarios.filter(s => s.id !== selectedScenarioId.value);
      allOtherScenarios.sort((a, b) => a.created_at - b.created_at);
      const nodeScenarios = selectedScenario !== undefined ? [selectedScenario, ...allOtherScenarios] : [...allOtherScenarios];
      nodeScenarios.forEach(({ id, name, description, is_valid, result, parameter, constraints }) => {
        // `result` is undefined for the any scenarios that haven't been run yet
        projections.push({
          scenarioName: name,
          scenarioDesc: description,
          scenarioId: id,
          is_valid,
          parameter,
          values: result?.values ?? [],
          constraints: constraints ?? []
        });
      });

      return {
        indicatorName: selectedNodeScenarioData.indicator_name,
        historicalTimeseries: selectedNodeScenarioData.indicator_time_series ?? [],
        historicalConstraints: [],
        projections,
        unit
      };
    });

    const historicalTimeseries = ref<TimeseriesPoint[]>([]);
    // FIXME: we only want to overwrite historicalTimeseries with the selected
    //  node's timeseries when we first fetch it
    //  - we DON'T want to overwrite it when changing any parameterization
    //  - we DO want to overwrite it if we jump to another node drilldown page
    //    by clicking a neighbour node
    // As a temporary hack, use the indicator's name to as a heuristic to see
    //  if we just loaded the historical timeseries for the first time or
    //  switched to a different node
    watch(
      () => selectedNodeScenarioData.value,
      (newScenarioData, oldScenarioData) => {
        if (oldScenarioData?.indicatorName !== newScenarioData?.indicatorName) {
          historicalTimeseries.value = selectedNodeScenarioData.value?.historicalTimeseries ?? [];
        }
      }
    );

    const setHistoricalTimeseries = (newPoints: TimeseriesPoint[]) => {
      historicalTimeseries.value = newPoints;
    };

    const selectedScenarioId = computed<string | null>(() => {
      const scenarioId = store.getters['model/selectedScenarioId'];
      if (scenarios.value.filter(d => d.id === scenarioId).length === 0) {
        // Default to "historical data only" mode
        return null;
      }
      return scenarioId;
    });

    const setSelectedScenarioId =
      (newId: string | null) => store.dispatch('model/setSelectedScenarioId', newId);

    const scenarioSelectDropdownItems = computed<DropdownItem[]>(() => {
      return [
        { displayName: 'Historical data', value: null },
        ...scenarios.value.map(scenario => {
          return { displayName: scenario.is_valid ? scenario.name : (scenario.name + ' (Stale)'), value: scenario.id };
        })
      ];
    });

    const hasConstraints = computed(() => {
      return constraints.value.length > 0;
    });

    // TODO: Filter top drivers and top impacts
    //  CLARIFICATION REQUIRED:
    //    is this taken from the sensitivity analysis?
    //    do we want a maximum number of drivers/impacts? or add a scrollbar?
    const drivers = computed(() => {
      if (modelComponents.value === null || selectedNode.value === null) {
        return [];
      }
      const selectedConcept = selectedNode.value.concept;
      const { edges, nodes } = modelComponents.value;
      return edges
        .filter(edge => edge.target === selectedConcept)
        .map(edge => ({
          node: nodes.find(node => node.concept === edge.source),
          edge
        }));
    });
    const impacts = computed(() => {
      if (modelComponents.value === null || selectedNode.value === null) {
        return [];
      }
      const selectedConcept = selectedNode.value.concept;
      const { edges, nodes } = modelComponents.value;
      return edges
        .filter(edge => edge.source === selectedConcept)
        .map(edge => ({
          node: nodes.find(node => node.concept === edge.target),
          edge
        }));
    });
    const drilldownPanelTabs = computed(() => [
      {
        name: 'Breakdown',
        id: 'only-tab'
      }
    ]);
    const collapseNode = () => {
      router.push({
        name: 'quantitative',
        params: {
          project: project.value,
          currentCAG: currentCAG.value,
          projectType: ProjectType.Analysis
        }
      });
    };

    const openNeighborDrilldown = (node: any) => {
      router.push({
        name: 'nodeDrilldown',
        params: {
          project: project.value,
          currentCAG: currentCAG.value,
          projectType: ProjectType.Analysis,
          nodeId: node.id
        }
      });
    };

    const indicatorId = computed(() => {
      return selectedNode.value?.parameter?.id ?? null;
    });
    const indicatorData = useModelMetadata(indicatorId);
    const indicatorDescription = computed(() => {
      if (indicatorData.value === null) return '';
      return indicatorData.value.outputs[0].description;
    });
    const indicatorMin = ref(0);
    const indicatorMax = ref(1);
    const selectedTemporalResolution = ref<string|null>(null);
    const indicatorPeriod = ref(1);
    const indicatorRegions = ref('');
    watchEffect(() => {
      const indicator = selectedNode.value?.parameter;
      if (indicator !== null && indicator !== undefined) {
        const { min, max, temporalResolution, period } = indicator;
        indicatorMin.value = min;
        indicatorMax.value = max;
        selectedTemporalResolution.value = temporalResolution;
        indicatorPeriod.value = period;
        indicatorRegions.value = [
          indicator.admin3, indicator.admin2, indicator.admin1, indicator.country
        ].filter(d => d !== '').join(', ');
      }
    });
    const clearParameterization = async () => {
      if (selectedNode.value === null) return;
      const { id, concept, label, model_id, components } = selectedNode.value;
      const nodeParameters = {
        id,
        concept,
        label,
        model_id,
        parameter: {
          id: null,
          name: 'Abstract',
          unit: '',
          country: '',
          admin1: '',
          admin2: '',
          admin3: '',
          period: 1,
          timeseries: [
            { value: 0.5, timestamp: Date.UTC(2017, 0) },
            { value: 0.5, timestamp: Date.UTC(2017, 1) },
            { value: 0.5, timestamp: Date.UTC(2017, 2) }
          ],
          // Let server determine min/max
          max: null,
          min: null
        },
        components
      };

      // save view config options when quantifying the node along with the node parameters
      const viewConfig: ViewState = {
        spatialAggregation: AggregationOption.Mean,
        temporalAggregation: AggregationOption.Mean,
        temporalResolution: TemporalResolutionOption.Month,
        breakdownOption: null
      };
      Object.keys(viewConfig).forEach(key => {
        (nodeParameters.parameter as any)[key] = viewConfig[key];
      });
      try {
        await modelService.updateNodeParameter(currentCAG.value, nodeParameters);

        // FIXME: manually set historical for now because bad watcher
        historicalTimeseries.value = [
          { value: 0.5, timestamp: Date.UTC(2017, 0) },
          { value: 0.5, timestamp: Date.UTC(2017, 1) },
          { value: 0.5, timestamp: Date.UTC(2017, 2) }
        ];

        refreshModelData();
      } catch {
        console.error(QUANTIFICATION.ERRONEOUS_PARAMETER_CHANGE, nodeParameters);
        toaster(QUANTIFICATION.ERRONEOUS_PARAMETER_CHANGE, 'error', true);
      }
    };
    const areParameterValuesChanged = computed(() => {
      const indicator = selectedNode.value?.parameter;
      if (indicator === null || indicator === undefined) return false;
      const { min, max, temporalResolution, period, timeseries } = indicator;
      return indicatorMin.value !== min ||
        indicatorMax.value !== max ||
        selectedTemporalResolution.value !== temporalResolution ||
        indicatorPeriod.value !== period ||
        !_.isEqual(timeseries, historicalTimeseries.value);
    });
    const saveParameterValueChanges = async () => {
      if (selectedNode.value === null) return;
      const { id, concept, label, model_id, parameter, components } = selectedNode.value;
      const nodeParameters = {
        id,
        concept,
        label,
        model_id,
        parameter: Object.assign({}, parameter, {
          min: indicatorMin.value,
          max: indicatorMax.value,
          temporalResolution: selectedTemporalResolution.value,
          period: indicatorPeriod.value,
          timeseries: historicalTimeseries.value
        }),
        components
      };
      try {
        await modelService.updateNodeParameter(currentCAG.value, nodeParameters);
        refreshModelData();
      } catch {
        console.error(QUANTIFICATION.ERRONEOUS_PARAMETER_CHANGE, nodeParameters);
        toaster(QUANTIFICATION.ERRONEOUS_PARAMETER_CHANGE, 'error', true);
      }
    };

    const comparisonBaselineId = ref<string | null>(null);
    const comparisonBaselineIdWithFallback = computed(() => {
      if (comparisonBaselineId.value !== null) {
        return comparisonBaselineId.value;
      }
      // When no comparison baseline has been selected, use the baseline
      //  scenario
      return baselineScenarioId.value;
    });

    const constraints = ref<ProjectionConstraint[]>([]);
    const modifyConstraints = (newConstraints: ProjectionConstraint[]) => {
      constraints.value = newConstraints;
      saveConstraints(newConstraints);
    };

    const clearConstraints = () => {
      constraints.value = [];
      saveConstraints([]);
    };

    watchEffect(() => {
      // When the selectedScenario changes, grab the constraints from that scenario
      //  and store them in the `constraints` ref to be displayed
      const projections = (selectedNodeScenarioData.value?.projections ?? []);
      const selectedScenario = projections.find(
        scenario => scenario.scenarioId === selectedScenarioId.value
      );
      if (selectedScenario !== undefined) {
        constraints.value = selectedScenario.constraints;
      }
    });

    // Find out the default viewing window
    const viewingExtent = computed<number[] | null>(() => {
      const parameter = modelSummary.value?.parameter;
      if (!parameter || selectedScenarioId.value === null) {
        return null;
      } else {
        // FIXME: last available clamp position can be derived from time_scale
        const projections = selectedNodeScenarioData.value?.projections || [];
        let max = Number.NEGATIVE_INFINITY;
        for (let i = 0; i < projections.length; i++) {
          for (let j = 0; j < projections[i].values.length; j++) {
            if (max < projections[i].values[j].timestamp) {
              max = projections[i].values[j].timestamp;
            }
          }
        }
        // FIXME: default viewing extent should be equal to whatever is
        //  displayed on the graph view
        const historicalMonthsToDisplay = 5 * 12;
        const historyStart = moment
          .utc(parameter.projection_start)
          .subtract(historicalMonthsToDisplay, 'months')
          .valueOf();
        return [historyStart, max];
      }
    });

    const onCreateScenario = async (scenarioInfo: { name: string; description: string }) => {
      const baselineScenario = scenarios.value.find(s => s.is_baseline);
      if (baselineScenario === undefined) {
        console.error('Failed to save new scenario, baseline scenario is null.');
        return;
      }
      // add new scenario
      const newScenario: NewScenario = {
        model_id: currentCAG.value,
        name: scenarioInfo.name,
        description: scenarioInfo.description,
        is_baseline: false,
        parameter: _.cloneDeep(baselineScenario?.parameter)
      };
      // enableOverlay('Creating Scenario');
      const createdScenario = await modelService.createScenario(newScenario);
      // Save and reload scenarios
      scenarios.value = await modelService.getScenarios(currentCAG.value, currentEngine.value as string);
      setSelectedScenarioId(createdScenario.id);
      // disableOverlay();
    };

    return {
      nodeConceptName,
      drilldownPanelTabs,
      drivers,
      impacts,
      collapseNode,
      openNeighborDrilldown,
      modelComponents,
      scenarios,
      baselineScenarioId,
      selectedNodeScenarioData,
      selectedScenarioId,
      setSelectedScenarioId,
      modelSummary,
      scenarioSelectDropdownItems,
      historicalTimeseries,
      setHistoricalTimeseries,
      indicatorId,
      indicatorDescription,
      indicatorMin,
      indicatorMax,
      indicatorPeriod,
      indicatorRegions,
      areParameterValuesChanged,
      saveParameterValueChanges,
      selectedTemporalResolution,
      comparisonBaselineId,
      comparisonBaselineIdWithFallback,
      constraints,
      modifyConstraints,
      nodeId,
      project,
      currentCAG,
      clearParameterization,
      viewingExtent,
      hasConstraints,
      clearConstraints,
      scenarioData,
      onCreateScenario,
      SEASONALITY_OPTIONS,
      isDatacubeConfigDropdownOpen: ref(false),
      setRunImmediately
    };
  },
  methods: {
    openDataExplorer() {
      const filters: any = filtersUtil.newFilters();
      filtersUtil.setClause(filters, STATUS, ['READY'], 'or', false);
      this.$router.push({
        name: 'nodeDataExplorer',
        params: {
          currentCAG: this.currentCAG,
          nodeId: this.nodeId,
          project: this.project,
          projectType: ProjectType.Analysis
        },
        query: { filters }
      });
    },
    openDataDrilldown() {
      this.$router.push({
        name: 'nodeCompExperiment',
        params: {
          currentCAG: this.currentCAG,
          indicatorId: this.indicatorId,
          nodeId: this.nodeId,
          project: this.project,
          projectType: ProjectType.Analysis
        }
      });
    },
    switchToBaselineScenario() {
      const baseline = this.scenarios.find(scenario => scenario.is_baseline === true);
      if (baseline === undefined) {
        console.error('Unable to find baseline scenario in ', this.scenarios);
        return;
      }
      this.setSelectedScenarioId(baseline.id);
    },
    scheduleRun() {
      this.setRunImmediately(true);
      router.push({
        name: 'quantitative',
        params: {
          project: this.project,
          currentCAG: this.currentCAG,
          projectType: ProjectType.Analysis
        }
      });
    }
  }
});
</script>

<style lang="scss" scoped>
@import '@/styles/variables';

.node-drilldown-container {
  height: $content-full-height;
  display: flex;
  overflow: hidden;
}

main {
  flex: 1;
  min-width: 0;
  display: flex;
  margin: 10px;
}

h4 {
  margin: 0;
}

.selected-node-column {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  margin: 0 15px;
  overflow-y: auto;
}

.scenario-selector-row {
  display: flex;
  justify-content: space-between;

  & > div {
    display: flex;
    align-items: center;

    & > span {
      margin-right: 5px;
    }

  }
}

h6 {
  margin: 0;
  font-size: $font-size-medium;
  color: $text-color-light;
  font-weight: normal;
}

.indicator-controls {
  display: flex;
  align-items: flex-start;
}

.indicator-control-column {
  display: flex;
  flex-direction: column;
}

.from-to-separator {
  align-self: baseline;
  margin: 2.25rem 5px 0 5px;
}

input {
  background: white;
}

input[type=number] {
  width: 60px;
  margin: 0px 5px;
  display: inline-block;
  background: white;
}

input[type="radio"] {
  appearance: radio;
  margin: 0;
  margin-right: 5px;
  cursor: pointer;
  position: relative;
  bottom: -2px;
}

.expanded-node {
  flex-shrink: 0;
  border: 1px solid #bbb;
  border-radius: 4px;
  overflow: hidden;
  display: flex;
  flex-direction: column;
  background: white;
  flex: 1;
  min-height: 400px;
}

.expanded-node-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 5px;
  padding-left: 10px;
  font-size: $font-size-extra-large;
}

.expanded-node-body {
  flex: 1;
  min-height: 0;
  display: flex;
  flex-direction: column;
  padding: 10px;
  padding-top: 0;
}

.button-group > *:not(:first-child) {
  margin-left: 5px;
}

.scenario-chart {
  height: 140px;
}

.projection-ridgelines {
  flex: 3;
  min-height: 0;
  margin-top: 5px;
}

.neighbor-node {
  margin-top: 10px;
  background: white;
  cursor: pointer;
}

h5 {
  margin: 0;
  @include header-secondary;
}

.indicator-title-row {
  display: flex;
  align-items: center;

  & > span {
    flex-shrink: 1;
    min-width: 0;
  }
}

.indicator-config {
  margin-top: 5px;
  display: flex;
  align-items: center;
  gap: 5px;

  .form-control {
    width: 10ch;
  }

  .indicator-name {
    max-width: 25ch;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  .description {
    flex-basis: 4ch;
    flex-grow: 1;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
    color: $text-color-medium;
  }

}

.configure-dropdown-container {
  position: relative;
}

.configure-dropdown {
  position: absolute;
  top: calc(100% - 2px);
  left: 0;
  width: max-content;
}

.danger {
  color: $negative;
}

.restrict-max-width {
  max-width: 110ch;
}

.save-parameter-button {
  align-self: flex-start;
}

.btn-danger {
  color: white;
}

.btn-danger:hover {
  color: white;
}

</style>
