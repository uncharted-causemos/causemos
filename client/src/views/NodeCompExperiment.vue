<template>
  <div class="comp-analysis-experiment-container">
    <full-screen-modal-header
      icon="angle-left"
      :nav-back-label="navBackLabel"
      @close="onBack"
    >
      <button
        v-tooltip.top-center="selectLabel"
        type="button"
        class="btn btn-primary btn-call-for-action"
        @click="onSelection"
      >
        <i class="fa fa-fw fa-plus-circle" />
        {{selectLabel}}
      </button>
    </full-screen-modal-header>
    <main>
      <datacube-card
        :class="{ 'datacube-expanded': true }"
        :selected-admin-level="selectedAdminLevel"
        :selected-model-id="selectedModelId"
        :all-model-run-data="allModelRunData"
        :selected-scenario-ids="selectedScenarioIds"
        :selected-timestamp="selectedTimestamp"
        :selected-temporal-resolution="selectedTemporalResolution"
        :selected-temporal-aggregation="selectedTemporalAggregation"
        :selected-spatial-aggregation="selectedSpatialAggregation"
        :regional-data="regionalData"
        :output-source-specs="outputSpecs"
        :is-description-view="isDescriptionView"
        :metadata="metadata"
        :timeseries-data="visibleTimeseriesData"
        :relative-to="relativeTo"
        :breakdown-option="breakdownOption"
        :baseline-metadata="baselineMetadata"
        @set-selected-scenario-ids="setSelectedScenarioIds"
        @select-timestamp="setSelectedTimestamp"
        @set-drilldown-data="setDrilldownData"
        @set-relative-to="setRelativeTo"
        @refetch-data="fetchData"
        @new-runs-mode="newRunsMode=!newRunsMode"
        @update-desc-view="updateDescView"
      >
        <template #datacube-model-header>
          <div class="datacube-header" v-if="metadata && mainModelOutput">
            <div v-if="isExpanded">
              <h5>
                <select name="outputs" id="outputs"
                  v-if="outputs.length > 1"
                  @change="onOutputSelectionChange($event)"
                >
                  <option
                    v-for="(output, indx) in outputs"
                    :key="output.name"
                    :selected="indx === currentOutputIndex"
                  >{{output.display_name !== '' ? output.display_name : output.name}}</option>
                </select>
                <span v-else>{{mainModelOutput.display_name !== '' ? mainModelOutput.display_name : mainModelOutput.name}}</span>
                <label style="margin-left: 1rem; font-weight: normal;">| {{metadata.name}}</label>
              </h5>
              <disclaimer
                v-if="scenarioCount > 0"
                :message="
                  scenarioCount +
                    ' scenarios. Click a vertical line to select or deselect it.'
                "
              />
            </div>
          </div>
        </template>

        <template #spatial-aggregation-config>
          <dropdown-button
            class="spatial-aggregation"
            :inner-button-label="'Spatial Aggregation'"
            :items="['mean', 'sum']"
            :selected-item="selectedSpatialAggregation"
            @item-selected="item => selectedSpatialAggregation = item"
          />
        </template>

        <template #datacube-description>
          <datacube-description
            :metadata="metadata"
          />
        </template>

      </datacube-card>
      <drilldown-panel
          class="drilldown"
          :is-open="activeDrilldownTab !== null"
          :tabs="drilldownTabs"
          :active-tab-id="activeDrilldownTab"
        >
          <template #content>
            <breakdown-pane
              v-if="activeDrilldownTab ==='breakdown'"
              :selected-admin-level="selectedAdminLevel"
              :type-breakdown-data="typeBreakdownData"
              :regional-data="regionalData"
              :unit="unit"
              :selected-spatial-aggregation="selectedSpatialAggregation"
              :selected-timestamp="selectedTimestamp"
              :selected-scenario-ids="selectedScenarioIds"
              :deselected-region-ids="deselectedRegionIds"
              :selected-breakdown-option="breakdownOption"
              :selected-timeseries-points="selectedTimeseriesPoints"
              @toggle-is-region-selected="toggleIsRegionSelected"
              @set-selected-admin-level="setSelectedAdminLevel"
              @set-all-regions-selected="setAllRegionsSelected"
              @set-breakdown-option="setBreakdownOption"
            />
          </template>
      </drilldown-panel>
    </main>
  </div>
</template>

<script lang="ts">
import _ from 'lodash';
import { computed, defineComponent, Ref, ref, watchEffect } from 'vue';
import { mapActions, useStore } from 'vuex';

import BreakdownPane from '@/components/drilldown-panel/breakdown-pane.vue';
import DatacubeCard from '@/components/data/datacube-card.vue';
import DrilldownPanel from '@/components/drilldown-panel.vue';
import Disclaimer from '@/components/widgets/disclaimer.vue';
import DatacubeDescription from '@/components/data/datacube-description.vue';
import DropdownButton from '@/components/dropdown-button.vue';
import FullScreenModalHeader from '@/components/widgets/full-screen-modal-header.vue';

import useModelMetadata from '@/services/composables/useModelMetadata';
import useScenarioData from '@/services/composables/useScenarioData';
import useRegionalData from '@/services/composables/useRegionalData';
import useTimeseriesData from '@/services/composables/useTimeseriesData';

import { DimensionInfo, DatacubeFeature } from '@/types/Datacube';
import { NamedBreakdownData } from '@/types/Datacubes';
import { DatacubeType, ProjectType } from '@/types/Enums';

import { colorFromIndex } from '@/utils/colors-util';
import { getRandomNumber } from '@/utils/random';
import useSelectedTimeseriesPoints from '@/services/composables/useSelectedTimeseriesPoints';
import modelService from '@/services/model-service';

const DRILLDOWN_TABS = [
  {
    name: 'Breakdown',
    id: 'breakdown',
    // TODO: our version of FA doesn't include fa-chart
    icon: 'fa-question'
  }
];

export default defineComponent({
  name: 'NodeCompExperiment',
  components: {
    DatacubeCard,
    DrilldownPanel,
    BreakdownPane,
    Disclaimer,
    DatacubeDescription,
    DropdownButton,
    FullScreenModalHeader
  },
  data: () => ({
    modelComponents: {
      nodes: []
    }
  }),
  setup() {
    const selectedAdminLevel = ref(2);
    function setSelectedAdminLevel(newValue: number) {
      selectedAdminLevel.value = newValue;
    }

    const typeBreakdownData = ref([] as NamedBreakdownData[]);
    const isExpanded = true;

    const store = useStore();

    const currentCAG = computed(() => store.getters['app/currentCAG']);
    const nodeId = computed(() => store.getters['app/nodeId']);
    const project = computed(() => store.getters['app/project']);


    // NOTE: only one datacube id (model or indicator) will be provided as a selection from the data explorer
    const datacubeId = computed(() => store.getters['app/datacubeId']);

    const currentOutputIndex = computed(() => store.getters['modelPublishStore/currentOutputIndex']);

    const selectedModelId = ref(datacubeId);

    const metadata = useModelMetadata(selectedModelId);

    const mainModelOutput = ref<DatacubeFeature | undefined>(undefined);

    const selectedScenarioIds = ref([] as string[]);

    const selectedTimestamp = ref(null) as Ref<number | null>;

    const newRunsMode = ref(false);

    const modelRunsFetchedAt = ref(0);

    const allModelRunData = useScenarioData(selectedModelId, modelRunsFetchedAt);

    const timeInterval = 10000;

    function fetchData() {
      if (!newRunsMode.value && metadata.value?.type === DatacubeType.Model) {
        modelRunsFetchedAt.value = Date.now();
      }
    }

    // @REVIEW: consider notifying the user of new data and only fetch/reload if confirmed
    const timerHandler = setInterval(fetchData, timeInterval);

    const allScenarioIds = computed(() => allModelRunData.value.length > 0 ? allModelRunData.value.map(run => run.id) : []);
    const scenarioCount = computed(() => allModelRunData.value.length);
    const unit = computed(() =>
      mainModelOutput.value &&
      mainModelOutput.value.unit &&
      mainModelOutput.value.unit !== ''
        ? mainModelOutput.value.unit
        : null
    );

    const isDescriptionView = ref<boolean>(true);

    const outputs = ref([]) as Ref<DatacubeFeature[]>;

    watchEffect(() => {
      if (metadata.value && currentOutputIndex.value >= 0) {
        outputs.value = metadata.value?.validatedOutputs ? metadata.value?.validatedOutputs : metadata.value?.outputs;

        mainModelOutput.value = outputs.value[currentOutputIndex.value];
      }

      if (metadata.value?.type === DatacubeType.Indicator) {
        selectedScenarioIds.value = [DatacubeType.Indicator.toString()];
      } else {
        isDescriptionView.value = selectedScenarioIds.value.length === 0;
      }
    });

    const selectedTemporalResolution = ref('month');
    const selectedTemporalAggregation = ref('mean');
    const selectedSpatialAggregation = ref('mean');

    const setSelectedTimestamp = (value: number) => {
      if (selectedTimestamp.value === value) return;
      selectedTimestamp.value = value;
    };

    const breakdownOption = ref<string | null>(null);
    const setBreakdownOption = (newValue: string | null) => {
      breakdownOption.value = newValue;
    };

    const {
      timeseriesData,
      visibleTimeseriesData,
      relativeTo,
      baselineMetadata,
      setRelativeTo
    } = useTimeseriesData(
      metadata,
      selectedModelId,
      selectedScenarioIds,
      selectedTemporalResolution,
      selectedTemporalAggregation,
      selectedSpatialAggregation,
      breakdownOption,
      selectedTimestamp,
      setSelectedTimestamp
    );

    const { selectedTimeseriesPoints } = useSelectedTimeseriesPoints(
      breakdownOption,
      timeseriesData,
      selectedTimestamp,
      selectedScenarioIds
    );

    const {
      outputSpecs,
      regionalData,
      deselectedRegionIds,
      toggleIsRegionSelected,
      setAllRegionsSelected
    } = useRegionalData(
      selectedModelId,
      selectedSpatialAggregation,
      selectedTemporalAggregation,
      selectedTemporalResolution,
      metadata,
      selectedTimeseriesPoints
    );

    const selectLabel = 'Quantify Node';
    const navBackLabel = 'Select A Different Datacube';
    return {
      drilldownTabs: DRILLDOWN_TABS,
      activeDrilldownTab: 'breakdown',
      selectedTemporalResolution,
      selectedTemporalAggregation,
      selectedSpatialAggregation,
      selectedAdminLevel,
      setSelectedAdminLevel,
      selectedModelId,
      selectedScenarioIds,
      typeBreakdownData,
      selectedTimestamp,
      isExpanded,
      colorFromIndex,
      metadata,
      mainModelOutput,
      allModelRunData,
      allScenarioIds,
      scenarioCount,
      fetchData,
      newRunsMode,
      timerHandler,
      unit,
      regionalData,
      outputSpecs,
      isDescriptionView,
      deselectedRegionIds,
      toggleIsRegionSelected,
      setAllRegionsSelected,
      outputs,
      currentOutputIndex,
      setSelectedTimestamp,
      visibleTimeseriesData,
      baselineMetadata,
      relativeTo,
      setRelativeTo,
      breakdownOption,
      setBreakdownOption,
      selectLabel,
      navBackLabel,
      selectedTimeseriesPoints,
      currentCAG,
      nodeId,
      project
    };
  },
  unmounted(): void {
    clearInterval(this.timerHandler);
  },
  mounted() {
    // reset to 0 when any analysis loads
    //  to avoid the shared store state from conflicting when a different datacube/analysis is loaded
    // FIXME: actually read the value of the default output variable from the metadata
    // later, this value will be persisted per analysis
    this.setCurrentOutputIndex(0);

    // Load the CAG so we can find relevant components
    modelService.getComponents(this.currentCAG).then(_modelComponents => {
      this.modelComponents = _modelComponents;
    });
  },


  computed: {
    selectedNode(): any {
      if (this.nodeId === undefined || this.modelComponents === null) {
        return null;
      }
      return this.modelComponents.nodes.find((node: { id: any }) => node.id === this.nodeId);
    }
  },
  methods: {
    ...mapActions({
      setCurrentOutputIndex: 'modelPublishStore/setCurrentOutputIndex'
    }),

    onBack() {
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

    onSelection () {
      const nodeParameters = {
        id: this.selectedNode.id,
        concept: this.selectedNode.concept,
        label: this.selectedNode.label,
        model_id: this.selectedNode.model_id,
        parameter: {
          id: this.outputSpecs[this.currentOutputIndex].id,
          name: this.mainModelOutput?.name,
          unit: this.mainModelOutput?.unit,
          // to do respect selections made by users in the experiment view
          country: '',
          admin1: '',
          admin2: '',
          admin3: '',
          geospatial_aggregation: this.outputSpecs[this.currentOutputIndex].spatialAggregation,
          temporal_aggregation: this.outputSpecs[this.currentOutputIndex].temporalAggregation,
          temporal_resolution: this.outputSpecs[this.currentOutputIndex].temporalResolution,
          timeseries: [ // to do get actual timeseries data here
            {
              timestamp: 1527811200000,
              value: 10.5
            },
            {
              timestamp: 1530403200000,
              value: 13.5
            },
            {
              timestamp: 1533081600000,
              value: 24.5
            },
            {
              timestamp: 1535760000000,
              value: 15.2
            },
            {
              timestamp: 1538352000000,
              value: 24.9
            },
            {
              timestamp: 1541030400000,
              value: 30.2
            },
            {
              timestamp: 1543622400000,
              value: 11.2
            }
          ]
        }
      };
      modelService.updateNodeParameter(this.selectedNode.model_id, nodeParameters);


      this.$router.push({
        name: 'nodeDrilldown',
        params: {
          currentCAG: this.currentCAG,
          nodeId: this.nodeId,
          project: this.project,
          projectType: ProjectType.Analysis
        }
      });
    },

    onOutputSelectionChange(event: any) {
      const selectedOutputIndex = event.target.selectedIndex;
      // update the store so that other components can sync
      this.setCurrentOutputIndex(selectedOutputIndex);
    },
    updateDescView(val: boolean) {
      this.isDescriptionView = val;
    },
    setSelectedScenarioIds(newIds: string[]) {
      if (this.metadata?.type !== DatacubeType.Indicator) {
        if (_.isEqual(this.selectedScenarioIds, newIds)) return;
      }
      this.selectedScenarioIds = newIds;
    },
    setDrilldownData(e: { drilldownDimensions: Array<DimensionInfo> }) {
      this.typeBreakdownData = [];
      if (this.selectedScenarioIds.length === 0) return;
      // typeBreakdownData array contains an entry for each drilldown dimension
      //  (e.g. 'crop type')
      this.typeBreakdownData = e.drilldownDimensions.map(dimension => {
        // Initialize total for each scenarioId to 0
        const totals = {} as { [scenarioId: string]: number };
        this.selectedScenarioIds.forEach(scenarioId => {
          totals[scenarioId] = 0;
        });
        // Randomly assign values for each option in the dimension (e.g. 'maize', 'corn)
        //  to each scenario, and keep track of the sum totals for each scenario
        const choices = dimension.choices ?? [];
        const drilldownChildren = choices.map(choice => {
          const values = {} as { [scenarioId: string]: number };
          this.selectedScenarioIds.forEach(scenarioId => {
            // FIXME: use random data for now. Later, pickup the actual breakdown aggregation
            //  from (selected scenarios) data
            const randomValue = getRandomNumber(0, 5000);
            values[scenarioId] = randomValue;
            totals[scenarioId] += randomValue;
          });
          return {
            // Breakdown data IDs are written as the hierarchical path delimited by '__'
            id: 'All__' + choice,
            values
          };
        });

        return {
          name: dimension.name,
          data: {
            Total: [{ id: 'All', values: totals }],
            [dimension.name]: drilldownChildren
          }
        };
      });
    }
  }
});
</script>

<style lang="scss" scoped>
@import '~styles/variables';
.comp-analysis-experiment-container {
  height: $content-full-height;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

main {
  flex: 1;
  display: flex;
  min-height: 0;
}

.datacube-expanded {
  min-width: 0;
  flex: 1;
  margin: 10px;
  margin-top: 0;
}

.search-button {
  align-self: center;
  margin: 10px 0;
}

.comp-analysis-experiment-header {
  flex-direction: row;
  margin: auto;
}

.datacube-header {
  flex: 1;
  min-height: 70px;
}

.spatial-aggregation {
  margin: 5px 0;
}
</style>
