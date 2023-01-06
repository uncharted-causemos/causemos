<template>
  <hideable-legend>
    <div class="cag-legend">
      <div class="column edge-column">
        <div class="edge-row">
          <arrow-icon class="arrow" :type="ArrowType.Positive" />
          <span>Increase of A <strong class="positive">increases</strong> B</span>
        </div>
        <div class="edge-row">
          <arrow-icon class="arrow" :type="ArrowType.Negative" />
          <span>Increase of A <strong class="negative">decreases</strong> B</span>
        </div>

        <div class="edge-row">
          <arrow-icon class="arrow" :type="ArrowType.Ambiguous" />
          <span>A <strong class="ambiguous">increases or decreases</strong> B</span>
        </div>

        <div class="edge-row">
          <arrow-icon class="arrow" :type="ArrowType.NoEvidence" />
          <span>No evidence</span>
        </div>

        <div v-if="showEdgeTypeExplanation" class="edge-row">
          <i class="fa fa-fw fa-bolt" />
          <span>A's level (not trend) affects B</span>
        </div>
      </div>
      <div v-if="showDataWarnings" class="column data-warnings">
        <div class="data-warning old-data">Old data</div>
        <div class="data-warning no-data">Insufficient data</div>
      </div>
      <div v-if="areRidgelinesVisible" class="column">
        <img :src="ridgelineFilepath" />
      </div>
    </div>
  </hideable-legend>
</template>

<script lang="ts">
import { computed, defineComponent, PropType, toRefs } from 'vue';
import HideableLegend from '@/components/widgets/hideable-legend.vue';
import ArrowIcon, { ArrowType } from '@/components/graph/arrow-icon.vue';
import { TimeScale } from '@/types/Enums';

export default defineComponent({
  name: 'CagLegend',
  components: { HideableLegend, ArrowIcon },
  props: {
    timeScale: {
      type: String as PropType<TimeScale>,
      default: TimeScale.Months,
    },
    showDataWarnings: {
      type: Boolean,
      default: false,
    },
    showEdgeTypeExplanation: {
      type: Boolean,
      default: false,
    },
    areRidgelinesVisible: {
      type: Boolean,
      default: false,
    },
  },
  setup(props) {
    const { timeScale } = toRefs(props);
    const ridgelineFilepath = computed(() => {
      // NodeRequire type doesn't have `.context()`
      return (require as any).context('@/assets/')(
        `./ridgeline-legend-${timeScale.value === TimeScale.Years ? 'years' : 'months'}.svg`
      );
    });
    return {
      ArrowType,
      ridgelineFilepath,
    };
  },
});
</script>

<style lang="scss" scoped>
@import '@/styles/variables';

.cag-legend {
  display: flex;
  gap: 10px;
}

.column {
  display: flex;
  flex-direction: column;
}

.edge-row {
  display: flex;
  gap: 5px;
}

.arrow {
  width: 20px;
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

.data-warnings {
  gap: 5px;
}

.data-warning {
  padding: 5px;

  &.old-data {
    // From `scenario-renderer.ts`
    background: #f4efdb;
  }

  &.no-data {
    // From `scenario-renderer.ts`
    background: #f7e6aa;
  }
}
</style>
