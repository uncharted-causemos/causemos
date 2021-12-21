<template>
  <div class="datacube-region-ranking-composite-container">
    <header class="datacube-header" >
      <h5 class="datacube-title-area">
        Custom Datacube
      </h5>
    </header>
    <main>
      <div class="chart-and-footer">
        <bar-chart
          class="bar-chart"
          :bars-data="barsData"
          :hover-info="barChartHoverInfo"
          @bar-chart-hover="$emit('bar-chart-hover', $event)"
        />
        <div class="row datacube-footer">Showing data for {{timestampFormatter(selectedTimestamp)}} (or earlier)</div>
      </div>
      <div class="datacube-map-placeholder" />
    </main>
  </div>
</template>

<script lang="ts">
import { defineComponent, PropType } from 'vue';
import { BarData } from '@/types/BarChart';
import dateFormatter from '@/formatters/date-formatter';
import BarChart from '@/components/widgets/charts/bar-chart.vue';

export default defineComponent({
  name: 'DatacubeRegionRankingCompositeCard',
  components: {
    BarChart
  },
  emits: ['bar-chart-hover'],
  props: {
    barsData: {
      type: Array as PropType<BarData[]>,
      default: []
    },
    selectedTimestamp: {
      type: Number,
      default: 0
    },
    barChartHoverInfo: {
      type: Object as PropType<{hoverId: string; isVisible: boolean}>,
      default: () => null
    }
  },
  setup() {
    return {
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
  height: 190px;
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

.datacube-map-placeholder {
  background-color: #fafafa;
  height: 100%;
  width: 150px;
  display: flex;
  flex-direction: column;
  padding: 5px;
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

.datacube-header {
  display: flex;
  align-items: center;
  align-self: baseline;

  .datacube-title-area {
    display: inline-block;
    flex: 1;
    min-width: 0;
    margin: 0;
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

</style>
