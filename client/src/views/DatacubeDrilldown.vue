<template>
  <div class="comp-analysis-experiment-container">
    <main class="main">
      <analytical-questions-and-insights-panel />
      <div class="main insight-capture">
        <datacube-card
          class="datacube-card"
          :initial-data-config="initialDataConfig"
          :metadata="metadata"
          :initial-view-config="initialViewConfig ?? undefined"
          :aggregation-options="aggregationOptionFiltered"
          :temporal-resolution-options="temporalResolutionOptionFiltered"
          @update-model-parameter="onModelParamUpdated"
        >
          <template #datacube-model-header>
            <h5 v-if="metadata && mainModelOutput" class="datacube-header">
              <select
                name="outputs"
                id="outputs"
                v-if="outputs.length > 1"
                :disabled="canChangeOutputVariable === false"
                @change="onOutputSelectionChange($event)"
              >
                <option
                  v-for="(output, indx) in outputs"
                  :key="output.name"
                  :selected="indx === currentOutputIndex"
                >
                  {{ output.display_name !== '' ? output.display_name : output.name }}
                </option>
              </select>
              <span v-else>{{
                mainModelOutput.display_name !== ''
                  ? mainModelOutput.display_name
                  : mainModelOutput.name
              }}</span>
              <span
                v-if="isIndicator(metadata)"
                v-tooltip.top-center="'Explore related indicators'"
                class="datacube-name indicator"
                @click="onClickDatacubeName"
                >{{ metadata.name }} <i class="fa fa-search"></i
              ></span>
              <span v-else class="datacube-name">{{ metadata.name }} </span>
              <span
                v-if="metadata.status === DatacubeStatus.Deprecated"
                v-tooltip.top-center="'Show current version of datacube'"
                style="margin-left: 1rem"
                :style="{ backgroundColor: statusColor, cursor: 'pointer' }"
                @click="showCurrentDatacube"
                >{{ statusLabel }} <i class="fa fa-search"></i
              ></span>
            </h5>
          </template>

          <template #datacube-model-header-collapse>
            <button v-tooltip="'Collapse datacube'" class="btn" @click="onClose">
              <i class="fa fa-fw fa-compress" />
            </button>
          </template>

          <template #datacube-description>
            <datacube-description :metadata="metadata" />
          </template>
        </datacube-card>
      </div>
    </main>
  </div>
</template>

<script lang="ts">
import _ from 'lodash';
import { computed, defineComponent, Ref, ref, watch, watchEffect } from 'vue';
import { useRoute } from 'vue-router';
import { mapActions, useStore } from 'vuex';
import router from '@/router';
import AnalyticalQuestionsAndInsightsPanel from '@/components/analytical-questions/analytical-questions-and-insights-panel.vue';
import DatacubeCard from '@/components/data/datacube-card.vue';
import DatacubeDescription from '@/components/data/datacube-description.vue';

import { getAnalysis } from '@/services/analysis-service-new';
import useModelMetadata from '@/composables/useModelMetadata';

import { DatacubeFeature, Model, ModelParameter } from '@/types/Datacube';
import { DatacubeStatus, ProjectType, SPLIT_BY_VARIABLE } from '@/types/Enums';
import { DataSpaceDataState, DataState, ViewState } from '@/types/Insight';

import {
  DATASET_NAME,
  isIndicator,
  getValidatedOutputs,
  getOutputs,
  getSelectedOutput,
} from '@/utils/datacube-util';
import {
  aggregationOptionFiltered,
  temporalResolutionOptionFiltered,
} from '@/utils/drilldown-util';
import filtersUtil from '@/utils/filters-util';
import useDatacubeVersioning from '@/composables/useDatacubeVersioning';
import { updateDatacubesOutputsMap } from '@/utils/analysis-util';
import useActiveDatacubeFeature from '@/composables/useActiveDatacubeFeature';
import { isDataSpaceDataState } from '@/utils/insight-util';
import { useDataAnalysis } from '@/composables/useDataAnalysis';

export default defineComponent({
  name: 'DatacubeDrilldown',
  components: {
    DatacubeCard,
    DatacubeDescription,
    AnalyticalQuestionsAndInsightsPanel,
  },
  setup() {
    const route = useRoute();
    const store = useStore();

    const projectType = computed(() => store.getters['app/projectType']);
    const datacubeCurrentOutputsMap = computed(
      () => store.getters['app/datacubeCurrentOutputsMap']
    );
    const analysisId = computed(() => route.params.analysisId as string);
    const datacubeId = route.query.datacube_id as any;
    const datacubeItemId = route.query.item_id as any;
    const selectedModelId = ref(datacubeId);
    const dataState = computed<DataState | null>(() => store.getters['insightPanel/dataState']);
    const viewState = computed(() => store.getters['insightPanel/viewState']);

    const { analysisItems, setAnalysisItemViewConfig, setAnalysisItemDataState } =
      useDataAnalysis(analysisId);

    const initialViewConfig = ref<ViewState | null>(null);
    const initialDataConfig = ref<DataSpaceDataState | null>(null);
    watch([analysisItems], () => {
      if (initialViewConfig.value || initialDataConfig.value) {
        return;
      }
      let item = analysisItems.value.find((item) => item.itemId === datacubeItemId);
      if (!item) {
        item = analysisItems.value.find((item) => item.id === selectedModelId.value);
      }
      if (item) {
        initialViewConfig.value = item.viewConfig;
        initialDataConfig.value = item.dataConfig;
      }
    });

    watch(
      () => [viewState.value, dataState.value],
      () => {
        setAnalysisItemViewConfig(datacubeItemId, viewState.value);
        // Note: this is where datacubes get their initial data state. When
        //  they are added from the data explorer, they have a view state but
        //  no data state. The datacube-card on this page calls
        //  initDataStateFromRefs and then sets that new data state object in
        //  the insightPanelStore. This component watches that value
        //  (dataState.value), sees that it's not null, and then calls
        //  setAnalysisItemDataState().
        // This could be simplified if the initial data state was created when
        //  adding a new datacube to the analysis, and it was no longer
        //  optional.
        if (dataState.value !== null && isDataSpaceDataState(dataState.value)) {
          setAnalysisItemDataState(datacubeItemId, dataState.value);
        }
      }
    );

    const metadata = useModelMetadata(selectedModelId);
    const project = computed(() => store.getters['app/project']);
    const mainModelOutput = ref<DatacubeFeature | undefined>(undefined);

    const outputs = ref([]) as Ref<DatacubeFeature[]>;
    const { currentOutputIndex } = useActiveDatacubeFeature(metadata, ref(datacubeItemId));

    const hideInsightPanel = () => store.dispatch('insightPanel/hideInsightPanel');

    // apply initial view config for this datacube
    if (initialViewConfig.value) {
      if (initialViewConfig.value.selectedOutputIndex !== undefined) {
        updateDatacubesOutputsMap(
          datacubeItemId,
          store,
          route,
          initialViewConfig.value.selectedOutputIndex
        );
      }
    }

    watch(
      () => [initialViewConfig.value, metadata.value],
      () => {
        if (
          metadata.value &&
          _.isEmpty(initialViewConfig.value) &&
          !_.isEmpty(metadata.value.default_view)
        ) {
          setAnalysisItemViewConfig(datacubeItemId, metadata.value.default_view);
        }
      }
    );

    watchEffect(() => {
      if (metadata.value) {
        store.dispatch('insightPanel/setContextId', [metadata.value.id]);

        outputs.value = getOutputs(metadata.value);
        const datacubeKey = datacubeItemId ?? metadata.value.id;

        let initialOutputIndex = 0;
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
          updateDatacubesOutputsMap(datacubeItemId, store, route, initialOutputIndex);
        }
        mainModelOutput.value = getSelectedOutput(metadata.value, initialOutputIndex);
      }
    });

    const onClose = async () => {
      router.push({
        name: 'dataComparative',
        params: {
          analysisId: analysisId.value,
          project: project.value,
          projectType: ProjectType.Analysis,
        },
      });
    };

    const onOutputSelectionChange = (event: any) => {
      const selectedOutputIndex = event.target.selectedIndex;
      // update the store so that other components can sync
      updateDatacubesOutputsMap(datacubeItemId, store, route, selectedOutputIndex);
    };

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
        const updatedParamIndex = (metadata.value as Model).parameters.findIndex(
          (p) => p.name === updatedModelParam.name
        );
        (metadata.value as Model).parameters[updatedParamIndex] = updatedModelParam;
        refreshMetadata();
      }
    };

    const { statusColor, statusLabel } = useDatacubeVersioning(metadata);

    const canChangeOutputVariable = computed(() => {
      if (viewState.value && viewState.value.breakdownOption === SPLIT_BY_VARIABLE) {
        return false;
      }
      return true;
    });

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
      onModelParamUpdated,
      DatacubeStatus,
      statusColor,
      statusLabel,
      canChangeOutputVariable,
    };
  },
  data: () => ({
    // TODO: add Typescript type to replace `any`
    analysis: undefined as any | undefined,
    ProjectType,
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
      setAnalysisName: 'app/setAnalysisName',
    }),
    onClickDatacubeName() {
      const analysisId = this.analysisId ?? '';
      const metadataName = this.metadata?.name ?? '';
      const filters: any = filtersUtil.newFilters();
      filtersUtil.setClause(filters, DATASET_NAME, [metadataName], 'or', false);
      this.$router.push({ name: 'dataExplorer', query: { analysisId, filters } });
    },
    showCurrentDatacube() {
      // direct user to update the deprecated datacube to the current version
      const analysisId = this.analysisId ?? '';
      const metadataNewId = this.metadata?.new_version_data_id ?? '';
      const filters: any = filtersUtil.newFilters();
      filtersUtil.setClause(filters, 'dataId', [metadataNewId], 'or', false);
      this.$router.push({ name: 'dataExplorer', query: { analysisId, filters } });
    },
  },
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
</style>
