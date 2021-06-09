<template>
  <div class="comp-analysis-experiment-container">
    <main>
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
      :is-description-view="isDescriptionView"
      @set-selected-scenario-ids="setSelectedScenarioIds"
      @select-timestamp="setSelectedTimestamp"
      @set-drilldown-data="setDrilldownData"
      @refetch-data="fetchData"
      @new-runs-mode="newRunsMode=!newRunsMode"
      @update-desc-view="updateDescView"
    >
      <template #datacube-model-header>
        <div class="datacube-header" v-if="mainModelOutput">
          <div v-if="isExpanded">
            <h5>{{mainModelOutput.display_name}} | {{metadata.name}}</h5>
            <disclaimer
              v-if="scenarioCount > 0"
              :message="
                scenarioCount +
                  ' scenarios. Click a vertical line to select or deselect it.'
              "
            />
          </div>
          <datacube-scenario-header
            class="scenario-header"
            :isExpanded="isExpanded"
            :outputVariable="mainModelOutput.display_name"
            :outputVariableUnits="unit"
            :selected-model-id="selectedModelId"
            :selected-scenario-ids="selectedScenarioIds"
            :color-from-index="colorFromIndex"
            v-else
          />
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
          :selected-model-id="selectedModelId"
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
            :metadata="metadata"
            :selected-model-id="selectedModelId"
            :selected-scenario-ids="selectedScenarioIds"
            :selected-timestamp="selectedTimestamp"
            :selected-temporal-resolution="selectedTemporalResolution"
            :selected-temporal-aggregation="selectedTemporalAggregation"
            :selected-spatial-aggregation="selectedSpatialAggregation"
            :unit="unit"
            @set-selected-admin-level="setSelectedAdminLevel"
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
import { DimensionInfo, Model, DatacubeFeature } from '@/types/Datacube';
import { getRandomNumber } from '@/utils/random';
import DatacubeScenarioHeader from '@/components/data/datacube-scenario-header.vue';
import Disclaimer from '@/components/widgets/disclaimer.vue';
import { colorFromIndex } from '@/utils/colors-util';
import DatacubeDescription from '@/components/data/datacube-description.vue';
import DropdownButton from '@/components/dropdown-button.vue';
import useScenarioData from '@/services/composables/useScenarioData';
import useModelMetadata from '@/services/composables/useModelMetadata';
import router from '@/router';
import _ from 'lodash';
import { DatacubeType } from '@/types/Enums';
import { mapActions, mapGetters, useStore } from 'vuex';
import { NamedBreakdownData } from '@/types/Datacubes';
import API from '@/api/api';
import { Insight } from '@/types/Insight';


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
    DatacubeScenarioHeader,
    Disclaimer,
    DatacubeDescription,
    DropdownButton
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

    const selectedModelId = ref(datacubeId);

    const metadata = useModelMetadata(selectedModelId) as Ref<Model | null>;

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

    watchEffect(() => {
      mainModelOutput.value = metadata.value?.outputs[0];

      if (metadata.value?.type === DatacubeType.Indicator) {
        selectedScenarioIds.value = [DatacubeType.Indicator.toString()];
      } else {
        isDescriptionView.value = selectedScenarioIds.value.length === 0;
      }

      // NOTE: the following line is being set only inside the data view and the model publish page
      store.dispatch('insightPanel/setPublishedModelId', metadata.value?.id);
      store.dispatch('insightPanel/setProjectId', projectId.value);
    });

    return {
      drilldownTabs: DRILLDOWN_TABS,
      activeDrilldownTab: 'breakdown',
      selectedTemporalResolution: 'month',
      selectedTemporalAggregation: 'mean',
      selectedSpatialAggregation: ref('mean'),
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
      isDescriptionView,
      unit
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
  mounted(): void {
    this.saveUpdatedState();
  },
  unmounted(): void {
    clearInterval(this.timerHandler);
  },
  computed: {
    ...mapGetters({
      project: 'app/project'
    })
  },
  methods: {
    ...mapActions({
      setViewState: 'insightPanel/setViewState',
      setDataState: 'insightPanel/setDataState'
    }),
    updateDescView(val: boolean) {
      this.isDescriptionView = val;
    },
    clearRouteParam() {
      router.push({
        query: {
          insight_id: undefined
        }
      }).catch(() => {});
    },
    saveUpdatedState() {
      this.setDataState({
        selectedModelId: this.selectedModelId,
        selectedScenarioIds: this.selectedScenarioIds,
        selectedTimestamp: this.selectedTimestamp as number
      });
      this.setViewState({
        spatialAggregation: this.selectedSpatialAggregation,
        temporalAggregation: this.selectedTemporalAggregation,
        temporalResolution: this.selectedTemporalResolution,
        isDescriptionView: this.isDescriptionView
      });
    },
    updateStateFromInsight(insight_id: string) {
      API.get(`insights/${insight_id}`).then(d => {
        const listBookmarks: Insight[] = _.orderBy(d.data, d => d.modified_at, ['desc']);
        if (listBookmarks.length > 0) {
          // insight was found and loaded
          const loadedInsight = listBookmarks[0];
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
      });
    },
    setSelectedTimestamp(value: number) {
      if (this.selectedTimestamp === value) return;
      this.selectedTimestamp = value;
      this.saveUpdatedState();
      this.clearRouteParam();
    },
    setSelectedScenarioIds(newIds: string[]) {
      if (this.metadata?.type !== DatacubeType.Indicator) {
        if (_.isEqual(this.selectedScenarioIds, newIds)) return;
      }
      this.selectedScenarioIds = newIds;
      this.saveUpdatedState();
      this.clearRouteParam();
    },
    setDrilldownData(e: { drilldownDimensions: Array<DimensionInfo> }) {
      this.typeBreakdownData = [];
      if (this.selectedScenarioIds.length === 0) return;
      this.typeBreakdownData = e.drilldownDimensions.map(dimension => {
        const choices = dimension.choices ?? [];
        const dataForEachRun = this.selectedScenarioIds.map(() => {
          // Generate random breakdown data for each run
          const drilldownChildren = choices.map(choice => ({
            // Breakdown data IDs are written as the hierarchical path delimited by '__'
            id: 'All__' + choice,
            // FIXME: use random data for now. Later, pickup the actual breakdown aggregation
            //  from (selected scenarios) data
            value: getRandomNumber(0, 5000)
          }));
          const sumTotal = drilldownChildren.map(c => c.value).reduce((a, b) => a + b, 0);
          return {
            Total: [{ id: 'All', value: sumTotal }],
            [dimension.name]: drilldownChildren
          };
        });
        return {
          name: dimension.name,
          data: dataForEachRun
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
