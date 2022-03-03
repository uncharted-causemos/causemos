<template>
  <div class="datacube-region-ranking-composite-container">
    <main>
      <div class="chart-and-footer">
        <bar-chart
          class="bar-chart"
          :bars-data="barsData"
          :hover-id="barChartHoverId"
          @bar-chart-hover="$emit('bar-chart-hover', $event)"
        />
        <div class="row datacube-footer">Showing data for {{timestampFormatter(selectedTimestamp)}} (or earlier)</div>
      </div>
      <div class="card-maps-box">
        <region-map class="region-map-container"
          :data="barsData"
          :selected-admin-level="selectedAdminLevel"
          :map-bounds="mapBounds"
          :selected-id="barChartHoverId"
          @click-region="$emit('map-click-region', $event)"/>
        <div v-if="mapLegendData.length > 0" class="card-maps-legend-container">
          <map-legend :ramp="mapLegendData" :label-position="{ top: false, right: true }" :isContinuos="false" />
        </div>
      </div>
    </main>
  </div>
</template>

<script lang="ts">
import { defineComponent, PropType, ref, toRefs, watch } from 'vue';
import { BarData } from '@/types/BarChart';
import dateFormatter from '@/formatters/date-formatter';
import BarChart from '@/components/widgets/charts/bar-chart.vue';
import RegionMap from '@/components/widgets/region-map.vue';
import MapLegend from '@/components/widgets/map-legend.vue';
import { COLOR_SCHEME } from '@/utils/colors-util';
import { MapLegendColor } from '@/types/Common';

export default defineComponent({
  name: 'DatacubeRegionRankingCompositeCard',
  components: {
    BarChart,
    RegionMap,
    MapLegend
  },
  emits: ['bar-chart-hover', 'map-click-region'],
  props: {
    barsData: {
      type: Array as PropType<BarData[]>,
      default: []
    },
    selectedTimestamp: {
      type: Number,
      default: 0
    },
    selectedAdminLevel: {
      type: Number,
      default: 0
    },
    selectedColorScheme: {
      type: Array as PropType<string[]>,
      default: COLOR_SCHEME.PRIORITIZATION
    },
    barChartHoverId: {
      type: String,
      default: ''
    },
    mapBounds: {
      type: Array,
      default: () => undefined
    }
  },
  setup(props) {
    const {
      selectedColorScheme
    } = toRefs(props);
    const mapLegendData = ref<MapLegendColor[]>([]);

    watch(
      () => [
        selectedColorScheme.value
      ],
      () => {
        if (selectedColorScheme.value.length > 0) {
          const data: MapLegendColor[] = [];
          selectedColorScheme.value.forEach((colorStop, index) => {
            data.push({ color: colorStop, label: (index + 1).toString() });
          });
          data[0].decor = '0'; // FIXME: this should be set properly to align the composite mini-map with the other maps
          mapLegendData.value = data;
        }
      },
      { immediate: true }
    );

    return {
      mapLegendData,
      timestampFormatter: (value: any) => dateFormatter(value, 'MMM DD, YYYY')
    };
  }
});
</script>

<style lang="scss" scoped>
@import '~styles/variables';

.datacube-region-ranking-composite-container {
  background: $background-light-1;
  border-radius: 3px;
  height: 160px;
  display: flex;
  flex-direction: column;
  border: 1px solid $background-light-3;
  padding: 1rem;
}

.bar-chart {
  flex: 1;
  min-width: 0;
}

main {
  display: flex;
  flex: 1;
  min-height: 0;
}

.datacube-footer {
  margin-left: 2rem;
  font-size: small;
  display: flex;
  justify-content: space-around;
}

.checkbox {
  user-select: none; /* Standard syntax */
  display: inline-block;
  margin: 0;
  padding: 0;
  label {
    font-weight: normal;
    margin: 0;
    padding: 0;
    cursor: auto;
    color: gray;
  }
}

.datacube-footer {
  margin-left: 2rem;
  font-size: small;
  display: flex;
  justify-content: space-around;
}

.chart-and-footer {
  display: flex;
  flex-direction: column;
  flex: 1;
  min-width: 0;
}

.card-maps-box {
  display: flex;
  width: 180px;
  height: 100%;
  padding: 5px;
}

.card-maps-legend-container {
  display: flex;
  flex-direction: column;
  width: 25%;
  align-items: baseline;
  .top-padding {
    height: 19px;
  }
}

::v-deep(.color-ramp) {
  width: 10px; // FIXME: ideally this should be dynamic somehow to match the width of the legend colors in non-composite cards
}

.region-map-container {
  width: 75%;
}

</style>
