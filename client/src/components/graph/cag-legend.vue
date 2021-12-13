<template>
  <hideable-legend>
    <div class="cag-legend">
      <div class="column edge-column">
        <span>Increase of A <strong class="positive">increases</strong> B</span>
        <span>Increase of A <strong class="negative">decreases</strong> B</span>
        <span>A <strong class="ambiguous">increases or decreases</strong> B</span>
        <span>No evidence</span>
      </div>
      <div class="column histogram-y-axis" v-if="areHistogramsVisible">
        <span>Change in value</span>
        <span>Much higher than now</span>
        <span>Higher than now</span>
        <span>Negligible change from now</span>
        <span>Lower than now</span>
        <span>Much lower than now</span>
      </div>
      <div
        class="column histogram-column"
        v-for="label of histogramTimeSliceLabels"
        :key="label"
      >
        <span>{{ label }}</span>
        <div
          class="histogram-row"
          v-for="(histogramValue, index) of [15, 25, 30, 20, 10]"
          :key="index"
        >
          <div class="histogram-bar" :style="{ width: histogramValue + '%' }" />
        </div>
      </div>
    </div>
  </hideable-legend>
</template>

<script lang="ts">
import { defineComponent, PropType, toRefs, computed } from 'vue';
import HideableLegend from '../widgets/hideable-legend.vue';
export default defineComponent({
  name: 'CagLegend',
  components: { HideableLegend },
  props: {
    histogramTimeSliceLabels: {
      type: Array as PropType<string[]>,
      required: true
    }
  },
  setup(props) {
    const { histogramTimeSliceLabels } = toRefs(props);
    return {
      areHistogramsVisible: computed(
        () => histogramTimeSliceLabels.value.length > 0
      )
    };
  }
});
</script>

<style lang="scss" scoped>
@import '@/styles/variables';

.cag-legend {
  display: flex;
}

.column {
  display: flex;
  flex-direction: column;
  margin-left: 5px;
}

.histogram-y-axis {
  text-align: right;
}

.histogram-column {
}

.histogram-row {
  background: #efefef;
  flex: 1;
  min-height: 0;
  margin-top: 2px;
  position: relative;

  .histogram-bar {
    background: #D6D7D7;
    height: 100%;
  }
}

.positive {
  color: $positive;
}

.negative {
  color: $negative;
}

.ambiguous {
  color: $text-color-medium;
}

</style>
