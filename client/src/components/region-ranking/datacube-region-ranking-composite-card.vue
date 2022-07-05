<template>
  <div class="datacube-region-ranking-composite-container">
    <main>
      <div class="chart-and-footer">
        <div v-if="hiddenRegionRank > 0" class="hover-not-visible">
          <div style="display: flex; justify-content: space-between; min-width: 150px">
            <div>{{hiddenRegionName}}</div><div>{{hiddenRegionValue}}</div>
          </div>
          <div style="display: flex; justify-content: space-between; min-width: 150px">
            <div>Rank</div><div>{{hiddenRegionRank}}</div>
          </div>
        </div>
        <bar-chart
          class="bar-chart"
          :bars-data="topBarsData"
          :hover-id="barChartHoverId"
          @bar-chart-hover="$emit('bar-chart-hover', $event)"
        />
        <div class="datacube-footer">Showing data for {{timestampFormatter(selectedTimestamp)}} (or earlier)</div>
      </div>
      <div class="card-maps-box">
        <region-map class="region-map-container"
          :data="topBarsData"
          :selected-admin-level="selectedAdminLevel"
          :map-bounds="mapBounds"
          :selected-id="barChartHoverId"
          :disable-pan-zoom="true"
          @click-region="$emit('map-click-region', $event)"/>
        <div v-if="mapLegendData.length > 0" class="card-maps-legend-container">
          <map-legend :ramp="mapLegendData" :label-position="{ top: false, right: true }" :isContinuos="false" />
        </div>
      </div>
    </main>
  </div>
</template>

<script lang="ts">
import { defineComponent, PropType, ref, toRefs, watch, computed } from 'vue';
import { BarData } from '@/types/BarChart';
import dateFormatter from '@/formatters/date-formatter';
import BarChart from '@/components/widgets/charts/bar-chart.vue';
import RegionMap from '@/components/widgets/region-map.vue';
import MapLegend from '@/components/widgets/map-legend.vue';
import { COLOR_SCHEME } from '@/utils/colors-util';
import { MapLegendColor } from '@/types/Common';
import { chartValueFormatter } from '@/utils/string-util';

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
    maxNumberOfChartBars: {
      type: Number,
      default: -1
    },
    limitNumberOfChartBars: {
      type: Boolean,
      default: false
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
      selectedColorScheme,
      barChartHoverId
    } = toRefs(props);
    const mapLegendData = ref<MapLegendColor[]>([]);

    const topBarsData = computed(() => {
      return props.limitNumberOfChartBars ? props.barsData.slice(-props.maxNumberOfChartBars) : props.barsData;
    });

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

    // When selected region changes, check if we can display the native tooltip, or if the region is hidden/clipped
    const hiddenRegionRank = ref(-1);
    const hiddenRegionName = ref('');
    const hiddenRegionValue = ref('');
    watch(
      () => [barChartHoverId.value],
      () => {
        hiddenRegionValue.value = '';
        hiddenRegionRank.value = -1;
        hiddenRegionName.value = '';

        if (barChartHoverId.value && props.maxNumberOfChartBars > 0) {
          const targetBarInfo = props.barsData.find(regionInfo => regionInfo.label === barChartHoverId.value);

          const valueFormatter = chartValueFormatter(...props.barsData.map(d => d.value));

          if (targetBarInfo) {
            const rank = +targetBarInfo.name;
            if (rank > props.maxNumberOfChartBars) {
              console.log('should show hidden information as a tooltip', targetBarInfo);
              hiddenRegionRank.value = rank;
              hiddenRegionName.value = targetBarInfo.label;
              hiddenRegionValue.value = valueFormatter(targetBarInfo.value);
            }
          }
        }
      },
      { immediate: true }
    );

    return {
      mapLegendData,
      timestampFormatter: (value: any) => dateFormatter(value, 'MMM DD, YYYY'),
      topBarsData,

      hiddenRegionName,
      hiddenRegionValue,
      hiddenRegionRank
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
  position: relative;
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

:deep(.color-ramp) {
  width: 10px; // FIXME: ideally this should be dynamic somehow to match the width of the legend colors in non-composite cards
}

.region-map-container {
  width: 75%;
}

.hover-not-visible {
  position: absolute;
  left: 50%;
  border: #BBB;
  border-style: solid;
  border-radius: 2px;
  background-color: #F4F4F4;
  color: blue;
  z-index: 1;
  padding: 4px;
}


</style>
