<template>
  <hideable-legend>
    <div class="cag-legend">
      <div class="column edge-column">
        <div class="edge-row">
          <arrow-icon class="arrow" :type="ArrowType.Positive"/>
          <span>Increase of A <strong class="positive">increases</strong> B</span>
        </div>
        <div class="edge-row">
          <arrow-icon class="arrow" :type="ArrowType.Negative"/>
          <span>Increase of A <strong class="negative">decreases</strong> B</span>
        </div>

        <div class="edge-row">
          <arrow-icon class="arrow" :type="ArrowType.Ambiguous"/>
          <span>A <strong class="ambiguous">increases or decreases</strong> B</span>
        </div>

        <div class="edge-row">
          <arrow-icon class="arrow" :type="ArrowType.NoEvidence"/>
          <span>No evidence</span>
        </div>
      </div>
      <div class="column histogram-y-axis" v-if="areHistogramsVisible">
        <span>Change in value</span>
        <span class="faded">Much higher than now</span>
        <span class="faded">Higher than now</span>
        <span class="faded">Negligible change from now</span>
        <span class="faded">Lower than now</span>
        <span class="faded">Much lower than now</span>
      </div>
      <div
        class="column histogram-column"
        v-for="label of histogramTimeSliceLabels"
        :key="label"
      >
        <span class="faded">In {{ label }}</span>
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
import HideableLegend from '@/components/widgets/hideable-legend.vue';
import ArrowIcon, { ArrowType } from '@/components/graph/arrow-icon.vue';

export default defineComponent({
  name: 'CagLegend',
  components: { HideableLegend, ArrowIcon },
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
      ),
      ArrowType
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

.edge-row {
  display: flex;
  gap: 5px;
}

.arrow {
  width: 20px;
}

.histogram-y-axis {
  text-align: right;
  margin-left: 20px;
}

.histogram-column {
  margin-left: 10px;
  // Hardcoded to the approximate length of the longest label,
  //  "In several weeks"
  width: 96px;
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

.faded {
  color: $text-color-medium;
}

</style>
