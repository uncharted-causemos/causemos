<template>
  <div
    class="aggregation-checklist-item-container"
    :class="{ canToggleExpanded: itemData.showExpandToggle }"
    @click="toggleExpanded"
  >
    <i
      v-if="checkboxType !== null && itemData.isSelectedAggregationLevel"
      class="fa fa-lg fa-fw unit-width agg-item-checkbox icon-centered"
      :class="{
        'fa-circle': checkboxType === 'radio' && itemData.isChecked,
        'fa-circle-o': checkboxType === 'radio' && !itemData.isChecked,
        'fa-check-square-o': checkboxType === 'checkbox' && itemData.isChecked,
        'fa-square-o': checkboxType === 'checkbox' && !itemData.isChecked
      }"
      @click.stop="toggleChecked"
    />
    <!-- TODO: checkboxType === null -->
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
      v-if="itemData.bars.length === 1"
      v-tooltip.top-start="ancestorTooltip"
      class="content--single-row"
    >
      <div class="single-row-headings">
        <span class="title">
          <span class="faded">{{ ancestorPrefix }}</span>
          {{ itemData.name }}
        </span>
        <span :class="{ faded: !itemData.isSelectedAggregationLevel }">
          {{ valueFormatter(itemData.bars[0].value) }}
        </span>
      </div>
      <aggregation-checklist-bar
        v-if="histogramVisible"
        :barColor="itemData.bars[0].color"
        :barValue="itemData.bars[0].value"
        :isChecked="itemData.isChecked"
        :maxVisibleBarValue="maxVisibleBarValue"
        :minVisibleBarValue="minVisibleBarValue"
        :isSelectedAggregationLevel="itemData.isSelectedAggregationLevel"
        :isWrapped="false"
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
        v-for="(bar, index) in itemData.bars"
        :key="index"
        class="value-on-same-line"
      >
        <div class="histogram-bar-wrapper">
          <aggregation-checklist-bar
            v-if="histogramVisible"
            :barColor="bar.color"
            :barValue="bar.value"
            :isChecked="itemData.isChecked"
            :maxVisibleBarValue="maxVisibleBarValue"
            :minVisibleBarValue="minVisibleBarValue"
            :isSelectedAggregationLevel="itemData.isSelectedAggregationLevel"
            :isWrapped="true"
          />
        </div>
        <span
          :class="{
            'faded':
              !itemData.isSelectedAggregationLevel || !itemData.isChecked,
            'multiple-row-label': true
          }"
          :style="{ color: bar.color }"
        >
          {{ valueFormatter(bar.value) }}
        </span>
      </div>
    </div>
  </div>
</template>

<script lang="ts">
import * as d3 from 'd3';
import { TimeseriesPointSelection } from '@/types/Timeseries';
import { defineComponent, PropType } from '@vue/runtime-core';
import AggregationChecklistBar from '@/components/drilldown-panel/aggregation-checklist-bar.vue';
import { exponentFormatter } from '@/utils/string-util';

interface AggregationChecklistItemPropType {
  name: string;
  bars: { color: string; value: number }[];
  isSelectedAggregationLevel: boolean;
  showExpandToggle: boolean;
  isExpanded: boolean;
  isChecked: boolean;
  indentationCount: number;
  hiddenAncestorNames: string[];
}

const ANCESTOR_VISIBLE_CHAR_COUNT = 8;

export default defineComponent({
  name: 'AggregationChecklistItem',
  emits: ['toggle-expanded', 'toggle-checked'],
  components: {
    AggregationChecklistBar
  },
  props: {
    itemData: {
      type: Object as PropType<AggregationChecklistItemPropType>,
      default: () => ({
        name: '[Aggregation Checklist Item]',
        bars: [],
        isSelectedAggregationLevel: false,
        showExpandToggle: false,
        isExpanded: false,
        isChecked: false,
        indentationCount: 0,
        hiddenAncestorNames: []
      })
    },
    histogramVisible: {
      type: Boolean,
      default: true
    },
    maxVisibleBarValue: {
      type: Number,
      default: 0
    },
    minVisibleBarValue: {
      type: Number,
      default: 0
    },
    selectedTimeseriesPoints: {
      type: Array as PropType<TimeseriesPointSelection[]>,
      required: true
    },
    checkboxType: {
      type: String as PropType<'checkbox' | 'radio' | null>,
      default: null
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
      return tooltip;
    }
  },
  methods: {
    valueFormatter(v: number | null): string {
      if (v === null) return 'missing';
      if (v === 0 || Math.abs(v) >= 1) return d3.format(',.2f')(v);
      return exponentFormatter(v);
    },
    toggleExpanded() {
      this.$emit('toggle-expanded');
    },
    toggleChecked() {
      this.$emit('toggle-checked');
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
  flex-direction: column;
  .single-row-headings {
    display: flex;
    flex-direction: row;
  }
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

.histogram-bar-wrapper {
  flex: 1;
  position: relative;
}

</style>
