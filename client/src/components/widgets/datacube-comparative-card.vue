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
    </header>
    <div>
      <div class="col-md-9 timeseries-chart">
        <timeseries-chart
          v-if="timeseriesData.length > 0 && timeseriesData[0].points.length > 1"
          :timeseries-data="timeseriesData"
          :selected-timestamp="selectedTimestamp"
          :breakdown-option="breakdownOption"
          @select-timestamp="emitTimestampSelection"
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
import { DatacubeFeature } from '@/types/Datacube';
import { NamedBreakdownData } from '@/types/Datacubes';
import { AggregationOption, TemporalResolutionOption, DatacubeType, ProjectType } from '@/types/Enums';
import { computed, defineComponent, Ref, ref, toRefs, watchEffect } from 'vue';
import { colorFromIndex } from '@/utils/colors-util';
import TimeseriesChart from '@/components/widgets/charts/timeseries-chart.vue';
import useRegionalData from '@/services/composables/useRegionalData';
import useScenarioData from '@/services/composables/useScenarioData';
import { useStore } from 'vuex';
import router from '@/router';

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
    TimeseriesChart
  },
  props: {
    datacubeId: {
      type: String,
      required: true
    },
    isSelected: {
      type: Boolean,
      default: false
    }
  },
  emits: ['temporal-breakdown-data', 'regional-data', 'selected-scenario-ids', 'select-timestamp'],
  setup(props, { emit }) {
    const {
      datacubeId
    } = toRefs(props);

    const typeBreakdownData = ref([] as NamedBreakdownData[]);

    const metadata = useModelMetadata(datacubeId);

    const mainModelOutput = ref<DatacubeFeature | undefined>(undefined);

    const selectedScenarioIds = ref([] as string[]);

    const selectedTimestamp = ref(null) as Ref<number | null>;

    const emitTimestampSelection = (newTimestamp: number) => {
      emit('select-timestamp', newTimestamp);
    };

    const outputs = ref([]) as Ref<DatacubeFeature[]>;

    const store = useStore();

    const analysisId = computed(() => store.getters['dataAnalysis/analysisId']);
    const project = computed(() => store.getters['app/project']);
    const analysisItems = computed(() => store.getters['dataAnalysis/analysisItems']);

    watchEffect(() => {
      if (metadata.value) {
        outputs.value = metadata.value?.validatedOutputs ? metadata.value?.validatedOutputs : metadata.value?.outputs;

        const initialOutputIndex = metadata.value.validatedOutputs?.findIndex(o => o.name === metadata.value?.default_feature) ?? 0;

        mainModelOutput.value = outputs.value[initialOutputIndex];

        // FIXME: BUG HERE if multiple models are selected and each one is overwoverwriting the store's currentOutputIndex
        // save the initial output variable index
        if (metadata.value.type === DatacubeType.Model) {
          store.dispatch('modelPublishStore/setCurrentOutputIndex', initialOutputIndex);
        }
      }
    });

    const modelRunsFetchedAt = ref(0);
    const allModelRunData = useScenarioData(datacubeId, modelRunsFetchedAt);

    watchEffect(() => {
      if (metadata.value?.type === DatacubeType.Model && allModelRunData.value && allModelRunData.value.length > 0) {
        const allScenarioIds = allModelRunData.value.map(run => run.id);
        selectedScenarioIds.value = [allScenarioIds[0]];

        if (props.isSelected) {
          emit('selected-scenario-ids', selectedScenarioIds.value);
        }
      }
    });

    watchEffect(() => {
      if (metadata.value?.type === DatacubeType.Indicator) {
        selectedScenarioIds.value = [DatacubeType.Indicator.toString()];

        if (props.isSelected) {
          emit('selected-scenario-ids', selectedScenarioIds.value);
        }
      }
    });

    const selectedTemporalResolution = ref<string>(TemporalResolutionOption.Month);
    const selectedTemporalAggregation = ref<string>(AggregationOption.Mean);
    const selectedSpatialAggregation = ref<string>(AggregationOption.Mean);

    const setSelectedTimestamp = (value: number) => {
      if (selectedTimestamp.value === value) return;
      selectedTimestamp.value = value;
    };

    const breakdownOption = ref<string | null>(null);
    const setBreakdownOption = (newValue: string | null) => {
      breakdownOption.value = newValue;
    };

    const {
      timeseriesData,
      relativeTo,
      baselineMetadata,
      setRelativeTo,
      temporalBreakdownData
    } = useTimeseriesData(
      metadata,
      datacubeId,
      selectedScenarioIds,
      selectedTemporalResolution,
      selectedTemporalAggregation,
      selectedSpatialAggregation,
      breakdownOption,
      selectedTimestamp,
      setSelectedTimestamp
    );

    watchEffect(() => {
      if (temporalBreakdownData.value && props.isSelected) {
        emit('temporal-breakdown-data', temporalBreakdownData.value);
      }
    });

    const {
      outputSpecs,
      regionalData,
      deselectedRegionIds,
      toggleIsRegionSelected,
      setAllRegionsSelected
    } = useRegionalData(
      datacubeId,
      selectedScenarioIds,
      selectedTimestamp,
      selectedSpatialAggregation,
      selectedTemporalAggregation,
      selectedTemporalResolution,
      metadata
    );

    watchEffect(() => {
      if (regionalData.value && props.isSelected) {
        emit('regional-data', regionalData.value);
      }
    });

    async function openDrilldown() {
      // NOTE: instead of replacing the datacubeIDs array,
      //  ensure that the current datacubeId is at 0 index
      let datacubeIDs: string[] = analysisItems.value.map((item: any) => item.datacubeId);
      const indx = datacubeIDs.findIndex((datacubeId: string) => datacubeId === props.datacubeId);
      if (indx > 0) {
        // move to 0-index
        datacubeIDs = datacubeIDs.filter(datacubeId => datacubeId !== props.datacubeId);
        datacubeIDs.unshift(props.datacubeId);
      }
      const updatedAnalysisInfo = { currentAnalysisId: analysisId.value, datacubeIDs: datacubeIDs };
      await store.dispatch('dataAnalysis/updateAnalysisItemsNew', updatedAnalysisInfo);

      router.push({
        name: 'data',
        params: {
          project: project.value,
          analysisID: analysisId.value,
          projectType: ProjectType.Analysis
        }
      }).catch(() => {});
    }

    return {
      drilldownTabs: DRILLDOWN_TABS,
      activeDrilldownTab: 'breakdown',
      selectedTemporalResolution,
      selectedTemporalAggregation,
      selectedSpatialAggregation,
      selectedScenarioIds,
      typeBreakdownData,
      selectedTimestamp,
      colorFromIndex,
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
      emitTimestampSelection,
      regionalData,
      outputSpecs,
      deselectedRegionIds,
      setAllRegionsSelected,
      toggleIsRegionSelected,
      openDrilldown
    };
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
  margin-right: 20px;
  display: flex;
  align-items: center;
  justify-content: space-between;

  .drilldown-btn {
    padding: 5px;
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
