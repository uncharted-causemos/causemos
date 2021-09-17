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
    <main class="insight-capture">
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
        :current-tab-view="currentTabView"
        :metadata="metadata"
        :timeseries-data="visibleTimeseriesData"
        :relative-to="relativeTo"
        :breakdown-option="breakdownOption"
        :baseline-metadata="baselineMetadata"
        :selected-timeseries-points="selectedTimeseriesPoints"
        :selected-base-layer="selectedBaseLayer"
        :selected-data-layer="selectedDataLayer"
        :unit="unit"

        :qualifier-breakdown-data="qualifierBreakdownData"
        :temporal-breakdown-data="temporalBreakdownData"
        :selected-region-ids="selectedRegionIds"
        :selected-qualifier-values="selectedQualifierValues"
        :selected-breakdown-option="breakdownOption"
        :selected-years="selectedYears"

        @toggle-is-region-selected="toggleIsRegionSelected"
        @toggle-is-qualifier-selected="toggleIsQualifierSelected"
        @toggle-is-year-selected="toggleIsYearSelected"
        @set-selected-admin-level="setSelectedAdminLevel"
        @set-breakdown-option="setBreakdownOption"

        @set-selected-scenario-ids="setSelectedScenarioIds"
        @set-relative-to="setRelativeTo"
        @new-runs-mode="newRunsMode=!newRunsMode"
        @update-tab-view="updateTabView"
        @select-timestamp="setSelectedTimestamp"
        @refetch-data="fetchData"
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
            class="dropdown-config"
            :inner-button-label="'Spatial Aggregation'"
            :items="Object.values(AggregationOption)"
            :selected-item="selectedSpatialAggregation"
            @item-selected="setSpatialAggregationSelection"
          />
          <map-dropdown
            class="dropdown-config"
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
    </main>
  </div>
</template>

<script lang="ts">
import _ from 'lodash';
import { computed, defineComponent, Ref, ref, watchEffect } from 'vue';
import { mapActions, useStore } from 'vuex';
import DatacubeCard from '@/components/data/datacube-card.vue';
import Disclaimer from '@/components/widgets/disclaimer.vue';
import DatacubeDescription from '@/components/data/datacube-description.vue';
import DropdownButton from '@/components/dropdown-button.vue';
import FullScreenModalHeader from '@/components/widgets/full-screen-modal-header.vue';
import MapDropdown from '@/components/data/map-dropdown.vue';
import useModelMetadata from '@/services/composables/useModelMetadata';
import useScenarioData from '@/services/composables/useScenarioData';
import useOutputSpecs from '@/services/composables/useOutputSpecs';
import useRegionalData from '@/services/composables/useRegionalData';
import { AggregationOption, TemporalResolutionOption, DatacubeType, ProjectType } from '@/types/Enums';
import useTimeseriesData from '@/services/composables/useTimeseriesData';
import { DatacubeFeature } from '@/types/Datacube';
import useDatacubeHierarchy from '@/services/composables/useDatacubeHierarchy';
import useSelectedTimeseriesPoints from '@/services/composables/useSelectedTimeseriesPoints';
import useQualifiers from '@/services/composables/useQualifiers';
import { BASE_LAYER, DATA_LAYER } from '@/utils/map-util-new';
import { ViewState } from '@/types/Insight';
import modelService from '@/services/model-service';

export default defineComponent({
  name: 'NodeCompExperiment',
  components: {
    DatacubeCard,
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
    const store = useStore();
    const selectedAdminLevel = ref(0);
    function setSelectedAdminLevel(newValue: number) {
      selectedAdminLevel.value = newValue;
    }

    const isExpanded = true;

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

    const breakdownOption = ref<string | null>(null);
    const setBreakdownOption = (newValue: string | null) => {
      breakdownOption.value = newValue;
    };

    const {
      datacubeHierarchy,
      selectedRegionIds,
      toggleIsRegionSelected
    } = useDatacubeHierarchy(
      selectedScenarioIds,
      metadata,
      selectedAdminLevel,
      breakdownOption,
      ref([])
    );

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

    const currentTabView = ref<string>('description');

    const outputs = ref([]) as Ref<DatacubeFeature[]>;

    watchEffect(() => {
      if (metadata.value && currentOutputIndex.value >= 0) {
        outputs.value = metadata.value?.validatedOutputs ? metadata.value?.validatedOutputs : metadata.value?.outputs;

        mainModelOutput.value = outputs.value[currentOutputIndex.value];
      }

      if (metadata.value?.type === DatacubeType.Indicator) {
        selectedScenarioIds.value = [DatacubeType.Indicator.toString()];
      }
    });

    const selectedTemporalResolution = ref<TemporalResolutionOption>(TemporalResolutionOption.Month);
    const selectedTemporalAggregation = ref<AggregationOption>(AggregationOption.Mean);
    const selectedSpatialAggregation = ref<AggregationOption>(AggregationOption.Mean);

    const setSelectedTimestamp = (value: number) => {
      if (selectedTimestamp.value === value) return;
      selectedTimestamp.value = value;
    };

    const {
      qualifierBreakdownData,
      toggleIsQualifierSelected,
      selectedQualifierValues
    } = useQualifiers(
      metadata,
      breakdownOption,
      selectedScenarioIds,
      selectedTemporalResolution,
      selectedTemporalAggregation,
      selectedSpatialAggregation,
      selectedTimestamp,
      ref([])
    );


    const {
      timeseriesData,
      visibleTimeseriesData,
      relativeTo,
      baselineMetadata,
      setRelativeTo,
      temporalBreakdownData,
      selectedYears,
      toggleIsYearSelected
    } = useTimeseriesData(
      metadata,
      selectedScenarioIds,
      selectedTemporalResolution,
      selectedTemporalAggregation,
      selectedSpatialAggregation,
      breakdownOption,
      selectedTimestamp,
      setSelectedTimestamp,
      selectedRegionIds,
      selectedQualifierValues,
      ref([])
    );

    const { selectedTimeseriesPoints } = useSelectedTimeseriesPoints(
      breakdownOption,
      timeseriesData,
      selectedTimestamp,
      selectedScenarioIds
    );

    const {
      outputSpecs
    } = useOutputSpecs(
      selectedModelId,
      selectedSpatialAggregation,
      selectedTemporalAggregation,
      selectedTemporalResolution,
      metadata,
      selectedTimeseriesPoints
    );

    const {
      regionalData
    } = useRegionalData(
      outputSpecs,
      breakdownOption,
      datacubeHierarchy
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
      AggregationOption,
      allModelRunData,
      allScenarioIds,
      baselineMetadata,
      breakdownOption,
      currentCAG,
      currentOutputIndex,
      currentTabView,
      datacubeCurrentOutputsMap,
      fetchData,
      isExpanded,
      mainModelOutput,
      metadata,
      navBackLabel,
      newRunsMode,
      nodeId,
      outputs,
      outputSpecs,
      project,
      qualifierBreakdownData,
      regionalData,
      relativeTo,
      scenarioCount,
      selectedAdminLevel,
      selectedBaseLayer,
      selectedDataLayer,
      selectedModelId,
      selectedQualifierValues,
      selectedRegionIds,
      selectedScenarioIds,
      selectedSpatialAggregation,
      selectedTemporalAggregation,
      selectedTemporalResolution,
      selectedTimeseriesPoints,
      selectedTimestamp,
      selectedYears,
      selectLabel,
      setBaseLayer: (val: BASE_LAYER) => { selectedBaseLayer.value = val; },
      setBreakdownOption,
      setDataLayer: (val: DATA_LAYER) => { selectedDataLayer.value = val; },
      setRelativeTo,
      setSelectedAdminLevel,
      setSelectedTimestamp,
      stepsBeforeCanConfirm,
      temporalBreakdownData,
      timerHandler,
      toggleIsQualifierSelected,
      toggleIsRegionSelected,
      toggleIsYearSelected,
      unit,
      visibleTimeseriesData
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
      let country = '';
      let admin1 = '';
      let admin2 = '';
      let admin3 = '';

      if (this.selectedRegionIds.length > 0) {
        const regionList = this.selectedRegionIds[0].split('__');
        if (regionList.length > 0) {
          if (regionList[0]) country = regionList[0];
          if (regionList[1]) admin1 = regionList[1];
          if (regionList[2]) admin2 = regionList[2];
          if (regionList[3]) admin3 = regionList[3];
        }
      }

      const nodeParameters = {
        id: this.selectedNode.id,
        concept: this.selectedNode.concept,
        label: this.selectedNode.label,
        model_id: this.selectedNode.model_id,
        parameter: {
          id: this.metadata.id,
          name: this.metadata.name,
          unit: this.unit,
          country,
          admin1,
          admin2,
          admin3,
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
    onOutputSelectionChange(event: any) {
      const selectedOutputIndex = event.target.selectedIndex;
      // update the store so that other components can sync
      const updatedCurrentOutputsMap = _.cloneDeep(this.datacubeCurrentOutputsMap);
      updatedCurrentOutputsMap[this.metadata?.id ?? ''] = selectedOutputIndex;
      this.setDatacubeCurrentOutputsMap(updatedCurrentOutputsMap);
    },
    updateTabView(val: string) {
      this.currentTabView = val;
    },
    setTemporalAggregationSelection(temporalAgg: AggregationOption) {
      this.selectedTemporalAggregation = temporalAgg;
    },
    setSpatialAggregationSelection(spatialAgg: AggregationOption) {
      this.selectedSpatialAggregation = spatialAgg;
    },
    setTemporalResolutionSelection(temporalRes: TemporalResolutionOption) {
      this.selectedTemporalResolution = temporalRes;
    },
    setSelectedScenarioIds(newIds: string[]) {
      if (this.metadata?.type !== DatacubeType.Indicator) {
        if (_.isEqual(this.selectedScenarioIds, newIds)) return;
      }
      this.selectedScenarioIds = newIds;

      if (newIds.length > 0) {
        // selecting a run or multiple runs when the desc tab is active should always open the data tab
        //  selecting a run or multiple runs otherwise should respect the current tab
        if (this.currentTabView === 'description') {
          this.updateTabView('data');
        }
      } else {
        this.updateTabView('description');
      }
    }
  }
});
</script>

<style lang="scss" scoped>
@import '~styles/variables';
.comp-analysis-experiment-container {
  height: 100vh;
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

.dropdown-config:not(:first-child) {
  margin-left: 5px;
}
</style>
