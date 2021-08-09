<template>
  <div
    class="aggregation-checklist-item-container"
    :class="{ canToggleExpanded: itemData.showExpandToggle }"
    @click="toggleExpanded"
  >
    <i
      v-if="itemData.isSelectedAggregationLevel && isRadioButtonModeActive"
      class="fa fa-lg fa-fw unit-width agg-item-checkbox icon-centered"
      :class="{
        'fa-circle': itemData.isChecked,
        'fa-circle-o': !itemData.isChecked
      }"
      @click.stop="toggleChecked"
    />
    <i
      v-if="itemData.isSelectedAggregationLevel && !isRadioButtonModeActive"
      class="fa fa-lg fa-fw unit-width agg-item-checkbox icon-centered"
      :class="{
        'fa-check-square-o': itemData.isChecked,
        'fa-square-o': !itemData.isChecked
      }"
      @click.stop="toggleChecked"
    />
    <div v-for="i in itemData.indentationCount" :key="i" class="indentation" />
    <i
      v-if="itemData.showExpandToggle"
      class="icon-centered unit-width fa fa-fw"
      :class="{
        'fa-angle-down': itemData.isExpanded,
        'fa-angle-right': !itemData.isExpanded
      }"
    />
    <div v-else class="unit-width" />
    <div
      v-if="itemData.values.length === 1"
      v-tooltip.top-start="ancestorTooltip"
      class="content--single-row"
    >
      <span class="title">
        <span class="faded">{{ ancestorPrefix }}</span>
        {{ itemData.name }}
      </span>
      <span :class="{ faded: !itemData.isSelectedAggregationLevel }">
        {{ precisionFormatter(itemData.values[0]) ?? 'missing' }}
      </span>
      <div
        v-if="itemData.isSelectedAggregationLevel"
        class="histogram-bar"
        :class="{ faded: !itemData.isChecked }"
        :style="histogramBarStyle(itemData.values[0], 0)"
      />
    </div>
    <div
      v-else
      v-tooltip.top-start="ancestorTooltip"
      class="content--multiple-rows"
    >
      <span class="title">
        <span class="faded">{{ ancestorPrefix }}</span>
        {{ itemData.name }}
      </span>
      <div
        v-for="(value, index) in itemData.values"
        :key="index"
        class="value-on-same-line"
      >
        <div class="histogram-bar-wrapper">
          <div
            v-if="itemData.isSelectedAggregationLevel"
            class="histogram-bar"
            :class="{ faded: !itemData.isChecked }"
            :style="histogramBarStyle(value, index)"
          />
        </div>
        <span
          :class="{
            'faded':
              !itemData.isSelectedAggregationLevel || !itemData.isChecked,
            'multiple-row-label': true
          }"
          :style="textColorStyle(index)"
        >
          {{ precisionFormatter(value) ?? 'missing' }}
        </span>
      </div>
    </div>
  </div>
</template>

<script lang="ts">
import precisionFormatter from '@/formatters/precision-formatter';
import { TimeseriesPointSelection } from '@/types/Timeseries';
import { colorFromIndex } from '@/utils/colors-util';
import { defineComponent, PropType } from '@vue/runtime-core';

const ANCESTOR_VISIBLE_CHAR_COUNT = 8;

interface AggregationChecklistItemPropType {
  name: string;
  values: (number | null)[];
  isSelectedAggregationLevel: boolean;
  showExpandToggle: boolean;
  isExpanded: boolean;
  isChecked: boolean;
  indentationCount: number;
  hiddenAncestorNames: string[];
}

export default defineComponent({
  name: 'AggregationChecklistItem',
  emits: ['toggle-expanded', 'toggle-checked'],
  props: {
    itemData: {
      type: Object as PropType<AggregationChecklistItemPropType>,
      default: () => ({
        name: '[Aggregation Checklist Item]',
        values: [0],
        isSelectedAggregationLevel: false,
        showExpandToggle: false,
        isExpanded: false,
        isChecked: false,
        indentationCount: 0,
        hiddenAncestorNames: []
      })
    },
    maxVisibleBarValue: {
      type: Number,
      default: 0
    },
    selectedTimeseriesPoints: {
      type: Array as PropType<TimeseriesPointSelection[]>,
      required: true
    },
    isRadioButtonModeActive: {
      type: Boolean,
      default: false
    }
  },
  computed: {
    ancestorPrefix() {
      const hA = this.itemData.hiddenAncestorNames;
      let prefix = '';
      if (hA.length === 0) return prefix;
      if (hA.length > 1) {
        prefix += '.../';
      }
      const parent = hA[hA.length - 1];
      if (parent.length > ANCESTOR_VISIBLE_CHAR_COUNT) {
        prefix += parent.slice(0, ANCESTOR_VISIBLE_CHAR_COUNT) + '...';
      } else {
        prefix += parent;
      }
      return prefix + '/';
    },
    ancestorTooltip() {
      const hA = this.itemData.hiddenAncestorNames;
      let tooltip = '';
      hA.forEach(ancestor => {
        tooltip += `${ancestor} / `;
      });
      tooltip += this.itemData.name;
      return {
        content: tooltip,
        classes: 'agg-checklist-item-ancestor-tooltip'
      };
    }
  },
  methods: {
    precisionFormatter,
    toggleExpanded() {
      this.$emit('toggle-expanded');
    },
    toggleChecked() {
      this.$emit('toggle-checked');
    },
    histogramBarStyle(value: number | null, index: number) {
      const percentage =
        value !== null ? (value / this.maxVisibleBarValue) * 100 : 0;
      return { width: `${percentage}%`, background: colorFromIndex(index) };
    },
    textColorStyle(index: number) {
      return {
        color: colorFromIndex(index)
      };
    },
    colorFromIndex(index: number) {
      return this.selectedTimeseriesPoints[index].color;
    }
  }
});
</script>

<style lang="scss" scoped>
.aggregation-checklist-item-container {
  display: flex;
  padding-bottom: 4px;
  margin-bottom: 2px;

  &.canToggleExpanded {
    cursor: pointer;
  }
}

.agg-item-checkbox {
  cursor: pointer;
}

.icon-centered {
  margin-top: 2px;
}

.unit-width {
  width: 16px;
}

.indentation {
  width: 8px;
}

.unit-width,
.indentation {
  margin-right: 10px;
}

.content--single-row {
  flex: 1;
  display: flex;
  position: relative;

  .title {
    flex: 1;
  }
}

.content--multiple-rows {
  flex: 1;
  display: flex;
  flex-direction: column;
}

.multiple-row-label {
  // Have to hardcode the label width so that all histogram
  //  bars flex to fill the same amount of space, regardless
  //  of label value
  width: 8ch;
  text-align: right;
}

.value-on-same-line {
  display: flex;
}

span.faded {
  opacity: 50%;
}

.histogram-bar {
  position: absolute;
  top: 100%;
  left: 0;
  width: 100%;
  height: 4px;
  background: #8767c8;

  &.faded {
    opacity: 25%;
  }
}

.histogram-bar-wrapper {
  flex: 1;
  position: relative;
  .histogram-bar {
    top: 50%;
    transform: translateY(-50%);
  }
}
</style>
