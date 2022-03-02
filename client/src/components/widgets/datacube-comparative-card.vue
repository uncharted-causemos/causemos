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
        <timeseries-chart
          v-if="timeseriesData.length > 0 && timeseriesData[0].points.length > 0"
          class="timeseries-chart"
          :timeseries-data="visibleTimeseriesData"
          :selected-temporal-resolution="selectedTemporalResolution"
          :selected-timestamp="selectedTimestamp"
          :selected-timestamp-range="selectedTimestampRange"
          :breakdown-option="breakdownOption"
          @select-timestamp="setSelectedTimestamp"
        >
          <template #timeseries-footer-contents>
            <div class="row datacube-footer">
              <div>Aggregated by: {{ selectedSpatialAggregation }}</div>
              <!-- legend of selected runs here, with a dropdown that indicates which run is selected -->
              <div style="display: flex; align-items: center">
                <div style="margin-right: 1rem">Total Runs: {{selectedScenarioIds.length}}</div>
                <div style="display: flex; align-items: center">
                  <div style="margin-right: 4px">Selected:</div>
                  <select name="selectedRegionRankingRun" id="selectedRegionRankingRun"
                          @change="selectedScenarioIndex = $event.target.selectedIndex"
                          :disabled="selectedScenarioIds.length === 1"
                          :style="{ color: regionRunsScenarios && regionRunsScenarios.length > selectedScenarioIndex ? regionRunsScenarios[selectedScenarioIndex].color : 'black' }"
                  >
                    <option
                      v-for="(selectedRun, indx) in regionRunsScenarios"
                      :key="selectedRun.name"
                      :selected="indx === selectedScenarioIndex"
                    >
                      {{selectedRun.name}}
                    </option>
                  </select>
                </div>
              </div>
            </div>
          </template>
        </timeseries-chart>
      </div>
      <div class="datacube-map-placeholder">
        <region-map
          :data="regionMapData"
          :map-bounds="mapBounds"
          :popup-formatter="popupFormatter"
          :region-filter="selectedRegionIdsAtAllLevels"
          :selected-admin-level="selectedAdminLevel"
        />
      </div>
    </main>
  </div>
</template>

<script lang="ts">
import * as d3 from 'd3';
import useModelMetadata from '@/services/composables/useModelMetadata';
import useTimeseriesData from '@/services/composables/useTimeseriesData';
import { AnalysisItem } from '@/types/Analysis';
import { DatacubeFeature } from '@/types/Datacube';
import { getFilteredScenariosFromIds, getOutputs, getSelectedOutput, isModel, hasRegionLevelData } from '@/utils/datacube-util';
import { ModelRun } from '@/types/ModelRun';
import { AggregationOption, TemporalResolutionOption, DatacubeType, DatacubeStatus, DataTransform } from '@/types/Enums';
import { computed, defineComponent, PropType, Ref, ref, toRefs, watch, watchEffect } from 'vue';
import OptionsButton from '@/components/widgets/options-button.vue';
import TimeseriesChart from '@/components/widgets/charts/timeseries-chart.vue';
import useScenarioData from '@/services/composables/useScenarioData';
import { mapActions, useStore } from 'vuex';
import router from '@/router';
import _ from 'lodash';
import { DataState, ViewState } from '@/types/Insight';
import useDatacubeDimensions from '@/services/composables/useDatacubeDimensions';
import useDatacubeVersioning from '@/services/composables/useDatacubeVersioning';
import { COLOR, colorFromIndex, ColorScaleType, COLOR_SCHEME, getColors, isDiscreteScale, validateColorScaleType } from '@/utils/colors-util';
import RegionMap from '@/components/widgets/region-map.vue';
import { adminLevelToString, DATA_LAYER_TRANSPARENCY } from '@/utils/map-util-new';
import { fromStateSelectedRegionsAtAllLevels } from '@/utils/drilldown-util';
import { getSelectedRegionIdsDisplay } from '@/utils/admin-level-util';
import { BarData } from '@/types/BarChart';
import useRegionalData from '@/services/composables/useRegionalData';
import useMapBounds from '@/services/composables/useMapBounds';
import useOutputSpecs from '@/services/composables/useOutputSpecs';
import useSelectedTimeseriesPoints from '@/services/composables/useSelectedTimeseriesPoints';
import useDatacubeHierarchy from '@/services/composables/useDatacubeHierarchy';
import { OutputVariableSpecs, RegionalAggregations } from '@/types/Outputdata';
import { duplicateAnalysisItem, openDatacubeDrilldown } from '@/utils/analysis-util';
import useActiveDatacubeFeature from '@/services/composables/useActiveDatacubeFeature';
import { AdminRegionSets } from '@/types/Datacubes';
import { normalize } from '@/utils/value-util';

export default defineComponent({
  name: 'DatacubeComparativeCard',
  components: {
    OptionsButton,
    TimeseriesChart,
    RegionMap
  },
  props: {
    id: {
      type: String,
      required: true
    },
    datacubeId: {
      type: String,
      required: true
    },
    selectedTimestamp: {
      type: Number,
      default: 0
    },
    datacubeIndex: {
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
      datacubeId,
      selectedTimestamp,
      datacubeIndex
    } = toRefs(props);

    const metadata = useModelMetadata(id);

    const isModelMetadata = computed(() => metadata.value !== null && isModel(metadata.value));

    const mainModelOutput = ref<DatacubeFeature | undefined>(undefined);

    const selectedScenarioIds = ref([] as string[]);
    const selectedScenarios = ref([] as ModelRun[]);

    const outputs = ref([]) as Ref<DatacubeFeature[]>;

    const selectedDataLayerTransparency = ref(DATA_LAYER_TRANSPARENCY['50%']);

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

    watch(
      () => [
        initialViewConfig.value,
        metadata.value
      ],
      () => {
        if (metadata.value) {
          if (_.isEmpty(initialViewConfig.value) && !_.isEmpty(metadata.value.default_view)) {
            const updatedAnalysisItems = _.cloneDeep(analysisItems.value);
            const datacubeAnalysisItem = updatedAnalysisItems.find(item => item.id === props.id && item.datacubeId === datacubeId.value);
            if (datacubeAnalysisItem) {
              datacubeAnalysisItem.viewConfig = metadata.value.default_view;
              store.dispatch('dataAnalysis/updateAnalysisItems', { currentAnalysisId: analysisId.value, analysisItems: updatedAnalysisItems });
            }
            initialViewConfig.value = metadata.value.default_view;
          }
        }
      }
    );

    watchEffect(() => {
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

    const selectedRegionIds: string[] = [];
    const selectedRegionIdsAtAllLevels = ref<AdminRegionSets>({
      country: new Set(),
      admin1: new Set(),
      admin2: new Set(),
      admin3: new Set()
    });
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
    const selectedTransform = ref<DataTransform>(DataTransform.None);

    const regionMapData = ref<BarData[]>([]);

    const selectedAdminLevel = ref(0); // country by default

    const colorSchemeReversed = ref(false);
    const selectedColorSchemeName = ref<COLOR>(COLOR.DEFAULT); // DEFAULT
    const selectedColorScaleType = ref(ColorScaleType.LinearDiscrete);
    const numberOfColorBins = ref(5); // assume default number of 5 bins on startup

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
          if (initialViewConfig.value.colorSchemeReversed !== undefined) {
            colorSchemeReversed.value = initialViewConfig.value.colorSchemeReversed;
          }
          if (initialViewConfig.value.colorSchemeName !== undefined) {
            selectedColorSchemeName.value = initialViewConfig.value.colorSchemeName;
          }
          if (validateColorScaleType(String(initialViewConfig.value.colorScaleType))) {
            selectedColorScaleType.value = initialViewConfig.value.colorScaleType as ColorScaleType;
          }
          if (initialViewConfig.value.numberOfColorBins !== undefined) {
            numberOfColorBins.value = initialViewConfig.value.numberOfColorBins;
          }
          if (initialViewConfig.value.selectedAdminLevel !== undefined) {
            selectedAdminLevel.value = initialViewConfig.value.selectedAdminLevel;
          }
          if (initialViewConfig.value.dataLayerTransparency !== undefined) {
            selectedDataLayerTransparency.value = initialViewConfig.value.dataLayerTransparency;
          }
        }

        // apply initial data config for this datacube
        if (initialDataConfig.value && !_.isEmpty(initialDataConfig.value)) {
          if (initialDataConfig.value.selectedRegionIds !== undefined) {
            initialDataConfig.value.selectedRegionIds.forEach(regionId => {
              selectedRegionIds.push(regionId);
            });
          }
          if (initialDataConfig.value.selectedRegionIdsAtAllLevels !== undefined) {
            selectedRegionIdsAtAllLevels.value = fromStateSelectedRegionsAtAllLevels(initialDataConfig.value.selectedRegionIdsAtAllLevels);
          }
          if (initialDataConfig.value.selectedScenarioIds !== undefined) {
            initialSelectedScenarioIds.value = initialDataConfig.value.selectedScenarioIds;
          }
          if (initialDataConfig.value.selectedTransform !== undefined) {
            selectedTransform.value = initialDataConfig.value.selectedTransform;
          }
        }
      },
      {
        immediate: true
      });

    const setSelectedTimestamp = (value: number) => {
      if (selectedTimestamp.value === value) {
        return;
      }
      // emit the timestamp so that the parent component can set and sync others
      emit('select-timestamp', value);
    };

    const breakdownOption = ref<string | null>(null);
    const setBreakdownOption = (newValue: string | null) => {
      breakdownOption.value = newValue;
    };

    const { activeFeature } = useActiveDatacubeFeature(metadata, mainModelOutput);

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
      selectedTransform,
      setSelectedTimestamp,
      ref(selectedRegionIds),
      ref(new Set()),
      ref([]),
      ref(false),
      activeFeature,
      selectedScenarios
    );

    watchEffect(() => {
      if (metadata.value && visibleTimeseriesData.value && visibleTimeseriesData.value.length > 0) {
        // override the color of all loaded timeseries
        visibleTimeseriesData.value.forEach(timeseries => {
          timeseries.color = colorFromIndex(datacubeIndex.value);
        });

        regionRunsScenarios.value = visibleTimeseriesData.value.map(timeseries => ({ name: timeseries.name, color: timeseries.color }));

        emit('loaded-timeseries', {
          id: id.value,
          datacubeId: datacubeId.value,
          timeseriesList: visibleTimeseriesData.value,
          //
          datacubeName: metadata.value.name,
          datacubeOutputName: mainModelOutput.value?.display_name,
          source: metadata.value.maintainer.organization,
          //
          region: metadata.value.geography.country // FIXME: later this could be the selected region for each datacube
        });
      }
    });

    const selectedRegionIdsDisplay = computed(() => {
      return getSelectedRegionIdsDisplay(selectedRegionIdsAtAllLevels.value, selectedAdminLevel.value);
    });

    const { statusColor, statusLabel } = useDatacubeVersioning(metadata);

    const {
      datacubeHierarchy
      // NOTE: selectedRegionIds is already calculated above so no need to receive as a return object
    } = useDatacubeHierarchy(
      selectedScenarioIds,
      metadata,
      selectedAdminLevel,
      ref(null), // breakdownOption,
      activeFeature
    );

    const { selectedTimeseriesPoints } = useSelectedTimeseriesPoints(
      ref(null), // breakdownOption,
      timeseriesData,
      selectedTimestamp,
      selectedScenarioIds
    );

    const activeFeatures = computed<OutputVariableSpecs[]>(() => {
      return selectedTimeseriesPoints.value.map(() => ({
        temporalAggregation: selectedTemporalAggregation.value as AggregationOption,
        temporalResolution: selectedTemporalResolution.value as TemporalResolutionOption,
        spatialAggregation: selectedSpatialAggregation.value as AggregationOption,
        transform: selectedTransform.value,
        name: activeFeature.value,
        display_name: activeFeature.value
      }));
    });

    const {
      outputSpecs
    } = useOutputSpecs(
      id,
      metadata,
      selectedTimeseriesPoints,
      activeFeatures
    );

    const {
      regionalData
    } = useRegionalData(
      outputSpecs,
      ref(null), // breakdownOption,
      datacubeHierarchy
    );

    const { mapBounds } = useMapBounds(regionalData, selectedAdminLevel, selectedRegionIdsAtAllLevels);

    // note that final color scheme represents the list of final colors that should be used, for example, in the map and its legend
    const finalColorScheme = computed(() => {
      const scheme = isDiscreteScale(selectedColorScaleType.value)
        ? getColors(selectedColorSchemeName.value, numberOfColorBins.value)
        : _.clone(COLOR_SCHEME[selectedColorSchemeName.value]);
      return colorSchemeReversed.value ? scheme.reverse() : scheme;
    });

    const selectedScenarioIndex = ref(0);
    const regionRunsScenarios = ref([] as {name: string; color: string}[]);

    const popupFormatter = (feature: any) => {
      const { label, value } = feature.state || {};
      if (!label) return null;
      return `${label.split('__').pop()}<br> Value: ${+value.toFixed(2)}`;
    };

    watch(
      () => [
        regionalData.value,
        selectedAdminLevel.value,
        finalColorScheme.value,
        selectedScenarioIndex.value,
        selectedDataLayerTransparency.value
      ],
      () => {
        const temp: BarData[] = [];

        if (regionalData.value !== null) {
          const adminLevelAsString = adminLevelToString(selectedAdminLevel.value) as keyof RegionalAggregations;
          const regionLevelData = regionalData.value[adminLevelAsString];
          const hasValues = hasRegionLevelData(regionLevelData);

          if (regionLevelData !== undefined && regionLevelData.length > 0 && hasValues) {
            const data = regionLevelData.map(regionDataItem => ({
              name: regionDataItem.id,
              value: Object.values(regionDataItem.values).length > 0 && Object.values(regionDataItem.values).length > selectedScenarioIndex.value ? Object.values(regionDataItem.values)[selectedScenarioIndex.value] : 0
            }));

            if (data.length > 0) {
              let regionIndexCounter = 0;

              const allValues = data.map(regionDataItem => regionDataItem.value);
              const scale = d3
                .scaleLinear()
                .domain(d3.extent(allValues) as [number, number])
                .nice(); // 😃
              const dataExtent = scale.domain(); // after nice() is called

              const colors = finalColorScheme.value;

              // @REVIEW
              // Normalization is a transform performed by wm-go: https://gitlab.uncharted.software/WM/wm-go/-/merge_requests/64
              // To receive normalized data, send transform=normalization when fetching regional data
              data.forEach(dataItem => {
                const normalizedValue = normalize(dataItem.value, dataExtent[0], dataExtent[1]);
                const itemValue = dataItem.value;
                const colorIndex = Math.trunc(normalizedValue * numberOfColorBins.value); // i.e., linear binning
                // REVIEW: is the calculation of map colors consistent with how the datacube-card map is calculating colors?
                const clampedColorIndex = _.clamp(colorIndex, 0, colors.length - 1);
                const regionColor = colors[clampedColorIndex];
                temp.push({
                  name: (regionIndexCounter + 1).toString(),
                  label: dataItem.name,
                  value: itemValue,
                  normalizedValue: normalizedValue,
                  color: regionColor,
                  opacity: Number(selectedDataLayerTransparency.value)
                });
                regionIndexCounter++;
              });
            }

            // adjust the ranking so that the highest value will be ranked 1st
            // REVIEW: do we need this in the Overlay mode?
            temp.forEach((item, indx) => {
              item.name = (temp.length - indx).toString();
            });
          }
          regionMapData.value = temp;
        }
      });

    return {
      activeDrilldownTab: 'breakdown',
      selectedTemporalResolution,
      selectedTemporalAggregation,
      selectedSpatialAggregation,
      selectedScenarioIds,
      selectedRegionIds,
      selectedRegionIdsAtAllLevels,
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
      statusLabel,
      regionMapData,
      mapBounds,
      selectedAdminLevel,
      popupFormatter,
      selectedScenarioIndex,
      regionRunsScenarios,
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

.chart-and-footer {
  display: flex;
  flex-direction: column;
  flex: 1;
  min-width: 0;
}

.datacube-footer {
  margin-left: 2rem;
  font-size: small;
  display: flex;
  justify-content: space-around;
  flex: 1;
}

</style>
