<template>
  <div class="comp-analysis-experiment-container">
    <main class="main">
      <analytical-questions-and-insights-panel />
      <div class="main insight-capture">
        <!-- TODO: whether a card is actually expanded or not will
        be dynamic later -->
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
          :selectedBaseLayer="selectedBaseLayer"
          :selectedDataLayer="selectedDataLayer"
          :unit="unit"
          @set-selected-scenario-ids="setSelectedScenarioIds"
          @select-timestamp="setSelectedTimestamp"
          @set-relative-to="setRelativeTo"
          @refetch-data="fetchData"
          @new-runs-mode="newRunsMode=!newRunsMode"
          @update-tab-view="updateTabView"
        >
          <template #datacube-model-header>
            <h5
              v-if="metadata && mainModelOutput && isExpanded"
              class="datacube-header"
            >
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
              <span v-tooltip.top-center="'Explore related indicators'" class="datacube-name" @click="onClickDatacubeName">{{metadata.name}}</span>
            </h5>
          </template>

          <template #datacube-model-header-collapse>
            <button
              v-tooltip="'Collapse datacube'"
              class="btn btn-default"
              @click="onClose"
            >
              <i class="fa fa-fw fa-compress" />
            </button>
          </template>

          <template #temporal-aggregation-config>
            <dropdown-button
              class="dropdown-config tour-temporal-agg-dropdown-config"
              :inner-button-label="'Temporal Aggregation'"
              :items="Object.values(AggregationOption)"
              :selected-item="selectedTemporalAggregation"
              @item-selected="setTemporalAggregationSelection"
            />
          </template>

          <template #temporal-resolution-config>
            <dropdown-button
              class="dropdown-config"
              :inner-button-label="'Temporal Resolution'"
              :items="Object.values(TemporalResolutionOption)"
              :selected-item="selectedTemporalResolution"
              @item-selected="setTemporalResolutionSelection"
            />
          </template>

          <template #spatial-aggregation-config>
            <dropdown-button
              class="dropdown-config tour-spatial-agg-dropdown-config"
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
                :qualifier-breakdown-data="qualifierBreakdownData"
                :regional-data="regionalData"
                :temporal-breakdown-data="temporalBreakdownData"
                :unit="unit"
                :selected-spatial-aggregation="selectedSpatialAggregation"
                :selected-temporal-aggregation="selectedTemporalAggregation"
                :selected-temporal-resolution="selectedTemporalResolution"
                :selected-timestamp="selectedTimestamp"
                :selected-scenario-ids="selectedScenarioIds"
                :selected-region-ids="selectedRegionIds"
                :selected-qualifier-values="selectedQualifierValues"
                :selected-breakdown-option="breakdownOption"
                :selected-timeseries-points="selectedTimeseriesPoints"
                :selected-years="selectedYears"
                @toggle-is-region-selected="toggleIsRegionSelected"
                @toggle-is-qualifier-selected="toggleIsQualifierSelected"
                @toggle-is-year-selected="toggleIsYearSelected"
                @set-selected-admin-level="setSelectedAdminLevel"
                @set-breakdown-option="setBreakdownOption"
              />
            </template>
        </drilldown-panel>
      </div>
    </main>
  </div>
</template>

<script lang="ts">
import DatacubeCard from '@/components/data/datacube-card.vue';
import DrilldownPanel from '@/components/drilldown-panel.vue';
import { computed, defineComponent, Ref, ref, watchEffect } from 'vue';
import BreakdownPane from '@/components/drilldown-panel/breakdown-pane.vue';
import { DatacubeFeature } from '@/types/Datacube';
import DatacubeDescription from '@/components/data/datacube-description.vue';
import DropdownButton from '@/components/dropdown-button.vue';
import MapDropdown from '@/components/data/map-dropdown.vue';
import useScenarioData from '@/services/composables/useScenarioData';
import useOutputSpecs from '@/services/composables/useOutputSpecs';
import useRegionalData from '@/services/composables/useRegionalData';
import useModelMetadata from '@/services/composables/useModelMetadata';
import router from '@/router';
import _ from 'lodash';
import { AggregationOption, TemporalResolutionOption, DatacubeType, ProjectType } from '@/types/Enums';
import { mapActions, mapGetters, useStore } from 'vuex';
import { getInsightById } from '@/services/insight-service';
import AnalyticalQuestionsAndInsightsPanel from '@/components/analytical-questions/analytical-questions-and-insights-panel.vue';
import useTimeseriesData from '@/services/composables/useTimeseriesData';
import useDatacubeHierarchy from '@/services/composables/useDatacubeHierarchy';
import { getAnalysis } from '@/services/analysis-service';
import useSelectedTimeseriesPoints from '@/services/composables/useSelectedTimeseriesPoints';
import { BASE_LAYER, DATA_LAYER } from '@/utils/map-util-new';
import { Insight, ViewState, DataState } from '@/types/Insight';
import { AnalysisItem } from '@/types/Analysis';
import useQualifiers from '@/services/composables/useQualifiers';
import { useRoute } from 'vue-router';
import { ModelRun } from '@/types/ModelRun';
import filtersUtil from '@/utils/filters-util';
import { DATASET_NAME } from '@/utils/datacube-util';

const DRILLDOWN_TABS = [
  {
    name: 'Breakdown',
    id: 'breakdown',
    // TODO: our version of FA doesn't include fa-chart
    icon: 'fa-question'
  }
];

export default defineComponent({
  name: 'DatacubeDrilldown',
  components: {
    DatacubeCard,
    DrilldownPanel,
    BreakdownPane,
    DatacubeDescription,
    DropdownButton,
    AnalyticalQuestionsAndInsightsPanel,
    MapDropdown
  },
  setup() {
    const selectedAdminLevel = ref(0);
    const isExpanded = true;

    const selectedBaseLayer = ref(BASE_LAYER.DEFAULT);
    const selectedDataLayer = ref(DATA_LAYER.ADMIN);
    const breakdownOption = ref<string | null>(null);

    const selectedTemporalResolution = ref<TemporalResolutionOption>(TemporalResolutionOption.Month);
    const selectedTemporalAggregation = ref<AggregationOption>(AggregationOption.Mean);
    const selectedSpatialAggregation = ref<AggregationOption>(AggregationOption.Mean);

    const store = useStore();
    const datacubeCurrentOutputsMap = computed(() => store.getters['app/datacubeCurrentOutputsMap']);
    const currentOutputIndex = computed(() => metadata.value?.id !== undefined ? datacubeCurrentOutputsMap.value[metadata.value?.id] : 0);
    const analysisItems = computed(() => store.getters['dataAnalysis/analysisItems']);
    const route = useRoute();
    const datacubeId = route.query.datacube_id as any;
    const analysisId = computed(() => store.getters['dataAnalysis/analysisId']);

    // apply initial data config for this datacube
    const initialSelectedRegionIds = ref<string[]>([]);
    const initialSelectedQualifierValues = ref<string[]>([]);
    const initialSelectedYears = ref<string[]>([]);

    // NOTE: only one datacube id (model or indicator) will be provided as the analysis-item at 0-index
    const initialViewConfig: ViewState = analysisId.value[0].viewConfig;
    const initialDataConfig: DataState = analysisId.value[0].dataConfig;

    // apply initial view config for this datacube
    if (initialViewConfig && !_.isEmpty(initialViewConfig)) {
      if (initialViewConfig.temporalResolution !== undefined) {
        selectedTemporalResolution.value = initialViewConfig.temporalResolution as TemporalResolutionOption;
      }
      if (initialViewConfig.temporalAggregation !== undefined) {
        selectedTemporalAggregation.value = initialViewConfig.temporalAggregation as AggregationOption;
      }
      if (initialViewConfig.spatialAggregation !== undefined) {
        selectedSpatialAggregation.value = initialViewConfig.spatialAggregation as AggregationOption;
      }
      if (initialViewConfig.selectedOutputIndex !== undefined) {
        const defaultOutputMap = _.cloneDeep(datacubeCurrentOutputsMap.value);
        defaultOutputMap[datacubeId] = initialViewConfig.selectedOutputIndex;
        store.dispatch('app/setDatacubeCurrentOutputsMap', defaultOutputMap);
      }
      if (initialViewConfig.selectedMapBaseLayer !== undefined) {
        selectedBaseLayer.value = initialViewConfig.selectedMapBaseLayer;
      }
      if (initialViewConfig.selectedMapDataLayer !== undefined) {
        selectedDataLayer.value = initialViewConfig.selectedMapDataLayer;
      }
      if (initialViewConfig.breakdownOption !== undefined) {
        breakdownOption.value = initialViewConfig.breakdownOption;
      }
      if (initialViewConfig.selectedAdminLevel !== undefined) {
        selectedAdminLevel.value = initialViewConfig.selectedAdminLevel;
      }
    }

    if (initialDataConfig && !_.isEmpty(initialDataConfig)) {
      if (initialDataConfig.selectedRegionIds !== undefined) {
        initialSelectedRegionIds.value = _.clone(initialDataConfig.selectedRegionIds);
      }
      if (initialDataConfig.selectedQualifierValues !== undefined) {
        initialSelectedQualifierValues.value = _.clone(initialDataConfig.selectedQualifierValues);
      }
    }

    const selectedModelId = ref(datacubeId);

    const metadata = useModelMetadata(selectedModelId);

    const mainModelOutput = ref<DatacubeFeature | undefined>(undefined);

    const selectedScenarioIds = ref([] as string[]);
    const selectedScenarios = ref([] as ModelRun[]);

    watchEffect(() => {
      // If more than one run is selected, make sure "split by" is set to none.
      if (selectedScenarioIds.value.length > 1) {
        breakdownOption.value = null;
      }
    });

    const selectedTimestamp = ref(null) as Ref<number | null>;

    const newRunsMode = ref(false);

    const modelRunsFetchedAt = ref(0);

    const allModelRunData = useScenarioData(selectedModelId, modelRunsFetchedAt);

    const {
      datacubeHierarchy,
      selectedRegionIds,
      toggleIsRegionSelected
    } = useDatacubeHierarchy(
      selectedScenarioIds,
      metadata,
      selectedAdminLevel,
      breakdownOption,
      initialSelectedRegionIds
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
      if (metadata.value) {
        outputs.value = metadata.value?.validatedOutputs ? metadata.value?.validatedOutputs : metadata.value?.outputs;

        // note: this value of metadata may be undefined while model is still being loaded
        store.dispatch('insightPanel/setContextId', [metadata.value?.id]);

        let initialOutputIndex = 0;
        const currentOutputEntry = datacubeCurrentOutputsMap.value[metadata.value.id];
        if (currentOutputEntry !== undefined) {
          // we have a store entry for the selected output of the current model
          initialOutputIndex = currentOutputEntry;
        } else {
          initialOutputIndex = metadata.value.validatedOutputs?.findIndex(o => o.name === metadata.value?.default_feature) ?? 0;

          // update the store
          const defaultOutputMap = _.cloneDeep(datacubeCurrentOutputsMap.value);
          defaultOutputMap[metadata.value.id] = initialOutputIndex;
          store.dispatch('app/setDatacubeCurrentOutputsMap', defaultOutputMap);
        }
        mainModelOutput.value = outputs.value[initialOutputIndex];
      }
    });

    watchEffect(() => {
      if (metadata.value?.type === DatacubeType.Indicator) {
        selectedScenarioIds.value = [DatacubeType.Indicator.toString()];
      }
    });

    const clearRouteParam = () => {
      router.push({
        query: {
          insight_id: undefined,
          datacube_id: selectedModelId.value
        }
      }).catch(() => {});
    };

    const setSelectedTimestamp = (value: number) => {
      if (selectedTimestamp.value === value) return;
      selectedTimestamp.value = value;
      clearRouteParam();
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
      initialSelectedQualifierValues
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
      initialSelectedYears,
      selectedScenarios
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
      selectedTimeseriesPoints,
      allModelRunData
    );

    const {
      regionalData
    } = useRegionalData(
      outputSpecs,
      breakdownOption,
      datacubeHierarchy
    );

    watchEffect(() => {
      const updatedAnalysisItems = _.cloneDeep(analysisItems.value);
      const currentAnalysisItem: AnalysisItem = updatedAnalysisItems.find((item: AnalysisItem) => item.id === datacubeId);
      if (currentAnalysisItem.viewConfig === undefined) {
        currentAnalysisItem.viewConfig = {} as ViewState;
      }
      const viewState: ViewState = {
        spatialAggregation: selectedSpatialAggregation.value,
        temporalAggregation: selectedTemporalAggregation.value,
        temporalResolution: selectedTemporalResolution.value,
        isDescriptionView: currentTabView.value === 'description', // FIXME
        selectedOutputIndex: currentOutputIndex.value,
        selectedMapBaseLayer: selectedBaseLayer.value,
        selectedMapDataLayer: selectedDataLayer.value,
        breakdownOption: breakdownOption.value,
        selectedAdminLevel: selectedAdminLevel.value
      };
      store.dispatch('insightPanel/setViewState', viewState);

      //
      // data state
      //
      if (currentAnalysisItem.dataConfig === undefined) {
        currentAnalysisItem.dataConfig = {} as DataState;
      }
      const dataState: DataState = {
        selectedModelId: selectedModelId.value,
        selectedScenarioIds: selectedScenarioIds.value,
        selectedTimestamp: selectedTimestamp.value,
        datacubeTitles: [{
          datacubeName: metadata.value?.name ?? '',
          datacubeOutputName: mainModelOutput?.value?.display_name ?? ''
        }],
        datacubeRegions: metadata.value?.geography.country, // FIXME: later this could be the selected region for each datacube
        selectedRegionIds: selectedRegionIds.value,
        relativeTo: relativeTo.value,
        selectedQualifierValues: [...selectedQualifierValues.value],
        selectedYears: [...selectedYears.value]
      };
      store.dispatch('insightPanel/setDataState', dataState);

      // FIXME: state is now stored in two places: dataAnalysis and insightPanel
      currentAnalysisItem.viewConfig = viewState;
      currentAnalysisItem.dataConfig = dataState;
      store.dispatch('dataAnalysis/updateAnalysisItems', { currentAnalysisId: analysisId.value, analysisItems: updatedAnalysisItems });
    });

    return {
      drilldownTabs: DRILLDOWN_TABS,
      activeDrilldownTab: 'breakdown',
      selectedTemporalResolution,
      selectedTemporalAggregation,
      selectedSpatialAggregation,
      selectedAdminLevel,
      selectedModelId,
      selectedScenarioIds,
      selectedTimestamp,
      isExpanded,
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
      currentTabView,
      selectedRegionIds,
      toggleIsRegionSelected,
      outputs,
      currentOutputIndex,
      setSelectedTimestamp,
      clearRouteParam,
      visibleTimeseriesData,
      baselineMetadata,
      relativeTo,
      setRelativeTo,
      breakdownOption,
      temporalBreakdownData,
      AggregationOption,
      TemporalResolutionOption,
      selectedTimeseriesPoints,
      selectedBaseLayer,
      selectedDataLayer,
      datacubeCurrentOutputsMap,
      analysisItems,
      analysisId,
      qualifierBreakdownData,
      toggleIsQualifierSelected,
      selectedQualifierValues,
      selectedYears,
      toggleIsYearSelected,
      initialSelectedQualifierValues,
      initialSelectedRegionIds,
      initialSelectedYears,
      selectedScenarios
    };
  },
  data: () => ({
    analysis: undefined,
    ProjectType
  }),
  watch: {
    $route: {
      handler(/* newValue, oldValue */) {
        // NOTE:  this is only valid when the route is focused on the 'data' space
        if (this.$route.name === 'data' && this.$route.query) {
          const insight_id = this.$route.query.insight_id as any;
          if (insight_id !== undefined) {
            this.updateStateFromInsight(insight_id);
          }
        }
      },
      immediate: true
    }
  },
  unmounted(): void {
    clearInterval(this.timerHandler);
  },
  async mounted() {
    // ensure the insight explorer panel is closed in case the user has
    //  previously opened it and clicked the browser back button
    this.hideInsightPanel();

    if (this.projectType === ProjectType.Analysis) {
      this.analysis = await getAnalysis(this.analysisId);
    }
  },
  computed: {
    ...mapGetters({
      project: 'app/project',
      projectType: 'app/projectType'
    })
  },
  methods: {
    ...mapActions({
      setDatacubeCurrentOutputsMap: 'app/setDatacubeCurrentOutputsMap',
      hideInsightPanel: 'insightPanel/hideInsightPanel'
    }),
    setSelectedAdminLevel(newValue: number) {
      this.selectedAdminLevel = newValue;
    },
    setBaseLayer(val: BASE_LAYER) {
      this.selectedBaseLayer = val;
    },
    setDataLayer(val: DATA_LAYER) {
      this.selectedDataLayer = val;
    },
    setBreakdownOption(newValue: string | null) {
      this.breakdownOption = newValue;
    },
    onClickDatacubeName() {
      const analysisId = this.analysisId ?? '';
      const metadataName = this.metadata?.name ?? '';
      const filters: any = filtersUtil.newFilters();
      filtersUtil.setClause(filters, DATASET_NAME, [metadataName], 'or', false);
      this.$router.push({ name: 'dataExplorer', query: { analysisId, filters } });
    },
    async onClose() {
      this.$router.push({
        name: 'dataComparative',
        params: {
          project: this.project,
          analysisId: this.analysisId,
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
    async updateStateFromInsight(insight_id: string) {
      const loadedInsight: Insight = await getInsightById(insight_id);
      // FIXME: before applying the insight, which will overwrite current state,
      //  consider pushing current state to the url to support browser hsitory
      //  in case the user wants to navigate to the original state using back button
      if (loadedInsight) {
        //
        // insight was found and loaded
        //
        // data state
        // FIXME: the order of resetting the state is important
        if (loadedInsight.data_state?.selectedModelId) {
          // this will reload datacube metadata as well as scenario runs
          this.selectedModelId = loadedInsight.data_state?.selectedModelId;
        }
        if (loadedInsight.data_state?.selectedScenarioIds) {
          // this would only be valid and effective if/after datacube runs are reloaded
          this.setSelectedScenarioIds(loadedInsight.data_state?.selectedScenarioIds);
        }
        if (loadedInsight.data_state?.selectedTimestamp) {
          this.setSelectedTimestamp(loadedInsight.data_state?.selectedTimestamp);
        }
        if (loadedInsight.data_state?.relativeTo !== undefined) {
          this.setRelativeTo(loadedInsight.data_state?.relativeTo);
        }
        // view state
        if (loadedInsight.view_state?.spatialAggregation) {
          this.selectedSpatialAggregation = loadedInsight.view_state?.spatialAggregation as AggregationOption;
        }
        if (loadedInsight.view_state?.temporalAggregation) {
          this.selectedTemporalAggregation = loadedInsight.view_state?.temporalAggregation as AggregationOption;
        }
        if (loadedInsight.view_state?.temporalResolution) {
          this.selectedTemporalResolution = loadedInsight.view_state?.temporalResolution as TemporalResolutionOption;
        }
        if (loadedInsight.view_state?.isDescriptionView !== undefined) {
          // FIXME
          this.updateTabView(loadedInsight.view_state?.isDescriptionView ? 'description' : 'data');
        }
        if (loadedInsight.view_state?.selectedOutputIndex) {
          const updatedCurrentOutputsMap = _.cloneDeep(this.datacubeCurrentOutputsMap);
          const datacubeId = this.metadata ? this.metadata?.id : loadedInsight.data_state?.selectedModelId;
          updatedCurrentOutputsMap[datacubeId ?? ''] = loadedInsight.view_state?.selectedOutputIndex;
          this.setDatacubeCurrentOutputsMap(updatedCurrentOutputsMap);
        }
        if (loadedInsight.view_state?.selectedMapBaseLayer) {
          this.setBaseLayer(loadedInsight.view_state?.selectedMapBaseLayer);
        }
        if (loadedInsight.view_state?.selectedMapDataLayer) {
          this.setDataLayer(loadedInsight.view_state?.selectedMapDataLayer);
        }
        if (loadedInsight.view_state?.breakdownOption !== undefined) {
          this.setBreakdownOption(loadedInsight.view_state?.breakdownOption);
        }
        if (loadedInsight.view_state?.selectedAdminLevel !== undefined) {
          this.setSelectedAdminLevel(loadedInsight.view_state?.selectedAdminLevel);
        }
        if (loadedInsight.data_state?.selectedRegionIds !== undefined) {
          this.initialSelectedRegionIds = _.clone(loadedInsight.data_state?.selectedRegionIds);
        }
        // @NOTE: 'initialSelectedQualifierValues' must be set after 'breakdownOption'
        if (loadedInsight.data_state?.selectedQualifierValues !== undefined) {
          this.initialSelectedQualifierValues = _.clone(loadedInsight.data_state?.selectedQualifierValues);
        }
        // @NOTE: 'initialSelectedQualifierValues' must be set after 'breakdownOption'
        if (loadedInsight.data_state?.selectedYears !== undefined) {
          this.initialSelectedYears = _.clone(loadedInsight.data_state?.selectedYears);
        }
      }
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

      this.clearRouteParam();

      if (newIds.length > 0) {
        // selecting a run or multiple runs when the desc tab is active should always open the data tab
        //  selecting a run or multiple runs otherwise should respect the current tab
        if (this.currentTabView === 'description') {
          this.updateTabView('data');
        }

        // once the list of selected scenario changes,
        //  extract model runs that match the selected scenario IDs
        this.selectedScenarios = newIds.reduce((filteredRuns: ModelRun[], runId) => {
          this.allModelRunData.some(run => {
            return runId === run.id && filteredRuns.push(run);
          });
          return filteredRuns;
        }, []);
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
  height: $content-full-height;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.main {
  flex: 1;
  display: flex;
  min-height: 0;
  min-width: 0;
}

.datacube-expanded {
  min-width: 0;
  flex: 1;
  margin: 10px;
  margin-left: 0;
}

.datacube-name {
  font-weight: normal;
  color: $label-color;
  margin-left: 10px;
  cursor: -moz-zoom-in;
  cursor: -webkit-zoom-in;
  cursor: zoom-in;
  &:hover {
    filter: brightness(60%);
  }
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
  margin: 0;
}

.dropdown-config:not(:first-child) {
  margin-left: 5px;
}

</style>
