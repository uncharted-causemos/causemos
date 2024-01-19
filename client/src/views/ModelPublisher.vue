<template>
  <div class="model-publishing-experiment-container">
    <span
      v-if="metadata && metadata.status === DatacubeStatus.Deprecated"
      style="margin: 2px; padding: 2px 5px; font-size: large; font-weight: bolder"
      :style="{ backgroundColor: statusColor }"
      >{{ statusLabel }}</span
    >
    <ModelPublishingChecklist
      v-if="metadata && metadata.status !== DatacubeStatus.Deprecated"
      :publishingSteps="publishingSteps"
      :is-already-published="metadata.status === DatacubeStatus.Ready"
      @navigate-to-publishing-step="jumpToPublishingStep"
      @publish-model="publishModel"
    />
    <DatacubeCard
      class="datacube-card"
      :isPublishing="true"
      :initial-data-config="initialDataConfig"
      :initial-view-config="initialViewConfig ?? undefined"
      :metadata="metadata"
      :aggregation-options="Object.values(AggregationOption)"
      :temporal-resolution-options="Object.values(TemporalResolutionOption)"
      :tab-state="tabState"
      @update-model-parameter="onModelParamUpdated"
    >
      <template v-slot:datacube-model-header>
        <DatacubeModelHeader
          class="scenario-header"
          :metadata="(metadata as Model | null)"
          :item-id="selectedModelId"
        />
      </template>
      <template v-slot:datacube-description>
        <ModelDescription
          :metadata="(metadata as Model | null)"
          :item-id="selectedModelId"
          @refresh-metadata="refreshMetadata"
        />
      </template>
    </DatacubeCard>
  </div>
</template>

<script setup lang="ts">
import _ from 'lodash';
import { computed, ComputedRef, nextTick, ref, watch, watchEffect } from 'vue';
import { useStore } from 'vuex';
import router from '@/router';
import DatacubeCard from '@/components/data/datacube-card.vue';
import DatacubeModelHeader from '@/components/data/datacube-model-header.vue';
import ModelDescription from '@/components/data/model-description.vue';
import ModelPublishingChecklist from '@/components/widgets/model-publishing-checklist.vue';
import useModelMetadata from '@/composables/useModelMetadata';
import {
  updateDatacube,
  generateSparklines,
  getDefaultModelRunMetadata,
} from '@/services/datacube-service';
import { Datacube, Model, ModelParameter, ModelPublishingStep } from '@/types/Datacube';
import {
  AggregationOption,
  TemporalResolutionOption,
  DatacubeStatus,
  ModelPublishingStepID,
  TemporalResolution,
  DatacubeViewMode,
} from '@/types/Enums';
import { DataSpaceDataState, DataState, ViewState } from '@/types/Insight';
import { getValidatedOutputs, isModel } from '@/utils/datacube-util';
import { isDataSpaceDataState } from '@/utils/insight-util';
import useToaster from '@/composables/useToaster';
import { updateDatacubesOutputsMap } from '@/utils/analysis-util';
import { useRoute } from 'vue-router';
import useActiveDatacubeFeature from '@/composables/useActiveDatacubeFeature';
import { TYPE } from 'vue-toastification';
import useDatacubeVersioning from '@/composables/useDatacubeVersioning';
import {
  convertFromLegacyState,
  convertToLegacyDataSpaceDataState,
  convertToLegacyViewState,
} from '@/utils/legacy-data-space-state-util';
import { isBreakdownQualifier } from '@/utils/qualifier-util';

const store = useStore();
const route = useRoute();
const toast = useToaster();
const projectId: ComputedRef<string> = computed(() => store.getters['app/project']);
const datacubeCurrentOutputsMap = computed(() => store.getters['app/datacubeCurrentOutputsMap']);
const dataState = computed<DataState | null>(() => store.getters['insightPanel/dataState']);

const viewState = computed(() => store.getters['insightPanel/viewState']);
const selectedSpatialAggregation = computed(() => viewState.value.spatialAggregation);
const selectedTemporalAggregation = computed(() => viewState.value.temporalAggregation);
const selectedTemporalResolution = computed(() => viewState.value.temporalResolution);

const enableOverlay = (message: string) => store.dispatch('app/enableOverlay', message);
const disableOverlay = () => store.dispatch('app/disableOverlay');

const tabState = ref('');
const jumpToPublishingStep = (step: ModelPublishingStepID) => {
  // HACK: some strange Vue issue does not force the update to "tabState.value" to be triggered in the datacube-card
  //         so the following hack is used
  tabState.value = '';
  nextTick(() => {
    tabState.value =
      step === ModelPublishingStepID.Enrich_Description
        ? DatacubeViewMode.Description
        : DatacubeViewMode.Data;
  });
};

const selectedModelId = ref('');
// Load the datacube whose ID is passed through the URL
watch(
  () => route.query.datacube_id,
  (datacubeId) => {
    if (datacubeId !== undefined) {
      selectedModelId.value = datacubeId as string;
    }
  },
  { immediate: true }
);

const metadata = useModelMetadata(selectedModelId);

const publishingSteps = ref<ModelPublishingStep[]>([
  {
    id: ModelPublishingStepID.Enrich_Description,
    text: 'Describe inputs and outputs',
    completed: false,
  },
  {
    id: ModelPublishingStepID.Tweak_Visualization,
    text: 'Configure aggregation options',
    completed: false,
  },
]);
// Mark the "Enrich Description" step as completed if all fields have text, or incomplete otherwise.
watch(
  metadata,
  (_metadata) => {
    if (_metadata === null) return;
    const inputParameters = (_metadata as Model).parameters.filter((p) => !p.is_drilldown) ?? [];
    const outputVariables = _metadata.outputs;
    const qualifiers = _metadata.qualifier_outputs?.filter((q) => isBreakdownQualifier(q)) ?? [];
    const invalidItems = [...inputParameters, ...outputVariables, ...qualifiers].filter(
      (item) => item.display_name.length === 0 || item.description.length === 0
    );
    const areNamesAndDescriptionsValid = invalidItems.length === 0;
    const metadataStep = publishingSteps.value.find(
      (s) => s.id === ModelPublishingStepID.Enrich_Description
    );
    if (metadataStep) {
      metadataStep.completed = areNamesAndDescriptionsValid;
    }
  },
  { deep: true }
);
// Mark the "Tweak Visualization" step as completed when aggregation options are defined.
watch(
  () => [
    selectedSpatialAggregation.value,
    selectedTemporalAggregation.value,
    selectedTemporalResolution.value,
  ],
  () => {
    const vizConfigStep = publishingSteps.value.find(
      (s) => s.id === ModelPublishingStepID.Tweak_Visualization
    );
    if (vizConfigStep) {
      vizConfigStep.completed =
        selectedSpatialAggregation.value !== AggregationOption.None &&
        selectedTemporalAggregation.value !== AggregationOption.None &&
        selectedTemporalResolution.value !== TemporalResolutionOption.None;
    }
  }
);

const initialDataConfig = ref<DataSpaceDataState | null>(null);
const initialViewConfig = ref<ViewState | null>({
  temporalAggregation: AggregationOption.None,
  spatialAggregation: AggregationOption.None,
  temporalResolution: TemporalResolutionOption.None,
});
// When metadata loads, convert from the new "ModelOrDatasetState" object back to the legacy
//  DataSpaceDataState and ViewState schemas and pass them to datacube-card to populate the
//  various fields.
watch([metadata, selectedModelId], ([_metadata, _id]) => {
  if (!_metadata?.default_state || _id.length === 0) return;
  initialDataConfig.value = convertToLegacyDataSpaceDataState(
    _id,
    _metadata.default_state,
    metadata.value?.outputs ?? []
  );
  initialViewConfig.value = convertToLegacyViewState(_metadata.default_state);
});

const { statusColor, statusLabel } = useDatacubeVersioning(metadata);

const { currentOutputIndex } = useActiveDatacubeFeature(metadata, selectedModelId);

const selectedScenarioIds = computed(() =>
  dataState.value && isDataSpaceDataState(dataState.value)
    ? dataState.value.selectedScenarioIds
    : null
);

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
      initialOutputIndex =
        metadata.value.validatedOutputs?.findIndex(
          (o) => o.name === metadata.value?.default_feature
        ) ?? 0;

      // update the store
      updateDatacubesOutputsMap(datacubeKey, store, route, initialOutputIndex);
    }
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

const addSparkline = async (meta: Datacube) => {
  const feature = meta.default_feature;
  const output = meta.outputs.find((output) => output.name === feature);
  const rawResolution = output?.data_resolution?.temporal_resolution ?? TemporalResolution.Other;
  const finalRawTimestamp = meta.period?.lte ?? 0;
  const defaultRun = await getDefaultModelRunMetadata(meta.id);
  const sparklineResult = await generateSparklines([
    {
      id: meta.id,
      dataId: meta.data_id,
      // This function is called when publishing model, which means it's safe
      //  to assert that selectedScenarioIds is defined
      runId: defaultRun?.id ?? (selectedScenarioIds.value as string[])[0],
      feature,
      resolution: selectedTemporalResolution.value,
      temporalAgg: selectedTemporalAggregation.value,
      spatialAgg: selectedSpatialAggregation.value,
      rawResolution,
      finalRawTimestamp,
    },
  ]);
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
      if (validatedOutputs.length === 0) {
        throw new Error('No valid outputs.');
      }
      metadata.value.default_feature = validatedOutputs[currentOutputIndex.value].name;
      // remove newly-added fields such as 'validatedOutputs' so that ES can update
      const modelToUpdate = _.cloneDeep(metadata.value);
      delete modelToUpdate.sparkline;
      delete modelToUpdate.validatedOutputs;

      const defaultRun = await getDefaultModelRunMetadata(modelToUpdate.id);
      modelToUpdate.default_state = convertFromLegacyState(
        modelToUpdate.data_id,
        defaultRun.id,
        viewState.value,
        dataState.value,
        modelToUpdate.default_feature
      );
      // Update server data
      await updateDatacube(modelToUpdate.id, modelToUpdate);

      await disableOverlay();
      // redirect to model family page
      router.push({
        name: 'domainDatacubeOverview',
        params: {
          project: projectId.value,
          projectType: modelToUpdate.type,
        },
      });
    } catch {
      toast('Failed to publish model', TYPE.INFO, true);
      await disableOverlay();
    }
  }
};

const onModelParamUpdated = (updatedModelParam: ModelParameter) => {
  if (metadata.value !== null) {
    const updatedParamIndex = (metadata.value as Model).parameters.findIndex(
      (p) => p.name === updatedModelParam.name
    );
    (metadata.value as Model).parameters[updatedParamIndex] = updatedModelParam;
    refreshMetadata();
  }
};
</script>

<style lang="scss" scoped>
@import '~styles/variables';

.model-publishing-experiment-container {
  height: $content-full-height;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  padding: 10px;
  gap: 10px;
}

.datacube-card {
  min-height: 0;
  flex: 1;
}
</style>
