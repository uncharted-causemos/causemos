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
      @set-selected-scenario-ids="setSelectedScenarioIds"
      @select-timestamp="setSelectedTimestamp"
      @set-drilldown-data="setDrilldownData"
      @refetch-data="fetchData"
      @new-runs-mode="newRunsMode=!newRunsMode"
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
            :regional-data="regionalData"
            :unit="unit"
            :selected-spatial-aggregation="selectedSpatialAggregation"
            :selected-timestamp="selectedTimestamp"
            :selected-scenario-ids="selectedScenarioIds"
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
import { computed, defineComponent, Ref, ref, watch } from 'vue';
import BreakdownPane from '@/components/drilldown-panel/breakdown-pane.vue';
import { DimensionInfo, Model, DatacubeFeature } from '@/types/Datacube';
import { getRandomNumber } from '@/utils/random';
import DatacubeScenarioHeader from '@/components/data/datacube-scenario-header.vue';
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
import { useStore } from 'vuex';
import { NamedBreakdownData } from '@/types/Datacubes';

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

    const modelId = ref(datacubeId);
    const selectedModelId = ref(datacubeId);

    const metadata = useModelMetadata(modelId) as Ref<Model | null>;

    const mainModelOutput = ref<DatacubeFeature | undefined>(undefined);

    const selectedScenarioIds = ref([] as string[]);

    const selectedTimestamp = ref(null) as Ref<number | null>;

    const newRunsMode = ref(false);

    const modelRunsFetchedAt = ref(0);

    const allModelRunData = useScenarioData(modelId, modelRunsFetchedAt);

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

    watch(() => metadata.value, () => {
      mainModelOutput.value = metadata.value?.outputs[0];

      if (metadata.value?.type === DatacubeType.Indicator) {
        selectedScenarioIds.value = [DatacubeType.Indicator.toString()];
      }
    }, {
      immediate: true
    });

    const selectedSpatialAggregation = ref('mean');
    const selectedTemporalAggregation = ref('mean');
    const selectedTemporalResolution = ref('month');

    const regionalData = useRegionalData(
      selectedModelId,
      selectedScenarioIds,
      selectedTimestamp,
      selectedSpatialAggregation,
      selectedTemporalAggregation,
      selectedTemporalResolution,
      metadata
    );

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
      regionalData
    };
  },
  watch: {
    $route(/* to, from */) {
      // NOTE:  this is only valid when the route is focused on the 'data' space
      if (this.$route.name === 'data') {
        const timestamp = this.$route.query.timestamp as any;
        if (timestamp !== undefined) {
          this.setSelectedTimestamp(timestamp);
        }

        if (this.allScenarioIds.length > 0) {
          // FIXME: only support saving insights with at most a single valid scenario id
          const selectedScenarioID = this.$route.query.selectedScenarioID as any;
          if (selectedScenarioID !== undefined) {
            // we should have at least one valid scenario selected. If not, cancel scenario selection
            const selectedIds = selectedScenarioID !== '' ? [selectedScenarioID] : [];
            this.setSelectedScenarioIds(selectedIds);
          }
        }
      }
    }
  },
  mounted(): void {
    this.updateRouteParams();
  },
  unmounted(): void {
    clearInterval(this.timerHandler);
  },
  methods: {
    setSelectedTimestamp(value: number) {
      if (this.selectedTimestamp === value) return;
      this.selectedTimestamp = value;
      this.updateRouteParams();
    },
    setSelectedScenarioIds(newIds: string[]) {
      if (_.isEqual(this.selectedScenarioIds, newIds)) return;
      this.selectedScenarioIds = newIds;
      this.updateRouteParams();
    },
    updateRouteParams() {
      // save the info in the query params so saved insights would pickup the latest value
      // FIXME: only support saving insights with at most a single valid scenario id
      router.push({
        query: {
          timestamp: this.selectedTimestamp,
          selectedScenarioID: this.selectedScenarioIds.length === 1 ? this.selectedScenarioIds[0] : undefined
        }
      }).catch(() => {});
    },
    setDrilldownData(e: { drilldownDimensions: Array<DimensionInfo> }) {
      this.typeBreakdownData = [];
      if (this.selectedScenarioIds.length === 0) return;
      this.typeBreakdownData = []; e.drilldownDimensions.map(dimension => {
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
