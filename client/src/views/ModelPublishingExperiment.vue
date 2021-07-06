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
          :currentPublishStep="currentPublishStep"
          @navigate-to-publishing-step="showPublishingStep"
          @publish-model="publishModel"
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
      :regional-data="regionalData"
      :output-source-specs="outputSpecs"
      :is-description-view="isDescriptionView"
      :metadata="metadata"
      :timeseries-data="timeseriesData"
      :relative-to="relativeTo"
      :breakdown-option="breakdownOption"
      :baseline-metadata="baselineMetadata"
      @set-selected-scenario-ids="setSelectedScenarioIds"
      @select-timestamp="updateSelectedTimestamp"
      @set-drilldown-data="setDrilldownData"
      @check-model-metadata-validity="checkModelMetadataValidity"
      @update-desc-view="updateDescView"
      @set-relative-to="setRelativeTo"
    >
      <template v-slot:datacube-model-header>
        <datacube-model-header
          class="scenario-header"
          :metadata="metadata"
        />
      </template>
      <template v-slot:datacube-description>
        <model-description
          :metadata="metadata"
        />
      </template>
      <template #temporal-aggregation-config>
        <dropdown-button
          class="dropdown-config"
          :class="{ 'attribute-invalid': selectedTemporalAggregation === '' }"
          :inner-button-label="'Temporal Aggregation'"
          :items="Object.values(AggregationOption)"
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
          :items="Object.values(AggregationOption)"
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
            :selected-model-id="selectedModelId"
            :selected-scenario-ids="selectedScenarioIds"
            :selected-timestamp="selectedTimestamp"
            :selected-spatial-aggregation="selectedSpatialAggregation"
            :selected-temporal-aggregation="selectedTemporalAggregation"
            :regional-data="regionalData"
            :output-source-specs="outputSpecs"
            :deselected-region-ids="deselectedRegionIds"
            :selected-breakdown-option="breakdownOption"
            :temporal-breakdown-data="temporalBreakdownData"
            @toggle-is-region-selected="toggleIsRegionSelected"
            @set-all-regions-selected="setAllRegionsSelected"
            @set-selected-admin-level="setSelectedAdminLevel"
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
import DSSAT_PRODUCTION_DATA from '@/assets/DSSAT-production.js';
import { computed, ComputedRef, defineComponent, ref, watchEffect } from 'vue';
import BreakdownPane from '@/components/drilldown-panel/breakdown-pane.vue';
import ModelPublishingChecklist from '@/components/widgets/model-publishing-checklist.vue';
import DatacubeModelHeader from '@/components/data/datacube-model-header.vue';
import ModelDescription from '@/components/data/model-description.vue';
import { AggregationOption, DatacubeStatus, DatacubeType, ModelPublishingStepID } from '@/types/Enums';
import { DimensionInfo, ModelPublishingStep } from '@/types/Datacube';
import { isModel } from '@/utils/datacube-util';
import { getRandomNumber } from '@/utils/random';
import { mapActions, mapGetters, useStore } from 'vuex';
import useModelMetadata from '@/services/composables/useModelMetadata';
import useScenarioData from '@/services/composables/useScenarioData';
import { NamedBreakdownData } from '@/types/Datacubes';
import DropdownButton from '@/components/dropdown-button.vue';
import useRegionalData from '@/services/composables/useRegionalData';
import useTimeseriesData from '@/services/composables/useTimeseriesData';
import { updateDatacube } from '@/services/new-datacube-service';
import _ from 'lodash';

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
      countInsights: 'insightPanel/countInsights',
      project: 'app/project'
    })
  },
  data: () => ({
    temporalResolutions: [] as string[],
    initialInsightCount: -1
  }),
  setup() {
    const store = useStore();
    const projectId: ComputedRef<string> = computed(() => store.getters['app/project']);

    const currentOutputIndex: ComputedRef<number> = computed(() => store.getters['modelPublishStore/currentOutputIndex']);
    const currentPublishStep: ComputedRef<number> = computed(() => store.getters['modelPublishStore/currentPublishStep']);
    const selectedTemporalAggregation: ComputedRef<string> = computed(() => store.getters['modelPublishStore/selectedTemporalAggregation']);
    const selectedTemporalResolution: ComputedRef<string> = computed(() => store.getters['modelPublishStore/selectedTemporalResolution']);
    const selectedSpatialAggregation: ComputedRef<string> = computed(() => store.getters['modelPublishStore/selectedSpatialAggregation']);
    const selectedTimestamp: ComputedRef<number> = computed(() => store.getters['modelPublishStore/selectedTimestamp']);
    const selectedScenarioIds: ComputedRef<string[]> = computed(() => store.getters['modelPublishStore/selectedScenarioIds']);

    // reset on init:
    store.dispatch('modelPublishStore/setCurrentPublishStep', ModelPublishingStepID.Enrich_Description);

    const selectedAdminLevel = ref(2);
    function setSelectedAdminLevel(newValue: number) {
      selectedAdminLevel.value = newValue;
    }

    const typeBreakdownData: NamedBreakdownData[] = [];

    // FIXME: set initial model to DSSAT in case the query param does not have a valid datacubeid
    const selectedModelId = ref(DSSAT_PRODUCTION_DATA.modelId);
    const metadata = useModelMetadata(selectedModelId);

    const modelRunsFetchedAt = ref(0);

    // NOTE: data is only fetched one time for DSSAT since it is not executable
    // so no external status need to be tracked
    const allModelRunData = useScenarioData(selectedModelId, modelRunsFetchedAt);

    const allScenarioIds = computed(() => allModelRunData.value.length > 0 ? allModelRunData.value.map(run => run.id) : []);

    function setSelectedScenarioIds(newIds: string[]) {
      let isChanged = newIds.length !== selectedScenarioIds.value.length;
      newIds.forEach((id, index) => {
        isChanged = isChanged || (id !== selectedScenarioIds.value[index]);
      });
      if (!isChanged) return;
      store.dispatch('modelPublishStore/setSelectedScenarioIds', newIds);

      if (newIds.length > 0) {
        if (currentPublishStep.value === ModelPublishingStepID.Enrich_Description) {
          // user attempted to select one or more scenarios but the model publishing step is not correct
          // this would be the case of the user selected a scenario on the PC plot while the model publishing step is still assuming description view
          store.dispatch('modelPublishStore/setCurrentPublishStep', ModelPublishingStepID.Tweak_Visualization);
        }
      } else {
        // if no scenario selection is made, ensure we are back to the first step
        if (currentPublishStep.value !== ModelPublishingStepID.Enrich_Description) {
          store.dispatch('modelPublishStore/setCurrentPublishStep', ModelPublishingStepID.Enrich_Description);
        }
      }
    }

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

    const isDescriptionView = ref<boolean>(true);

    watchEffect(() => {
      if (metadata.value?.type === DatacubeType.Indicator) {
        setSelectedScenarioIds([DatacubeType.Indicator.toString()]);
      } else {
        isDescriptionView.value = selectedScenarioIds.value.length === 0;
      }
      if (metadata.value) {
        store.dispatch('insightPanel/setContextId', metadata.value.name);
      }
    });

    watchEffect(() => {
      const dataState = {
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

    const {
      regionalData,
      outputSpecs,
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

    const breakdownOption = ref<string | null>(null);
    const setBreakdownOption = (newValue: string | null) => {
      breakdownOption.value = newValue;
    };

    const setSelectedTimestamp = (timestamp: number | null) =>
      store.dispatch('modelPublishStore/setSelectedTimestamp', timestamp);

    const {
      timeseriesData,
      relativeTo,
      baselineMetadata,
      setRelativeTo,
      temporalBreakdownData
    } = useTimeseriesData(
      metadata,
      selectedModelId,
      selectedScenarioIds,
      selectedTemporalResolution,
      selectedTemporalAggregation,
      selectedSpatialAggregation,
      breakdownOption,
      setSelectedTimestamp
    );


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
      currentPublishStep,
      selectedTemporalAggregation,
      selectedSpatialAggregation,
      selectedTemporalResolution,
      metadata,
      regionalData,
      outputSpecs,
      isDescriptionView,
      deselectedRegionIds,
      toggleIsRegionSelected,
      setAllRegionsSelected,
      currentOutputIndex,
      setSelectedTimestamp,
      timeseriesData,
      baselineMetadata,
      relativeTo,
      setRelativeTo,
      breakdownOption,
      setBreakdownOption,
      projectId,
      temporalBreakdownData,
      AggregationOption
    };
  },
  watch: {
    $route: {
      handler(/* newValue, oldValue */) {
        // NOTE:  this is only valid when the route is focused on the 'model publishing experiment' space
        if (this.$route.name === 'modelPublishingExperiment' && this.$route.query) {
          const datacubeid = this.$route.query.datacubeid as any;
          if (datacubeid !== undefined) {
            // re-fetch model data
            this.setSelectedTimestamp(null);
            this.selectedModelId = datacubeid;
          }
        }
      },
      immediate: true
    },
    countInsights: {
      handler(/* newValue, oldValue */) {
        if (this.initialInsightCount === -1) {
          // save initial insights count
          this.initialInsightCount = this.countInsights;
        } else {
          // initial insights count is valid and we have some update
          // if the current insights count differ, then the user has saved some new insight(s)
          if (this.initialInsightCount !== this.countInsights) {
            // so mark this step as completed
            this.setCurrentPublishStep(ModelPublishingStepID.Capture_Insight);
            this.updatePublishingStep(true);
          }
        }
      }
    }
  },
  mounted(): void {
    this.fetchAvailableAggregations();

    // TODO: when new-runs-mode is active, clear the breakdown panel content
    // TODO: add other viz options as per WG4 recent slides

    // set initial output variable index
    // FIXME: default will be provided later through metadata
    this.setCurrentOutputIndex(0);
  },
  methods: {
    ...mapActions({
      setCurrentOutputIndex: 'modelPublishStore/setCurrentOutputIndex',
      setCurrentPublishStep: 'modelPublishStore/setCurrentPublishStep',
      setSelectedTemporalAggregation: 'modelPublishStore/setSelectedTemporalAggregation',
      setSelectedSpatialAggregation: 'modelPublishStore/setSelectedSpatialAggregation',
      setSelectedTemporalResolution: 'modelPublishStore/setSelectedTemporalResolution'
    }),
    async publishModel() {
      // call the backend to update model metadata and finalize model publication
      if (this.metadata && isModel(this.metadata)) {
        this.metadata.status = DatacubeStatus.Ready;
        const modelToUpdate = _.cloneDeep(this.metadata);
        delete modelToUpdate.validatedOutputs;
        // remove newly-added fields such as 'validatedOutputs' so that ES can update
        await updateDatacube(modelToUpdate.id, modelToUpdate);
        // redirect to model family page
        this.$router.push({ name: 'domainDatacubeOverview', params: { project: this.projectId, projectType: modelToUpdate.type } });
      }
    },
    updateDescView(val: boolean) {
      this.isDescriptionView = val;
    },
    updateSelectedTimestamp(value: number) {
      if (this.selectedTimestamp === value) return;
      this.setSelectedTimestamp(value);
    },
    fetchAvailableAggregations() {
      // TODO: fetch actual available aggregations based on the pipeline support
      this.temporalResolutions.push('year');
      this.temporalResolutions.push('month');
    },
    updatePublishingStep(completed: boolean) {
      const currStep = this.publishingSteps.find(ps => ps.id === this.currentPublishStep);
      if (currStep) {
        currStep.completed = completed;
      }
    },
    showPublishingStep(publishStepInfo: {publishStep: ModelPublishingStep}) {
      this.setCurrentPublishStep(publishStepInfo.publishStep.id);
      this.openPublishAccordion = !this.openPublishAccordion;

      if (this.allScenarioIds.length > 0) {
        let selectedIds = this.selectedScenarioIds;
        if (this.currentPublishStep === ModelPublishingStepID.Enrich_Description) {
          selectedIds = [];
        } else {
          // we should have at least one valid scenario selected. If not, then select the first one
          selectedIds = this.selectedScenarioIds.length > 0 ? this.selectedScenarioIds : [this.allScenarioIds[0]];
        }
        this.setSelectedScenarioIds(selectedIds);
      }
    },
    handleTemporalAggregationSelection(tempAgg: string) {
      this.setSelectedTemporalAggregation(tempAgg);
      this.checkStepForCompleteness();
    },
    handleTemporalResolutionSelection(tempRes: string) {
      this.setSelectedTemporalResolution(tempRes);
      this.checkStepForCompleteness();
    },
    handleSpatialAggregationSelection(spatialAgg: string) {
      this.setSelectedSpatialAggregation(spatialAgg);
      this.checkStepForCompleteness();
    },
    checkStepForCompleteness() {
      // mark this step as complete
      if (this.selectedSpatialAggregation !== '' &&
          this.selectedTemporalAggregation !== '' &&
          this.selectedTemporalResolution !== '') {
        this.updatePublishingStep(true);
      }
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
