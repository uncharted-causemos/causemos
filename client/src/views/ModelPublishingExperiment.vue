<template>
  <div class="model-publishing-experiment-container">
    <div class="model-publishing-experiment-header">
      <button
        class="accordion"
        :class="{ 'active' : openPublishAccordion }"
        @click="toggleAccordion($event)"
      >
        Publish
        <i
          class="fa fa-fw"
          :class="{ 'fa-angle-down': !openPublishAccordion, 'fa-angle-up': openPublishAccordion }"
        />
      </button>
      <div class="accordion-panel">
        <model-publishing-checklist
          v-if="openPublishAccordion"
          :publishingSteps="publishingSteps"
          :currentPublishingStep="currentPublishingStep"
          @navigate-to-publishing-step="showPublishingStep"
        />
      </div>
    </div>
    <main>
    <!-- TODO: whether a card is actually expanded or not will
    be dynamic later -->
    <datacube-card
      :class="{ 'datacube-expanded': true }"
      :isExpanded="false"
      :selected-admin-level="selectedAdminLevel"
      :selected-model-id="selectedModelId"
      :all-model-run-data="allModelRunData"
      :selected-scenario-ids="selectedScenarioIds"
      :selected-timestamp="selectedTimestamp"
      :selected-temporal-aggregation="selectedTemporalAggregation"
      :selected-temporal-resolution="selectedTemporalResolution"
      :selected-spatial-aggregation="selectedSpatialAggregation"
      @set-selected-scenario-ids="setSelectedScenarioIds"
      @select-timestamp="setSelectedTimestamp"
      @set-drilldown-data="setDrilldownData"
      @check-model-metadata-validity="checkModelMetadataValidity"
    >
      <template v-slot:datacube-model-header>
        <datacube-model-header
          class="scenario-header"
          :selected-model-id="selectedModelId"
        />
      </template>
      <template v-slot:datacube-description>
        <model-description
          :selected-model-id="selectedModelId"
        />
      </template>
      <template #temporal-aggregation-config>
        <dropdown-button
          class="dropdown-config"
          :class="{ 'attribute-invalid': selectedTemporalAggregation === '' }"
          :inner-button-label="'Temporal Aggregation'"
          :items="temporalAggregations"
          :selected-item="selectedTemporalAggregation"
          @item-selected="handleTemporalAggregationSelection"
        />
      </template>
      <template #temporal-resolution-config>
        <dropdown-button
          class="dropdown-config"
          :class="{ 'attribute-invalid': selectedTemporalResolution === '' }"
          :inner-button-label="'Temporal Resolution'"
          :items="temporalResolutions"
          :selected-item="selectedTemporalResolution"
          @item-selected="handleTemporalResolutionSelection"
        />
      </template>
      <template #spatial-aggregation-config>
        <dropdown-button
          class="dropdown-config"
          :class="{ 'attribute-invalid': selectedSpatialAggregation === '' }"
          :inner-button-label="'Spatial Aggregation'"
          :items="spatialAggregations"
          :selected-item="selectedSpatialAggregation"
          @item-selected="handleSpatialAggregationSelection"
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
import DSSAT_PRODUCTION_DATA from '@/assets/DSSAT-production.js';
import { defineComponent, Ref, ref } from 'vue';
import BreakdownPane from '@/components/drilldown-panel/breakdown-pane.vue';
import ModelPublishingChecklist from '@/components/widgets/model-publishing-checklist.vue';
import DatacubeModelHeader from '@/components/data/datacube-model-header.vue';
import ModelDescription from '@/components/data/model-description.vue';
import { ModelPublishingStep } from '@/types/UseCase';
import { ModelPublishingStepID } from '@/types/Enums';
import router from '@/router';
import { DimensionInfo, Model } from '@/types/Datacube';
import { getRandomNumber } from '@/utils/random';
import { mapGetters } from 'vuex';
import useModelMetadata from '@/services/composables/useModelMetadata';
import useScenarioData from '@/services/composables/useScenarioData';
import { NamedBreakdownData } from '@/types/Datacubes';
import DropdownButton from '@/components/dropdown-button.vue';

const DRILLDOWN_TABS = [
  {
    name: 'Breakdown',
    id: 'breakdown',
    // TODO: our version of FA doesn't include fa-chart
    icon: 'fa-question'
  }
];

export default defineComponent({
  name: 'ModelPublishingExperiment',
  components: {
    DatacubeCard,
    DrilldownPanel,
    BreakdownPane,
    DatacubeModelHeader,
    ModelPublishingChecklist,
    ModelDescription,
    DropdownButton
  },
  computed: {
    ...mapGetters({
      countBookmarks: 'bookmarkPanel/countBookmarks',
      project: 'app/project'
    })
  },
  data: () => ({
    temporalAggregations: [] as string[],
    temporalResolutions: [] as string[],
    spatialAggregations: [] as string[],
    initialBookmarkCount: -1
  }),
  setup() {
    const selectedAdminLevel = ref(2);
    function setSelectedAdminLevel(newValue: number) {
      selectedAdminLevel.value = newValue;
    }

    const typeBreakdownData: NamedBreakdownData[] = [];

    const currentPublishingStep = ref(ModelPublishingStepID.Enrich_Description);
    const selectedTemporalAggregation = ref('');
    const selectedTemporalResolution = ref('');
    const selectedSpatialAggregation = ref('');

    const selectedModelId = ref(DSSAT_PRODUCTION_DATA.modelId);
    const metadata = useModelMetadata(selectedModelId) as Ref<Model | null>;

    const allScenarioIds = DSSAT_PRODUCTION_DATA.scenarioIds;

    const modelRunsFetchedAt = ref(0);

    const updateRouteParams = () => {
      // save the info in the query params so saved insights would pickup the latest value
      router.push({
        query: {
          step: currentPublishingStep.value,
          temporalAggregation: selectedTemporalAggregation.value,
          temporalResolution: selectedTemporalResolution.value,
          spatialAggregation: selectedSpatialAggregation.value,
          timeStamp: selectedTimestamp.value,
          selectedScenarioID: selectedScenarioIds.value.length === 1 ? selectedScenarioIds.value[0] : undefined
        }
      }).catch(() => {});
    };

    // NOTE: data is only fetched one time for DSSAT since it is not executable
    // so no external status need to be tracked
    const allModelRunData = useScenarioData(selectedModelId, modelRunsFetchedAt);

    const selectedScenarioIds = ref([] as string[]);
    function setSelectedScenarioIds(newIds: string[]) {
      let isChanged = newIds.length !== selectedScenarioIds.value.length;
      newIds.forEach((id, index) => {
        isChanged = isChanged || (id !== selectedScenarioIds.value[index]);
      });
      if (!isChanged) return;
      selectedScenarioIds.value = newIds;
      if (newIds.length > 0) {
        if (currentPublishingStep.value === ModelPublishingStepID.Enrich_Description) {
          // user attempted to select one or more scenarios but the model publishing step is not correct
          // this would be the case of the user selected a scenario on the PC plot while the model publishing step is still assuming description view
          currentPublishingStep.value = ModelPublishingStepID.Tweak_Visualization;
        }
      } else {
        // if no scenario selection is made, ensure we are back to the first step
        if (currentPublishingStep.value !== ModelPublishingStepID.Enrich_Description) {
          currentPublishingStep.value = ModelPublishingStepID.Enrich_Description;
        }
      }
      updateRouteParams();
    }

    const selectedTimestamp = ref<number | null>(null);

    const openPublishAccordion = ref(false);

    const publishingSteps = ref<ModelPublishingStep[]>([
      {
        id: ModelPublishingStepID.Enrich_Description,
        text: 'Enrich your description',
        completed: false
      },
      {
        id: ModelPublishingStepID.Tweak_Visualization,
        text: 'Tweak the visualization',
        completed: false
      },
      {
        id: ModelPublishingStepID.Capture_Insight,
        text: 'Capture model insight',
        completed: false
      }
    ]);

    return {
      drilldownTabs: DRILLDOWN_TABS,
      activeDrilldownTab: 'breakdown',
      selectedAdminLevel,
      setSelectedAdminLevel,
      selectedModelId,
      allScenarioIds,
      allModelRunData,
      selectedScenarioIds,
      setSelectedScenarioIds,
      typeBreakdownData,
      selectedTimestamp,
      openPublishAccordion,
      publishingSteps,
      currentPublishingStep,
      selectedTemporalAggregation,
      selectedSpatialAggregation,
      selectedTemporalResolution,
      metadata,
      updateRouteParams
    };
  },
  watch: {
    $route(/* to, from */) {
      // react to route changes (either by clicking on a publishing step or on one of the insights)
      // NOTE:  this is only valid when the route is focused on the 'modelPublishingExperiment'
      if (this.$route.name === 'modelPublishingExperiment') {
        const publishStepId = this.$route.query.step as any;
        if (publishStepId !== undefined) {
          this.currentPublishingStep = publishStepId as ModelPublishingStepID;
        }

        const timestamp = this.$route.query.timeStamp as any;
        if (timestamp !== undefined) {
          this.setSelectedTimestamp(timestamp);
        }

        const publishTemporalAggr = this.$route.query.temporalAggregation as any;
        if (publishTemporalAggr !== undefined) {
          this.selectedTemporalAggregation = publishTemporalAggr;
        }

        const publishTemporalRes = this.$route.query.temporalResolution as any;
        if (publishTemporalRes !== undefined) {
          this.selectedTemporalResolution = publishTemporalRes;
        }

        const publishSpatialAggr = this.$route.query.spatialAggregation as any;
        if (publishSpatialAggr !== undefined) {
          this.selectedSpatialAggregation = publishSpatialAggr;
        }

        if (this.allScenarioIds.length > 0) {
          let selectedIds = this.selectedScenarioIds;
          if (this.currentPublishingStep === ModelPublishingStepID.Enrich_Description) {
            selectedIds = [];
          } else {
            // FIXME: only support saving insights with at most a single valid scenario id
            const selectedScenarioID = this.$route.query.selectedScenarioID as any;
            // we should have at least one valid scenario selected. If not, then select the first one
            selectedIds = selectedScenarioID !== undefined && selectedScenarioID !== '' ? [selectedScenarioID] : [this.allScenarioIds[0]];
          }
          this.setSelectedScenarioIds(selectedIds);
        }
      }
    },
    countBookmarks: {
      handler(/* newValue, oldValue */) {
        if (this.initialBookmarkCount === -1) {
          // save initial insights count
          this.initialBookmarkCount = this.countBookmarks;
        } else {
          // initial insights count is valid and we have some update
          // if the current insights count differ, then the user has saved some new insight(s)
          if (this.initialBookmarkCount !== this.countBookmarks) {
            // so mark this step as completed
            this.currentPublishingStep = ModelPublishingStepID.Capture_Insight;
            this.updatePublishingStep(true);
          }
        }
      }
    }
  },
  mounted(): void {
    this.fetchAvailableAggregations();

    // ensure the URL query params match initial publish step value
    this.updateRouteParams();

    // TODO: when new-runs-mode is active, clear the breakdown panel content
    // TODO: add other viz options as per WG4 recent slides
  },
  methods: {
    setSelectedTimestamp(value: number) {
      if (this.selectedTimestamp === value) return;
      this.selectedTimestamp = value;
      this.updateRouteParams();
    },
    fetchAvailableAggregations() {
      // TODO: fetch actual available aggregations based on the pipeline support

      this.temporalResolutions.push('year');
      this.temporalResolutions.push('month');

      this.temporalAggregations.push('mean');
      this.temporalAggregations.push('sum');

      this.spatialAggregations.push('mean');
      this.spatialAggregations.push('sum');
    },
    updatePublishingStep(completed: boolean) {
      const currStep = this.publishingSteps.find(ps => ps.id === this.currentPublishingStep);
      if (currStep) {
        currStep.completed = completed;
      }
    },
    showPublishingStep(publishStepInfo: {publishStep: ModelPublishingStep}) {
      this.currentPublishingStep = publishStepInfo.publishStep.id;
      this.openPublishAccordion = !this.openPublishAccordion;
      this.updateRouteParams();
    },
    handleTemporalAggregationSelection(tempAgg: string) {
      this.selectedTemporalAggregation = tempAgg;
      this.checkStepForCompletenessAndUpdateRouteParams();
    },
    handleTemporalResolutionSelection(tempRes: string) {
      this.selectedTemporalResolution = tempRes;
      this.checkStepForCompletenessAndUpdateRouteParams();
    },
    handleSpatialAggregationSelection(spatialAgg: string) {
      this.selectedSpatialAggregation = spatialAgg;
      this.checkStepForCompletenessAndUpdateRouteParams();
    },
    checkStepForCompletenessAndUpdateRouteParams() {
      // mark this step as complete
      if (this.selectedSpatialAggregation !== '' &&
          this.selectedTemporalAggregation !== '' &&
          this.selectedTemporalResolution !== '') {
        this.updatePublishingStep(true);
      }
      this.updateRouteParams();
    },
    setDrilldownData(e: { drilldownDimensions: Array<DimensionInfo> }) {
      this.typeBreakdownData = e.drilldownDimensions.map(dimension => {
        const choices = dimension.choices as Array<string>;
        const drilldownChildren = choices.map(choice => ({
          // Breakdown data IDs are written as the hierarchical path delimited by '__'
          id: 'All__' + choice,
          // FIXME: use random data for now. Later, pickup the actual breakdown aggregation
          //  from (selected scenarios) data
          value: getRandomNumber(0, 5000)
        }));
        const sumTotal = drilldownChildren.map(c => c.value).reduce((a, b) => a + b, 0);
        return {
          name: dimension.name,
          data: {
            Total: [{ id: 'All', value: sumTotal }],
            [dimension.name]: drilldownChildren
          }
        };
      });
    },
    checkModelMetadataValidity(info: { valid: boolean }) {
      this.updatePublishingStep(info.valid);
    },
    toggleAccordion(event: any) {
      this.openPublishAccordion = !this.openPublishAccordion;
      const target = event.target.nodeName === 'I' ? event.target.parentElement : event.target;
      const panel = target.nextElementSibling as HTMLElement;
      if (panel) {
        if (!this.openPublishAccordion) {
          panel.style.display = 'none';
        } else {
          panel.style.display = 'block';
        }
      }
    }
  }
});
</script>

<style lang="scss" scoped>
@import '~styles/variables';

.model-publishing-experiment-container {
  height: $content-full-height;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.dropdown-config {
  margin-bottom: 5px;
  margin-top: 5px;
  margin-right: 5px;
}

::v-deep(.attribute-invalid button) {
  border:1px solid red !important;
}

.new-insight-popup {
  display: block;
  background-color: rgb(236, 236, 236);
  position: absolute;
  margin: auto;
  display: flex;
  flex-direction: column;
  padding: 15px;
  box-shadow: 0px 5px 4px 2px rgba(0, 0, 0, 0.05),
              0px 3px 2px 1px rgba(0, 0, 0, 0.05);
  z-index: 2;
  width: 30vw;
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

.model-publishing-experiment-header {
  flex-direction: row;
  margin: auto;
}

/* Style the buttons that are used to open and close the accordion panel */
  .accordion {
    background-color: #eee;
    color: #444;
    cursor: pointer;
    margin: 10px 5px;
    text-align: left;
    border: none;
    outline: none;
    transition: 0.4s;
  }

  /* Add a background color to the button if it is clicked on (add the .active class with JS), and when you move the mouse over it (hover) */
  .active, .accordion:hover {
    background-color: #ccc;
  }

  /* Style the accordion panel. Note: hidden by default */
  .accordion-panel {
    padding: 0 18px;
    background-color: white;
    display: none;
    overflow: hidden;
  }
</style>
