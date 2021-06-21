<template>
  <div class="comp-analysis-experiment-container">
    <main>
    <context-insight-panel />
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
      :is-description-view="isDescriptionView"
      :metadata="metadata"
      :timeseries-data="timeseriesData"
      :relative-to="relativeTo"
      @set-selected-scenario-ids="setSelectedScenarioIds"
      @select-timestamp="setSelectedTimestamp"
      @set-drilldown-data="setDrilldownData"
      @set-relative-to="setRelativeTo"
      @refetch-data="fetchData"
      @new-runs-mode="newRunsMode=!newRunsMode"
      @update-desc-view="updateDescView"
    >
      <template #datacube-model-header>
        <div class="datacube-header" v-if="mainModelOutput">
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
import DatacubeCard from '@/components/data/datacube-card.vue';
import DrilldownPanel from '@/components/drilldown-panel.vue';
import { computed, defineComponent, Ref, ref, watchEffect } from 'vue';
import BreakdownPane from '@/components/drilldown-panel/breakdown-pane.vue';
import { DimensionInfo, DatacubeFeature } from '@/types/Datacube';
import { getRandomNumber } from '@/utils/random';
import Disclaimer from '@/components/widgets/disclaimer.vue';
import { colorFromIndex } from '@/utils/colors-util';
import DatacubeDescription from '@/components/data/datacube-description.vue';
import DropdownButton from '@/components/dropdown-button.vue';
import useScenarioData from '@/services/composables/useScenarioData';
import useRegionalData from '@/services/composables/useRegionalData';
import useModelMetadata from '@/services/composables/useModelMetadata';
import router from '@/router';
import _ from 'lodash';
import { DatacubeType } from '@/types/Enums';
import { mapActions, mapGetters, useStore } from 'vuex';
import { NamedBreakdownData } from '@/types/Datacubes';
import { getInsightById } from '@/services/insight-service';
import { Insight } from '@/types/Insight';
import ContextInsightPanel from '@/components/context-insight-panel/context-insight-panel.vue';
import useTimeseriesData from '@/services/composables/useTimeseriesData';

const DRILLDOWN_TABS = [
  {
    name: 'Breakdown',
    id: 'breakdown',
    // TODO: our version of FA doesn't include fa-chart
    icon: 'fa-question'
  }
];

export default defineComponent({
  name: 'CompAnalysisExperiment',
  components: {
    DatacubeCard,
    DrilldownPanel,
    BreakdownPane,
    Disclaimer,
    DatacubeDescription,
    DropdownButton,
    ContextInsightPanel
  },
  setup() {
    const selectedAdminLevel = ref(2);
    function setSelectedAdminLevel(newValue: number) {
      selectedAdminLevel.value = newValue;
    }

    const typeBreakdownData = ref([] as NamedBreakdownData[]);
    const isExpanded = true;

    const store = useStore();
    const analysisItem = computed(() => store.getters['dataAnalysis/analysisItems']);
    // NOTE: only one datacube id (model or indicator) will be provided as a selection from the data explorer
    const datacubeId = analysisItem.value[0].id;

    const projectId = computed(() => store.getters['app/project']);

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

      // NOTE: the following line is being set only inside the data view and the model publish page
      if (metadata.value !== null) {
        // note: this value of metadata may be undefined while model is still being loaded
        store.dispatch('insightPanel/setContextId', metadata.value?.id);
      }
      store.dispatch('insightPanel/setProjectId', projectId.value);
    });

    const selectedTemporalResolution = ref('month');
    const selectedTemporalAggregation = ref('mean');
    const selectedSpatialAggregation = ref('mean');

    watchEffect(() => {
      const dataState = {
        selectedModelId: selectedModelId.value,
        selectedScenarioIds: selectedScenarioIds.value,
        selectedTimestamp: selectedTimestamp.value
      };
      const viewState = {
        spatialAggregation: selectedSpatialAggregation.value,
        temporalAggregation: selectedTemporalAggregation.value,
        temporalResolution: selectedTemporalResolution.value,
        isDescriptionView: isDescriptionView.value
      };

      store.dispatch('insightPanel/setViewState', viewState);
      store.dispatch('insightPanel/setDataState', dataState);
    });

    const clearRouteParam = () => {
      router.push({
        query: {
          insight_id: undefined
        }
      }).catch(() => {});
    };

    const setSelectedTimestamp = (value: number) => {
      if (selectedTimestamp.value === value) return;
      selectedTimestamp.value = value;
      clearRouteParam();
    };

    const {
      timeseriesData,
      relativeTo,
      setRelativeTo
    } = useTimeseriesData(
      metadata,
      selectedModelId,
      selectedScenarioIds,
      colorFromIndex,
      selectedTemporalResolution,
      selectedTemporalAggregation,
      selectedSpatialAggregation,
      setSelectedTimestamp
    );

    const {
      outputSpecs,
      regionalData,
      deselectedRegionIds,
      toggleIsRegionSelected,
      setAllRegionsSelected
    } = useRegionalData(
      selectedModelId,
      selectedScenarioIds,
      selectedTimestamp,
      selectedSpatialAggregation,
      selectedTemporalAggregation,
      selectedTemporalResolution,
      metadata
    );

    const breakdownOption = ref('none');
    const setBreakdownOption = (newValue: string) => {
      breakdownOption.value = newValue;
    };

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
      clearRouteParam,
      timeseriesData,
      relativeTo,
      setRelativeTo,
      breakdownOption,
      setBreakdownOption
    };
  },
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
  mounted() {
    // reset to 0 when any analysis loads
    //  to avoid the shared store state from conflicting when a different datacube/analysis is loaded
    // FIXME: actually read the value of the default output variable from the metadata
    // later, this value will be persisted per analysis
    this.setCurrentOutputIndex(0);
  },
  computed: {
    ...mapGetters({
      project: 'app/project'
    })
  },
  methods: {
    ...mapActions({
      setCurrentOutputIndex: 'modelPublishStore/setCurrentOutputIndex'
    }),
    onOutputSelectionChange(event: any) {
      const selectedOutputIndex = event.target.selectedIndex;
      // update the store so that other components can sync
      this.setCurrentOutputIndex(selectedOutputIndex);
    },
    updateDescView(val: boolean) {
      this.isDescriptionView = val;
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
        if (loadedInsight.data_state?.selectedTimestamp !== undefined) {
          this.setSelectedTimestamp(loadedInsight.data_state?.selectedTimestamp);
        }
        // view state
        if (loadedInsight.view_state?.spatialAggregation) {
          this.selectedSpatialAggregation = loadedInsight.view_state?.spatialAggregation;
        }
        if (loadedInsight.view_state?.temporalAggregation) {
          this.selectedTemporalAggregation = loadedInsight.view_state?.temporalAggregation;
        }
        if (loadedInsight.view_state?.temporalResolution) {
          this.selectedTemporalResolution = loadedInsight.view_state?.temporalResolution;
        }
        if (loadedInsight.view_state?.isDescriptionView !== undefined) {
          this.isDescriptionView = loadedInsight.view_state?.isDescriptionView;
        }
      }
    },
    setSelectedScenarioIds(newIds: string[]) {
      if (this.metadata?.type !== DatacubeType.Indicator) {
        if (_.isEqual(this.selectedScenarioIds, newIds)) return;
      }
      this.selectedScenarioIds = newIds;
      this.clearRouteParam();
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
