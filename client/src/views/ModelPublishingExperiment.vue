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
      :all-scenario-ids="allScenarioIds"
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
      <template v-slot:temporal-aggregation-config>
        <div class="aggregation">
          <button
            type="button"
            class="btn dropdown-btn"
            :class="{ 'attribute-invalid': selectedTemporalAggregation === '' }"
            @click="isTemporalAggregationDropdownOpen = !isTemporalAggregationDropdownOpen"
          >
            <div class="button-text">
              Temporal aggregation: <span style="font-weight: bold">{{ selectedTemporalAggregation }}</span>
            </div>
            <i
              class="fa fa-fw fa-angle-down"
            />
          </button>
          <dropdown-control
            v-if="isTemporalAggregationDropdownOpen"
            class="dropdown-control">
            <template #content>
              <div
                v-for="tempAgg in temporalAggregations"
                :key="tempAgg"
                class="dropdown-option"
                :class="{ 'dropdown-option-selected': selectedTemporalAggregation === tempAgg }"
                @click="handleTemporalAggregationSelection(tempAgg)"
              >
                {{ tempAgg }}
              </div>
            </template>
          </dropdown-control>
        </div>
      </template>
      <template v-slot:temporal-resolution-config>
        <div class="aggregation">
          <button
            type="button"
            class="btn dropdown-btn"
            :class="{ 'attribute-invalid': selectedTemporalResolution === '' }"
            @click="isTemporalResolutionDropdownOpen = !isTemporalResolutionDropdownOpen"
          >
            <div class="button-text">
              Temporal resolution: <span style="font-weight: bold">{{ selectedTemporalResolution }}</span>
            </div>
            <i
              class="fa fa-fw fa-angle-down"
            />
          </button>
          <dropdown-control
            v-if="isTemporalResolutionDropdownOpen"
            class="dropdown-control">
            <template #content>
              <div
                v-for="tempRes in temporalResolutions"
                :key="tempRes"
                class="dropdown-option"
                :class="{ 'dropdown-option-selected': selectedTemporalResolution === tempRes }"
                @click="handleTemporalResolutionSelection(tempRes)"
              >
                {{ tempRes }}
              </div>
            </template>
          </dropdown-control>
        </div>
      </template>
      <template v-slot:spatial-aggregation-config>
        <div class="aggregation">
          <button
            type="button"
            class="btn dropdown-btn"
            :class="{ 'attribute-invalid': selectedSpatialAggregation === '' }"
            @click="isSpatialAggregationDropdownOpen = !isSpatialAggregationDropdownOpen"
          >
            <div class="button-text">
              Spatial aggregation: <span style="font-weight: bold">{{ selectedSpatialAggregation }}</span>
            </div>
            <i
              class="fa fa-fw fa-angle-down"
            />
          </button>
          <dropdown-control
            v-if="isSpatialAggregationDropdownOpen"
            class="dropdown-control">
            <template #content>
              <div
                v-for="spatialAgg in spatialAggregations"
                :key="spatialAgg"
                class="dropdown-option"
                :class="{ 'dropdown-option-selected': selectedSpatialAggregation === spatialAgg }"
                @click="handleSpatialAggregationSelection(spatialAgg)"
              >
                {{ spatialAgg }}
              </div>
            </template>
          </dropdown-control>
        </div>
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
            :selected-model-id="selectedModelId"
            :selected-scenario-ids="selectedScenarioIds"
            :selected-timestamp="selectedTimestamp"
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
import { defineComponent, ref } from 'vue';
import BreakdownPane from '@/components/drilldown-panel/breakdown-pane.vue';
import ModelPublishingChecklist from '@/components/widgets/model-publishing-checklist.vue';
import DatacubeModelHeader from '@/components/data/datacube-model-header.vue';
import ModelDescription from '@/components/data/model-description.vue';
import { ModelPublishingStep } from '@/types/UseCase';
import { ModelPublishingStepID } from '@/types/ModelPublishingTypes';
import router from '@/router';
import DropdownControl from '@/components/dropdown-control.vue';
import { DimensionInfo } from '@/types/Model';
import { getRandomNumber } from '../../tests/utils/random';
import { mapGetters } from 'vuex';

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
    DropdownControl
  },
  computed: {
    ...mapGetters({
      countBookmarks: 'bookmarkPanel/countBookmarks',
      project: 'app/project'
    })
  },
  data: () => ({
    temporalAggregations: [] as string[],
    isTemporalAggregationDropdownOpen: false,
    temporalResolutions: [] as string[],
    isTemporalResolutionDropdownOpen: false,
    spatialAggregations: [] as string[],
    isSpatialAggregationDropdownOpen: false,
    initialBookmarkCount: -1
  }),
  setup() {
    const selectedAdminLevel = ref(2);
    function setSelectedAdminLevel(newValue: number) {
      selectedAdminLevel.value = newValue;
    }

    const typeBreakdownData: any[] = [];

    const currentPublishingStep = ref(ModelPublishingStepID.Enrich_Description);
    const selectedTemporalAggregation = ref('');
    const selectedTemporalResolution = ref('');
    const selectedSpatialAggregation = ref('');

    const allScenarioIds = DSSAT_PRODUCTION_DATA.scenarioIds;
    const selectedScenarioIds = ref([] as string[]);
    function setSelectedScenarioIds(newIds: string[]) {
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
    }

    const selectedTimestamp = ref(0);

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
      selectedModelId: DSSAT_PRODUCTION_DATA.modelId,
      allScenarioIds,
      selectedScenarioIds,
      setSelectedScenarioIds,
      typeBreakdownData,
      selectedTimestamp,
      openPublishAccordion,
      publishingSteps,
      currentPublishingStep,
      selectedTemporalAggregation,
      selectedSpatialAggregation,
      selectedTemporalResolution
    };
  },
  watch: {
    $route(/* to, from */) {
      // react to route changes (either by clicking on a publishing step or on one of the insights)
      // NOTE:  this is only valid when the route is focused on the 'modelPublishingExperiment'
      if (this.$route.name === 'modelPublishingExperiment') {
        const publishStepId = this.$route.query.step as any;
        this.currentPublishingStep = publishStepId as ModelPublishingStepID;

        const timestamp = this.$route.query.timeStamp as any;
        this.selectedTimestamp = timestamp;

        const publishTemporalAggr = this.$route.query.temporalAggregation as any;
        this.selectedTemporalAggregation = publishTemporalAggr;

        const publishTemporalRes = this.$route.query.temporalResolution as any;
        this.selectedTemporalResolution = publishTemporalRes;

        const publishSpatialAggr = this.$route.query.spatialAggregation as any;
        this.selectedSpatialAggregation = publishSpatialAggr;

        if (this.allScenarioIds.length > 0) {
          const selectedIds = this.currentPublishingStep !== ModelPublishingStepID.Enrich_Description ? [this.allScenarioIds[0]] : [];
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

    // TODO: fix the issue of not selecting a default PC line when step 2 is active
    // TODO: when new-runs-mode is active, clear the breakdown panel content

    // TODO: add other viz options as per WG4 recent slides

    // push to route
    // const projectId = 'project-20c61e8e-31a9-46b4-aced-e84e2403380d';
  },
  methods: {
    setSelectedTimestamp(value: number) {
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
      this.isTemporalAggregationDropdownOpen = !this.isTemporalAggregationDropdownOpen;
      this.checkStepForCompletenessAndUpdateRouteParams();
    },
    handleTemporalResolutionSelection(tempRes: string) {
      this.selectedTemporalResolution = tempRes;
      this.isTemporalResolutionDropdownOpen = !this.isTemporalResolutionDropdownOpen;
      this.checkStepForCompletenessAndUpdateRouteParams();
    },
    handleSpatialAggregationSelection(spatialAgg: string) {
      this.selectedSpatialAggregation = spatialAgg;
      this.isSpatialAggregationDropdownOpen = !this.isSpatialAggregationDropdownOpen;
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
    updateRouteParams() {
      // save the info in the query params so saved insights would pickup the latest value
      router.push({
        query: {
          step: this.currentPublishingStep,
          temporalAggregation: this.selectedTemporalAggregation,
          temporalResolution: this.selectedTemporalResolution,
          spatialAggregation: this.selectedSpatialAggregation,
          timeStamp: this.selectedTimestamp
        }
      }).catch(() => {});
    },
    setDrilldownData(e: { drilldownDimensions: Array<DimensionInfo> }) {
      this.typeBreakdownData.length = 0;
      e.drilldownDimensions.forEach(dd => {
        const drillDownChildren: Array<{name: string; value: number}> = [];
        const choices = dd.choices as Array<string>;
        choices.forEach((c) => {
          drillDownChildren.push({
            name: c,
            value: getRandomNumber(0, 5000) // FIXME: pickup the actual breakdown aggregation from data
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
    },
    checkModelMetadataValidity(info: { valid: boolean }) {
      this.updatePublishingStep(info.valid);
    },
    toggleAccordion(event: any) {
      this.openPublishAccordion = !this.openPublishAccordion;
      const panel = event.target.nextElementSibling as HTMLElement;
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

.aggregation {
  min-width: 0;
  padding-top: 5px;
  margin-left: 10px;
  align-self: center;

  .dropdown-control {
    position: absolute;
    max-height: 400px;
    overflow-y: auto;
  }
  .dropdown-option-selected {
    color: $selected-dark;
  }
  .dropdown-btn {
    max-width: 100%;
    display: flex;
    align-items: center;
    font-weight: normal;
    padding: 4px 4px;
    border:1px solid gray;

    .button-text {
      flex: 1;
      text-overflow: ellipsis;
      overflow: hidden;
    }
  }
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

.attribute-invalid {
  border:1px solid red !important;
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
