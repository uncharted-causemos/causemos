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
          <div
            v-if="isModelMetadata"
            class="dropdown-option"
            @click="clickDuplicate"
          >
            Duplicate
          </div>
        </template>
      </options-button>
    </header>
    <main>
      <div class="chart-and-footer">
        <bar-chart
          class="bar-chart"
          :bars-data="barsData"
          :hover-id="barChartHoverId"
          @bar-chart-hover="$emit('bar-chart-hover', $event)"
        />
        <div class="row datacube-footer">
          <div>Showing data for {{timestampFormatter(selectedTimestamp)}}</div>
          <!-- legend of selected runs here, with a dropdown that indicates which run is selected -->
          <div style="display: flex; align-items: center">
            <div style="margin-right: 1rem">Total Runs: {{selectedScenarioIds.length}}</div>
            <div style="display: flex; align-items: center">
              <div style="margin-right: 4px">Selected:</div>
              <select name="selectedRegionRankingRun" id="selectedRegionRankingRun"
                @change="selectedRegionRankingScenario = $event.target.selectedIndex"
                :disabled="selectedScenarioIds.length === 1"
                :style="{ color: regionRunsScenarios && regionRunsScenarios.length > selectedRegionRankingScenario ? regionRunsScenarios[selectedRegionRankingScenario].color : 'black' }"
              >
                <option
                  v-for="(selectedRun, indx) in regionRunsScenarios"
                  :key="selectedRun.name"
                  :selected="indx === selectedRegionRankingScenario"
                >
                  {{selectedRun.name}}
                </option>
              </select>
            </div>
          </div>
        </div>
      </div>
      <div class="datacube-map-placeholder">
        <region-map
          :data="barsData"
          :selected-layer-id="selectedAdminLevel"
          :map-bounds="bbox"
          :selected-id="barChartHoverId"
          @click-region="$emit('map-click-region', $event)" />
      </div>
    </main>
  </div>
</template>

<script lang="ts">
import _ from 'lodash';
import * as d3 from 'd3';
import { mapActions, useStore } from 'vuex';
import router from '@/router';
import useModelMetadata from '@/services/composables/useModelMetadata';
import useTimeseriesData from '@/services/composables/useTimeseriesData';
import useActiveDatacubeFeature from '@/services/composables/useActiveDatacubeFeature';
import { AnalysisItem } from '@/types/Analysis';
import { DatacubeFeature } from '@/types/Datacube';
import { getFilteredScenariosFromIds, getOutputs, getSelectedOutput, isModel } from '@/utils/datacube-util';
import { ModelRun } from '@/types/ModelRun';
import {
  AggregationOption,
  BinningOptions,
  DatacubeStatus,
  DatacubeType,
  DataTransform,
  TemporalResolutionOption
} from '@/types/Enums';
import { computed, defineComponent, PropType, Ref, ref, toRefs, watch, watchEffect } from 'vue';
import OptionsButton from '@/components/widgets/options-button.vue';
import BarChart from '@/components/widgets/charts/bar-chart.vue';
import RegionMap from '@/components/widgets/region-map.vue';
import useScenarioData from '@/services/composables/useScenarioData';
import { DataState, ViewState } from '@/types/Insight';
import useDatacubeDimensions from '@/services/composables/useDatacubeDimensions';
import useDatacubeVersioning from '@/services/composables/useDatacubeVersioning';
import { BarData } from '@/types/BarChart';
import { COLOR_SCHEME } from '@/utils/colors-util';
import useRegionalData from '@/services/composables/useRegionalData';
import useSelectedTimeseriesPoints from '@/services/composables/useSelectedTimeseriesPoints';
import useOutputSpecs from '@/services/composables/useOutputSpecs';
import useDatacubeHierarchy from '@/services/composables/useDatacubeHierarchy';
import { adminLevelToString, computeMapBoundsForCountries } from '@/utils/map-util-new';
import { RegionalAggregations } from '@/types/Runoutput';
import dateFormatter from '@/formatters/date-formatter';
import { duplicateAnalysisItem, openDatacubeDrilldown } from '@/utils/analysis-util';
import { normalize } from '@/utils/value-util';

export default defineComponent({
  name: 'DatacubeRegionRankingCard',
  components: {
    OptionsButton,
    BarChart,
    RegionMap
  },
  emits: ['updated-bars-data', 'bar-chart-hover', 'map-click-region'],
  props: {
    id: {
      type: String,
      required: true
    },
    datacubeId: {
      type: String,
      required: true
    },
    selectedAdminLevel: {
      type: Number,
      required: true
    },
    numberOfColorBins: {
      type: Number,
      default: 5
    },
    selectedColorScheme: {
      type: Array as PropType<string[]>,
      default: COLOR_SCHEME.PRIORITIZATION
    },
    maxNumberOfChartBars: {
      type: Number,
      default: 20
    },
    limitNumberOfChartBars: {
      type: Boolean,
      default: false
    },
    regionRankingBinningType: {
      type: String,
      default: BinningOptions.Linear
    },
    barChartHoverId: {
      type: String,
      default: ''
    },
    showNormalizedData: {
      type: Boolean,
      default: true
    }
  },
  setup(props, { emit }) {
    const {
      id,
      datacubeId,
      selectedColorScheme,
      numberOfColorBins,
      selectedAdminLevel,
      maxNumberOfChartBars,
      limitNumberOfChartBars,
      regionRankingBinningType,
      showNormalizedData,
      barChartHoverId
    } = toRefs(props);

    const metadata = useModelMetadata(id);

    const isModelMetadata = computed(() => metadata.value !== null && isModel(metadata.value));

    const mainModelOutput = ref<DatacubeFeature | undefined>(undefined);
    const bbox = ref<number[][] | undefined>(undefined);

    const selectedScenarioIds = ref([] as string[]);
    const selectedScenarios = ref([] as ModelRun[]);
    const selectedRegionRankingScenario = ref(0);
    const regionRunsScenarios = ref([] as {name: string; color: string}[]);

    const outputs = ref([]) as Ref<DatacubeFeature[]>;

    const store = useStore();

    const analysisId = computed(() => store.getters['dataAnalysis/analysisId']);
    const project = computed(() => store.getters['app/project']);
    const analysisItems = computed<AnalysisItem[]>(() => store.getters['dataAnalysis/analysisItems']);
    const datacubeCurrentOutputsMap = computed(() => store.getters['app/datacubeCurrentOutputsMap']);

    const initialViewConfig = ref<ViewState | null>(null);
    const initialDataConfig = ref<DataState | null>(null);
    const datacubeAnalysisItem = analysisItems.value.find(item => item.id === props.id && item.datacubeId === datacubeId.value);
    if (datacubeAnalysisItem) {
      initialViewConfig.value = datacubeAnalysisItem.viewConfig;
      initialDataConfig.value = datacubeAnalysisItem.dataConfig;
    }

    watchEffect(async () => {
      if (metadata.value) {
        outputs.value = getOutputs(metadata.value);

        let initialOutputIndex = 0;
        const currentOutputEntry = datacubeCurrentOutputsMap.value[metadata.value.id];
        if (currentOutputEntry !== undefined && currentOutputEntry >= 0) {
          // we have a store entry for the default output of the current model
          initialOutputIndex = currentOutputEntry;
        } else {
          initialOutputIndex = metadata.value.validatedOutputs?.findIndex(o => o.name === metadata.value?.default_feature) ?? 0;

          // update the store
          const defaultOutputMap = _.cloneDeep(datacubeCurrentOutputsMap.value);
          defaultOutputMap[metadata.value.id] = initialOutputIndex;
          store.dispatch('app/setDatacubeCurrentOutputsMap', defaultOutputMap);
        }
        // override (to correctly fetch the output selection for each datacube duplication)
        if (initialViewConfig.value && !_.isEmpty(initialViewConfig.value) && initialViewConfig.value.selectedOutputIndex !== undefined) {
          initialOutputIndex = initialViewConfig.value.selectedOutputIndex;
        }
        mainModelOutput.value = getSelectedOutput(metadata.value, initialOutputIndex);
      }
    });

    const {
      dimensions
    } = useDatacubeDimensions(metadata);

    const modelRunsFetchedAt = ref(0);
    const { allModelRunData } = useScenarioData(id, modelRunsFetchedAt, ref({}) /* search filters */, dimensions);

    const initialSelectedScenarioIds = ref<string[]>([]);

    watchEffect(() => {
      if (metadata.value?.type === DatacubeType.Model && allModelRunData.value && allModelRunData.value.length > 0) {
        const allScenarioIds = allModelRunData.value.map(run => run.id);
        // do not pick the first run by default in case a run was previously selected
        selectedScenarioIds.value = initialSelectedScenarioIds.value.length > 0 ? initialSelectedScenarioIds.value : [allScenarioIds[0]];

        selectedScenarios.value = getFilteredScenariosFromIds(selectedScenarioIds.value, allModelRunData.value);
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
    watch(
      () => [
        initialViewConfig.value,
        initialDataConfig.value
      ],
      () => {
        if (initialViewConfig.value && !_.isEmpty(initialViewConfig.value)) {
          if (initialViewConfig.value.temporalResolution !== undefined) {
            selectedTemporalResolution.value = initialViewConfig.value.temporalResolution;
          }
          if (initialViewConfig.value.temporalAggregation !== undefined) {
            selectedTemporalAggregation.value = initialViewConfig.value.temporalAggregation;
          }
          if (initialViewConfig.value.spatialAggregation !== undefined) {
            selectedSpatialAggregation.value = initialViewConfig.value.spatialAggregation;
          }
          if (initialViewConfig.value.selectedOutputIndex !== undefined) {
            const defaultOutputMap = _.cloneDeep(datacubeCurrentOutputsMap.value);
            defaultOutputMap[props.id] = initialViewConfig.value.selectedOutputIndex;
            store.dispatch('app/setDatacubeCurrentOutputsMap', defaultOutputMap);
          }
        }

        // apply initial data config for this datacube
        if (initialDataConfig.value && !_.isEmpty(initialDataConfig.value)) {
          if (initialDataConfig.value.selectedScenarioIds !== undefined) {
            initialSelectedScenarioIds.value = initialDataConfig.value.selectedScenarioIds;
          }
        }
      },
      {
        immediate: true
      });

    const { activeFeature } = useActiveDatacubeFeature(metadata, mainModelOutput);

    const {
      datacubeHierarchy,
      selectedRegionIds
    } = useDatacubeHierarchy(
      selectedScenarioIds,
      metadata,
      selectedAdminLevel,
      ref(null), // breakdownOption,
      ref([]), // initialSelectedRegionIds
      activeFeature
    );

    const selectedTimestamp = ref<number | null>(null);

    const {
      timeseriesData,
      visibleTimeseriesData,
      temporalBreakdownData
    } = useTimeseriesData(
      metadata,
      selectedScenarioIds,
      selectedTemporalResolution,
      selectedTemporalAggregation,
      selectedSpatialAggregation,
      ref(null), // breakdownOption
      ref(null), // selectedTimestamp
      ref(DataTransform.None), // Transforms are NOT used for region ranking
      () => {}, // setSelectedTimestamp
      selectedRegionIds,
      ref(new Set()),
      ref([]),
      ref(false),
      activeFeature,
      selectedScenarios
    );

    watchEffect(() => {
      if (visibleTimeseriesData.value.length > 0) {
        regionRunsScenarios.value = visibleTimeseriesData.value.map(timeseries => ({ name: timeseries.name, color: timeseries.color }));

        // flatten the list of timeseries for all selected runs and extract the last timestmap
        let allTimestamps = visibleTimeseriesData.value
          .map(timeseries => timeseries.points)
          .flat()
          .map(point => point.timestamp);

        const timeseriesForSelectedRun = visibleTimeseriesData.value
          .find((timeseries, indx) => indx === selectedRegionRankingScenario.value);
        if (timeseriesForSelectedRun !== undefined) {
          allTimestamps = timeseriesForSelectedRun.points
            .flat()
            .map(point => point.timestamp);
        }

        // select the last timestamp as the initial value
        const lastTimestamp = _.max(allTimestamps);
        if (lastTimestamp !== undefined) {
          // set initial timestamp selection
          selectedTimestamp.value = lastTimestamp;
        }
      }
    });

    const { selectedTimeseriesPoints } = useSelectedTimeseriesPoints(
      ref(null), // breakdownOption,
      timeseriesData,
      selectedTimestamp,
      selectedScenarioIds
    );

    const {
      outputSpecs
    } = useOutputSpecs(
      id,
      selectedSpatialAggregation,
      selectedTemporalAggregation,
      selectedTemporalResolution,
      ref(DataTransform.None), // Transforms are NOT used for region ranking
      metadata,
      selectedTimeseriesPoints,
      activeFeature
    );

    const {
      regionalData
    } = useRegionalData(
      outputSpecs,
      ref(null), // breakdownOption,
      datacubeHierarchy
    );

    const selectedRegionIdsDisplay = computed(() => {
      if (_.isEmpty(selectedRegionIds.value)) return 'All';
      return selectedRegionIds.value.join('/');
    });

    const { statusColor, statusLabel } = useDatacubeVersioning(metadata);

    const barsData = ref<BarData[]>([]);

    // Calculate bbox
    watchEffect(async () => {
      const countries = barChartHoverId.value
        ? [barChartHoverId.value.split('__')[0]]
        : [...new Set((regionalData.value?.country || []).map(d => d.id))];
      bbox.value = await computeMapBoundsForCountries(countries) || undefined;
    });

    watch(
      () => [
        regionalData.value,
        selectedAdminLevel.value,
        selectedColorScheme.value,
        showNormalizedData.value,
        numberOfColorBins.value,
        maxNumberOfChartBars.value,
        limitNumberOfChartBars.value,
        regionRankingBinningType.value,
        selectedRegionRankingScenario.value
      ],
      () => {
        const temp: BarData[] = [];
        // if either color bins, the list of scheme colors, or regional data has changed,
        // then reconstruct the bar chart data
        const colors = selectedColorScheme.value;

        if (regionalData.value !== null) {
          const adminLevelAsString = adminLevelToString(selectedAdminLevel.value) as keyof RegionalAggregations;
          const regionLevelData = regionalData.value[adminLevelAsString];

          if (regionLevelData !== undefined && regionLevelData.length > 0) {
            const data = regionLevelData.map(regionDataItem => ({
              name: regionDataItem.id,
              value: Object.values(regionDataItem.values).length > 0 && Object.values(regionDataItem.values).length > selectedRegionRankingScenario.value ? Object.values(regionDataItem.values)[selectedRegionRankingScenario.value] : 0
            }));
            //
            // bin data
            //
            if (data.length > 0) {
              const allValues = data.map(regionDataItem => regionDataItem.value);
              const scale = d3
                .scaleLinear()
                .domain(d3.extent(allValues) as [number, number])
                .nice(); // 😃
              const dataExtent = scale.domain(); // after nice() is called
              const binGenerator = d3.bin<{name: string;value: number}, number>()
                .domain(scale.domain() as [number, number]) // omit to use the default domain/extent from data
                // use a custom threshold generator to ensure
                //  bucket count that matches the required number of bins
                .thresholds((data, min, max) =>
                  d3.range(numberOfColorBins.value).map(t => min + (t / numberOfColorBins.value) * (max - min))
                )
                .value(function(d) { return d.value; })
              ;
              const bins = binGenerator(data);
              let regionIndexCounter = 0;

              // @REVIEW
              // Normalization is a transform performed by wm-go: https://gitlab.uncharted.software/WM/wm-go/-/merge_requests/64
              // To receive normalized data, send transform=normalization when fetching regional data
              const numBars = regionLevelData.length;
              // we can have many bars than the available colors, so map indices
              const slope = 1.0 * (colors.length) / (numBars);
              bins.forEach((bin) => {
                _.sortBy(bin, item => item.value).forEach(dataItem => {
                  const normalizedValue = normalize(dataItem.value, dataExtent[0], dataExtent[1]);
                  const barValue = showNormalizedData.value ? (normalizedValue * numberOfColorBins.value) : dataItem.value;
                  let barColor = 'skyblue';
                  let binIndex = -1;
                  if (regionRankingBinningType.value === BinningOptions.Linear) {
                    binIndex = Math.trunc(normalizedValue * numberOfColorBins.value);
                  }
                  if (regionRankingBinningType.value === BinningOptions.Quantile) {
                    binIndex = Math.trunc(slope * (regionIndexCounter));
                  }
                  if (binIndex !== -1) {
                    const colorIndex = _.clamp(binIndex, 0, colors.length - 1);
                    barColor = colors[colorIndex];
                  }
                  temp.push({
                    name: (regionIndexCounter + 1).toString(),
                    label: dataItem.name,
                    value: barValue,
                    normalizedValue: normalizedValue,
                    color: barColor
                  });
                  regionIndexCounter++;
                });
              });
            }

            // adjust the bar ranking so that the highest bar value will be ranked 1st
            temp.forEach((barItem, indx) => {
              barItem.name = (temp.length - indx).toString();
            });

            emit('updated-bars-data', {
              id: id.value,
              datacubeId: datacubeId.value,
              name: mainModelOutput.value?.display_name + ' : ' + metadata.value?.name,
              barsData: limitNumberOfChartBars.value ? temp.slice(-maxNumberOfChartBars.value) : temp,
              selectedTimestamp: selectedTimestamp.value
            });
          }
          // limit the number of bars to the selected maximum
          barsData.value = limitNumberOfChartBars.value ? temp.slice(-maxNumberOfChartBars.value) : temp;
        }
      });

    return {
      selectedTemporalResolution,
      selectedTemporalAggregation,
      selectedSpatialAggregation,
      selectedScenarioIds,
      selectedRegionIdsDisplay,
      metadata,
      mainModelOutput,
      outputs,
      timeseriesData,
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
      statusLabel,
      barsData,
      selectedTimestamp,
      timestampFormatter: (value: any) => dateFormatter(value, 'MMM DD, YYYY'),
      selectedRegionRankingScenario,
      regionRunsScenarios,
      bbox,
      isModelMetadata
    };
  },
  methods: {
    ...mapActions({
      removeAnalysisItems: 'dataAnalysis/removeAnalysisItems'
    }),
    openDrilldown() {
      openDatacubeDrilldown(this.props.id, this.datacubeId, router, this.store);
    },
    clickRemove() {
      // when removing, it is not enough to only send the datacube id to be removed
      //  since the datacube may have been duplicated multiple times
      //  and we need to suport removing one at a time
      this.removeAnalysisItems([this.datacubeId]);
    },
    clickDuplicate() {
      if (this.metadata !== null) {
        duplicateAnalysisItem(this.metadata, this.id, this.analysisId, this.store);
      }
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
    white-space: nowrap;
    text-overflow: ellipsis;
    overflow: hidden;

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

.bar-chart {
  flex: 1;
  min-width: 0;
}

.chart-and-footer {
  display: flex;
  flex-direction: column;
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

.datacube-footer {
  margin-left: 2rem;
  font-size: small;
  display: flex;
  justify-content: space-around;
}

</style>
