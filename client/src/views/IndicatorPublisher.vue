<template>
  <div class="indicator-publishing-experiment-container">
    <DatacubeCard
      class="datacube-card"
      :isPublishing="true"
      :initial-view-config="initialViewConfig ?? undefined"
      :metadata="metadata"
      :aggregation-options="aggregationOptionFiltered"
      :temporal-resolution-options="temporalResolutionOptionFiltered"
      @update-model-parameter="onModelParamUpdated"
    >
      <template #datacube-model-header>
        <h5 v-if="metadata && mainModelOutput" class="datacube-header">
          <div>
            <span>{{
              mainModelOutput.display_name !== ''
                ? mainModelOutput.display_name
                : mainModelOutput.name
            }}</span>
            <span class="datacube-name"> | {{ metadata.name }} </span>
          </div>
          <button
            class="btn btn-call-to-action"
            style="border-radius: 2px; margin-left: 1rem; align-self: center; height: 75%"
            v-tooltip.top-center="'Save the visualization options for this indicator'"
            @click="updateIndicator()"
          >
            Update Indicator
          </button>
        </h5>
      </template>

      <template #datacube-description>
        <DatacubeDescription :metadata="metadata" />
      </template>
    </DatacubeCard>
  </div>
</template>

<script lang="ts">
import _ from 'lodash';
import { computed, ComputedRef, defineComponent, Ref, ref, watch } from 'vue';
import { useStore } from 'vuex';
import router from '@/router';
import DatacubeCard from '@/components/data/datacube-card.vue';
import useModelMetadata from '@/composables/useModelMetadata';
import { generateSparklines, updateIndicatorsBulk } from '@/services/datacube-service';
import { Datacube, DatacubeFeature, Model, ModelParameter } from '@/types/Datacube';
import {
  AggregationOption,
  TemporalResolutionOption,
  DatacubeStatus,
  TemporalResolution,
} from '@/types/Enums';
import { DataSpaceDataState, ViewState } from '@/types/Insight';
import {
  getSelectedOutput,
  getValidatedOutputs,
  isIndicator,
  getOutputs,
} from '@/utils/datacube-util';
import useToaster from '@/composables/useToaster';
import DatacubeDescription from '@/components/data/datacube-description.vue';
import {
  aggregationOptionFiltered,
  temporalResolutionOptionFiltered,
} from '@/utils/drilldown-util';
import useDatacubeVersioning from '@/composables/useDatacubeVersioning';
import { TYPE } from 'vue-toastification';
import {
  convertFromLegacyState,
  convertToLegacyViewState,
} from '@/utils/legacy-data-space-state-util';

export default defineComponent({
  name: 'IndicatorPublisher',
  components: {
    DatacubeCard,
    DatacubeDescription,
  },
  setup() {
    const store = useStore();
    const toast = useToaster();
    const projectId: ComputedRef<string> = computed(() => store.getters['app/project']);
    const projectType = computed(() => store.getters['app/projectType']);

    const enableOverlay = (message: string) => store.dispatch('app/enableOverlay', message);
    const disableOverlay = () => store.dispatch('app/disableOverlay');

    const initialViewConfig = ref<ViewState | null>({
      temporalAggregation: AggregationOption.Mean,
      spatialAggregation: AggregationOption.Mean,
      temporalResolution: TemporalResolutionOption.Month,
    });

    const viewState = computed(() => store.getters['insightPanel/viewState']);

    const selectedIndicatorId = ref('');
    const metadata = useModelMetadata(selectedIndicatorId);

    const outputs = ref([]) as Ref<DatacubeFeature[]>;
    watch(
      metadata,
      (_metadata) => {
        if (_metadata) {
          outputs.value = getOutputs(_metadata);
        }
      },
      { immediate: true }
    );

    const mainModelOutput = ref<DatacubeFeature | undefined>(undefined);
    watch(
      metadata,
      (_metadata) => {
        if (_metadata) {
          mainModelOutput.value = getSelectedOutput(_metadata, 0);
        }
      },
      { immediate: true }
    );

    // When metadata loads, convert from the new "ModelOrDatasetState" object back to the legacy
    //  ViewState schema and pass it to datacube-card to populate the various fields.
    watch(
      [metadata, selectedIndicatorId],
      ([_metadata, _id]) => {
        if (!_metadata?.default_state || _id.length === 0) return;
        initialViewConfig.value = convertToLegacyViewState(_metadata.default_state);
      },
      { immediate: true }
    );

    const refreshMetadata = () => {
      if (metadata.value !== null) {
        const cloneMetadata = _.cloneDeep(metadata.value);

        // re-create the validatedOutputs array
        cloneMetadata.validatedOutputs = getValidatedOutputs(cloneMetadata.outputs);

        metadata.value = cloneMetadata;
      }
    };

    const generateSparkline = async (
      meta: Datacube,
      output?: DatacubeFeature,
      selections?: ViewState
    ) => {
      const feature = output?.name ?? meta.default_feature;
      const rawResolution =
        output?.data_resolution?.temporal_resolution ?? TemporalResolution.Other;
      const finalRawTimestamp = meta.period?.lte ?? 0;
      const sparklineResult = await generateSparklines([
        {
          id: meta.id,
          dataId: meta.data_id,
          runId: 'indicator',
          feature,
          resolution: selections?.temporalResolution ?? 'month',
          temporalAgg: selections?.temporalAggregation ?? 'mean',
          spatialAgg: selections?.spatialAggregation ?? 'mean',
          rawResolution,
          finalRawTimestamp,
        },
      ]);
      console.log('Sparkline requested: ' + sparklineResult);
    };

    /**
     * Call the backend to update metadata
     */
    const updateIndicator = async () => {
      if (metadata.value) {
        const defaultState = convertFromLegacyState(
          _.cloneDeep(metadata.value),
          'indicator',
          viewState.value,
          {} as DataSpaceDataState
        );
        const deltas = [
          {
            id: metadata.value.id,
            default_state: defaultState,
          },
        ];
        try {
          await enableOverlay('Generating preview');
          await generateSparkline(metadata.value, mainModelOutput.value, viewState.value);
          await enableOverlay('Saving changes');
          await updateIndicatorsBulk(deltas);
          await disableOverlay();
          toast('Indicator updated', TYPE.SUCCESS);
          // redirect to dataset family page
          router.push({
            name: 'datasetOverview',
            query: { template_id: selectedIndicatorId.value },
            params: {
              project: projectId.value,
              projectType: projectType.value,
            },
          });
        } catch {
          await disableOverlay();
          toast('The was an issue with applying the settings', TYPE.INFO);
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

    const { statusColor, statusLabel } = useDatacubeVersioning(metadata);

    return {
      AggregationOption,
      updateIndicator,
      refreshMetadata,
      selectedIndicatorId,
      TemporalResolutionOption,
      initialViewConfig,
      onModelParamUpdated,
      projectId,
      toast,
      metadata,
      isIndicator,
      mainModelOutput,
      outputs,
      DatacubeStatus,
      aggregationOptionFiltered,
      temporalResolutionOptionFiltered,
      statusColor,
      statusLabel,
    };
  },
  watch: {
    $route: {
      handler(/* newValue, oldValue */) {
        // NOTE:  this is only valid when the route is focused on the 'indicator publishing experiment' space
        if (this.$route.name === 'indicatorPublisher' && this.$route.query) {
          const datacubeid = this.$route.query.datacube_id as any;
          if (datacubeid !== undefined) {
            // update selected datacube id to start datacube card update
            this.selectedIndicatorId = datacubeid;
          }
        }
      },
      immediate: true,
    },
  },
});
</script>

<style lang="scss" scoped>
@import '~styles/variables';

.indicator-publishing-experiment-container {
  height: $content-full-height;
  display: flex;
  overflow: hidden;
  padding: 5px;
}

.datacube-card {
  min-width: 0;
  flex: 1;
}

.datacube-header {
  display: flex;
  flex: 1;
  margin: 0;
}
</style>
