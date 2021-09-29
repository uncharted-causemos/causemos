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
      <div class="main insight-capture">
        <!-- TODO: whether a card is actually expanded or not will
        be dynamic later -->
        <datacube-card
          :class="{ 'datacube-expanded': true }"
          :isExpanded="false"
          :default-spatial-aggregation="AggregationOption.None"
          :default-temporal-aggregation="AggregationOption.None"
          :default-temporal-resolution="TemporalResolutionOption.None"
          :initial-selected-model-id="selectedModelId"
          :spatial-aggregation-options="Object.values(AggregationOption)"
          :temporal-aggregation-options="Object.values(AggregationOption)"
          :temporal-resolution-options="Object.values(TemporalResolutionOption)"
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
import DatacubeModelHeader from '@/components/data/datacube-model-header.vue';
import ModelDescription from '@/components/data/model-description.vue';
import ModelPublishingChecklist from '@/components/widgets/model-publishing-checklist.vue';
import useModelMetadata from '@/services/composables/useModelMetadata';
import { fetchInsights, InsightFilterFields } from '@/services/insight-service';
import { updateDatacube } from '@/services/new-datacube-service';
import { DatacubeFeature, ModelPublishingStep } from '@/types/Datacube';
import { AggregationOption, TemporalResolutionOption, DatacubeStatus, ModelPublishingStepID } from '@/types/Enums';
import { Insight } from '@/types/Insight';
import { getValidatedOutputs, isModel } from '@/utils/datacube-util';
import domainProjectService from '@/services/domain-project-service';

export default defineComponent({
  name: 'ModelPublishingExperiment',
  components: {
    AnalyticalQuestionsAndInsightsPanel,
    DatacubeCard,
    DatacubeModelHeader,
    ModelDescription,
    ModelPublishingChecklist
  },
  setup() {
    const store = useStore();
    const projectId: ComputedRef<string> = computed(() => store.getters['app/project']);
    const countInsights = computed(() => store.getters['insightPanel/countInsights']);
    const datacubeCurrentOutputsMap = computed(() => store.getters['app/datacubeCurrentOutputsMap']);
    const dataState = computed(() => store.getters['insightPanel/dataState']);
    const viewState = computed(() => store.getters['insightPanel/viewState']);

    const currentOutputIndex = computed((): number => metadata.value?.id !== undefined ? datacubeCurrentOutputsMap.value[metadata.value?.id] : 0);
    const currentPublishStep: ComputedRef<number> = computed(() => store.getters['modelPublishStore/currentPublishStep']);

    const setDatacubeCurrentOutputsMap = (updatedMap: any) => store.dispatch('app/setDatacubeCurrentOutputsMap', updatedMap);
    const hideInsightPanel = () => store.dispatch('insightPanel/hideInsightPanel');
    const setCurrentPublishStep = (step: ModelPublishingStepID) => store.dispatch('modelPublishStore/setCurrentPublishStep', step);

    // reset on init:
    setCurrentPublishStep(ModelPublishingStepID.Enrich_Description);

    const selectedModelId = ref('');
    const metadata = useModelMetadata(selectedModelId);


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
    const outputs = ref([]) as Ref<DatacubeFeature[]>;
    const mainModelOutput = ref<DatacubeFeature | undefined>(undefined);

    const selectedScenarioIds = computed(() => dataState.value.selectedScenarioIds);
    const selectedSpatialAggregation = computed(() => viewState.value.selectedSpatialAggregation);
    const selectedTemporalAggregation = computed(() => viewState.value.selectedTemporalAggregation);
    const selectedTemporalResolution = computed(() => viewState.value.selectedTemporalResolution);

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
          setDatacubeCurrentOutputsMap(defaultOutputMap);
        }
        mainModelOutput.value = outputs.value[initialOutputIndex];
      }
    });


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

    watchEffect(() => {
      // mark this step as complete
      if (selectedSpatialAggregation.value !== '' &&
          selectedTemporalAggregation.value !== '' &&
          selectedTemporalResolution.value !== '') {
        updatePublishingStep(true);
      }
      if (selectedScenarioIds?.value?.length > 0) {
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
    });

    return {
      AggregationOption,
      currentPublishStep,
      getPublicInsights,
      hideInsightPanel,
      metadata,
      openPublishAccordion,
      publishModel,
      publishingSteps,
      refreshMetadata,
      selectedModelId,
      showPublishingStep,
      TemporalResolutionOption,
      toggleAccordion
    };
  },
  watch: {
    $route: {
      handler(/* newValue, oldValue */) {
        // NOTE:  this is only valid when the route is focused on the 'model publishing experiment' space
        if (this.$route.name === 'modelPublishingExperiment' && this.$route.query) {
          // check for 'insight_id' first to apply insight, then if not found, then 'datacube_id'
          const insight_id = this.$route.query.insight_id as any;
          const datacubeid = this.$route.query.datacube_id as any;
          if (!insight_id && datacubeid !== undefined) {
            // update selected model id to start datacube card update
            this.selectedModelId = datacubeid;
          }
        }
      },
      immediate: true
    }
  },
  async mounted() {
    // ensure the insight explorer panel is closed in case the user has
    //  previously opened it and clicked the browser back button
    this.hideInsightPanel();

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
