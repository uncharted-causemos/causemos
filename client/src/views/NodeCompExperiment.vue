<template>
  <div class="comp-analysis-experiment-container">
    <full-screen-modal-header
      icon="angle-left"
      :nav-back-label="navBackLabel"
      @close="onBack"
    >
      <div class="header-content">
        <button
          v-tooltip.top-center="selectLabel"
          :disabled="stepsBeforeCanConfirm.length > 0"
          type="button"
          class="btn btn-primary btn-call-for-action"
          @click="onSelection"
        >
          <i class="fa fa-fw fa-plus-circle" />
          {{selectLabel}}
        </button>
        <span v-if="stepsBeforeCanConfirm.length > 0">{{ stepsBeforeCanConfirm[0] }}</span>
      </div>
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
        :selected-timeseries-points="selectedTimeseriesPoints"
        :selected-base-layer="selectedBaseLayer"
        :selected-data-layer="selectedDataLayer"
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
          <map-dropdown
            :selectedBaseLayer="selectedBaseLayer"
            :selectedDataLayer="selectedDataLayer"
            @set-base-layer="setBaseLayer"
            @set-data-layer="setDataLayer"
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
import MapDropdown from '@/components/data/map-dropdown.vue';

import useModelMetadata from '@/services/composables/useModelMetadata';
import useScenarioData from '@/services/composables/useScenarioData';
import useRegionalData from '@/services/composables/useRegionalData';
import useTimeseriesData from '@/services/composables/useTimeseriesData';

import { DimensionInfo, DatacubeFeature } from '@/types/Datacube';
import { NamedBreakdownData } from '@/types/Datacubes';
import { DatacubeType, ProjectType } from '@/types/Enums';

import { BASE_LAYER, DATA_LAYER } from '@/utils/map-util-new';
import { colorFromIndex } from '@/utils/colors-util';
import { getRandomNumber } from '@/utils/random';
import useSelectedTimeseriesPoints from '@/services/composables/useSelectedTimeseriesPoints';
import modelService from '@/services/model-service';
import { ViewState } from '@/types/Insight';

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
    FullScreenModalHeader,
    MapDropdown
  },
  data: () => ({
    modelComponents: {
      nodes: []
    }
  }),
  setup() {
    const selectedAdminLevel = ref(0);
    function setSelectedAdminLevel(newValue: number) {
      selectedAdminLevel.value = newValue;
    }

    const typeBreakdownData = ref([] as NamedBreakdownData[]);
    const isExpanded = true;

    const store = useStore();

    const currentCAG = computed(() => store.getters['app/currentCAG']);
    const nodeId = computed(() => store.getters['app/nodeId']);
    const project = computed(() => store.getters['app/project']);


    // NOTE: only one indicator id (model or indicator) will be provided as a selection from the data explorer
    const indicatorId = computed(() => store.getters['app/indicatorId']);

    const datacubeCurrentOutputsMap = computed(() => store.getters['app/datacubeCurrentOutputsMap']);

    const currentOutputIndex = computed(() => {
      if (
        metadata.value?.id !== undefined &&
        datacubeCurrentOutputsMap.value[metadata.value?.id] !== undefined
      ) {
        return datacubeCurrentOutputsMap.value[metadata.value?.id];
      } else {
        return 0;
      }
    });

    const metadata = useModelMetadata(indicatorId);

    const selectedModelId = ref(metadata.value?.data_id ?? '');

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
      setSelectedTimestamp,
      ref([]) // region breakdown
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

    const stepsBeforeCanConfirm = computed(() => {
      const steps = [];
      if (metadata.value === null) {
        steps.push('Loading...');
      }
      if (selectedScenarioIds.value.length < 1) {
        steps.push('Please select a scenario.');
      } else if (selectedScenarioIds.value.length > 1) {
        steps.push('Please select exactly one scenario.');
      }
      if (breakdownOption.value !== null) {
        steps.push('Please set "split by" to "none".');
      }
      return steps;
    });

    const selectLabel = 'Quantify Node';
    const navBackLabel = 'Select A Different Datacube';

    const selectedBaseLayer = ref(BASE_LAYER.DEFAULT);
    const selectedDataLayer = ref(DATA_LAYER.ADMIN);
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
      datacubeCurrentOutputsMap,
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
      project,
      stepsBeforeCanConfirm,
      selectedBaseLayer,
      selectedDataLayer,
      setBaseLayer: (val: BASE_LAYER) => { selectedBaseLayer.value = val; },
      setDataLayer: (val: DATA_LAYER) => { selectedDataLayer.value = val; }
    };
  },
  unmounted(): void {
    clearInterval(this.timerHandler);
  },
  mounted() {
    // Load the CAG so we can find relevant components
    modelService.getComponents(this.currentCAG).then(_modelComponents => {
      this.modelComponents = _modelComponents;

      if (this.selectedNode !== null) {
        // restore view config options, if any
        const initialViewConfig = this.selectedNode.parameter;
        if (initialViewConfig) {
          if (initialViewConfig.temporalResolution !== undefined) {
            this.selectedTemporalResolution = initialViewConfig.temporalResolution;
          }
          if (initialViewConfig.temporalAggregation !== undefined) {
            this.selectedTemporalAggregation = initialViewConfig.temporalAggregation;
          }
          if (initialViewConfig.spatialAggregation !== undefined) {
            this.selectedSpatialAggregation = initialViewConfig.spatialAggregation;
          }
          if (initialViewConfig.selectedOutputIndex !== undefined) {
            const updatedCurrentOutputsMap = _.cloneDeep(this.datacubeCurrentOutputsMap);
            updatedCurrentOutputsMap[this.metadata?.id ?? ''] = initialViewConfig.selectedOutputIndex;
            this.setDatacubeCurrentOutputsMap(updatedCurrentOutputsMap);
          }
          if (initialViewConfig.selectedMapBaseLayer !== undefined) {
            this.selectedBaseLayer = initialViewConfig.selectedMapBaseLayer;
          }
          if (initialViewConfig.selectedMapDataLayer !== undefined) {
            this.selectedDataLayer = initialViewConfig.selectedMapDataLayer;
          }
          if (initialViewConfig.breakdownOption !== undefined) {
            this.breakdownOption = initialViewConfig.breakdownOption;
          }
          if (initialViewConfig.selectedAdminLevel !== undefined) {
            this.selectedAdminLevel = initialViewConfig.selectedAdminLevel;
          }
        }
      }
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
      setDatacubeCurrentOutputsMap: 'app/setDatacubeCurrentOutputsMap'
    }),

    onBack() {
      if (window.history.length > 1) {
        window.history.go(-1);
      } else {
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
    },
    async onSelection() {
      if (this.metadata === null) {
        console.error('Confirm should not be clickable until metadata is loaded.');
        return;
      }
      if (this.visibleTimeseriesData.length !== 1) {
        console.error('There should be exactly one timeseries visible.', this.visibleTimeseriesData);
        return;
      }
      const timeseries = this.visibleTimeseriesData[0].points;
      const nodeParameters = {
        id: this.selectedNode.id,
        concept: this.selectedNode.concept,
        label: this.selectedNode.label,
        model_id: this.selectedNode.model_id,
        parameter: {
          id: this.metadata.id,
          name: this.metadata.name,
          unit: this.unit,
          country: '',
          admin1: '',
          admin2: '',
          admin3: '',
          period: 12,
          timeseries,
          max: null, // filled in by server
          min: null // filled in by server
        }
      };
      // save view config options when quantifying the node along with the node parameters
      const viewConfig: ViewState = {
        spatialAggregation: this.selectedSpatialAggregation,
        temporalAggregation: this.selectedTemporalAggregation,
        temporalResolution: this.selectedTemporalResolution,
        breakdownOption: this.breakdownOption,
        selectedAdminLevel: this.selectedAdminLevel,
        selectedOutputIndex: this.currentOutputIndex,
        selectedMapBaseLayer: this.selectedBaseLayer,
        selectedMapDataLayer: this.selectedDataLayer
      };
      Object.keys(viewConfig).forEach(key => {
        (nodeParameters.parameter as any)[key] = viewConfig[key];
      });
      await modelService.updateNodeParameter(this.selectedNode.model_id, nodeParameters);

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

    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    onOutputSelectionChange(event: any) {
      const selectedOutputIndex = event.target.selectedIndex;
      // update the store so that other components can sync
      const updatedCurrentOutputsMap = _.cloneDeep(this.datacubeCurrentOutputsMap);
      updatedCurrentOutputsMap[this.metadata?.id ?? ''] = selectedOutputIndex;
      this.setDatacubeCurrentOutputsMap(updatedCurrentOutputsMap);
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

.header-content > *:not(:first-child) {
  margin-left: 5px;
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
