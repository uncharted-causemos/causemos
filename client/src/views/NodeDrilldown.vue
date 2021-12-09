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
        <div class="scenario-selector-row">
          <div>
            <span>Selected scenario</span>
            <dropdown-button
              :items="scenarioSelectDropdownItems"
              :selected-item="selectedScenarioId"
              @item-selected="setSelectedScenarioId"
            />
          </div>
          <div>
            <span v-if="comparisonDropdownOptions.length > 1">
              Compare scenarios relative to
            </span>
            <dropdown-button
              v-if="comparisonDropdownOptions.length > 1"
              :items="comparisonDropdownOptions"
              :selected-item="comparisonBaselineId"
              @item-selected="(value) => comparisonBaselineId = value"
            />
          </div>
        </div>
        <div class="expanded-node insight-capture">
          <div class="expanded-node-header">
            {{ nodeConceptName }}
            <div class="button-group">
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
              <!-- TODO: New scenario button -->
              <!-- TODO: Set goal button -->
            </div>
          </div>
          <div class="expanded-node-body">
            <td-node-chart
              v-if="selectedNodeScenarioData !== null"
              class="scenario-chart"
              :class="{'is-expanded': isHistoricalDataExpanded}"
              :is-expanded="isHistoricalDataExpanded"
              :historical-timeseries="historicalTimeseries"
              :projections="selectedNodeScenarioData.projections"
              :unit="selectedNodeScenarioData.unit"
              :min-value="indicatorMin"
              :max-value="indicatorMax"
              :constraints="constraints"
              :model-summary="modelSummary"
              :viewing-extent="viewingExtent"
              @set-constraints="modifyConstraints"
              @set-historical-timeseries="setHistoricalTimeseries"
            />
            <projection-histograms
              v-if="
                selectedNodeScenarioData !== null && !isHistoricalDataExpanded
              "
              class="projection-histograms"
              :comparison-baseline-id="comparisonBaselineId"
              :historical-timeseries="historicalTimeseries"
              :projections="selectedNodeScenarioData.projections"
              :model-summary="modelSummary"
              :indicator-id="indicatorId"
            />
          </div>
        </div>
        <div class="restrict-max-width indicator-title-row">
          <span><strong>{{ selectedNodeScenarioData?.indicatorName ?? '' }}</strong></span>
          <div class="indicator-buttons">
            <button
              v-if="indicatorId !== null"
              v-tooltip.top-center="'Edit datacube'"
              type="button"
              class="btn btn-primary btn-sm"
              @click="openDataDrilldown">
              Edit datacube
            </button>
            <button
              v-if="indicatorId !== null"
              v-tooltip.top-center="'Change datacube'"
              type="button"
              class="btn btn-primary btn-sm"
              @click="openDataExplorer">
              <i class="fa fa-fw fa-search" /> Change datacube
            </button>
            <button
              v-else
              v-tooltip.top-center="'Find datacube'"
              type="button"
              class="btn btn-primary btn-call-for-action btn-sm"
              @click="openDataExplorer">
              <i class="fa fa-fw fa-search" /> Find datacube
            </button>
            <button
              v-tooltip.top-center="'Clear parameterization'"
              type="button"
              class="btn btn-danger btn-sm"
              @click="clearParameterization">
              Clear parameterization
            </button>
            <button
              v-if="hasConstraints"
              v-tooltip.top-center="'Clear constraints'"
              type="button"
              class="btn btn-danger btn-sm"
              @click="clearConstraints">
              Clear constraints
            </button>
          </div>
        </div>
        <p class="restrict-max-width">
          {{ indicatorDescription }}
        </p>
        <div class="indicator-controls">
          <div class="indicator-control-column">
            <span>Minimum value</span>
            <input class="form-control input-sm" v-model.number="indicatorMin"/>
          </div>
          <span class="from-to-separator">to</span>
          <div class="indicator-control-column">
            <span>Maximum value</span>
            <input class="form-control input-sm" v-model.number="indicatorMax"/>
          </div>
          <div class=" indicator-control-column seasonality">
            Seasonality
            <div class="indicator-control-row">
              <input type="radio" id="seasonality-true" :value="true" v-model="isSeasonalityActive">
              <label for="seasonality-true">Yes</label>
              <input
                v-model.number="indicatorPeriod"
                :disabled="isSeasonalityActive === false"
                class="form-control input-sm"
                type="number"
              >
              <span>{{ selectedTemporalResolution + (indicatorPeriod === 1 ? '' : 's') }}</span>
            </div>
            <div class="indicator-control-row">
              <input type="radio" id="seasonality-false" :value="false" v-model="isSeasonalityActive">
              <label for="seasonality-false">No</label>
            </div>
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
import { ProjectionConstraint, Scenario, ScenarioProjection } from '@/types/CAG';
import DropdownButton, { DropdownItem } from '@/components/dropdown-button.vue';
import { TimeseriesPoint } from '@/types/Timeseries';
import useModelMetadata from '@/services/composables/useModelMetadata';
import useQualitativeModel from '@/services/composables/useQualitativeModel';
import AnalyticalQuestionsAndInsightsPanel from '@/components/analytical-questions/analytical-questions-and-insights-panel.vue';
import useToaster from '@/services/composables/useToaster';
import { ViewState } from '@/types/Insight';
import { QUANTIFICATION } from '@/utils/messages-util';
import ProjectionHistograms from '@/components/node-drilldown/projection-histograms.vue';
import moment from 'moment';
import { getLastTimeStepFromTimeScale } from '@/utils/time-scale-util';

export default defineComponent({
  name: 'NodeDrilldown',
  components: {
    NeighborNode,
    TdNodeChart,
    DropdownButton,
    AnalyticalQuestionsAndInsightsPanel,
    ProjectionHistograms
  },
  props: {},
  setup() {
    // Get CAG and selected node from route
    const store = useStore();
    const toaster = useToaster();
    const project = computed(() => store.getters['app/project']);
    const nodeId = computed(() => store.getters['app/nodeId']);

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
        indicator_time_series_range,
        projection_start
      } = modelSummary.value.parameter;
      const numSteps = getLastTimeStepFromTimeScale(time_scale);
      const updatedScenario = {
        id: selectedScenarioId.value,
        model_id: currentCAG.value,
        parameter: {
          constraints: constraintsParameter,
          num_steps: numSteps,
          indicator_time_series_range,
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
      allOtherScenarios.sort((a, b) => a.modified_at - b.modified_at);
      const nodeScenarios = selectedScenario !== undefined ? [selectedScenario, ...allOtherScenarios] : [...allOtherScenarios];
      nodeScenarios.forEach(({ id, name, result, constraints }) => {
        // `result` is undefined for the any scenarios that haven't been run yet
        projections.push({
          scenarioName: name,
          scenarioId: id,
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

    // FIXME
    const historicalTimeseries = ref<TimeseriesPoint[]>([]);
    watch([selectedNodeScenarioData], () => {
      if (_.isEmpty(historicalTimeseries.value)) {
        historicalTimeseries.value = selectedNodeScenarioData.value?.historicalTimeseries ?? [];
      }
    });

    const setHistoricalTimeseries = (newPoints: TimeseriesPoint[]) => {
      historicalTimeseries.value = newPoints;
    };

    const selectedScenarioId = computed<string | null>(() => {
      const scenarioId = store.getters['model/selectedScenarioId'];
      if (scenarios.value.filter(d => d.id === scenarioId).length === 0) {
        const baselineScenario = scenarios.value.find(d => d.is_baseline);
        return baselineScenario?.id ?? null;
      }
      return scenarioId;
    });

    const setSelectedScenarioId =
      (newId: string) => store.dispatch('model/setSelectedScenarioId', newId);

    const scenarioSelectDropdownItems = computed<DropdownItem[]>(() =>
      scenarios.value.map(scenario => {
        return { displayName: scenario.name, value: scenario.id };
      })
    );

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
    const isSeasonalityActive = ref(false);
    const indicatorRegions = ref('');
    watchEffect(() => {
      // if isSeasonalityActive is toggled on, indicatorPeriod should be at least 2,
      //  since a period of 1 is equivalent to no seasonality
      if (isSeasonalityActive.value === true && indicatorPeriod.value < 2) {
        indicatorPeriod.value = 2;
      }
    });
    watchEffect(() => {
      const indicator = selectedNode.value?.parameter;
      if (indicator !== null && indicator !== undefined) {
        const { min, max, temporalResolution, period } = indicator;
        indicatorMin.value = min;
        indicatorMax.value = max;
        selectedTemporalResolution.value = temporalResolution;
        indicatorPeriod.value = period;
        isSeasonalityActive.value = period > 1;
        indicatorRegions.value = [
          indicator.country, indicator.admin1, indicator.admin2, indicator.admin3
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
          max: null, // filled in by server
          min: null // filled in by server
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
        isSeasonalityActive.value !== (period > 1) ||
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
          period: isSeasonalityActive.value ? indicatorPeriod.value : 1,
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
    const comparisonDropdownOptions = computed<DropdownItem[]>(() => {
      const _projections = selectedNodeScenarioData.value?.projections ?? [];
      if (_projections.length < 2) {
        return [];
      }
      return [
        { displayName: 'none', value: null },
        ..._projections.map(({ scenarioId, scenarioName }) => ({
          value: scenarioId,
          displayName: scenarioName
        }))
      ];
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
      if (!parameter) {
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

    return {
      nodeConceptName,
      drilldownPanelTabs,
      drivers,
      impacts,
      collapseNode,
      openNeighborDrilldown,
      modelComponents,
      scenarios,
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
      isSeasonalityActive,
      indicatorPeriod,
      indicatorRegions,
      areParameterValuesChanged,
      saveParameterValueChanges,
      selectedTemporalResolution,
      comparisonBaselineId,
      comparisonDropdownOptions,
      constraints,
      modifyConstraints,
      nodeId,
      project,
      currentCAG,
      clearParameterization,
      viewingExtent,
      hasConstraints,
      clearConstraints,
      scenarioData
    };
  },
  data: () => ({
    isHistoricalDataExpanded: false
  }),
  methods: {
    openDataExplorer() {
      this.$router.push({
        name: 'nodeDataExplorer',
        params: {
          currentCAG: this.currentCAG,
          nodeId: this.nodeId,
          project: this.project,
          projectType: ProjectType.Analysis
        }
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

.seasonality {
  margin-left: 10px;
  flex: 1;
  min-width: 0;

  label {
    font-weight: normal;
    margin-right: 10px;
    cursor: pointer;
  }
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
  margin: 10px 0;
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
  height: 120px;
}

.projection-histograms {
  flex: 3;
  min-width: 0;
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

  .indicator-buttons {
    margin-left: 20px;
    flex-shrink: 0;
    & > button:not(:first-child) {
      margin-left: 5px;
    }
  }
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
