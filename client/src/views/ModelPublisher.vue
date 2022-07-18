<template>
  <div class="model-publishing-experiment-container">
    <model-publishing-checklist
      :publishingSteps="publishingSteps"
      :currentPublishStep="currentPublishStep"
      :metadata="metadata"
      @navigate-to-publishing-step="showPublishingStep"
      @publish-model="publishModel"
    />
    <main class="main">
      <analytical-questions-and-insights-panel />
      <div class="main insight-capture">
        <datacube-card
          class="datacube-card"
          :isPublishing="true"
          :initial-data-config="initialDataConfig"
          :initial-view-config="initialViewConfig"
          :metadata="metadata"
          :aggregation-options="Object.values(AggregationOption)"
          :temporal-resolution-options="Object.values(TemporalResolutionOption)"
          :tab-state="tabState"
          @update-model-parameter="onModelParamUpdated"
        >
          <template v-slot:datacube-model-header>
            <datacube-model-header
              class="scenario-header"
              :metadata="metadata"
              :item-id="selectedModelId"
            />
          </template>
          <template v-slot:datacube-description>
            <model-description
              :metadata="metadata"
              :item-id="selectedModelId"
              @refresh-metadata="refreshMetadata"
              @check-model-metadata-validity="updateModelMetadataValidity"
            />
          </template>
        </datacube-card>
      </div>
    </main>
  </div>
</template>

<script lang="ts">
import _ from 'lodash';
import { computed, ComputedRef, defineComponent, nextTick, ref, watch, watchEffect } from 'vue';
import { useStore } from 'vuex';
import router from '@/router';
import AnalyticalQuestionsAndInsightsPanel from '@/components/analytical-questions/analytical-questions-and-insights-panel.vue';
import DatacubeCard from '@/components/data/datacube-card.vue';
import DatacubeModelHeader from '@/components/data/datacube-model-header.vue';
import ModelDescription from '@/components/data/model-description.vue';
import ModelPublishingChecklist from '@/components/widgets/model-publishing-checklist.vue';
import useModelMetadata from '@/services/composables/useModelMetadata';
import { updateDatacube, generateSparklines, getDefaultModelRunMetadata } from '@/services/new-datacube-service';
import { Datacube, DatacubeFeature, Model, ModelParameter, ModelPublishingStep } from '@/types/Datacube';
import {
  AggregationOption,
  TemporalResolutionOption,
  DatacubeStatus,
  ModelPublishingStepID,
  TemporalResolution,
  DatacubeViewMode
} from '@/types/Enums';
import { DataSpaceDataState, DataState, ViewState } from '@/types/Insight';
import { getSelectedOutput, getValidatedOutputs, isModel } from '@/utils/datacube-util';
import { isDataSpaceDataState } from '@/utils/insight-util';
import useToaster from '@/services/composables/useToaster';
import { getFirstInsight, InsightFilterFields, countPublicInsights } from '@/services/insight-service';
import { updateDatacubesOutputsMap } from '@/utils/analysis-util';
import { useRoute } from 'vue-router';
import useActiveDatacubeFeature from '@/services/composables/useActiveDatacubeFeature';

export default defineComponent({
  name: 'ModelPublisher',
  components: {
    AnalyticalQuestionsAndInsightsPanel,
    DatacubeCard,
    DatacubeModelHeader,
    ModelDescription,
    ModelPublishingChecklist
  },
  setup() {
    const store = useStore();
    const route = useRoute();
    const toast = useToaster();
    const projectId: ComputedRef<string> = computed(() => store.getters['app/project']);
    const countInsights = computed(() => store.getters['insightPanel/countInsights']);
    const datacubeCurrentOutputsMap = computed(() => store.getters['app/datacubeCurrentOutputsMap']);
    const dataState = computed<DataState | null>(() => store.getters['insightPanel/dataState']);
    const viewState = computed(() => store.getters['insightPanel/viewState']);
    const currentView = computed(() => store.getters['app/currentView']);

    const currentPublishStep: ComputedRef<number> = computed(() => store.getters['modelPublishStore/currentPublishStep']);

    const hideInsightPanel = () => store.dispatch('insightPanel/hideInsightPanel');
    const setCurrentPublishStep = (step: ModelPublishingStepID) => store.dispatch('modelPublishStore/setCurrentPublishStep', step);

    const enableOverlay = (message: string) => store.dispatch('app/enableOverlay', message);
    const disableOverlay = () => store.dispatch('app/disableOverlay');

    const initialDataConfig = ref<DataSpaceDataState | null>(null);
    const initialViewConfig = ref<ViewState | null>({
      temporalAggregation: AggregationOption.None,
      spatialAggregation: AggregationOption.None,
      temporalResolution: TemporalResolutionOption.None
    });

    // reset on init:
    setCurrentPublishStep(ModelPublishingStepID.Enrich_Description);

    const tabState = ref(''); // initial tab
    const selectedModelId = ref('');
    const metadata = useModelMetadata(selectedModelId);

    const { currentOutputIndex } = useActiveDatacubeFeature(metadata, selectedModelId);

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
    const mainModelOutput = ref<DatacubeFeature | undefined>(undefined);

    const selectedScenarioIds = computed(() => {
      if (dataState.value && isDataSpaceDataState(dataState.value)) {
        return dataState.value.selectedScenarioIds;
      }
      return null;
    });
    const selectedSpatialAggregation = computed(() => viewState.value.spatialAggregation);
    const selectedTemporalAggregation = computed(() => viewState.value.temporalAggregation);
    const selectedTemporalResolution = computed(() => viewState.value.temporalResolution);

    watchEffect(() => {
      if (metadata.value) {
        store.dispatch('insightPanel/setContextId', [metadata.value.id]);

        let initialOutputIndex = 0;
        const datacubeKey = selectedModelId.value; // i.e., datacube_id
        const currentOutputEntry = datacubeCurrentOutputsMap.value[datacubeKey];
        if (currentOutputEntry !== undefined && currentOutputEntry >= 0) {
          // we have a store entry for the selected output of the current model
          initialOutputIndex = currentOutputEntry;
        } else {
          initialOutputIndex = metadata.value.validatedOutputs?.findIndex(o => o.name === metadata.value?.default_feature) ?? 0;

          // update the store
          updateDatacubesOutputsMap(datacubeKey, store, route, initialOutputIndex);
        }
        mainModelOutput.value = getSelectedOutput(metadata.value, initialOutputIndex);
      }
    });

    const refreshMetadata = () => {
      if (metadata.value !== null) {
        const cloneMetadata = _.cloneDeep(metadata.value);

        // re-create the validatedOutputs array
        cloneMetadata.validatedOutputs = getValidatedOutputs(cloneMetadata.outputs);

        metadata.value = cloneMetadata;
      }
    };

    watch(
      () => [
        countInsights.value
      ],
      async () => {
        if (metadata.value) {
          const insightStep = publishingSteps.value.find(s => s.id === ModelPublishingStepID.Capture_Insight);
          const publicInsightCount = await countPublicInsights(metadata.value.id, projectId.value);
          // mark the relevant step as completed based on the availability of at least one public insight
          if (insightStep) { insightStep.completed = publicInsightCount > 0; }
          if (publicInsightCount === 0 && metadata.value.status === DatacubeStatus.Ready && currentView.value === 'modelPublisher') {
            toast('There isn\'t an insight found!\nPlease save an insight or unpublish the model!', 'error', false);
          }
        }
      },
      {
        immediate: true
      }
    );

    const showPublishingStep = (publishStepInfo: {publishStep: ModelPublishingStep}) => {
      setCurrentPublishStep(publishStepInfo.publishStep.id);
      // @NOTE: some strange Vue issue does not force the update to "tabState.value" to be triggered in the datacube-card
      //         so the following hack is used
      tabState.value = '';
      nextTick(() => {
        tabState.value = publishStepInfo.publishStep.id === ModelPublishingStepID.Enrich_Description ? DatacubeViewMode.Description : DatacubeViewMode.Data;
      });
    };

    const addSparkline = async(meta: Datacube) => {
      const feature = meta.default_feature;
      const output = meta.outputs.find(output => output.name === feature);
      const rawResolution = output?.data_resolution?.temporal_resolution ?? TemporalResolution.Other;
      const finalRawTimestamp = meta.period?.lte ?? 0;
      const defaultRun = await getDefaultModelRunMetadata(meta.id);
      const sparklineResult = await generateSparklines([{
        id: meta.id,
        dataId: meta.data_id,
        // This function is called when publishing model, which means it's safe
        //  to assert that selectedScenarioIds is defined
        runId: defaultRun?.id ?? (selectedScenarioIds.value as string[])[0],
        feature: feature,
        resolution: selectedTemporalResolution.value,
        temporalAgg: selectedTemporalAggregation.value,
        spatialAgg: selectedSpatialAggregation.value,
        rawResolution: rawResolution,
        finalRawTimestamp: finalRawTimestamp
      }]);
      console.log('Sparkline requested: ' + sparklineResult);
    };

    const publishModel = async () => {
      // call the backend to update model metadata and finalize model publication
      if (metadata.value && isModel(metadata.value)) {
        try {
          await enableOverlay('Generating preview');
          await addSparkline(metadata.value);
          await enableOverlay('Publishing model');
          // mark this datacube as published
          metadata.value.status = DatacubeStatus.Ready;
          // update the default output feature
          const validatedOutputs = metadata.value.validatedOutputs ?? [];
          if (validatedOutputs.length > 0) {
            metadata.value.default_feature = validatedOutputs[currentOutputIndex.value].name;
          }
          // remove newly-added fields such as 'validatedOutputs' so that ES can update
          const modelToUpdate = _.cloneDeep(metadata.value);
          delete modelToUpdate.sparkline;
          delete modelToUpdate.validatedOutputs;
          const drilldownParams = modelToUpdate.parameters.filter(p => p.is_drilldown);
          drilldownParams.forEach((p: any) => {
            // legacy field
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

          await disableOverlay();
          // redirect to model family page
          router.push({
            name: 'domainDatacubeOverview',
            params: {
              project: projectId.value,
              projectType: modelToUpdate.type
            }
          });
        } catch {
          toast('Failed to publish model', 'error', true);
          await disableOverlay();
        }
      }
    };

    watch(
      () => [
        selectedSpatialAggregation.value,
        selectedTemporalAggregation.value,
        selectedTemporalResolution.value
      ],
      () => {
        const vizConfigStep = publishingSteps.value.find(s => s.id === ModelPublishingStepID.Tweak_Visualization);
        if (vizConfigStep) {
          vizConfigStep.completed = selectedSpatialAggregation.value !== AggregationOption.None &&
            selectedTemporalAggregation.value !== AggregationOption.None &&
            selectedTemporalResolution.value !== TemporalResolutionOption.None;
        }
      }
    );

    watch(
      () => [
        selectedScenarioIds.value,
        selectedTemporalAggregation.value,
        selectedTemporalResolution.value
      ],
      () => {
        if (selectedScenarioIds.value && selectedScenarioIds.value.length > 0) {
          if (currentPublishStep.value === ModelPublishingStepID.Enrich_Description) {
            // user attempted to select one or more scenarios but the model publishing step is not correct
            // this would be the case of the user selected a scenario on the PC plot while the model publishing step is still assuming description view
            setCurrentPublishStep(ModelPublishingStepID.Tweak_Visualization);
          }
        } else {
          // if no scenario selection is made, ensure we are back to the first step
          if (currentPublishStep.value !== ModelPublishingStepID.Enrich_Description) {
            setCurrentPublishStep(ModelPublishingStepID.Enrich_Description);
          }
        }
      }
    );

    const onModelParamUpdated = (updatedModelParam: ModelParameter) => {
      if (metadata.value !== null) {
        const updatedParamIndex = (metadata.value as Model).parameters.findIndex(p => p.name === updatedModelParam.name);
        (metadata.value as Model).parameters[updatedParamIndex] = updatedModelParam;
        refreshMetadata();
      }
    };

    const updateModelMetadataValidity = (valid: boolean) => {
      const metadataStep = publishingSteps.value.find(s => s.id === ModelPublishingStepID.Enrich_Description);
      if (metadataStep) {
        metadataStep.completed = valid;
      }
    };

    const getFirstPublicInsight = async (datacubeId: string, projectId: string) => {
      const publicInsightsSearchFields: InsightFilterFields = {};
      publicInsightsSearchFields.visibility = 'public';
      publicInsightsSearchFields.project_id = projectId;
      publicInsightsSearchFields.context_id = datacubeId;
      return await getFirstInsight(publicInsightsSearchFields);
    };

    return {
      AggregationOption,
      currentPublishStep,
      hideInsightPanel,
      metadata,
      publishModel,
      publishingSteps,
      refreshMetadata,
      selectedModelId,
      showPublishingStep,
      tabState,
      TemporalResolutionOption,
      initialDataConfig,
      initialViewConfig,
      onModelParamUpdated,
      updateModelMetadataValidity,
      getFirstPublicInsight,
      projectId,
      toast,
      currentView
    };
  },
  watch: {
    $route: {
      handler(/* newValue, oldValue */) {
        // NOTE:  this is only valid when the route is focused on the 'model publishing experiment' space
        if (this.$route.name === 'modelPublisher' && this.$route.query) {
          // check for 'insight_id' first to apply insight, then if not found, then 'datacube_id'
          // const insight_id = this.$route.query.insight_id as any;
          const datacubeid = this.$route.query.datacube_id as any;
          if (datacubeid !== undefined) {
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

    let markInsightStepAsCompleted = false;

    // we have some insights, some/all of which relates to the current model instance
    const insight_id = this.$route.query.insight_id as any;
    if (insight_id !== undefined) {
      markInsightStepAsCompleted = true;
    } else {
      // check if a public insight exist for this model instance
      // first, fetch public insights to load the publication status, as needed
      // FIXME: Fetch the first default insight, not the first public insight
      const defaultInsight = await this.getFirstPublicInsight(this.metadata?.id as string, this.projectId);
      if (defaultInsight) {
        //
        // FIXME: only apply public insight if no, other, insight is being applied
        //
        // we have at least one public insight, which we should use to fetch view configurations
        if (defaultInsight.context_id?.includes(this.metadata?.id as string)) {
          markInsightStepAsCompleted = true;
          // restore initial config from the insight, if available
          if (
            defaultInsight.data_state !== undefined &&
            isDataSpaceDataState(defaultInsight.data_state)
          ) {
            this.initialDataConfig = defaultInsight.data_state;
          }
          if (defaultInsight.view_state !== undefined) {
            this.initialViewConfig = defaultInsight.view_state;
          }
          this.toast('An existing published insight was found!\nLoading default configurations...', 'success', false);
        }
      } else {
        if (this.metadata?.status === DatacubeStatus.Ready && this.currentView === 'modelPublisher') {
          this.toast('There isn\'t an insight found!\nPlease save an insight or unpublish the model!', 'error', false);
        }
      }
    }
    if (markInsightStepAsCompleted) {
      // mark the last step (i.e., the insight step) as completed
      const step = this.publishingSteps.find(s => s.id === ModelPublishingStepID.Capture_Insight);
      if (step) {
        step.completed = true;
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

.main {
  flex: 1;
  display: flex;
  min-height: 0;
  min-width: 0;
}

.datacube-card {
  min-width: 0;
  flex: 1;
  margin: 0 10px 10px 0;
}

</style>
