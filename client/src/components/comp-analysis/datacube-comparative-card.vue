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
      <div class="chart-and-footer">
        <timeseries-chart
          v-if="timeseriesData.length > 0 && computedSelectedTimestamp !== null"
          class="timeseries-chart"
          :timeseries-data="timeseriesData"
          :selected-temporal-resolution="TemporalResolutionOption.Month"
          :selected-timestamp="computedSelectedTimestamp"
          :breakdown-option="breakdownOption"
          @select-timestamp="setSelectedTimestamp"
        >
          <template #timeseries-footer-contents>
            <div class="datacube-footer">
              <div>Aggregated by: {{ spatialAggregationMethod }}</div>
              <!-- legend of selected runs here, with a dropdown that indicates which run is selected -->
              <div style="display: flex; align-items: center">
                <div style="margin-right: 1rem">Total Timeseries: {{ timeseriesData.length }}</div>
                <div style="display: flex; align-items: center">
                  <div style="margin-right: 4px">Selected:</div>
                  <select
                    name="selectedRegionRankingRun"
                    id="selectedRegionRankingRun"
                    @change="event => selectedTimeseriesIndex = (event.target as any).selectedIndex"
                    :disabled="timeseriesData.length === 1"
                    :style="{
                      color:
                        timeseriesData && timeseriesData.length > selectedTimeseriesIndex
                          ? timeseriesData[selectedTimeseriesIndex].color
                          : 'black',
                    }"
                  >
                    <option
                      v-for="(selected, indx) in timeseriesData"
                      :key="selected.name"
                      :selected="indx === selectedTimeseriesIndex"
                    >
                      {{ selected.name }}
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
          :map-bounds="getMapBounds(timeseriesData[selectedTimeseriesIndex]?.id)"
          :popup-formatter="popupFormatter"
          :region-filter="selectedRegionIdsAtAllLevels"
          :selected-admin-level="selectedAdminLevel"
          :disable-pan-zoom="true"
        />
      </div>
    </main>
  </div>
</template>

<script lang="ts">
import _ from 'lodash';
import { useStore } from 'vuex';
import router from '@/router';
import { AggregationOption, TemporalResolutionOption, DatacubeStatus } from '@/types/Enums';
import { AnalysisItem } from '@/types/Analysis';
import { BarData } from '@/types/BarChart';
import { ModelRun } from '@/types/ModelRun';
import { computed, defineComponent, PropType, ref, toRefs, watchEffect } from 'vue';
import {
  convertRegionalDataToBarData,
  getAdminRegionSetsFromBreakdownState,
  getOutputDisplayNamesForBreakdownState,
} from '@/utils/datacube-util';
import { getDefaultModelRunMetadata } from '@/services/datacube-service';
import OptionsButton from '@/components/widgets/options-button.vue';
import TimeseriesChart from '@/components/widgets/charts/timeseries-chart.vue';
import useDatacubeVersioning from '@/composables/useDatacubeVersioning';
import { colorFromIndex, getColorScheme } from '@/utils/colors-util';
import RegionMap from '@/components/widgets/region-map.vue';
import { popupFormatter } from '@/utils/map-util-new';
import { openDatacubeDrilldown } from '@/services/analysis-service';
import { getState as getAnalysisItemState } from '@/utils/analysis-util';
import { BreakdownState } from '@/types/Datacube';
import useModelMetadata from '@/composables/useModelMetadata';
import useTimeseriesDataFromBreakdownState from '@/composables/useTimeseriesDataFromBreakdownState';
import useRegionalDataFromBreakdownState from '@/composables/useRegionalDataFromBreakdownState';
import useOutputSpecsFromBreakdownState from '@/composables/useOutputSpecsFromBreakdownState';
import { getTimestampRange } from '@/utils/timeseries-util';
import {
  fixIncompleteDefaultBreakdownState,
  getBreakdownOptionFromBreakdownState,
} from '@/utils/legacy-data-space-state-util';
import useMapBoundsFromBreakdownState from '@/composables/useMapBoundsFromBreakdownState';
import {
  getAdminLevelFromSpatialAggregation,
  stringifySelectedRegions,
} from '@/utils/admin-level-util';

export default defineComponent({
  name: 'DatacubeComparativeCard',
  components: {
    OptionsButton,
    TimeseriesChart,
    RegionMap,
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
    selectedTimestamp: {
      type: Number,
      default: null,
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
    'select-timestamp',
    'loaded-timeseries',
    'loaded-metadata',
    'updated-feature-display-name',
    'set-analysis-item-view-config',
    'remove-analysis-item',
    'duplicate-analysis-item',
  ],
  setup(props, { emit }) {
    const store = useStore();
    const project = computed(() => store.getters['app/project']);

    const {
      itemId,
      id: datacubeId,
      selectedTimestamp,
      datacubeIndex,
      analysisItem,
    } = toRefs(props);

    // =========== Datacube metadata ===========

    const metadata = useModelMetadata(datacubeId);
    watchEffect(() => {
      if (metadata.value !== null) {
        emit('loaded-metadata', itemId.value, metadata.value);
      }
    });
    const { statusColor, statusLabel } = useDatacubeVersioning(metadata);

    const isMetadataLoaded = ref(false);

    // Fetch default model run for model datacube
    const defaultModelRun = ref<ModelRun | null>(null);
    watchEffect(async () => {
      if (metadata.value?.type === 'model') {
        isMetadataLoaded.value = false;
        defaultModelRun.value = (await getDefaultModelRunMetadata(metadata.value.data_id)) ?? null;
      }
      isMetadataLoaded.value = !!metadata.value;
    });

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
    const outputDisplayName = computed(
      () =>
        getOutputDisplayNamesForBreakdownState(breakdownState.value, metadata.value?.outputs)[0] ??
        ''
    );

    const spatialAggregationMethod = computed(
      () => analysisItemState.value.spatialAggregationMethod
    );
    const temporalAggregationMethod = computed(
      () => analysisItemState.value.temporalAggregationMethod
    );
    const temporalResolution = computed(() => analysisItemState.value.temporalResolution);

    // =========== Timeseries data ===========

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

    // Handle timeseries(scenario) selection for region map data
    const selectedTimeseriesIndex = ref(0);

    // Handle selected timestamp
    const defaultSelectedTimestamp = computed(
      () => analysisItemState.value.selectedTimestamp ?? getTimestampRange(timeseriesData.value).end
    );
    const computedSelectedTimestamp = computed(
      () => selectedTimestamp.value ?? defaultSelectedTimestamp.value
    );
    const setSelectedTimestamp = (value: number) => {
      if (selectedTimestamp.value === value) {
        return;
      }
      // emit the timestamp so that the parent component can set and sync others
      emit('select-timestamp', value);
    };

    // =========== Regional data and map ===========

    const { outputSpecs } = useOutputSpecsFromBreakdownState(
      breakdownState,
      metadata,
      spatialAggregationMethod,
      temporalAggregationMethod,
      temporalResolution,
      computedSelectedTimestamp
    );
    const { regionalData } = useRegionalDataFromBreakdownState(
      breakdownState,
      metadata,
      outputSpecs,
      computedSelectedTimestamp
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

    const regionMapData = computed<BarData[]>(() => {
      if (regionalData.value === null) return [];
      if (timeseriesData.value.length === 0) return [];
      const timeseriesId = timeseriesData.value[selectedTimeseriesIndex.value].id;
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
        timeseriesId,
        numberOfColorBins,
        getColorScheme(colorScaleType, colorSchemeName, numberOfColorBins, colorSchemeReversed),
        dataLayerTransparency
      );
    });

    return {
      project,
      metadata,
      breakdownState,
      statusColor,
      statusLabel,
      outputDisplayName,
      timeseriesData,
      setSelectedTimestamp,
      spatialAggregationMethod,
      breakdownOption,
      computedSelectedTimestamp,
      regionMapData,
      getMapBounds,
      selectedTimeseriesIndex,
      selectedAdminLevel,
      selectedRegionsString,
      selectedRegionIdsAtAllLevels,
      AggregationOption,
      DatacubeStatus,
      TemporalResolutionOption,
      popupFormatter: (feature: any) => popupFormatter(feature, false),
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
