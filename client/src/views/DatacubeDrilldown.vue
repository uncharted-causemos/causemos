<template>
  <div class="comp-analysis-experiment-container">
    <main class="main">
      <analytical-questions-and-insights-panel />
      <div class="main insight-capture">
        <datacube-card
          class="datacube-card"
          :initial-data-config="initialDataConfig"
          :metadata="metadata"
          :initial-view-config="initialViewConfig"
          :aggregation-options="aggregationOptionFiltered"
          :temporal-resolution-options="temporalResolutionOptionFiltered"
          @update-model-parameter="onModelParamUpdated"
        >
          <template #datacube-model-header>
            <h5
              v-if="metadata && mainModelOutput"
              class="datacube-header"
            >
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
              <span v-if="isIndicator(metadata)" v-tooltip.top-center="'Explore related indicators'" class="datacube-name indicator" @click="onClickDatacubeName">{{metadata.name}} <i class="fa fa-search"></i></span>
              <span v-else class="datacube-name">{{metadata.name}} </span>
            </h5>
          </template>

          <template #datacube-model-header-collapse>
            <button
              v-tooltip="'Collapse datacube'"
              class="btn btn-default"
              @click="onClose"
            >
              <i class="fa fa-fw fa-compress" />
            </button>
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
import { computed, defineComponent, Ref, ref, watchEffect } from 'vue';
import { useRoute } from 'vue-router';
import { mapActions, useStore } from 'vuex';
import router from '@/router';
import AnalyticalQuestionsAndInsightsPanel from '@/components/analytical-questions/analytical-questions-and-insights-panel.vue';
import DatacubeCard from '@/components/data/datacube-card.vue';
import DatacubeDescription from '@/components/data/datacube-description.vue';

import { getAnalysis } from '@/services/analysis-service';
import useModelMetadata from '@/services/composables/useModelMetadata';

import { AnalysisItem } from '@/types/Analysis';
import { DatacubeFeature, Model, ModelParameter } from '@/types/Datacube';
import { ProjectType } from '@/types/Enums';
import { DataState, ViewState } from '@/types/Insight';

import { DATASET_NAME, isIndicator, getValidatedOutputs } from '@/utils/datacube-util';
import { aggregationOptionFiltered, temporalResolutionOptionFiltered } from '@/utils/drilldown-util';
import filtersUtil from '@/utils/filters-util';

export default defineComponent({
  name: 'DatacubeDrilldown',
  components: {
    DatacubeCard,
    DatacubeDescription,
    AnalyticalQuestionsAndInsightsPanel
  },
  setup() {
    const route = useRoute();
    const store = useStore();

    const datacubeCurrentOutputsMap = computed(() => store.getters['app/datacubeCurrentOutputsMap']);
    const analysisId = computed(() => store.getters['dataAnalysis/analysisId']);
    const analysisItems = computed(() => store.getters['dataAnalysis/analysisItems']);
    const datacubeId = route.query.datacube_id as any;
    const selectedModelId = ref(datacubeId);
    const datacubeAnalysisItem = analysisItems.value.find((item: any) => item.id === selectedModelId.value);
    const initialViewConfig = ref<ViewState | null>(null);
    const initialDataConfig = ref<DataState | null>(null);
    if (datacubeAnalysisItem) {
      initialViewConfig.value = datacubeAnalysisItem.viewConfig;
      initialDataConfig.value = datacubeAnalysisItem.dataConfig;
    }
    const metadata = useModelMetadata(selectedModelId);
    const project = computed(() => store.getters['app/project']);
    const projectType = computed(() => store.getters['app/projectType']);
    const dataState = computed(() => store.getters['insightPanel/dataState']);
    const viewState = computed(() => store.getters['insightPanel/viewState']);
    const mainModelOutput = ref<DatacubeFeature | undefined>(undefined);

    const outputs = ref([]) as Ref<DatacubeFeature[]>;
    const currentOutputIndex = computed((): number => metadata.value?.id !== undefined ? datacubeCurrentOutputsMap.value[metadata.value?.id] : 0);

    const setDatacubeCurrentOutputsMap = (updatedMap: any) => store.dispatch('app/setDatacubeCurrentOutputsMap', updatedMap);
    const hideInsightPanel = () => store.dispatch('insightPanel/hideInsightPanel');

    // apply initial view config for this datacube
    if (initialViewConfig.value !== null) {
      if (initialViewConfig.value.selectedOutputIndex !== undefined) {
        const defaultOutputMap = _.cloneDeep(datacubeCurrentOutputsMap.value);
        defaultOutputMap[datacubeId] = initialViewConfig.value.selectedOutputIndex;
        setDatacubeCurrentOutputsMap(defaultOutputMap);
      }
    }

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

    const onClose = async () => {
      router.push({
        name: 'dataComparative',
        params: {
          analysisId: analysisId.value,
          project: project.value,
          projectType: ProjectType.Analysis
        }
      });
    };

    const onOutputSelectionChange = (event: any) => {
      const selectedOutputIndex = event.target.selectedIndex;
      // update the store so that other components can sync
      const updatedCurrentOutputsMap = _.cloneDeep(datacubeCurrentOutputsMap.value);
      updatedCurrentOutputsMap[metadata?.value?.id ?? ''] = selectedOutputIndex;
      setDatacubeCurrentOutputsMap(updatedCurrentOutputsMap);
    };

    watchEffect(() => {
      const updatedAnalysisItems = _.cloneDeep(analysisItems.value);
      const currentAnalysisItem: AnalysisItem = updatedAnalysisItems.find((item: AnalysisItem) => item.id === datacubeId);
      if (currentAnalysisItem.viewConfig === undefined) {
        currentAnalysisItem.viewConfig = {} as ViewState;
      }

      if (currentAnalysisItem.dataConfig === undefined) {
        currentAnalysisItem.dataConfig = {} as DataState;
      }

      currentAnalysisItem.viewConfig = viewState.value;
      currentAnalysisItem.dataConfig = dataState.value;
      store.dispatch('dataAnalysis/updateAnalysisItems', { currentAnalysisId: analysisId.value, analysisItems: updatedAnalysisItems });
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

    return {
      aggregationOptionFiltered,
      analysisId,
      currentOutputIndex,
      hideInsightPanel,
      initialDataConfig,
      initialViewConfig,
      isIndicator,
      mainModelOutput,
      metadata,
      onClose,
      onOutputSelectionChange,
      outputs,
      projectType,
      selectedModelId,
      temporalResolutionOptionFiltered,
      onModelParamUpdated
    };
  },
  data: () => ({
    // TODO: add Typescript type to replace `any`
    analysis: undefined as (any | undefined),
    ProjectType
  }),
  async mounted() {
    // ensure the insight explorer panel is closed in case the user has
    //  previously opened it and clicked the browser back button
    this.hideInsightPanel();

    if (this.projectType === ProjectType.Analysis) {
      // If the analyst navigates directly to this page from another analysis,
      //  the previous analysis's name will still be loaded. We clear it here
      //  to prevent the previous name from showing while the getAnalysis
      //  request is in flight.
      this.setAnalysisName('');
      this.analysis = await getAnalysis(this.analysisId);
      this.setAnalysisName(this.analysis?.title ?? '');
    }
  },
  methods: {
    ...mapActions({
      setAnalysisName: 'app/setAnalysisName'
    }),
    onClickDatacubeName() {
      const analysisId = this.analysisId ?? '';
      const metadataName = this.metadata?.name ?? '';
      const filters: any = filtersUtil.newFilters();
      filtersUtil.setClause(filters, DATASET_NAME, [metadataName], 'or', false);
      this.$router.push({ name: 'dataExplorer', query: { analysisId, filters } });
    }
  }
});
</script>

<style lang="scss" scoped>
@import '~styles/variables';
.comp-analysis-experiment-container {
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
  margin: 10px;
  margin-left: 0;
}

.datacube-name {
  font-weight: normal;
  color: $label-color;
  margin-left: 10px;
}
.datacube-name.indicator {
  cursor: pointer;
  &:hover {
    filter: brightness(60%);
  }
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
  margin: 0;
}

.dropdown-config:not(:first-child) {
  margin-left: 5px;
}
</style>
