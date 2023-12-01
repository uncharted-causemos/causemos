<template>
  <div
    class="bar-chart-panel-row-container"
    :class="{ canToggleExpanded: itemData.showExpandToggle }"
    @click="emit('toggle-expanded')"
  >
    <div v-for="i in itemData.indentationCount" :key="i" class="indentation" />
    <i
      v-if="itemData.showExpandToggle"
      class="icon-centered unit-width fa fa-fw"
      :class="{
        'fa-angle-down': itemData.isExpanded,
        'fa-angle-right': !itemData.isExpanded,
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
      <AggregationChecklistBar
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
    <div v-else v-tooltip.top-start="ancestorTooltip" class="content--multiple-rows">
      <span class="title">
        <span class="faded">{{ ancestorPrefix }}</span>
        {{ itemData.name }}
      </span>
      <div v-for="(bar, index) in itemData.bars" :key="index" class="value-on-same-line">
        <div class="histogram-bar-wrapper">
          <AggregationChecklistBar
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
            faded: !itemData.isSelectedAggregationLevel || !itemData.isChecked,
            'multiple-row-label': true,
          }"
          :style="{ color: bar.color }"
        >
          {{ valueFormatter(bar.value) }}
        </span>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { TimeseriesPointSelection } from '@/types/Timeseries';
import AggregationChecklistBar from '@/components/drilldown-panel/aggregation-checklist-bar.vue';
import { valueFormatter } from '@/utils/string-util';
import { computed, toRefs } from 'vue';

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

const emit = defineEmits<{ (e: 'toggle-expanded'): void }>();
const props = defineProps<{
  itemData: AggregationChecklistItemPropType;
  histogramVisible: boolean;
  maxVisibleBarValue: number;
  minVisibleBarValue: number;
  selectedTimeseriesPoints: TimeseriesPointSelection[];
}>();
const { itemData } = toRefs(props);

const ancestorPrefix = computed(() => {
  const hA = itemData.value.hiddenAncestorNames;
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
});
const ancestorTooltip = computed(() => {
  const hA = itemData.value.hiddenAncestorNames;
  let tooltip = '';
  hA.forEach((ancestor) => {
    tooltip += `${ancestor} / `;
  });
  tooltip += itemData.value.name;
  return tooltip;
});
</script>

<style lang="scss" scoped>
.bar-chart-panel-row-container {
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
