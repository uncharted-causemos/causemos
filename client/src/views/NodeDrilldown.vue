<template>
  <div class="node-drilldown-container">
    <main>
      <header>
        <h4>{{ nodeConceptName }}</h4>
        <!-- TODO: toggles go here -->
        <div class="toggle-container">
          (toggles go here)
        </div>

        <button
          v-tooltip="'Collapse node'"
          class="btn btn-default"
          @click="collapseNode"
        >
          <i class="fa fa-fw fa-compress" />
        </button>
      </header>
      <div class="nodes-container">
        <div class="drivers">
          <h5>Top Drivers</h5>
          <neighbor-node
            v-for="driver in drivers"
            :key="driver.edge.id"
            :node="driver.node"
            :edge="driver.edge"
            :is-driver="true"
            class="neighbor-node"
          />
        </div>
        <div class="selected-node-column">
          <dropdown-button
            class="scenario-selector"
            :inner-button-label="'Scenario'"
            :items="scenarioSelectDropdownItems"
            :selected-item="selectedScenarioId"
            @item-selected="setSelectedScenarioId"
          />
          <div class="expanded-node">
            <div class="expanded-node-header">
              {{ nodeConceptName }}
              <div class="button-group">
                (buttons go here)
                <!-- TODO: New scenario button -->
                <!-- TODO: Set goal button -->
              </div>
            </div>
            <td-node-chart
              v-if="selectedNodeScenarioData !== null"
              class="scenario-chart"
              :selected-scenario-id="selectedScenarioId"
              :historical-timeseries="historicalTimeseries"
              :projections="selectedNodeScenarioData.projections"
              :min-value="indicatorMin"
              :max-value="indicatorMax"
              @set-historical-timeseries="setHistoricalTimeseries"
            />
          </div>
          <p>
            <i class="fa fa-fw fa-info-circle" />To create a scenario, set some
            values by clicking on the chart. To remove a point, click on it
            again.
          </p>
          <hr>
          <div>
            Variable type
          </div>
          <div>
            <span><strong>{{ selectedNodeScenarioData?.indicatorName ?? '' }}</strong></span>
            &nbsp;
            <button
              v-tooltip.top-center="'Edit datacube'"
              type="button"
              class="btn btn-primary btn-sm">
              Edit datacube
            </button>
            &nbsp;
            <button
              v-tooltip.top-center="'Change datacube'"
              type="button"
              class="btn btn-primary btn-sm"
              @click="openDataExplorer">
              Change datacube
            </button>
          </div>
          <div>
            {{ indicatorDescription }}
          </div>
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
                <span>{{ temporalResolution + (indicatorPeriod === 1 ? '' : 's') }}</span>
              </div>
              <div class="indicator-control-row">
                <input type="radio" id="seasonality-false" :value="false" v-model="isSeasonalityActive">
                <label for="seasonality-false">No</label>
              </div>
            </div>
          </div>
        </div>
        <div class="impacts">
          <h5>Top Impacts</h5>
          <neighbor-node
            v-for="impact in impacts"
            :key="impact.edge.id"
            :node="impact.node"
            :edge="impact.edge"
            :is-driver="false"
            class="neighbor-node"
          />
        </div>
      </div>
    </main>
    <drilldown-panel
      class="drilldown-panel"
      :tabs="drilldownPanelTabs"
      :active-tab-id="'only-tab'"
    >
      <template #content>

        (Panes go here)
        <!-- TODO: Panes go here -->
        <!-- <indicator-summary
          v-if="activeDrilldownTab === PANE_ID.INDICATOR && selectedNode && isDrilldownOpen"
          :node="selectedNode"
          :model-summary="modelSummary"
          @function-selected="onFunctionSelected"
          @edit-indicator="editIndicator"
          @remove-indicator="removeIndicator"
        /> -->
      </template>
    </drilldown-panel>
  </div>
</template>

<script lang="ts">
import { computed, defineComponent, ref, watchEffect } from 'vue';
import DrilldownPanel from '@/components/drilldown-panel.vue';
import NeighborNode from '@/components/node-drilldown/neighbor-node.vue';
import TdNodeChart from '@/components/widgets/charts/td-node-chart.vue';
import router from '@/router';
import { useStore, mapGetters } from 'vuex';
import { ProjectType } from '@/types/Enums';
import modelService from '@/services/model-service';
import { CAGGraph, CAGModelSummary, Scenario, ScenarioProjection } from '@/types/CAG';
import DropdownButton, { DropdownItem } from '@/components/dropdown-button.vue';
import { TimeseriesPoint } from '@/types/Timeseries';
import useModelMetadata from '@/services/composables/useModelMetadata';

export default defineComponent({
  name: 'NodeDrilldown',
  components: {
    DrilldownPanel,
    NeighborNode,
    TdNodeChart,
    DropdownButton
  },
  props: {},
  computed: {
    ...mapGetters({
      currentCAG: 'app/currentCAG',
      nodeId: 'app/nodeId',
      project: 'app/project'
    })
  },
  setup() {
    // Get CAG and selected node from route
    const store = useStore();
    const project = computed(() => store.getters['app/project']);
    const currentCAG = computed(() => store.getters['app/currentCAG']);
    const nodeId = computed(() => store.getters['app/nodeId']);

    const modelSummary = ref<CAGModelSummary | null>(null);
    const modelComponents = ref<CAGGraph | null>(null);
    const currentEngine = computed(
      () => modelSummary.value?.parameter?.engine ?? null
    );

    watchEffect(onInvalidate => {
      // Fetch model summary and components
      if (currentCAG.value === null) return;
      let isCancelled = false;
      onInvalidate(() => {
        isCancelled = true;
      });
      modelService.getSummary(currentCAG.value).then(_modelSummary => {
        if (isCancelled) return;
        modelSummary.value = _modelSummary;
      });
      modelService.getComponents(currentCAG.value).then(_modelComponents => {
        if (isCancelled) return;
        modelComponents.value = _modelComponents;
      });
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
      if (modelSummary.value === null || modelComponents.value === null) {
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

      const projections: ScenarioProjection[] = [];
      selectedNodeScenarioData.scenarios.forEach(({ id, name, result, constraints }) => {
        if (result === undefined) return;
        projections.push({
          scenarioName: name,
          scenarioId: id,
          values: result.values,
          confidenceInterval: result.confidenceInterval,
          constraints: constraints ?? []
        });
      });

      // TODO: remove dummy data
      // [
      //   { timestamp: 1483228800000, value: 0.5 },
      //   { timestamp: 1485907200000, value: 0.5906666666666667 },
      //   { timestamp: 1488326400000, value: 0.642 },
      //   { timestamp: 1491004800000, value: 0.6903333333333334 },
      //   { timestamp: 1493596800000, value: 0.7603333333333333 },
      //   { timestamp: 1496275200000, value: 0.8 },
      //   { timestamp: 1498867200000, value: 0.8236666666666668 },
      //   { timestamp: 1501545600000, value: 0.85 },
      //   { timestamp: 1504224000000, value: 0.8786666666666667 },
      //   { timestamp: 1506816000000, value: 0.901 },
      //   { timestamp: 1509494400000, value: 0.9283333333333335 },
      //   { timestamp: 1514764800000, value: 0.9476666666666667 }
      // ]

      return {
        indicatorName: selectedNodeScenarioData.indicator_name ?? 'Missing indicator name',
        historicalTimeseries: selectedNodeScenarioData.indicator_time_series ?? [],
        historicalConstraints: [],
        projections
      };
    });

    const historicalTimeseries = ref<TimeseriesPoint[]>([]);
    watchEffect(() => {
      historicalTimeseries.value =
        selectedNodeScenarioData.value?.historicalTimeseries ?? [];
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
    const temporalResolution = ref<string|null>(null);
    const indicatorPeriod = ref(1);
    const isSeasonalityActive = ref(false);
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
        indicatorMin.value = indicator.min;
        indicatorMax.value = indicator.max;
        temporalResolution.value = indicator.temporal_resolution;
        indicatorPeriod.value = indicator.period;
      }
    });

    return {
      nodeConceptName,
      drilldownPanelTabs,
      drivers,
      impacts,
      collapseNode,
      modelComponents,
      scenarios,
      selectedNodeScenarioData,
      selectedScenarioId,
      setSelectedScenarioId,
      modelSummary,
      scenarioSelectDropdownItems,
      historicalTimeseries,
      setHistoricalTimeseries,
      indicatorDescription,
      indicatorMin,
      indicatorMax,
      isSeasonalityActive,
      indicatorPeriod,
      temporalResolution
    };
  },
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
  flex-direction: column;
  background: white;
  margin: 10px;
  padding: 0 10px;
}

header {
  padding: 5px 0;
  margin-bottom: 5px;
  display: flex;
  justify-content: space-between;
  align-items: center;
}

h4 {
  margin: 0;
}

.nodes-container {
  display: flex;
  flex: 1;
  min-height: 0;
  margin-bottom: 10px;
}

.selected-node-column {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  margin: 0 15px;
  overflow-y: auto;
}

.scenario-selector {
  align-self: flex-start;
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

input[type=text] {
  width: 80px;
  margin: 0px 5px;
}
input[type=number] {
  width: 60px;
  margin: 0px 5px;
  display: inline-block;
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
  height: 350px;
  flex-shrink: 0;
  border: 1px solid black;
  border-radius: 4px;
  overflow: hidden;
  margin: 10px 0;
  display: flex;
  flex-direction: column;
}

.expanded-node-header {
  background: #eee;
  display: flex;
  justify-content: space-between;
  padding: 10px;
}

.scenario-chart {
  flex: 1;
  min-height: 0;
}

.neighbor-node {
  margin-top: 10px;
}

h5 {
  margin: 0;
  @include header-secondary;
}
</style>
