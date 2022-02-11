<template>
  <div class="indicator-publishing-experiment-container">
    <main class="main">
      <div class="main">
        <datacube-card
          class="datacube-card"
          :isPublishing="true"
          :initial-view-config="initialViewConfig"
          :metadata="metadata"
          :aggregation-options="aggregationOptionFiltered"
          :temporal-resolution-options="temporalResolutionOptionFiltered"
          :tab-state="tabState"
          @update-model-parameter="onModelParamUpdated"
        >
          <template #datacube-model-header>
            <h5
              v-if="metadata && mainModelOutput"
              class="datacube-header"
            >
              <div>
                <span>{{mainModelOutput.display_name !== '' ? mainModelOutput.display_name : mainModelOutput.name}}</span>
                <span class="datacube-name">{{metadata.name}} </span>
                <!--
                <span v-if="metadata.status === DatacubeStatus.Deprecated" v-tooltip.top-center="'Show current version of datacube'" style="margin-left: 1rem" :style="{ backgroundColor: statusColor, cursor: 'pointer' }" @click="showCurrentDatacube">{{ statusLabel }} <i class="fa fa-search"></i></span>
                -->
              </div>
              <button
                class="btn btn-primary btn-call-for-action"
                style="border-radius: 2px; margin-left: 1rem; align-self: center; height: 75%;"
                v-tooltip.top-center="'Save the visualization options for this indicator'"
                @click="updateIndicator()">
                  Update Indicator
              </button>
            </h5>
          </template>

          <template #datacube-description>
            <datacube-description
              :metadata="metadata"
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
import DatacubeCard from '@/components/data/datacube-card.vue';
import useModelMetadata from '@/services/composables/useModelMetadata';
import { updateIndicatorsBulk } from '@/services/new-datacube-service';
import { DatacubeFeature, Model, ModelParameter } from '@/types/Datacube';
import { AggregationOption, TemporalResolutionOption, DatacubeStatus } from '@/types/Enums';
import { ViewState } from '@/types/Insight';
import { getSelectedOutput, getValidatedOutputs, isIndicator, getOutputs } from '@/utils/datacube-util';
import useToaster from '@/services/composables/useToaster';
import DatacubeDescription from '@/components/data/datacube-description.vue';
import { aggregationOptionFiltered, temporalResolutionOptionFiltered } from '@/utils/drilldown-util';
import useDatacubeVersioning from '@/services/composables/useDatacubeVersioning';

export default defineComponent({
  name: 'IndicatorPublishingExperiment',
  components: {
    DatacubeCard,
    DatacubeDescription
  },
  setup() {
    const store = useStore();
    const toast = useToaster();
    const projectId: ComputedRef<string> = computed(() => store.getters['app/project']);
    const projectType = computed(() => store.getters['app/projectType']);

    const initialViewConfig = ref<ViewState | null>({
      temporalAggregation: AggregationOption.Mean,
      spatialAggregation: AggregationOption.Mean,
      temporalResolution: TemporalResolutionOption.Month
    });

    const viewState = computed(() => store.getters['insightPanel/viewState']);

    const tabState = ref('');
    const selectedIndicatorId = ref('');
    const metadata = useModelMetadata(selectedIndicatorId);

    const outputs = ref([]) as Ref<DatacubeFeature[]>;
    const mainModelOutput = ref<DatacubeFeature | undefined>(undefined);

    watchEffect(() => {
      if (metadata.value) {
        outputs.value = getOutputs(metadata.value);

        if (!_.isEmpty(metadata.value.default_view)) {
          initialViewConfig.value = _.cloneDeep(metadata.value.default_view);
        }
        mainModelOutput.value = getSelectedOutput(metadata.value, 0);
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

    const updateIndicator = async () => {
      //
      // call the backend to update metadata
      //
      if (metadata.value) {
        //
        // update server data
        //
        const indicatorToUpdate = _.cloneDeep(metadata.value);
        indicatorToUpdate.default_view = viewState.value;
        const deltas = [indicatorToUpdate]
          .map(indicator => ({
            id: indicator.id,
            default_view: indicator.default_view
          }));
        try {
          await updateIndicatorsBulk(deltas);
          toast('Indicator updated', 'success');
          // redirect to dataset family page
          router.push({
            name: 'datasetOverview',
            query: { template_id: selectedIndicatorId.value },
            params: {
              project: projectId.value,
              projectType: projectType.value
            }
          });
        } catch {
          toast('The was an issue with applying the settings', 'error');
        }
      }
    };

    const onModelParamUpdated = (updatedModelParam: ModelParameter) => {
      if (metadata.value !== null) {
        const updatedParamIndex = (metadata.value as Model).parameters.findIndex(p => p.name === updatedModelParam.name);
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
      tabState,
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
      statusLabel
    };
  },
  watch: {
    $route: {
      handler(/* newValue, oldValue */) {
        // NOTE:  this is only valid when the route is focused on the 'indicator publishing experiment' space
        if (this.$route.name === 'indicatorPublishingExperiment' && this.$route.query) {
          const datacubeid = this.$route.query.datacube_id as any;
          if (datacubeid !== undefined) {
            // update selected datacube id to start datacube card update
            this.selectedIndicatorId = datacubeid;
          }
        }
      },
      immediate: true
    }
  }
});
</script>

<style lang="scss" scoped>
@import '~styles/variables';

.indicator-publishing-experiment-container {
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

.datacube-header {
  display: flex;
  flex: 1;
  margin: 0;
}

</style>
