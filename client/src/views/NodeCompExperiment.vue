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
          @click="checkSelection"
        >
          <i class="fa fa-fw fa-plus-circle" />
          {{selectLabel}}
        </button>
        <span v-if="stepsBeforeCanConfirm.length > 0">{{ stepsBeforeCanConfirm[0] }}</span>
      </div>
    </full-screen-modal-header>
    <main class="insight-capture">
      <modal class="timeseries-selection-modal" v-if="isTimeseriesSelectionModalOpen">
        <template #header>
          <h3>Please select one timeseires data</h3>
        </template>
        <template #body>
          <div v-for="(d, index) in dataState.visibleTimeseriesData" :key="index">
            <div class="select-row">
              <i
                class="fa fa-lg fa-fw"
                :class="{ 'fa-circle': selectedTimeseriesIndex === index, 'fa-circle-o': selectedTimeseriesIndex !== index }"
                @click="selectedTimeseriesIndex = index"
              />
              <span :style="{ color: d.color }"><b>{{d.name}}</b></span>
              <sparkline :data="[{ series: d.points.map(p => p.value), name: d.name, color: d.color }]" :size="[350, 20]" />
            </div>
          </div>

        </template>
        <template #footer>
          <ul class="unstyled-list">
            <button
              type="button"
              class="btn first-button"
              @click.stop="closeTimeseriesSelectionModal">
                Cancel
            </button>
            <button
              type="button"
              class="btn btn-primary btn-call-for-action"
              @click.stop="onSelection">
                Select
            </button>
          </ul>
        </template>
      </modal>
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
import Modal from '@/components/modals/modal.vue';
import Sparkline from '@/components/widgets/charts/sparkline.vue';
import DatacubeCard from '@/components/data/datacube-card.vue';
import DatacubeDescription from '@/components/data/datacube-description.vue';
import FullScreenModalHeader from '@/components/widgets/full-screen-modal-header.vue';
import modelService from '@/services/model-service';
import useModelMetadata from '@/services/composables/useModelMetadata';
import useDatacubeVersioning from '@/services/composables/useDatacubeVersioning';
import { DatacubeFeature, Model, ModelParameter } from '@/types/Datacube';
import { ProjectType, DatacubeStatus, TemporalResolutionOption, TimeScale, TemporalAggregationLevel, SPLIT_BY_VARIABLE } from '@/types/Enums';
import { getOutputs, getSelectedOutput, getValidatedOutputs, STATUS } from '@/utils/datacube-util';
import filtersUtil from '@/utils/filters-util';

import { aggregationOptionFiltered, temporalResolutionOptionFiltered } from '@/utils/drilldown-util';
import { ViewState } from '@/types/Insight';
import { getDatacubeKeyFromAnalysis } from '@/utils/analysis-util';
import { useRoute } from 'vue-router';


export default defineComponent({
  name: 'NodeCompExperiment',
  components: {
    Modal,
    DatacubeCard,
    DatacubeDescription,
    FullScreenModalHeader,
    Sparkline
  },
  setup() {
    const selectLabel = 'Quantify Node';
    const navBackLabel = 'Select A Different Datacube';
    const store = useStore();
    const route = useRoute();
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

    const isTimeseriesSelectionModalOpen = ref(false);
    const selectedTimeseriesIndex = ref(0);
    const mainModelOutput = ref<DatacubeFeature | undefined>(undefined);
    const modelComponents = ref(null) as Ref<any>;
    const outputs = ref([]) as Ref<DatacubeFeature[]>;
    const currentOutputIndex = ref(0);
    watch(
      () => [
        metadata.value,
        datacubeCurrentOutputsMap.value
      ],
      () => {
        const datacubeKey = getDatacubeKeyFromAnalysis(metadata.value, store, route);
        currentOutputIndex.value = datacubeCurrentOutputsMap.value[datacubeKey] ? datacubeCurrentOutputsMap.value[datacubeKey] : 0;
      }
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
      if (viewState.value?.breakdownOption === TemporalAggregationLevel.Year) {
        steps.push('"Split by year" is not supported.');
      } else if (viewState.value?.breakdownOption === SPLIT_BY_VARIABLE) {
        steps.push('"Split by variable" is not supported.');
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

    const closeTimeseriesSelectionModal = () => {
      selectedTimeseriesIndex.value = 0;
      isTimeseriesSelectionModalOpen.value = false;
    };

    const checkSelection = async () => {
      if (dataState.value.visibleTimeseriesData.length > 1) {
        isTimeseriesSelectionModalOpen.value = true;
      } else {
        await onSelection();
      }
    };

    const onSelection = async () => {
      if (metadata === null) {
        console.error('Confirm should not be clickable until metadata is loaded.');
        return;
      }
      const visibleTimeseriesData = dataState.value.visibleTimeseriesData;
      if (visibleTimeseriesData.length < 1) {
        console.error('There should be at least one timeseries visible.', visibleTimeseriesData);
        return;
      }
      const selectedIndex = visibleTimeseriesData.length > 1
        ? selectedTimeseriesIndex.value
        : 0;
      const timeseries = visibleTimeseriesData[selectedIndex].points;
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

      const nodeParameter = {
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
          temporalResolution: null,
          timeseries,
          original_timeseries: _.cloneDeep(timeseries),
          // Filled in by server
          max: null,
          min: null
        },
        components: selectedNode?.value?.components
      };

      Object.keys(viewState.value).forEach((key: string) => {
        (nodeParameter.parameter as any)[key] = viewState.value[key];
      });

      if (nodeParameter.parameter.temporalResolution === 'month') {
        nodeParameter.parameter.period = 12;
      } else {
        nodeParameter.parameter.period = 1;
      }

      await modelService.updateNodeParameter(selectedNode.value.model_id, nodeParameter);

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
      if (metadata.value) {
        outputs.value = getOutputs(metadata.value);
        mainModelOutput.value = getSelectedOutput(metadata.value, currentOutputIndex.value);

        let initialOutputIndex = 0;
        const datacubeKey = getDatacubeKeyFromAnalysis(metadata.value, store, route);
        const currentOutputEntry = datacubeCurrentOutputsMap.value[datacubeKey];
        if (currentOutputEntry !== undefined && currentOutputEntry >= 0) {
          // we have a store entry for the selected output of the current model
          initialOutputIndex = currentOutputEntry;
        } else {
          initialOutputIndex = metadata.value.validatedOutputs?.findIndex(o => o.name === metadata.value?.default_feature) ?? 0;

          // update the store
          const defaultOutputMap = _.cloneDeep(datacubeCurrentOutputsMap.value);
          defaultOutputMap[datacubeKey] = initialOutputIndex;
          setDatacubeCurrentOutputsMap(defaultOutputMap);
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
      checkSelection,
      currentCAG,
      currentOutputIndex,
      closeTimeseriesSelectionModal,
      dataState,
      DatacubeStatus,
      indicatorId,
      initialViewConfig,
      isTimeseriesSelectionModalOpen,
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
      selectedTimeseriesIndex,
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

.timeseries-selection-modal .select-row {
  display: flex;
  align-items: center;
  i {
    cursor: pointer;
  }
  span {
    padding: 5px;
    flex-grow: 1;
    max-width: 94px;
  }
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
