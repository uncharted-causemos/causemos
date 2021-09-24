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
    <main class="main">
      <analytical-questions-and-insights-panel />
      <!-- TODO: whether a card is actually expanded or not will
      be dynamic later -->
      <div class="main insight-capture">
        <datacube-card
          :class="{ 'datacube-expanded': true }"
          :isExpanded="false"
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
          @select-timestamp="updateSelectedTimestamp"
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
              @refresh-metadata="refreshMetadata"
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
              :items="Object.values(TemporalResolutionOption)"
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
        </datacube-card>
      </div>
    </main>
  </div>
</template>

<script lang="ts">
import _ from 'lodash';
import { computed, ComputedRef, defineComponent, Ref, ref, watchEffect } from 'vue';
import { useStore } from 'vuex';
import router from '@/router';
import AnalyticalQuestionsAndInsightsPanel from '@/components/analytical-questions/analytical-questions-and-insights-panel.vue';
import DatacubeCard from '@/components/data/datacube-card.vue';
import ModelDescription from '@/components/data/model-description.vue';
import DropdownButton from '@/components/dropdown-button.vue';
import MapDropdown from '@/components/data/map-dropdown.vue';
import ModelPublishingChecklist from '@/components/widgets/model-publishing-checklist.vue';
import DatacubeModelHeader from '@/components/data/datacube-model-header.vue';
import useModelMetadata from '@/services/composables/useModelMetadata';
import useScenarioData from '@/services/composables/useScenarioData';
import useOutputSpecs from '@/services/composables/useOutputSpecs';
import useRegionalData from '@/services/composables/useRegionalData';
import { AggregationOption, TemporalResolutionOption, DatacubeStatus, DatacubeType, ModelPublishingStepID } from '@/types/Enums';
import useTimeseriesData from '@/services/composables/useTimeseriesData';
import { DatacubeFeature, ModelPublishingStep } from '@/types/Datacube';
import { getValidatedOutputs, isModel } from '@/utils/datacube-util';
import { updateDatacube } from '@/services/new-datacube-service';
import useDatacubeHierarchy from '@/services/composables/useDatacubeHierarchy';
import useSelectedTimeseriesPoints from '@/services/composables/useSelectedTimeseriesPoints';
import useQualifiers from '@/services/composables/useQualifiers';
import { BASE_LAYER, DATA_LAYER } from '@/utils/map-util-new';
import { initDataStateFromRefs, initViewStateFromRefs } from '@/utils/drilldown-util';
import { DataState, Insight, ViewState } from '@/types/Insight';
import { fetchInsights, getInsightById, InsightFilterFields } from '@/services/insight-service';
import domainProjectService from '@/services/domain-project-service';
import { ModelRun } from '@/types/ModelRun';

export default defineComponent({
  name: 'ModelPublishingExperiment',
  components: {
    DatacubeCard,
    DatacubeModelHeader,
    ModelPublishingChecklist,
    ModelDescription,
    DropdownButton,
    AnalyticalQuestionsAndInsightsPanel,
    MapDropdown
  },
  setup() {
    const store = useStore();
    const projectId: ComputedRef<string> = computed(() => store.getters['app/project']);
    const countInsights = computed(() => store.getters['insightPanel/countInsights']);

    const datacubeCurrentOutputsMap = computed(() => store.getters['app/datacubeCurrentOutputsMap']);
    const currentOutputIndex = computed((): number => metadata.value?.id !== undefined ? datacubeCurrentOutputsMap.value[metadata.value?.id] : 0);
    const currentPublishStep: ComputedRef<number> = computed(() => store.getters['modelPublishStore/currentPublishStep']);
    const selectedTemporalAggregation: ComputedRef<AggregationOption> = computed(() => store.getters['modelPublishStore/selectedTemporalAggregation']);
    const selectedTemporalResolution: ComputedRef<TemporalResolutionOption> = computed(() => store.getters['modelPublishStore/selectedTemporalResolution']);
    const selectedSpatialAggregation: ComputedRef<AggregationOption> = computed(() => store.getters['modelPublishStore/selectedSpatialAggregation']);
    const selectedTimestamp: ComputedRef<number> = computed(() => store.getters['modelPublishStore/selectedTimestamp']);
    const selectedScenarioIds: ComputedRef<string[]> = computed(() => store.getters['modelPublishStore/selectedScenarioIds']);

    const setDatacubeCurrentOutputsMap = (updatedMap: any) => store.dispatch('app/setDatacubeCurrentOutputsMap', updatedMap);
    const hideInsightPanel = () => store.dispatch('insightPanel/hideInsightPanel');
    const setCurrentPublishStep = (step: ModelPublishingStepID) => store.dispatch('modelPublishStore/setCurrentPublishStep', step);
    const setSelectedTemporalAggregation = (tempAgg: string) => store.dispatch('modelPublishStore/setSelectedTemporalAggregation', tempAgg);
    const setSelectedSpatialAggregation = (spatAgg: string) => store.dispatch('modelPublishStore/setSelectedSpatialAggregation', spatAgg);
    const setSelectedTemporalResolution = (tempRes: string) => store.dispatch('modelPublishStore/setSelectedTemporalResolution', tempRes);
    watchEffect(() => {
      // If more than one run is selected, make sure "split by" is set to none.
      if (selectedScenarioIds.value.length > 1) {
        breakdownOption.value = null;
      }
    });

    // reset on init:
    setCurrentPublishStep(ModelPublishingStepID.Enrich_Description);

    const selectedAdminLevel = ref(0);
    function setSelectedAdminLevel(newValue: number) {
      selectedAdminLevel.value = newValue;
    }

    const selectedBaseLayer = ref(BASE_LAYER.DEFAULT);
    const selectedDataLayer = ref(DATA_LAYER.ADMIN);
    const breakdownOption = ref<string | null>(null);

    const selectedScenarios = ref<ModelRun[]>([]);

    // apply initial data config for this datacube
    const initialSelectedRegionIds = ref<string[]>([]);
    const initialSelectedQualifierValues = ref<string[]>([]);
    const initialSelectedYears = ref<string[]>([]);

    const selectedModelId = ref('');
    const metadata = useModelMetadata(selectedModelId);

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

    const modelRunsFetchedAt = ref(0);
    const newRunsMode = ref(false);

    const timeInterval = 10000;

    function fetchData() {
      if (!newRunsMode.value && metadata.value?.type === DatacubeType.Model) {
        modelRunsFetchedAt.value = Date.now();
      }
    }

    // @REVIEW: consider notifying the user of new data and only fetch/reload if confirmed
    const timerHandler = setInterval(fetchData, timeInterval);

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

        // selecting a run or multiple runs when the desc tab is active should always open the data tab
        // selecting a run or multiple runs otherwise should respect the current tab
        if (currentTabView.value === 'description') {
          currentTabView.value = 'data';
        }

        // once the list of selected scenario changes,
        // extract model runs that match the selected scenario IDs
        selectedScenarios.value = newIds.reduce((filteredRuns: ModelRun[], runId) => {
          allModelRunData.value.some(run => {
            return runId === run.id && filteredRuns.push(run);
          });
          return filteredRuns;
        }, []);
      } else {
        // if no scenario selection is made, ensure we are back to the first step
        if (currentPublishStep.value !== ModelPublishingStepID.Enrich_Description) {
          store.dispatch('modelPublishStore/setCurrentPublishStep', ModelPublishingStepID.Enrich_Description);
        }

        currentTabView.value = 'description';
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

    const currentTabView = ref<string>('description');
    const outputs = ref([]) as Ref<DatacubeFeature[]>;
    const mainModelOutput = ref<DatacubeFeature | undefined>(undefined);

    watchEffect(() => {
      if (metadata.value) {
        store.dispatch('insightPanel/setContextId', [metadata.value.id]);

        outputs.value = metadata.value?.validatedOutputs ? metadata.value?.validatedOutputs : metadata.value?.outputs;

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
        setSelectedScenarioIds([DatacubeType.Indicator.toString()]);
      }
    });

    const setBreakdownOption = (newValue: string | null) => {
      breakdownOption.value = newValue;
    };

    const setSelectedTimestamp = (timestamp: number | null) => {
      store.dispatch('modelPublishStore/setSelectedTimestamp', timestamp);
    };

    const getPublicInsights = async () => {
      const publicInsightsSearchFields: InsightFilterFields = {};
      publicInsightsSearchFields.visibility = 'public';
      publicInsightsSearchFields.project_id = projectId.value;
      publicInsightsSearchFields.context_id = metadata?.value?.id;
      const publicInsights = await fetchInsights([publicInsightsSearchFields]);
      return publicInsights as Insight[];
    };

    const refreshMetadata = () => {
      if (metadata.value !== null) {
        const cloneMetadata = _.cloneDeep(metadata.value);

        // re-create the validatedOutputs array
        cloneMetadata.validatedOutputs = getValidatedOutputs(cloneMetadata.outputs);

        metadata.value = cloneMetadata;
      }
    };

    const updateTabView = (val: string) => {
      currentTabView.value = val;
    };

    const setBaseLayer = (val: BASE_LAYER) => {
      selectedBaseLayer.value = val;
    };

    const setDataLayer = (val: DATA_LAYER) => {
      selectedDataLayer.value = val;
    };
    const updateSelectedTimestamp = (value: number) => {
      if (selectedTimestamp.value === value) return;
      setSelectedTimestamp(value);
    };
    const updateStateFromInsight = async (insight_id: string) => {
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
          selectedModelId.value = loadedInsight.data_state?.selectedModelId;
        }
        if (loadedInsight.data_state?.datacubeTitles !== undefined && loadedInsight.data_state?.datacubeTitles.length > 0) {
          // this will reload datacube metadata as well as scenario runs
          const selectedOutput = loadedInsight.data_state?.datacubeTitles[0].datacubeOutputName;
          const outputIndex = metadata?.value?.validatedOutputs?.findIndex(o => o.name === selectedOutput) ?? 0;
          // update the store
          const updatedCurrentOutputsMap = _.cloneDeep(datacubeCurrentOutputsMap);
          const datacubeId = metadata?.value ? metadata.value.id : loadedInsight.data_state?.selectedModelId;
          updatedCurrentOutputsMap.value[datacubeId ?? ''] = outputIndex;
          setDatacubeCurrentOutputsMap(updatedCurrentOutputsMap);
        }
        if (loadedInsight.data_state?.selectedScenarioIds) {
          // this would only be valid and effective if/after datacube runs are reloaded
          setSelectedScenarioIds(loadedInsight.data_state?.selectedScenarioIds);
        }
        if (loadedInsight.data_state?.selectedTimestamp !== undefined) {
          setSelectedTimestamp(loadedInsight.data_state?.selectedTimestamp);
        }
        if (loadedInsight.data_state?.relativeTo !== undefined) {
          setRelativeTo(loadedInsight.data_state?.relativeTo);
        }
        // view state
        if (loadedInsight.view_state?.spatialAggregation) {
          setSelectedSpatialAggregation(loadedInsight.view_state?.spatialAggregation);
        }
        if (loadedInsight.view_state?.temporalAggregation) {
          setSelectedTemporalAggregation(loadedInsight.view_state?.temporalAggregation);
        }
        if (loadedInsight.view_state?.temporalResolution) {
          setSelectedTemporalResolution(loadedInsight.view_state?.temporalResolution);
        }
        if (loadedInsight.view_state?.isDescriptionView !== undefined) {
          // FIXME
          updateTabView(loadedInsight.view_state?.isDescriptionView ? 'description' : 'data');
        }
        if (loadedInsight.view_state?.selectedOutputIndex !== undefined) {
          const updatedCurrentOutputsMap = _.cloneDeep(datacubeCurrentOutputsMap);
          const datacubeId = metadata?.value ? metadata.value.id : loadedInsight.data_state?.selectedModelId;
          updatedCurrentOutputsMap.value[datacubeId ?? ''] = loadedInsight.view_state?.selectedOutputIndex;
          setDatacubeCurrentOutputsMap(updatedCurrentOutputsMap);
        }
        if (loadedInsight.view_state?.selectedMapBaseLayer) {
          setBaseLayer(loadedInsight.view_state?.selectedMapBaseLayer);
        }
        if (loadedInsight.view_state?.selectedMapDataLayer) {
          setDataLayer(loadedInsight.view_state?.selectedMapDataLayer);
        }
        if (loadedInsight.view_state?.breakdownOption !== undefined) {
          setBreakdownOption(loadedInsight.view_state?.breakdownOption);
        }
        if (loadedInsight.view_state?.selectedAdminLevel !== undefined) {
          setSelectedAdminLevel(loadedInsight.view_state?.selectedAdminLevel);
        }
        // @NOTE: 'initialSelectedRegionIds' must be set after 'selectedAdminLevel'
        if (loadedInsight.data_state?.selectedRegionIds !== undefined) {
          initialSelectedRegionIds.value = _.clone(loadedInsight.data_state?.selectedRegionIds);
        }
        // @NOTE: 'initialSelectedQualifierValues' must be set after 'breakdownOption'
        if (loadedInsight.data_state?.selectedQualifierValues !== undefined) {
          initialSelectedQualifierValues.value = _.clone(loadedInsight.data_state?.selectedQualifierValues);
        }
        // @NOTE: 'initialSelectedYears' must be set after 'breakdownOption'
        if (loadedInsight.data_state?.selectedYears !== undefined) {
          initialSelectedYears.value = _.clone(loadedInsight.data_state?.selectedYears);
        }
      }
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
      const viewState: ViewState = initViewStateFromRefs(
        breakdownOption,
        currentOutputIndex,
        currentTabView,
        selectedAdminLevel,
        selectedBaseLayer,
        selectedDataLayer,
        selectedSpatialAggregation,
        selectedTemporalAggregation,
        selectedTemporalResolution
      );
      store.dispatch('insightPanel/setViewState', viewState);
      const dataState: DataState = initDataStateFromRefs(
        mainModelOutput,
        metadata,
        relativeTo,
        selectedModelId,
        selectedQualifierValues,
        selectedRegionIds,
        selectedScenarioIds,
        selectedTimestamp,
        selectedYears
      );

      store.dispatch('insightPanel/setDataState', dataState);
    });

    watchEffect(async () => {
      if (countInsights.value > 0) {
        const publicInsights = await getPublicInsights();
        if (publicInsights.length > 0) {
          // we have at least one insight, so mark the relevant step as completed
          const ps = publishingSteps.value.find(s => s.id === ModelPublishingStepID.Capture_Insight);
          if (ps) { ps.completed = true; }
        }
      }
    });

    const updatePublishingStep = (completed: boolean) => {
      const currStep = publishingSteps.value.find(ps => ps.id === currentPublishStep.value);
      if (currStep) {
        currStep.completed = completed;
      }
    };
    const showPublishingStep = (publishStepInfo: {publishStep: ModelPublishingStep}) => {
      setCurrentPublishStep(publishStepInfo.publishStep.id);
      openPublishAccordion.value = !openPublishAccordion.value;

      if (allScenarioIds.value.length > 0) {
        let selectedIds = selectedScenarioIds.value;
        if (currentPublishStep.value === ModelPublishingStepID.Enrich_Description) {
          selectedIds = [];
        } else {
          // we should have at least one valid scenario selected. If not, then select the first one
          selectedIds = selectedScenarioIds.value.length > 0 ? selectedScenarioIds.value : [allScenarioIds.value[0]];
        }
        setSelectedScenarioIds(selectedIds);
      }

      if (currentPublishStep.value === ModelPublishingStepID.Tweak_Visualization) {
        checkStepForCompleteness();
      }
    };
    const handleTemporalAggregationSelection = (tempAgg: string) => {
      setSelectedTemporalAggregation(tempAgg);
      checkStepForCompleteness();
    };
    const handleTemporalResolutionSelection = (tempRes: string) => {
      setSelectedTemporalResolution(tempRes);
      checkStepForCompleteness();
    };
    const setSpatialAggregationSelection = (spatialAgg: string) => {
      setSelectedSpatialAggregation(spatialAgg);
      checkStepForCompleteness();
    };
    const checkStepForCompleteness = () => {
      // mark this step as complete
      if (selectedSpatialAggregation.value !== '' &&
          selectedTemporalAggregation.value !== '' &&
          selectedTemporalResolution.value !== '') {
        updatePublishingStep(true);
      }
    };
    const toggleAccordion = (event: any) => {
      openPublishAccordion.value = !openPublishAccordion.value;
      const target = event.target.nodeName === 'I' ? event.target.parentElement : event.target;
      const panel = target.nextElementSibling as HTMLElement;
      if (panel) {
        if (!openPublishAccordion.value) {
          panel.style.display = 'none';
        } else {
          panel.style.display = 'block';
        }
      }
    };
    const publishModel = async () => {
      // call the backend to update model metadata and finalize model publication
      if (metadata.value && isModel(metadata.value)) {
        // mark this datacube as published
        metadata.value.status = DatacubeStatus.Ready;
        // update the default output feature
        const validatedOutputs = metadata.value.validatedOutputs ?? [];
        if (validatedOutputs.length > 0) {
          metadata.value.default_feature = validatedOutputs[currentOutputIndex.value].name;
        }
        // remove newly-added fields such as 'validatedOutputs' so that ES can update
        const modelToUpdate = _.cloneDeep(metadata.value);
        delete modelToUpdate.validatedOutputs;
        const drilldownParams = modelToUpdate.parameters.filter(p => p.is_drilldown);
        drilldownParams.forEach((p: any) => {
          if (p.roles) {
            delete p.roles;
          }
          if (p.related_features) {
            delete p.related_features;
          }
        });

        //
        // update server data
        //
        const updateResult = await updateDatacube(modelToUpdate.id, modelToUpdate);
        console.log('model update status: ' + JSON.stringify(updateResult));
        // also, update the project stats count
        const domainProject = await domainProjectService.getProject(projectId.value);
        // add the instance to list of published instances
        const updatedReadyInstances = domainProject.ready_instances;
        if (!updatedReadyInstances.includes(modelToUpdate.name)) {
          updatedReadyInstances.push(modelToUpdate.name);
        }
        // remove the instance from the list of ready/published instances
        const updatedDraftInstances = domainProject.ready_instances.filter((n: string) => n !== modelToUpdate.name);
        // update the project doc at the server
        domainProjectService.updateDomainProject(
          projectId.value,
          {
            draft_instances: updatedDraftInstances,
            ready_instances: updatedReadyInstances
          }
        );

        // redirect to model family page
        router.push({
          name: 'domainDatacubeOverview',
          params: {
            project: projectId.value,
            projectType: modelToUpdate.type
          }
        });
      }
    };

    return {
      AggregationOption,
      allModelRunData,
      baselineMetadata,
      breakdownOption,
      currentPublishStep,
      currentTabView,
      getPublicInsights,
      handleTemporalAggregationSelection,
      handleTemporalResolutionSelection,
      hideInsightPanel,
      initialSelectedQualifierValues,
      initialSelectedRegionIds,
      initialSelectedYears,
      metadata,
      newRunsMode,
      openPublishAccordion,
      outputSpecs,
      publishModel,
      publishingSteps,
      qualifierBreakdownData,
      refreshMetadata,
      regionalData,
      relativeTo,
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
      setBaseLayer,
      setBreakdownOption,
      setDatacubeCurrentOutputsMap,
      setDataLayer,
      setRelativeTo,
      setSelectedAdminLevel,
      setSelectedScenarioIds,
      setSelectedSpatialAggregation,
      setSelectedTemporalAggregation,
      setSelectedTemporalResolution,
      setSelectedTimestamp,
      setSpatialAggregationSelection,
      showPublishingStep,
      temporalBreakdownData,
      TemporalResolutionOption,
      timerHandler,
      toggleAccordion,
      toggleIsQualifierSelected,
      toggleIsRegionSelected,
      toggleIsYearSelected,
      updateSelectedTimestamp,
      updateStateFromInsight,
      updateTabView,
      visibleTimeseriesData
    };
  },
  watch: {
    $route: {
      handler(/* newValue, oldValue */) {
        // NOTE:  this is only valid when the route is focused on the 'model publishing experiment' space
        if (this.$route.name === 'modelPublishingExperiment' && this.$route.query) {
          // check for 'insight_id' first to apply insight, then if not found, then 'datacube_id'
          const insight_id = this.$route.query.insight_id as any;
          if (insight_id !== undefined) {
            this.updateStateFromInsight(insight_id);
          } else {
            const datacubeid = this.$route.query.datacube_id as any;
            if (datacubeid !== undefined) {
              // re-fetch model data
              this.setSelectedTimestamp(null);
              this.selectedModelId = datacubeid;
            }
          }
        }
      },
      immediate: true
    }
  },
  unmounted() {
    clearInterval(this.timerHandler);
  },
  async mounted() {
    // ensure the insight explorer panel is closed in case the user has
    //  previously opened it and clicked the browser back button
    this.hideInsightPanel();

    let foundPublishedInsights = false;

    // we have some insights, some/all of which relates to the current model instance

    const insight_id = this.$route.query.insight_id as any;
    if (insight_id !== undefined) {
      // just mark all steps as completed
      this.publishingSteps.forEach(step => {
        step.completed = true;
      });
    } else {
      // check if a public insight exist for this model instance
      // first, fetch public insights to load the publication status, as needed
      const publicInsights = await this.getPublicInsights();
      if (publicInsights.length > 0) {
        //
        // FIXME: only apply public insight if no, other, insight is being applied
        //
        // we have at least one public insight, which we should use to fetch view configurations
        const defaultInsight: Insight = publicInsights[0]; // FIXME: pick the default insight instead
        const viewConfig = defaultInsight.view_state;
        if (viewConfig && defaultInsight.context_id?.includes(this.metadata?.id as string)) {
          (this as any).toaster('An existing published insight was found!\nLoading default configurations...', 'success', false);

          // FIXME: do we need to apply any data state here!?
          if (viewConfig.temporalAggregation) {
            this.setSelectedTemporalAggregation(viewConfig.temporalAggregation);
          }
          if (viewConfig.temporalResolution) {
            this.setSelectedTemporalResolution(viewConfig.temporalResolution);
          }
          if (viewConfig.spatialAggregation) {
            this.setSelectedSpatialAggregation(viewConfig.spatialAggregation);
          }
          if (viewConfig.selectedAdminLevel !== undefined) {
            this.setSelectedAdminLevel(viewConfig.selectedAdminLevel);
          }
          if (viewConfig.selectedMapBaseLayer) {
            this.setBaseLayer(viewConfig.selectedMapBaseLayer);
          }
          if (viewConfig.selectedMapDataLayer) {
            this.setDataLayer(viewConfig.selectedMapDataLayer);
          }
          if (viewConfig.selectedOutputIndex) {
            const modelId = this.metadata?.id as string;
            const defaultFeature = {
              [modelId]: viewConfig.selectedOutputIndex
            };
            this.setDatacubeCurrentOutputsMap(defaultFeature);
          }
          if (viewConfig.breakdownOption !== undefined) {
            this.setBreakdownOption(viewConfig.breakdownOption);
          }

          // @TODO:
          //  need to support applying an insight by both domain modeler as well as analyst

          // ensure that all publication steps are marked as complete
          this.publishingSteps.forEach(step => {
            step.completed = true;
          });

          foundPublishedInsights = true;
        }
      }

      if (!foundPublishedInsights) {
        // reset store and ensure values are default view configurations
        //  (in case opening another published model instance has updated them)
        this.setSelectedTemporalAggregation(AggregationOption.None);
        this.setSelectedTemporalResolution(TemporalResolutionOption.None);
        this.setSelectedSpatialAggregation(AggregationOption.None);
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

.dropdown-config:not(:first-child) {
  margin-left: 5px;
}

::v-deep(.attribute-invalid button) {
  border:1px solid red !important;
}

.main {
  flex: 1;
  display: flex;
  min-height: 0;
}

.datacube-expanded {
  min-width: 0;
  flex: 1;
  margin: 0 10px 10px 0;
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
