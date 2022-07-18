<template>
  <div class="datacube-card-container">
    <header class="datacube-header" >
      <h5
        v-if="metadata && activeFeature"
        class="datacube-title-area"
        @click="openDrilldown"
      >
        <span>{{activeFeature.display_name !== '' ? activeFeature.display_name : activeFeature.name}} - {{ selectedRegionsString }}</span>
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
            class="dropdown-option"
            @click="clickDuplicate"
          >
            Duplicate
          </div>
        </template>
      </options-button>
    </header>
    <main>
      <div class="card-maps-box">
        <region-map
          :data="regionMapData"
          :map-bounds="mapBounds"
          :popup-Formatter="popupFormatter"
          :region-filter="selectedRegionIdsAtAllLevels"
          :selected-admin-level="selectedAdminLevel"
          :disable-pan-zoom="true"
        />
        <div v-if="mapLegendData.length > 0" class="card-maps-legend-container">
          <map-legend
            :ramp="mapLegendData[0]"
            :isContinuous="isContinuousScale"
          />
        </div>
      </div>
      <!-- legend of selected runs here, with a dropdown that indicates which run is selected -->
      <div style="display: flex; align-items: center; align-self: center">
        <div style="margin-right: 1rem">Total Timeseries: {{regionRunsScenarios.length}}</div>
        <div style="display: flex; align-items: center">
          <div style="margin-right: 4px">Selected:</div>
          <select name="selectedRegionRankingRun" id="selectedRegionRankingRun"
            @change="selectedScenarioIndex = $event.target.selectedIndex"
            :disabled="regionRunsScenarios.length === 1"
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
    </main>
  </div>
</template>

<script lang="ts">
import useModelMetadata from '@/services/composables/useModelMetadata';
import { AnalysisItem } from '@/types/Analysis';
import { DatacubeFeature } from '@/types/Datacube';
import { convertRegionalDataToBarData, getSelectedOutput, isModel } from '@/utils/datacube-util';
import { AggregationOption, TemporalResolutionOption, DatacubeStatus, SPLIT_BY_VARIABLE } from '@/types/Enums';
import { computed, defineComponent, PropType, ref, toRefs, watch, watchEffect } from 'vue';
import OptionsButton from '@/components/widgets/options-button.vue';
import { useStore } from 'vuex';
import router from '@/router';
import _ from 'lodash';
import { DataSpaceDataState, ViewState } from '@/types/Insight';
import useDatacubeVersioning from '@/services/composables/useDatacubeVersioning';
import { fromStateSelectedRegionsAtAllLevels, validateSelectedRegions } from '@/utils/drilldown-util';
import { colorFromIndex, ColorScaleType, validateColorScaleType } from '@/utils/colors-util';
import RegionMap from '@/components/widgets/region-map.vue';
import { BarData } from '@/types/BarChart';
import { openDatacubeDrilldown } from '@/services/analysis-service-new';
import MapLegend from '@/components/widgets/map-legend.vue';
import { isDataSpaceDataState } from '@/utils/insight-util';
import useDatacube from '@/services/composables/useDatacube';
import { getActiveRegions, popupFormatter } from '@/utils/map-util-new';

export default defineComponent({
  name: 'DatacubeComparativeOverlayRegion',
  components: {
    OptionsButton,
    RegionMap,
    MapLegend
  },
  props: {
    id: {
      type: String,
      required: true
    },
    itemId: {
      type: String,
      required: true
    },
    globalTimestamp: {
      type: Number,
      default: 0
    },
    datacubeIndex: {
      type: Number,
      default: 0
    },
    analysisItem: {
      type: Object as PropType<AnalysisItem>,
      required: true
    },
    analysisId: {
      type: String,
      required: true
    }
  },
  emits: [
    'loaded-timeseries',
    'loaded-metadata',
    'updated-feature-display-name',
    'remove-analysis-item',
    'duplicate-analysis-item'
  ],
  setup(props, { emit }) {
    const {
      itemId,
      id,
      globalTimestamp,
      datacubeIndex,
      analysisItem
    } = toRefs(props);

    const metadata = useModelMetadata(id);
    watchEffect(() => {
      if (metadata.value !== null) {
        emit('loaded-metadata', itemId.value, metadata.value);
      }
    });

    // FIXME: this watcher is extremely error prone. Seems like its jobs are to:
    // - Search if there's an entry in the store for the current itemId
    // - If there isn't, look up the default feature and update the store
    // - Store that output index as the current output index
    // - Unless we have an output index in initialViewConfig, in which case use that one
    // Can that last case be avoided by using an ID in the datacubeCurrentOutputsMap that is unique between duplicate datacubes?
    // FIXME: this logic is copied between all cards other than datacube-card
    const activeFeature = ref<DatacubeFeature | null>(null);
    watchEffect(() => {
      if (activeFeature.value !== null) {
        emit(
          'updated-feature-display-name',
          itemId.value,
          activeFeature.value.display_name
        );
      }
    });
    const activeFeatureName = computed(() => activeFeature.value?.name ?? '');
    watchEffect(() => {
      if (!metadata.value) {
        return;
      }

      let initialOutputIndex = 0;
      const datacubeKey = itemId.value;
      const currentOutputEntry = datacubeCurrentOutputsMap.value[datacubeKey];
      if (currentOutputEntry !== undefined && currentOutputEntry >= 0) {
        // we have a store entry for the default output of the current model
        initialOutputIndex = currentOutputEntry;
      } else {
        initialOutputIndex = metadata.value.validatedOutputs?.findIndex(o => o.name === metadata.value?.default_feature) ?? 0;

        // update the store
        const defaultOutputMap = _.cloneDeep(datacubeCurrentOutputsMap.value);
        defaultOutputMap[datacubeKey] = initialOutputIndex;
        store.dispatch('app/setDatacubeCurrentOutputsMap', defaultOutputMap);
      }
      // override (to correctly fetch the output selection for each datacube duplication)
      if (initialViewConfig.value && !_.isEmpty(initialViewConfig.value) && initialViewConfig.value.selectedOutputIndex !== undefined) {
        initialOutputIndex = initialViewConfig.value.selectedOutputIndex;
      }
      activeFeature.value = getSelectedOutput(metadata.value, initialOutputIndex);
    });

    const {
      selectedFeatureNames,
      selectedScenarioIds,
      selectedDataLayerTransparency,
      modelRunSearchFilters,
      breakdownOption,
      setBreakdownOption,
      initialActiveFeatures,
      initialSelectedQualifierValues,
      initialNonDefaultQualifiers,
      initialSelectedYears,
      initialSelectedGlobalTimestamp,
      initialActiveReferenceOptions,
      allModelRunData,
      selectedRegionIdsAtAllLevels,
      selectedRegionsString,
      selectedSpatialAggregation,
      selectedTemporalAggregation,
      selectedTemporalResolution,
      selectedTransform,
      selectedAdminLevel,
      colorSchemeReversed,
      selectedColorSchemeName,
      selectedColorScaleType,
      numberOfColorBins,
      finalColorScheme,
      datacubeHierarchy,
      timeseriesData,
      timeseriesDataForSelection,
      visibleTimeseriesData,
      regionalData,
      mapBounds,
      selectedDataLayer,
      mapLegendData,
      isContinuousScale,
      setSelectedTimestamp
    } = useDatacube(
      metadata,
      itemId,
      activeFeatureName,
      ref(false)
    );

    // CompAnalysis passes globalTimestamp into this component.
    // Keep the selectedTimestamp within useDatacube in sync with it.
    watchEffect(() => {
      setSelectedTimestamp(globalTimestamp.value);
    });

    const store = useStore();

    const project = computed(() => store.getters['app/project']);
    const datacubeCurrentOutputsMap = computed(() => store.getters['app/datacubeCurrentOutputsMap']);

    const initialViewConfig = ref<ViewState | null>(null);
    const initialDataConfig = ref<DataSpaceDataState | null>(null);
    initialViewConfig.value = analysisItem.value.viewConfig;
    initialDataConfig.value = analysisItem.value.dataConfig;

    const selectedRegionIds = ref<string[]>([]);

    const initialSelectedScenarioIds = ref<string[]>([]);

    // FIXME: this logic is shared by other cards. Can we extract it?
    watchEffect(() => {
      if (!isModel(metadata.value) || allModelRunData.value.length === 0) {
        return;
      }
      if (initialSelectedScenarioIds.value.length > 0) {
        selectedScenarioIds.value = initialSelectedScenarioIds.value;
        return;
      }
      const baselineRunIds = allModelRunData.value
        .filter(run => run.is_default_run)
        .map(run => run.id);
      if (baselineRunIds.length > 0) {
        selectedScenarioIds.value = [baselineRunIds[0]];
      }
    });

    // grab and track the view-config for this datacube
    watch(
      () => [
        initialViewConfig.value,
        initialDataConfig.value
      ],
      () => {
        if (initialViewConfig.value && !_.isEmpty(initialViewConfig.value)) {
          if (initialViewConfig.value?.breakdownOption !== undefined) {
            setBreakdownOption(initialViewConfig.value?.breakdownOption);
          }
          if (initialViewConfig.value.temporalResolution !== undefined) {
            selectedTemporalResolution.value = initialViewConfig.value.temporalResolution as TemporalResolutionOption;
          }
          if (initialViewConfig.value.temporalAggregation !== undefined) {
            selectedTemporalAggregation.value = initialViewConfig.value.temporalAggregation as AggregationOption;
          }
          if (initialViewConfig.value.spatialAggregation !== undefined) {
            selectedSpatialAggregation.value = initialViewConfig.value.spatialAggregation as AggregationOption;
          }
          if (initialViewConfig.value.selectedOutputIndex !== undefined) {
            const defaultOutputMap = _.cloneDeep(datacubeCurrentOutputsMap.value);
            const datacubeKey = itemId.value;
            defaultOutputMap[datacubeKey] = initialViewConfig.value.selectedOutputIndex;
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
          if (initialViewConfig.value.selectedMapDataLayer !== undefined) {
            selectedDataLayer.value = initialViewConfig.value.selectedMapDataLayer;
          }
          if (initialViewConfig.value.dataLayerTransparency !== undefined) {
            selectedDataLayerTransparency.value = initialViewConfig.value.dataLayerTransparency;
          }
        }

        // apply initial data config for this datacube
        if (initialDataConfig.value && !_.isEmpty(initialDataConfig.value)) {
          if (initialDataConfig.value.selectedTimestamp !== undefined) {
            if (initialViewConfig.value?.breakdownOption && initialViewConfig.value?.breakdownOption === SPLIT_BY_VARIABLE) {
              initialSelectedGlobalTimestamp.value = initialDataConfig.value.selectedTimestamp;
            } else {
              // setSelectedTimestamp(initialDataConfig.value?.selectedTimestamp as number);
            }
          }
          // FIXME: can we remove this? can we remove selectedRegionIds from the datastate entirely?selectedRegionIdsAtAllLevels should be loaded, and selectedRegionIds should just be calculated from that.
          // if (initialDataConfig.value.selectedRegionIds !== undefined) {
          //   initialDataConfig.value.selectedRegionIds.forEach(regionId => {
          //     selectedRegionIds.push(regionId);
          //   });
          // }
          if (initialDataConfig.value.selectedRegionIdsAtAllLevels !== undefined) {
            const regions = fromStateSelectedRegionsAtAllLevels(initialDataConfig.value.selectedRegionIdsAtAllLevels);
            const { validRegions } = validateSelectedRegions(regions, datacubeHierarchy.value);
            selectedRegionIdsAtAllLevels.value = validRegions;
          }
          if (initialDataConfig.value.selectedScenarioIds !== undefined) {
            initialSelectedScenarioIds.value = initialDataConfig.value.selectedScenarioIds;
          }
          if (initialDataConfig.value.selectedTransform !== undefined) {
            selectedTransform.value = initialDataConfig.value.selectedTransform;
          }
          if (initialDataConfig.value.selectedQualifierValues !== undefined) {
            initialSelectedQualifierValues.value = _.clone(initialDataConfig.value.selectedQualifierValues);
          }
          modelRunSearchFilters.value = _.clone(initialDataConfig.value.searchFilters);

          const dataState = initialDataConfig.value;
          if (dataState && isDataSpaceDataState(dataState)) {
            initialNonDefaultQualifiers.value = _.clone(dataState.nonDefaultQualifiers);

            selectedFeatureNames.value = new Set(_.clone(dataState.selectedOutputVariables));
            initialActiveFeatures.value = _.clone(dataState.activeFeatures);
            // @NOTE: 'initialSelectedQualifierValues' must be set after 'breakdownOption'
            initialSelectedQualifierValues.value = _.clone(dataState.selectedQualifierValues);
            // @NOTE: 'initialSelectedYears' must be set after 'breakdownOption'
            initialSelectedYears.value = _.clone(dataState.selectedYears);
            // @NOTE: 'initialActiveReferenceOptions' must be set after 'breakdownOption'
            initialActiveReferenceOptions.value = _.clone(dataState.activeReferenceOptions);
          }
        }
      },
      {
        immediate: true
      }
    );

    watchEffect(() => {
      if (metadata.value) {
        const timeseriesList = timeseriesDataForSelection.value;

        if (timeseriesList.length > 0) {
          // override the color of all loaded timeseries
          timeseriesList.forEach(timeseries => {
            timeseries.color = colorFromIndex(datacubeIndex.value);
          });

          regionRunsScenarios.value = timeseriesList.map(timeseries => ({ name: timeseries.name, color: timeseries.color }));

          emit('loaded-timeseries', itemId.value, timeseriesList);
        }
      }
    });

    const { statusColor, statusLabel } = useDatacubeVersioning(metadata);

    const selectedScenarioIndex = ref(0);
    const regionRunsScenarios = ref([] as {name: string; color: string}[]);

    // FIXME: See note in datacube-card
    const regionMapData = computed<BarData[]>(() => {
      if (regionalData.value === null) {
        return [];
      }
      const timeseriesToGetRegionDataFrom =
        timeseriesDataForSelection.value[selectedScenarioIndex.value];
      let timeseriesKey = '';
      if (timeseriesToGetRegionDataFrom === undefined) {
        timeseriesKey = '';
      } else if (breakdownOption.value === SPLIT_BY_VARIABLE) {
        // FIXME: useMultiTimeseriesData is only used when split by variable is
        //  active, but it sets all timeseries IDs to the same scenarioId, so
        //  they're not unique. In this case the feature name should be used as
        //  both the timeseries name and ID and there are many conditionals like
        //  this one which can then be cleaned up.
        timeseriesKey = timeseriesToGetRegionDataFrom.name;
      } else {
        timeseriesKey = timeseriesToGetRegionDataFrom.id;
      }
      const selectedRegionalData = getActiveRegions(
        regionalData.value,
        selectedRegionIdsAtAllLevels.value
      );
      return convertRegionalDataToBarData(
        selectedRegionalData,
        selectedAdminLevel.value,
        timeseriesKey,
        numberOfColorBins.value,
        finalColorScheme.value,
        selectedDataLayerTransparency.value
      );
    });

    return {
      selectedTemporalResolution,
      selectedTemporalAggregation,
      selectedSpatialAggregation,
      selectedScenarioIds,
      selectedRegionIds,
      selectedRegionIdsAtAllLevels,
      selectedRegionsString,
      mapBounds,
      metadata,
      activeFeature,
      timeseriesData,
      breakdownOption,
      setBreakdownOption,
      AggregationOption,
      visibleTimeseriesData,
      project,
      store,
      DatacubeStatus,
      statusColor,
      statusLabel,
      regionMapData,
      popupFormatter: (feature: any) => popupFormatter(feature, true),
      selectedScenarioIndex,
      regionRunsScenarios,
      selectedAdminLevel,
      mapLegendData,
      isContinuousScale
    };
  },
  methods: {
    openDrilldown() {
      openDatacubeDrilldown(
        this.id,
        this.itemId,
        router,
        this.project,
        this.analysisId
      );
    },
    clickRemove() {
      this.$emit('remove-analysis-item', this.itemId);
    },
    clickDuplicate() {
      this.$emit('duplicate-analysis-item', this.itemId);
    }
  }
});
</script>

<style lang="scss" scoped>
@import '~styles/variables';

.datacube-card-container {
  background: $background-light-1;
  border-radius: 2px;
  border-width: 3px;
  border-style: solid;
  border-color: inherit;
  height: 100%;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  text-overflow: hidden;
  white-space: nowrap;
}

.datacube-header {
  display: flex;
  align-items: center;

  .datacube-title-area {
    display: flex;
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

  white-space: nowrap;
  text-overflow: ellipsis;
  overflow: hidden;
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
  flex-direction: column;
}

.card-maps-legend-container {
  display: flex;
  flex-direction: column;
  .top-padding {
    height: 19px;
  }
}

.card-maps-box {
  flex: 3;
  min-width: 0;
  display: flex;
  flex-direction: row;
}

</style>