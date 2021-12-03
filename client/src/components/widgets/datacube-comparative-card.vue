<template>
  <div class="datacube-card-container">
    <header class="datacube-header" >
      <h5
        v-if="metadata && mainModelOutput"
        class="datacube-title-area"
        @click="openDrilldown"
      >
        <span>{{mainModelOutput.display_name !== '' ? mainModelOutput.display_name : mainModelOutput.name}} - {{ selectedRegionIdsDisplay }}</span>
        <span class="datacube-name">{{metadata.name}}</span>
        <span v-if="metadata.status === DatacubeStatus.Deprecated" style="margin-left: 1rem" :style="{ backgroundColor: statusColor }">{{ statusLabel }}</span>
        <i class="fa fa-fw fa-expand drilldown-btn" />
      </h5>

      <options-button :dropdown-below="true">
        <template #content>
          <div
            class="dropdown-option"
            @click="clickRemove"
          >
            Remove
          </div>
        </template>
      </options-button>
    </header>
    <main>
      <timeseries-chart
        v-if="timeseriesData.length > 0 && timeseriesData[0].points.length > 0"
        class="timeseries-chart"
        :timeseries-data="visibleTimeseriesData"
        :selected-temporal-resolution="selectedTemporalResolution"
        :selected-timestamp="selectedTimestamp"
        :selected-timestamp-range="selectedTimestampRange"
        :breakdown-option="breakdownOption"
      />
      <div class="datacube-map-placeholder">
        <!-- placeholder for mini map -->
        <strong>Country</strong>
        <div v-if="metadata" class="country-list">
          <div
            v-for="country in metadata.geography.country"
            :key="country">
              {{country}}
          </div>
        </div>
      </div>
    </main>
    <div>
      <div class="col-md-9">Aggregated by: {{ selectedSpatialAggregation }} </div>
    </div>
  </div>
</template>

<script lang="ts">
import useModelMetadata from '@/services/composables/useModelMetadata';
import useTimeseriesData from '@/services/composables/useTimeseriesData';
import { AnalysisItem } from '@/types/Analysis';
import { DatacubeFeature } from '@/types/Datacube';
import { ModelRun } from '@/types/ModelRun';
import { AggregationOption, TemporalResolutionOption, DatacubeType, ProjectType, DatacubeStatus } from '@/types/Enums';
import { computed, defineComponent, PropType, Ref, ref, toRefs, watchEffect } from 'vue';
import OptionsButton from '@/components/widgets/options-button.vue';
import TimeseriesChart from '@/components/widgets/charts/timeseries-chart.vue';
import useScenarioData from '@/services/composables/useScenarioData';
import { mapActions, useStore } from 'vuex';
import router from '@/router';
import _ from 'lodash';
import { DataState, ViewState } from '@/types/Insight';
import useDatacubeDimensions from '@/services/composables/useDatacubeDimensions';
import useDatacubeVersioning from '@/services/composables/useDatacubeVersioning';

export default defineComponent({
  name: 'DatacubeComparativeCard',
  components: {
    OptionsButton,
    TimeseriesChart
  },
  props: {
    id: {
      type: String,
      required: true
    },
    selectedTimestamp: {
      type: Number,
      default: 0
    },
    selectedTimestampRange: {
      type: Object as PropType<{start: number; end: number} | null>,
      default: null
    }
  },
  emits: ['temporal-breakdown-data', 'selected-scenario-ids', 'select-timestamp', 'loaded-timeseries'],
  setup(props, { emit }) {
    const {
      id,
      selectedTimestamp
    } = toRefs(props);

    const metadata = useModelMetadata(id);

    const mainModelOutput = ref<DatacubeFeature | undefined>(undefined);

    const selectedScenarioIds = ref([] as string[]);
    const selectedScenarios = ref([] as ModelRun[]);

    const outputs = ref([]) as Ref<DatacubeFeature[]>;

    const store = useStore();

    const analysisId = computed(() => store.getters['dataAnalysis/analysisId']);
    const project = computed(() => store.getters['app/project']);
    const analysisItems = computed(() => store.getters['dataAnalysis/analysisItems']);
    const datacubeCurrentOutputsMap = computed(() => store.getters['app/datacubeCurrentOutputsMap']);

    watchEffect(() => {
      if (metadata.value) {
        outputs.value = metadata.value?.validatedOutputs ? metadata.value?.validatedOutputs : metadata.value?.outputs;

        let initialOutputIndex = 0;
        const currentOutputEntry = datacubeCurrentOutputsMap.value[metadata.value.id];
        if (currentOutputEntry !== undefined) {
          // we have a store entry for the default output of the current model
          initialOutputIndex = currentOutputEntry;
        } else {
          initialOutputIndex = metadata.value.validatedOutputs?.findIndex(o => o.name === metadata.value?.default_feature) ?? 0;

          // update the store
          const defaultOutputMap = _.cloneDeep(datacubeCurrentOutputsMap.value);
          defaultOutputMap[metadata.value.id] = initialOutputIndex;
          store.dispatch('app/setDatacubeCurrentOutputsMap', defaultOutputMap);
        }
        mainModelOutput.value = outputs.value[initialOutputIndex];
      }
    });

    const {
      dimensions
    } = useDatacubeDimensions(metadata);

    const modelRunsFetchedAt = ref(0);
    const { allModelRunData } = useScenarioData(id, modelRunsFetchedAt, ref({}) /* search filters */, dimensions);

    const selectedRegionIds: string[] = [];
    let initialSelectedScenarioIds: string[] = [];

    watchEffect(() => {
      if (metadata.value?.type === DatacubeType.Model && allModelRunData.value && allModelRunData.value.length > 0) {
        const allScenarioIds = allModelRunData.value.map(run => run.id);
        // do not pick the first run by default in case a run was previously selected
        selectedScenarioIds.value = initialSelectedScenarioIds.length > 0 ? initialSelectedScenarioIds : [allScenarioIds[0]];

        selectedScenarios.value = selectedScenarioIds.value.reduce((filteredRuns: ModelRun[], runId) => {
          allModelRunData.value.some(run => {
            return runId === run.id && filteredRuns.push(run);
          });
          return filteredRuns;
        }, []); // some pretty dirty code duplication, copied straight from datacube-card.vue
      }
    });

    watchEffect(() => {
      if (metadata.value?.type === DatacubeType.Indicator) {
        selectedScenarioIds.value = [DatacubeType.Indicator.toString()];
      }
    });

    const selectedTemporalResolution = ref<string>(TemporalResolutionOption.Month);
    const selectedTemporalAggregation = ref<string>(AggregationOption.Mean);
    const selectedSpatialAggregation = ref<string>(AggregationOption.Mean);

    // apply the view-config for this datacube
    const indx = analysisItems.value.findIndex((ai: any) => ai.id === props.id);
    if (indx >= 0) {
      const initialViewConfig: ViewState = analysisItems.value[indx].viewConfig;
      const initialDataConfig: DataState = analysisItems.value[indx].dataConfig;

      if (initialViewConfig && !_.isEmpty(initialViewConfig)) {
        if (initialViewConfig.temporalResolution !== undefined) {
          selectedTemporalResolution.value = initialViewConfig.temporalResolution;
        }
        if (initialViewConfig.temporalAggregation !== undefined) {
          selectedTemporalAggregation.value = initialViewConfig.temporalAggregation;
        }
        if (initialViewConfig.spatialAggregation !== undefined) {
          selectedSpatialAggregation.value = initialViewConfig.spatialAggregation;
        }
        if (initialViewConfig.selectedOutputIndex !== undefined) {
          const defaultOutputMap = _.cloneDeep(datacubeCurrentOutputsMap.value);
          defaultOutputMap[props.id] = initialViewConfig.selectedOutputIndex;
          store.dispatch('app/setDatacubeCurrentOutputsMap', defaultOutputMap);
        }
      }

      // apply initial data config for this datacube
      if (initialDataConfig && !_.isEmpty(initialDataConfig)) {
        if (initialDataConfig.selectedRegionIds !== undefined) {
          initialDataConfig.selectedRegionIds.forEach(regionId => {
            selectedRegionIds.push(regionId);
          });
        }
        if (initialDataConfig.selectedScenarioIds !== undefined) {
          initialSelectedScenarioIds = initialDataConfig.selectedScenarioIds;
        }
      }
    }

    const setSelectedTimestamp = (value: number) => {
      if (selectedTimestamp.value === value) {
        // return;
      }
      // do not emit or set the timestamp since it can only be set/updated from the parent component
      // selectedTimestamp.value = value;
    };

    const breakdownOption = ref<string | null>(null);
    const setBreakdownOption = (newValue: string | null) => {
      breakdownOption.value = newValue;
    };

    const {
      timeseriesData,
      visibleTimeseriesData,
      relativeTo,
      baselineMetadata,
      setRelativeTo,
      temporalBreakdownData
    } = useTimeseriesData(
      metadata,
      selectedScenarioIds,
      selectedTemporalResolution,
      selectedTemporalAggregation,
      selectedSpatialAggregation,
      breakdownOption,
      selectedTimestamp,
      setSelectedTimestamp,
      ref(selectedRegionIds),
      ref(new Set()),
      ref([]),
      ref(false),
      selectedScenarios
    );

    watchEffect(() => {
      if (metadata.value && visibleTimeseriesData.value && visibleTimeseriesData.value.length > 0) {
        emit('loaded-timeseries', {
          id: id.value,
          timeseriesList: visibleTimeseriesData.value,
          //
          datacubeName: metadata.value.name,
          datacubeOutputName: mainModelOutput.value?.display_name,
          //
          region: metadata.value.geography.country // FIXME: later this could be the selected region for each datacube
        });
      }
    });

    const selectedRegionIdsDisplay = computed(() => {
      if (_.isEmpty(selectedRegionIds)) return 'All';
      return selectedRegionIds.join('/');
    });

    const { statusColor, statusLabel } = useDatacubeVersioning(metadata);

    return {
      activeDrilldownTab: 'breakdown',
      selectedTemporalResolution,
      selectedTemporalAggregation,
      selectedSpatialAggregation,
      selectedScenarioIds,
      selectedRegionIdsDisplay,
      metadata,
      mainModelOutput,
      outputs,
      setSelectedTimestamp,
      timeseriesData,
      baselineMetadata,
      relativeTo,
      setRelativeTo,
      breakdownOption,
      setBreakdownOption,
      temporalBreakdownData,
      AggregationOption,
      visibleTimeseriesData,
      analysisItems,
      project,
      analysisId,
      props,
      store,
      DatacubeStatus,
      statusColor,
      statusLabel
    };
  },
  methods: {
    ...mapActions({
      removeAnalysisItems: 'dataAnalysis/removeAnalysisItems'
    }),
    async openDrilldown() {
      // NOTE: instead of replacing the datacubeIDs array,
      // ensure that the current datacubeId is at 0 index
      const workingAnalysisItems = this.analysisItems.map((item: AnalysisItem): AnalysisItem => item);
      const updatedAnalysisInfo = { currentAnalysisId: this.analysisId, analysisItems: workingAnalysisItems };
      await this.store.dispatch('dataAnalysis/updateAnalysisItems', updatedAnalysisInfo);
      router.push({
        name: 'data',
        params: {
          project: this.project,
          analysisId: this.analysisId,
          projectType: ProjectType.Analysis
        },
        query: {
          datacube_id: this.props.id
        }
      }).catch(() => {});
    },
    clickRemove() {
      this.removeAnalysisItems([this.id]);
    }
  }
});
</script>

<style lang="scss" scoped>
@import '~styles/variables';

.datacube-card-container {
  background: $background-light-1;
  border-radius: 3px;
  height: 200px;
  display: flex;
  flex-direction: column;
  border: 1px solid $background-light-3;
  padding: 1rem;
}

.datacube-header {
  display: flex;
  align-items: center;

  .datacube-title-area {
    display: inline-block;
    cursor: pointer;
    flex: 1;
    min-width: 0;
    margin: 0;
    &:hover {
      color: $selected-dark;

      .datacube-name {
        color: $selected-dark;
      }

      .drilldown-btn {
        color: $selected-dark;
      }
    }
  }
}

.datacube-name {
  font-weight: normal;
  color: $label-color;
  margin-left: 10px;
}

.drilldown-btn {
  padding: 5px;
  color: $text-color-light;
  margin-left: 10px;
}

main {
  display: flex;
  flex: 1;
  min-height: 0;
}

.timeseries-chart {
  flex: 1;
  min-width: 0;
}

.datacube-map-placeholder {
  background-color: #fafafa;
  height: 100%;
  width: 150px;
  display: flex;
  flex-direction: column;
  padding: 5px;
}

.country-list {
  flex: 1;
  min-height: 0;
  overflow-y: auto;
}

</style>
