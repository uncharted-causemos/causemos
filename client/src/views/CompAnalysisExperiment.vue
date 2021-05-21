<template>
  <div class="comp-analysis-experiment-container">
    <div class="comp-analysis-experiment-header">
      <button class="search-button btn btn-primary btn-call-for-action" disabled>
        Search datacubes
      </button>
    </div>
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
    >
      <template v-slot:datacube-model-header>
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
            :outputVariableUnits="mainModelOutput.unit && mainModelOutput.unit !== '' ? mainModelOutput.unit : mainModelOutput.units"
            :selected-model-id="selectedModelId"
            :selected-scenario-ids="selectedScenarioIds"
            :color-from-index="colorFromIndex"
            v-else
          />
        </div>
      </template>

      <template v-slot:datacube-description>
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
import MAXHOP from '@/assets/MAXHOP.js';
import { defineComponent, Ref, ref, watch } from 'vue';
import BreakdownPane from '@/components/drilldown-panel/breakdown-pane.vue';
import { LegacyBreakdownDataStructure } from '@/types/Common';
import { DimensionInfo, Model, ModelFeature } from '@/types/Model';
import { getRandomNumber } from '../../tests/utils/random';
import DatacubeScenarioHeader from '@/components/data/datacube-scenario-header.vue';
import Disclaimer from '@/components/widgets/disclaimer.vue';
import { colorFromIndex } from '@/utils/colors-util';
import DatacubeDescription from '@/components/data/datacube-description.vue';
import useScenarioData from '@/services/composables/useScenarioData';
import useModelMetadata from '@/services/composables/useModelMetadata';
// import { ModelRun } from '@/types/Datacubes';

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
    DatacubeDescription
  },
  setup() {
    const selectedAdminLevel = ref(2);
    function setSelectedAdminLevel(newValue: number) {
      selectedAdminLevel.value = newValue;
    }

    const typeBreakdownData: LegacyBreakdownDataStructure[] = [];
    const isExpanded = true;

    const modelId = ref(MAXHOP.modelId);

    const metadata = useModelMetadata(modelId) as Ref<Model | null>;

    const mainModelOutput = ref<ModelFeature | undefined>(undefined);

    watch(() => metadata.value, () => {
      mainModelOutput.value = metadata.value?.outputs[0];
    }, {
      immediate: true
    });

    const selectedScenarioIds = ref([] as string[]);
    function setSelectedScenarioIds(newIds: string[]) {
      selectedScenarioIds.value = newIds;
    }

    const selectedTimestamp = ref(0);
    function setSelectedTimestamp(value: number) {
      selectedTimestamp.value = value;
    }

    const allScenarioIds = ref([]) as Ref<string[]>;
    const scenarioCount = ref(0);

    const fetchTimeStamp = ref(0);

    const allModelRunData = useScenarioData(modelId, fetchTimeStamp);

    const timeInterval = 5000;

    function fetchData() {
      fetchTimeStamp.value = Date.now();
    }

    setInterval(fetchData, timeInterval);

    watch(() => allModelRunData.value, () => {
      allScenarioIds.value = allModelRunData.value.length > 0 ? allModelRunData.value.map(run => run.id) : [];
      scenarioCount.value = allModelRunData.value.length;
    }, {
      immediate: true
    });

    return {
      drilldownTabs: DRILLDOWN_TABS,
      activeDrilldownTab: 'breakdown',
      selectedTemporalResolution: 'month',
      selectedTemporalAggregation: 'mean',
      selectedSpatialAggregation: 'mean',
      selectedAdminLevel,
      setSelectedAdminLevel,
      selectedModelId: modelId,
      selectedScenarioIds,
      setSelectedScenarioIds,
      typeBreakdownData,
      selectedTimestamp,
      setSelectedTimestamp,
      isExpanded,
      colorFromIndex,
      metadata,
      mainModelOutput,
      allModelRunData,
      allScenarioIds,
      scenarioCount,
      fetchData
    };
  },
  mounted(): void {
  },
  methods: {
    setDrilldownData(e: { drilldownDimensions: Array<DimensionInfo> }) {
      // TODO: inspect 'this.selectedScenarioIds' for drilldown data
      this.typeBreakdownData.length = 0;
      if (this.selectedScenarioIds.length === 0) {
        return;
      }
      e.drilldownDimensions.forEach(dd => {
        const drillDownChildren: Array<{name: string; value: number}> = [];
        const choices = dd.choices as Array<string>;
        choices.forEach((c) => {
          drillDownChildren.push({
            name: c,
            value: getRandomNumber(0, 5000) // FIXME: use random data for now. Later, pickup the actual breakdown aggregation from (selected scenarios) data
          });
        });
        const breakdown = {
          name: dd.name,
          data: {
            name: 'ALL',
            value: drillDownChildren.map(c => c.value).reduce((a, b) => a + b, 0), // sum all children values
            children: drillDownChildren
          }
        };
        this.typeBreakdownData.push(breakdown);
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
</style>
