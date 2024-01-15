<template>
  <div class="datacube-card-container">
    <header class="datacube-header">
      <h5 v-if="metadata" class="datacube-title-area" @click="openDrilldown">
        <span>{{ outputDisplayName }} - {{ selectedRegionsString }}</span>
        <span class="datacube-name">{{ metadata.name }}</span>
        <span
          v-if="metadata.status === DatacubeStatus.Deprecated"
          style="margin-left: 1rem"
          :style="{ backgroundColor: statusColor }"
          >{{ statusLabel }}</span
        >
        <i class="fa fa-fw fa-expand drilldown-btn" />
      </h5>

      <options-button :dropdown-below="true">
        <template #content>
          <div class="dropdown-option" @click="clickRemove">Remove</div>
          <div class="dropdown-option" @click="clickDuplicate">Duplicate</div>
        </template>
      </options-button>
    </header>
    <main>
      <div class="card-maps-box">
        <region-map
          :data="regionMapData"
          :map-bounds="getMapBounds(outputsMetadata[selectedOutputIndex]?.id)"
          :popup-Formatter="popupFormatter"
          :region-filter="selectedRegionIdsAtAllLevels"
          :selected-admin-level="selectedAdminLevel"
          :disable-pan-zoom="true"
        />
        <map-legend
          v-if="mapLegendData.length > 0"
          :ramp="mapLegendData[0]"
          :isContinuous="isContinuousScale"
        />
      </div>
      <!-- legend of selected runs here, with a dropdown that indicates which run is selected -->
      <div style="display: flex; align-items: center; align-self: center">
        <div style="margin-right: 1rem">Total Timeseries: {{ outputsMetadata.length }}</div>
        <div style="display: flex; align-items: center">
          <div style="margin-right: 4px">Selected:</div>
          <select
            name="selectedRegionRankingRun"
            id="selectedRegionRankingRun"
            @change="event => selectedOutputIndex = (event.target as any).selectedIndex"
            :disabled="outputsMetadata.length === 1"
            :style="{
              color:
                outputsMetadata && outputsMetadata.length > selectedOutputIndex
                  ? outputsMetadata[selectedOutputIndex].color
                  : 'black',
            }"
          >
            <option
              v-for="(selected, indx) in outputsMetadata"
              :key="selected.name"
              :selected="indx === selectedOutputIndex"
            >
              {{ selected.name }}
            </option>
          </select>
        </div>
      </div>
    </main>
  </div>
</template>

<script lang="ts">
import useModelMetadata from '@/composables/useModelMetadata';
import { AnalysisItem } from '@/types/Analysis';
import { BreakdownState } from '@/types/Datacube';
import {
  convertRegionalDataToBarData,
  getAdminRegionSetsFromBreakdownState,
  getOutputDisplayNamesForBreakdownState,
  isBreakdownStateNone,
  isBreakdownStateOutputs,
} from '@/utils/datacube-util';
import { AggregationOption, DatacubeStatus } from '@/types/Enums';
import { computed, defineComponent, PropType, ref, toRefs, watchEffect } from 'vue';
import OptionsButton from '@/components/widgets/options-button.vue';
import { useStore } from 'vuex';
import router from '@/router';
import _ from 'lodash';
import useDatacubeVersioning from '@/composables/useDatacubeVersioning';
import { colorFromIndex, getColorScheme, isDiscreteScale } from '@/utils/colors-util';
import RegionMap from '@/components/widgets/region-map.vue';
import { BarData } from '@/types/BarChart';
import { openDatacubeDrilldown } from '@/services/analysis-service';
import MapLegend from '@/components/widgets/map-legend.vue';
import { getState as getAnalysisItemState } from '@/utils/analysis-util';
import {
  getAnalysisMapColorOptionsFromMapDisplayOptions,
  popupFormatter,
} from '@/utils/map-util-new';
import { getDefaultModelRunMetadata, getModelRunsByRunIds } from '@/services/datacube-service';
import {
  fixIncompleteDefaultBreakdownState,
  getBreakdownOptionFromBreakdownState,
} from '@/utils/legacy-data-space-state-util';
import useOutputSpecsFromBreakdownState from '@/composables/useOutputSpecsFromBreakdownState';
import useRegionalDataFromBreakdownState from '@/composables/useRegionalDataFromBreakdownState';
import useMapBoundsFromBreakdownState from '@/composables/useMapBoundsFromBreakdownState';
import {
  getAdminLevelFromSpatialAggregation,
  stringifySelectedRegions,
} from '@/utils/admin-level-util';
import { ModelRun } from '@/types/ModelRun';
import useAnalysisMapStats from '@/composables/useAnalysisMapStats';
import useTimeseriesDataFromBreakdownState from '@/composables/useTimeseriesDataFromBreakdownState';

export default defineComponent({
  name: 'DatacubeComparativeOverlayRegion',
  components: {
    OptionsButton,
    RegionMap,
    MapLegend,
  },
  props: {
    id: {
      type: String,
      required: true,
    },
    itemId: {
      type: String,
      required: true,
    },
    globalTimestamp: {
      type: Number,
      default: 0,
    },
    datacubeIndex: {
      type: Number,
      default: 0,
    },
    analysisItem: {
      type: Object as PropType<AnalysisItem>,
      required: true,
    },
    analysisId: {
      type: String,
      required: true,
    },
  },
  emits: [
    'loaded-timeseries',
    'loaded-metadata',
    'updated-feature-display-name',
    'remove-analysis-item',
    'duplicate-analysis-item',
  ],
  setup(props, { emit }) {
    const store = useStore();
    const project = computed(() => store.getters['app/project']);

    const { itemId, id: datacubeID, globalTimestamp, datacubeIndex, analysisItem } = toRefs(props);

    // =========== Datacube metadata ===========

    const metadata = useModelMetadata(datacubeID);
    watchEffect(() => {
      if (metadata.value !== null) {
        emit('loaded-metadata', itemId.value, metadata.value);
      }
    });
    const { statusColor, statusLabel } = useDatacubeVersioning(metadata);

    // Fetch default model run for model datacube
    const defaultModelRun = ref<ModelRun | null>(null);
    watchEffect(async () => {
      if (metadata.value?.type !== 'model') return;
      defaultModelRun.value = (await getDefaultModelRunMetadata(metadata.value.data_id)) ?? null;
    });
    const isMetadataLoaded = computed(
      () =>
        metadata.value !== null &&
        (metadata.value.type === 'model' ? defaultModelRun.value !== null : true)
    );

    // =========== Analysis item and breakdown state ===========
    const analysisItemState = computed(() => getAnalysisItemState(analysisItem.value));
    const breakdownState = computed(() =>
      fixIncompleteDefaultBreakdownState(
        analysisItemState.value.breakdownState,
        metadata.value,
        defaultModelRun.value
      )
    );
    const breakdownOption = computed(() =>
      getBreakdownOptionFromBreakdownState(breakdownState.value ?? ({} as BreakdownState))
    );
    const outputDisplayNames = computed(() =>
      getOutputDisplayNamesForBreakdownState(breakdownState.value, metadata.value?.outputs)
    );
    const outputDisplayName = computed(() => outputDisplayNames.value[0] ?? '');

    const spatialAggregationMethod = computed(
      () => analysisItemState.value.spatialAggregationMethod
    );
    const temporalAggregationMethod = computed(
      () => analysisItemState.value.temporalAggregationMethod
    );
    const temporalResolution = computed(() => analysisItemState.value.temporalResolution);

    // Timeseries data
    // Note: although this component doesn't need timeseries data, parent component is relying this component to provide
    // the timeseries data by sending an event. This seems to create unnecessary coupling but until we refactor CompAnalysis.vue file,
    // this is needed.
    const { timeseriesData: _timeseriesData } = useTimeseriesDataFromBreakdownState(
      breakdownState,
      metadata,
      spatialAggregationMethod,
      temporalAggregationMethod,
      temporalResolution
    );
    // Override the color of all loaded timeseries
    const timeseriesData = computed(() =>
      _timeseriesData.value.map((timeseries) => ({
        ...timeseries,
        name: timeseries.id === 'indicator' ? 'indicator' : timeseries.name,
        color: colorFromIndex(datacubeIndex.value),
      }))
    );
    watchEffect(() => {
      if (isMetadataLoaded.value)
        emit('loaded-timeseries', itemId.value, timeseriesData.value, {
          outputDisplayName: outputDisplayName.value,
          datacubeName: metadata.value?.name,
        });
    });
    // =====================

    // =========== Regional data and map ===========

    const { outputSpecs } = useOutputSpecsFromBreakdownState(
      breakdownState,
      metadata,
      spatialAggregationMethod,
      temporalAggregationMethod,
      temporalResolution,
      globalTimestamp
    );

    // Handle output data selection for region map data
    const modelRunsMetadata = ref<ModelRun[]>([]);
    watchEffect(async () => {
      if (!breakdownState.value || metadata.value?.type !== 'model') return;
      if (!isBreakdownStateNone(breakdownState.value)) return;
      modelRunsMetadata.value = await getModelRunsByRunIds(breakdownState.value.modelRunIds);
    });
    const _outputSpecIdToDisplayName = (
      id: string,
      breakdownState: BreakdownState | null,
      outputNameIndex: number
    ) => {
      if (breakdownState === null) return id;
      if (isBreakdownStateOutputs(breakdownState)) return outputDisplayNames.value[outputNameIndex];
      if (isBreakdownStateNone(breakdownState))
        return modelRunsMetadata.value.find((run) => run.id === id)?.name ?? id;
      return id;
    };

    const selectedOutputIndex = ref(0);
    const outputsMetadata = computed(() =>
      outputSpecs.value.map(({ id }, index) => ({
        id,
        name: _outputSpecIdToDisplayName(id, breakdownState.value, index),
        color: colorFromIndex(datacubeIndex.value),
      }))
    );

    // Fetch regional data
    const { regionalData } = useRegionalDataFromBreakdownState(
      breakdownState,
      metadata,
      outputSpecs,
      globalTimestamp
    );
    const { getMapBounds } = useMapBoundsFromBreakdownState(breakdownState, regionalData);

    const selectedAdminLevel = computed(
      () => getAdminLevelFromSpatialAggregation(analysisItemState.value.spatialAggregation) ?? 0
    );
    const selectedRegionsString = computed(() =>
      stringifySelectedRegions(selectedRegionIdsAtAllLevels.value, selectedAdminLevel.value)
    );
    const selectedRegionIdsAtAllLevels = computed(() =>
      getAdminRegionSetsFromBreakdownState(breakdownState.value)
    );

    // Populate map data
    const regionMapData = computed<BarData[]>(() => {
      if (regionalData.value === null) return [];
      if (outputSpecs.value.length === 0) return [];
      const outputId = outputSpecs.value[selectedOutputIndex.value].id;
      const {
        numberOfColorBins,
        dataLayerTransparency,
        colorScaleType,
        colorSchemeName,
        colorSchemeReversed,
      } = analysisItemState.value.mapDisplayOptions;
      return convertRegionalDataToBarData(
        regionalData.value,
        selectedAdminLevel.value ?? 0,
        outputId,
        numberOfColorBins,
        getColorScheme(colorScaleType, colorSchemeName, numberOfColorBins, colorSchemeReversed),
        dataLayerTransparency
      );
    });

    // Map legend data
    const showPercentChange = computed(
      () => !(breakdownState.value?.comparisonSettings.shouldDisplayAbsoluteValues ?? false)
    );
    const relativeTo = computed(() =>
      !showPercentChange.value
        ? null
        : breakdownState.value?.comparisonSettings.baselineTimeseriesId ?? null
    );
    const mapColorOptions = computed(() =>
      getAnalysisMapColorOptionsFromMapDisplayOptions(analysisItemState.value.mapDisplayOptions)
    );
    const isContinuousScale = computed(
      () => !isDiscreteScale(analysisItemState.value.mapDisplayOptions.colorScaleType)
    );
    const { mapLegendData } = useAnalysisMapStats(
      outputSpecs,
      regionalData,
      relativeTo,
      analysisItemState.value.mapDisplayOptions.selectedMapDataLayer,
      selectedAdminLevel,
      selectedRegionIdsAtAllLevels,
      showPercentChange,
      mapColorOptions,
      ref([]), // TODO: activeReferenceOptions,
      breakdownOption,
      ref([]) // TODO: rawDataPointsList
    );

    return {
      outputDisplayName,
      outputsMetadata,
      selectedOutputIndex,
      getMapBounds,
      mapLegendData,

      selectedRegionIdsAtAllLevels,
      selectedRegionsString,
      metadata,
      AggregationOption,
      project,
      store,
      DatacubeStatus,
      statusColor,
      statusLabel,
      regionMapData,
      popupFormatter: (feature: any) => popupFormatter(feature, true),
      selectedAdminLevel,
      isContinuousScale,
    };
  },
  methods: {
    openDrilldown() {
      openDatacubeDrilldown(this.id, this.itemId, router, this.project, this.analysisId);
    },
    clickRemove() {
      this.$emit('remove-analysis-item', this.itemId);
    },
    clickDuplicate() {
      this.$emit('duplicate-analysis-item', this.itemId);
    },
  },
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

.card-maps-box {
  flex: 3;
  min-width: 0;
  display: flex;
  flex-direction: row;
}
</style>
