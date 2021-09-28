<template>
  <div class="comp-analysis-experiment-container">
    <main class="main">
      <analytical-questions-and-insights-panel />
      <div class="main insight-capture">
        <!-- TODO: whether a card is actually expanded or not will
        be dynamic later -->
        <datacube-card
          :class="{ 'datacube-expanded': true }"
          :initial-data-config="initialDataConfig"
          :initial-view-config="initialViewConfig"
          :selected-model-id="selectedModelId"
          :selected-temporal-resolution="selectedTemporalResolution"
          :selected-temporal-aggregation="selectedTemporalAggregation"
        >
          <template #datacube-model-header>
            <h5
              v-if="metadata && mainModelOutput && isExpanded"
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
              <span class="datacube-name">{{metadata.name}}</span>
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

          <template #temporal-aggregation-config>
            <dropdown-button
              class="dropdown-config tour-temporal-agg-dropdown-config"
              :class="{ 'attribute-invalid': selectedTemporalAggregation === '' }"
              :inner-button-label="'Temporal Aggregation'"
              :items="aggregationOptionFiltered"
              :selected-item="selectedTemporalAggregation"
              @item-selected="setTemporalAggregationSelection"
            />
          </template>

          <template #temporal-resolution-config>
            <dropdown-button
              class="dropdown-config"
              :class="{ 'attribute-invalid': selectedTemporalResolution === '' }"
              :inner-button-label="'Temporal Resolution'"
              :items="temporalResolutionOptionFiltered"
              :selected-item="selectedTemporalResolution"
              @item-selected="setTemporalResolutionSelection"
            />
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
import { useStore } from 'vuex';
import router from '@/router';
import AnalyticalQuestionsAndInsightsPanel from '@/components/analytical-questions/analytical-questions-and-insights-panel.vue';
import DatacubeCard from '@/components/data/datacube-card.vue';
import DatacubeDescription from '@/components/data/datacube-description.vue';
import DropdownButton from '@/components/dropdown-button.vue';

import { getAnalysis } from '@/services/analysis-service';
import useModelMetadata from '@/services/composables/useModelMetadata';

import { AnalysisItem } from '@/types/Analysis';
import { DatacubeFeature } from '@/types/Datacube';
import { AggregationOption, TemporalResolutionOption, ProjectType } from '@/types/Enums';
import { DataState, ViewState } from '@/types/Insight';

import { aggregationOptionFiltered, temporalResolutionOptionFiltered } from '@/utils/drilldown-util';

export default defineComponent({
  name: 'DatacubeDrilldown',
  components: {
    DatacubeCard,
    DatacubeDescription,
    DropdownButton,
    AnalyticalQuestionsAndInsightsPanel
  },
  setup() {
    const isExpanded = true;
    const route = useRoute();
    const store = useStore();
    const datacubeCurrentOutputsMap = computed(() => store.getters['app/datacubeCurrentOutputsMap']);
    const analysisId = computed(() => store.getters['dataAnalysis/analysisId']);
    const analysisItems = computed(() => store.getters['dataAnalysis/analysisItems']);
    const datacubeId = route.query.datacube_id as any;
    const initialViewConfig = analysisId.value[0].viewConfig;
    const initialDataConfig = analysisId.value[0].dataConfig;
    const selectedModelId = ref(datacubeId);
    const metadata = useModelMetadata(selectedModelId);
    const project = computed(() => store.getters['app/project']);
    const projectType = computed(() => store.getters['app/projectType']);
    const dataState = computed(() => store.getters['insightPanel/dataState']);
    const viewState = computed(() => store.getters['insightPanel/viewState']);
    const mainModelOutput = ref<DatacubeFeature | undefined>(undefined);

    const outputs = ref([]) as Ref<DatacubeFeature[]>;
    // NOTE: only one datacube id (model or indicator) will be provided as the analysis-item at 0-index
    const selectedTemporalResolution = ref<TemporalResolutionOption>(TemporalResolutionOption.Month);
    const selectedTemporalAggregation = ref<AggregationOption>(AggregationOption.Mean);

    const currentOutputIndex = computed((): number => metadata.value?.id !== undefined ? datacubeCurrentOutputsMap.value[metadata.value?.id] : 0);

    const setDatacubeCurrentOutputsMap = (updatedMap: any) => store.dispatch('app/setDatacubeCurrentOutputsMap', updatedMap);
    const hideInsightPanel = () => store.dispatch('insightPanel/hideInsightPanel');

    // apply initial view config for this datacube
    if (initialViewConfig && !_.isEmpty(initialViewConfig)) {
      if (initialViewConfig.temporalResolution !== undefined) {
        selectedTemporalResolution.value = initialViewConfig.temporalResolution as TemporalResolutionOption;
      }
      if (initialViewConfig.temporalAggregation !== undefined) {
        selectedTemporalAggregation.value = initialViewConfig.temporalAggregation as AggregationOption;
      }
      if (initialViewConfig.selectedOutputIndex !== undefined) {
        const defaultOutputMap = _.cloneDeep(datacubeCurrentOutputsMap.value);
        defaultOutputMap[datacubeId] = initialViewConfig.selectedOutputIndex;
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

    const setTemporalResolutionSelection = (temporalRes: TemporalResolutionOption) => {
      selectedTemporalResolution.value = temporalRes;
    };

    const setTemporalAggregationSelection = (temporalAgg: AggregationOption) => {
      selectedTemporalAggregation.value = temporalAgg;
    };

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

      currentAnalysisItem.viewConfig = viewState;
      currentAnalysisItem.dataConfig = dataState;
      store.dispatch('dataAnalysis/updateAnalysisItems', { currentAnalysisId: analysisId.value, analysisItems: updatedAnalysisItems });
    });

    return {
      aggregationOptionFiltered,
      analysisId,
      currentOutputIndex,
      hideInsightPanel,
      initialDataConfig,
      initialViewConfig,
      isExpanded,
      mainModelOutput,
      metadata,
      onClose,
      onOutputSelectionChange,
      outputs,
      projectType,
      selectedModelId,
      selectedTemporalAggregation,
      selectedTemporalResolution,
      setTemporalAggregationSelection,
      setTemporalResolutionSelection,
      temporalResolutionOptionFiltered
    };
  },
  data: () => ({
    analysis: undefined,
    ProjectType
  }),
  async mounted() {
    // ensure the insight explorer panel is closed in case the user has
    //  previously opened it and clicked the browser back button
    this.hideInsightPanel();

    if (this.projectType === ProjectType.Analysis) {
      this.analysis = await getAnalysis(this.analysisId);
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

.datacube-expanded {
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
