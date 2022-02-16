<template>
  <div class="comp-analysis-experiment-container">
    <full-screen-modal-header
      icon="angle-left"
      :nav-back-label="navBackLabel"
      @close="onBack"
    >
      <div class="header-content">
        <button
          v-tooltip.top-center="selectLabel"
          :disabled="stepsBeforeCanConfirm.length > 0"
          type="button"
          class="btn btn-primary btn-call-for-action"
          @click="onSelection"
        >
          <i class="fa fa-fw fa-plus-circle" />
          {{selectLabel}}
        </button>
        <span v-if="stepsBeforeCanConfirm.length > 0">{{ stepsBeforeCanConfirm[0] }}</span>
      </div>
    </full-screen-modal-header>
    <main class="insight-capture">
      <datacube-card
        class="datacube-card"
        :initial-view-config="initialViewConfig"
        :metadata="metadata"
        :aggregation-options="aggregationOptionFiltered"
        :temporal-resolution-options="temporalResolutionOption"
        @update-model-parameter="onModelParamUpdated"
      >
        <template #datacube-model-header>
          <div class="datacube-header" v-if="metadata && mainModelOutput">
            <h5>
              <select name="outputs" id="outputs"
                v-if="outputs.length > 1"
                @change="onOutputSelectionChange($event)"
              >
                <option
                  v-for="(output, indx) in outputs"
                  :key="output.name"
                  :selected="indx === currentOutputIndex"
                >{{output.display_name !== '' ? output.display_name : output.name}}</option>
              </select>
              <span v-else>{{mainModelOutput.display_name !== '' ? mainModelOutput.display_name : mainModelOutput.name}}</span>
              <label style="margin-left: 1rem; font-weight: normal;">| {{metadata.name}}</label>
              <span v-if="metadata.status === DatacubeStatus.Deprecated" v-tooltip.top-center="'Show current version of datacube'" style="margin-left: 1rem" :style="{ backgroundColor: statusColor, cursor: 'pointer' }" @click="showCurrentDatacube">{{ statusLabel }} <i class="fa fa-search"></i></span>
            </h5>
          </div>
        </template>
        <template #datacube-description>
          <datacube-description
            :metadata="metadata"
          />
        </template>
      </datacube-card>
    </main>
  </div>
</template>

<script lang="ts">
import _ from 'lodash';
import { computed, defineComponent, Ref, ref, watch, watchEffect } from 'vue';
import { useStore } from 'vuex';
import router from '@/router';
import DatacubeCard from '@/components/data/datacube-card.vue';
import DatacubeDescription from '@/components/data/datacube-description.vue';
import FullScreenModalHeader from '@/components/widgets/full-screen-modal-header.vue';
import modelService from '@/services/model-service';
import useModelMetadata from '@/services/composables/useModelMetadata';
import useDatacubeVersioning from '@/services/composables/useDatacubeVersioning';
import { DatacubeFeature, Model, ModelParameter } from '@/types/Datacube';
import { ProjectType, DatacubeStatus, TemporalResolutionOption, TimeScale } from '@/types/Enums';
import { getOutputs, getSelectedOutput, getValidatedOutputs, STATUS } from '@/utils/datacube-util';
import filtersUtil from '@/utils/filters-util';

import { aggregationOptionFiltered, temporalResolutionOptionFiltered } from '@/utils/drilldown-util';
import { ViewState } from '@/types/Insight';


export default defineComponent({
  name: 'NodeCompExperiment',
  components: {
    DatacubeCard,
    DatacubeDescription,
    FullScreenModalHeader
  },
  setup() {
    const selectLabel = 'Quantify Node';
    const navBackLabel = 'Select A Different Datacube';
    const store = useStore();
    // NOTE: only one indicator id (model or indicator) will be provided as a selection from the data explorer
    const currentCAG = computed(() => store.getters['app/currentCAG']);
    const datacubeCurrentOutputsMap = computed(() => store.getters['app/datacubeCurrentOutputsMap']);
    const indicatorId = computed(() => store.getters['app/indicatorId']);
    const metadata = useModelMetadata(indicatorId);
    const nodeId = computed(() => store.getters['app/nodeId']);
    const project = computed(() => store.getters['app/project']);
    const dataState = computed(() => store.getters['insightPanel/dataState']);
    const viewState = computed(() => store.getters['insightPanel/viewState']);
    const initialViewConfig = ref<ViewState | null>(null);

    const mainModelOutput = ref<DatacubeFeature | undefined>(undefined);
    const modelComponents = ref(null) as Ref<any>;
    const outputs = ref([]) as Ref<DatacubeFeature[]>;
    const currentOutputIndex = computed(() => metadata.value?.id !== undefined &&
      datacubeCurrentOutputsMap.value[metadata.value?.id] !== undefined
      ? datacubeCurrentOutputsMap.value[metadata.value?.id]
      : 0
    );

    const temporalResolutionOption = computed(() => {
      if (modelComponents.value === null) {
        return temporalResolutionOptionFiltered;
      }
      if (modelComponents.value.parameter.time_scale === TimeScale.Years) {
        return Object.values(TemporalResolutionOption).filter(tro => TemporalResolutionOption.Year as string === tro);
      }
      return temporalResolutionOptionFiltered;
    });

    const selectedNode = computed(() => {
      if (nodeId.value === undefined || modelComponents.value === null) {
        return null;
      }
      return modelComponents.value.nodes.find((node: { id: any }) => node.id === nodeId.value);
    });

    const setDatacubeCurrentOutputsMap = (updatedMap: any) => store.dispatch('app/setDatacubeCurrentOutputsMap', updatedMap);

    watch(
      () => [
        metadata.value,
        selectedNode.value
      ],
      () => {
        if (metadata.value) {
          const existingViewState = selectedNode?.value?.parameter;
          if (existingViewState && !_.isEmpty(existingViewState)) {
            return;
          }
          if (!_.isEmpty(metadata.value.default_view)) {
            initialViewConfig.value = metadata.value.default_view;
          }
        }
      }
    );

    const stepsBeforeCanConfirm = computed(() => {
      const steps = [];
      if (metadata.value === null || dataState.value?.selectedScenarioIds === undefined) {
        steps.push('Loading...');
        return steps;
      }
      if (dataState.value?.selectedScenarioIds?.length < 1) {
        steps.push('Please select a scenario.');
      } else if (dataState.value?.selectedScenarioIds?.length > 1) {
        steps.push('Please select exactly one scenario.');
      }
      if (viewState.value?.breakdownOption !== null) {
        steps.push('Please set "split by" to "none".');
      }
      return steps;
    });

    const onBack = () => {
      if (window.history.length > 1) {
        window.history.go(-1);
      } else {
        const filters: any = filtersUtil.newFilters();
        filtersUtil.setClause(filters, STATUS, ['READY'], 'or', false);
        router.push({
          name: 'nodeDataExplorer',
          params: {
            currentCAG: currentCAG.value,
            nodeId: nodeId.value,
            project: project.value,
            projectType: ProjectType.Analysis
          },
          query: { filters }
        });
      }
    };

    const onOutputSelectionChange = (event: any) => {
      const selectedOutputIndex = event.target.selectedIndex;
      // update the store so that other components can sync
      const updatedCurrentOutputsMap = _.cloneDeep(datacubeCurrentOutputsMap.value);
      updatedCurrentOutputsMap[metadata?.value?.id ?? ''] = selectedOutputIndex;
      setDatacubeCurrentOutputsMap(updatedCurrentOutputsMap);
    };


    const onSelection = async () => {
      if (metadata === null) {
        console.error('Confirm should not be clickable until metadata is loaded.');
        return;
      }
      const visibleTimeseriesData = dataState.value.visibleTimeseriesData;
      if (visibleTimeseriesData.length !== 1) {
        console.error('There should be exactly one timeseries visible.', visibleTimeseriesData);
        return;
      }
      const timeseries = visibleTimeseriesData[0].points;
      let country = '';
      let admin1 = '';
      let admin2 = '';
      let admin3 = '';

      if (dataState.value.selectedRegionIds.length > 0) {
        const regionList = dataState.value.selectedRegionIds[0].split('__');
        if (regionList.length > 0) {
          if (regionList[0]) country = regionList[0];
          if (regionList[1]) admin1 = regionList[1];
          if (regionList[2]) admin2 = regionList[2];
          if (regionList[3]) admin3 = regionList[3];
        }
      }

      const nodeParameters = {
        id: selectedNode?.value?.id,
        concept: selectedNode?.value?.concept,
        label: selectedNode?.value?.label,
        model_id: selectedNode?.value?.model_id,
        parameter: {
          id: metadata?.value?.id,
          data_id: metadata?.value?.data_id,
          name: metadata?.value?.name,
          unit: mainModelOutput?.value?.unit,
          country,
          admin1,
          admin2,
          admin3,
          period: 12,
          timeseries,
          original_timeseries: _.cloneDeep(timeseries),
          // Filled in by server
          max: null,
          min: null
        },
        components: selectedNode?.value?.components
      };

      Object.keys(viewState.value).forEach((key: string) => {
        (nodeParameters.parameter as any)[key] = viewState.value[key];
      });
      await modelService.updateNodeParameter(selectedNode.value.model_id, nodeParameters);

      router.push({
        name: 'nodeDrilldown',
        params: {
          currentCAG: currentCAG.value,
          nodeId: nodeId.value,
          project: project.value,
          projectType: ProjectType.Analysis
        }
      });
    };

    watchEffect(() => {
      if (metadata.value && currentOutputIndex.value >= 0) {
        outputs.value = getOutputs(metadata.value);
        mainModelOutput.value = getSelectedOutput(metadata.value, currentOutputIndex.value);
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

    const onModelParamUpdated = (updatedModelParam: ModelParameter) => {
      if (metadata.value !== null) {
        const updatedParamIndex = (metadata.value as Model).parameters.findIndex(p => p.name === updatedModelParam.name);
        (metadata.value as Model).parameters[updatedParamIndex] = updatedModelParam;
        refreshMetadata();
      }
    };

    const { statusColor, statusLabel } = useDatacubeVersioning(metadata);

    return {
      aggregationOptionFiltered,
      currentCAG,
      currentOutputIndex,
      DatacubeStatus,
      indicatorId,
      initialViewConfig,
      mainModelOutput,
      metadata,
      modelComponents,
      navBackLabel,
      nodeId,
      onBack,
      onOutputSelectionChange,
      onSelection,
      outputs,
      project,
      selectedNode,
      selectLabel,
      statusColor,
      statusLabel,
      stepsBeforeCanConfirm,
      onModelParamUpdated,
      temporalResolutionOption
    };
  },
  mounted() {
    // Load the CAG so we can find relevant components
    modelService.getComponents(this.currentCAG).then(_modelComponents => {
      this.modelComponents = _modelComponents;
    });
  },
  methods: {
    showCurrentDatacube() { // direct user to update the deprecated datacube to the current version
      const currentCAG = this.currentCAG ?? '';
      const nodeId = this.nodeId ?? '';
      const project = this.project ?? '';
      const metadataNewId = this.metadata?.new_version_data_id ?? '';
      const filters: any = filtersUtil.newFilters();
      filtersUtil.setClause(filters, 'dataId', [metadataNewId], 'or', false);
      filtersUtil.setClause(filters, STATUS, ['READY'], 'or', false);
      this.$router.push({
        name: 'nodeDataExplorer',
        params: {
          currentCAG: currentCAG,
          nodeId: nodeId,
          project: project,
          projectType: ProjectType.Analysis
        },
        query: { filters }
      });
    }
  }
});
</script>

<style lang="scss" scoped>
@import '~styles/variables';
.comp-analysis-experiment-container {
  height: 100vh;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.header-content > *:not(:first-child) {
  margin-left: 5px;
}

main {
  flex: 1;
  display: flex;
  min-height: 0;
}

.datacube-card {
  min-width: 0;
  flex: 1;
  margin: 10px;
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
}

.dropdown-config:not(:first-child) {
  margin-left: 5px;
}
</style>
