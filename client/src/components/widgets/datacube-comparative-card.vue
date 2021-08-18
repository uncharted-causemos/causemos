<template>
  <div class="row datacube-card-container">
    <header class="datacube-header" >
      <h5 v-if="metadata && mainModelOutput" style="display: inline-block">
        <span>{{mainModelOutput.display_name !== '' ? mainModelOutput.display_name : mainModelOutput.name}}</span>
        <label style="margin-left: 1rem; font-weight: normal;">| {{metadata.name}}</label>
      </h5>
      <button
        v-tooltip="'Drilldown'"
        class="btn btn-default drilldown-btn"
        @click="openDrilldown">
        <i class="fa fa-fw fa-expand" />
      </button>
      <datacard-options-button
        class="menu"
        :dropdown-below="true"
        :wider-dropdown-options="true"
      >
        <template #content>
          <div
            class="dropdown-option"
            @click="clickRemove"
          >
            Remove
          </div>
        </template>
      </datacard-options-button>
    </header>
    <div>
      <div class="col-md-9 timeseries-chart">
        <timeseries-chart
          v-if="timeseriesData.length > 0 && timeseriesData[0].points.length > 0"
          :timeseries-data="visibleTimeseriesData"
          :selected-timestamp="selectedTimestamp"
          :selected-timestamp-range="selectedTimestampRange"
          :breakdown-option="breakdownOption"
        />
      </div>
      <div class="datacube-map-placeholder col-md-3">
        <!-- placeholder for mini map -->
        <b>Country:</b>
        <div v-if="metadata" class="fixed-height-column">
          <div
            v-for="country in metadata.geography.country"
            :key="country">
              {{country}}
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script lang="ts">
import useModelMetadata from '@/services/composables/useModelMetadata';
import useTimeseriesData from '@/services/composables/useTimeseriesData';
import { AnalysisItem } from '@/types/Analysis';
import { DatacubeFeature } from '@/types/Datacube';
import { AggregationOption, TemporalResolutionOption, DatacubeType, ProjectType } from '@/types/Enums';
import { computed, defineComponent, PropType, Ref, ref, toRefs, watchEffect } from 'vue';
import DatacardOptionsButton from '@/components/widgets/datacard-options-button.vue';
import TimeseriesChart from '@/components/widgets/charts/timeseries-chart.vue';
import useScenarioData from '@/services/composables/useScenarioData';
import { mapActions, useStore } from 'vuex';
import router from '@/router';
import _ from 'lodash';

const DRILLDOWN_TABS = [
  {
    name: 'Breakdown',
    id: 'breakdown',
    // TODO: our version of FA doesn't include fa-chart
    icon: 'fa-question'
  }
];

export default defineComponent({
  name: 'DatacubeComparativeCard',
  components: {
    DatacardOptionsButton,
    TimeseriesChart
  },
  props: {
    id: {
      type: String,
      required: true
    },
    isSelected: {
      type: Boolean,
      default: false
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

    const modelRunsFetchedAt = ref(0);
    const allModelRunData = useScenarioData(id, modelRunsFetchedAt);

    watchEffect(() => {
      if (metadata.value?.type === DatacubeType.Model && allModelRunData.value && allModelRunData.value.length > 0) {
        const allScenarioIds = allModelRunData.value.map(run => run.id);
        selectedScenarioIds.value = [allScenarioIds[0]];
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
      const initialViewConfig = analysisItems.value[indx].viewConfig;

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
      ref([]), // region breakdown
      ref(new Set())
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

    return {
      drilldownTabs: DRILLDOWN_TABS,
      activeDrilldownTab: 'breakdown',
      selectedTemporalResolution,
      selectedTemporalAggregation,
      selectedSpatialAggregation,
      selectedScenarioIds,
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
      store
    };
  },
  methods: {
    ...mapActions({
      removeAnalysisItems: 'dataAnalysis/removeAnalysisItems'
    }),
    async openDrilldown() {
      // NOTE: instead of replacing the datacubeIDs array,
      // ensure that the current datacubeId is at 0 index
      let workingAnalysisItems = this.analysisItems.map((item: AnalysisItem): AnalysisItem => item);
      const indx = workingAnalysisItems.findIndex((ai: any) => ai.id === this.props.id);
      if (indx > 0) {
        // move to 0-index
        const targetItem = workingAnalysisItems[indx];
        workingAnalysisItems = workingAnalysisItems.filter((ai: any) => ai.id !== this.props.id);
        workingAnalysisItems.unshift(targetItem);
      }
      const updatedAnalysisInfo = { currentAnalysisId: this.analysisId, analysisItems: workingAnalysisItems };
      await this.store.dispatch('dataAnalysis/updateAnalysisItems', updatedAnalysisInfo);

      router.push({
        name: 'data',
        params: {
          project: this.project,
          analysisId: this.analysisId,
          projectType: ProjectType.Analysis
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
  box-shadow: $shadow-level-1;
  // padding: 10px;
  margin: 10px;
  border-radius: 3px;
}

.datacube-expanded {
  min-width: 0;
  flex: 1;
  margin: 10px;
  margin-top: 0;
}

.datacube-header {
  flex: 1;
  margin-left: 20px;
  display: flex;
  align-items: center;

  .drilldown-btn {
    padding: 5px;
    margin-left:auto;
  }
}

.timeseries-chart {
  display: flex;
  flex-direction: column;
  padding-left: 5px;
  padding-right: 5px;
}

.datacube-map-placeholder {
  background-color: aliceblue;
  height: 100%;
  border-color: darkgray;
  border-style: solid;
  border-width: thin;
  margin-bottom: 5px;
}

.fixed-height-column {
  height: 12vh;
  overflow-y: scroll;
}

</style>
