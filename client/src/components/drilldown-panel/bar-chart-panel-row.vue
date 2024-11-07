<template>
  <div
    class="bar-chart-panel-row-container"
    :class="{ canToggleExpanded: itemData.showExpandToggle }"
    @click="emit('toggle-expanded')"
  >
    <div v-for="i in itemData.indentationCount" :key="i" class="indentation" />
    <i
      v-if="itemData.showExpandToggle"
      class="unit-width fa fa-fw expand-toggle-icon"
      :class="{
        'fa-caret-down': itemData.isExpanded,
        'fa-caret-right': !itemData.isExpanded,
      }"
    />
    <div v-else class="unit-width" />
    <div v-tooltip.top-start="ancestorTooltip" class="content--multiple-rows">
      <span class="title un-font-small">
        <span class="faded">{{ ancestorPrefix }}</span>
        {{ itemData.name }}
      </span>
      <div v-for="(bar, index) in itemData.bars" :key="index" class="value-on-same-line">
        <div class="histogram-bar-wrapper">
          <AggregationChecklistBar
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
          class="un-font-small value"
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
  maxVisibleBarValue: number;
  minVisibleBarValue: number;
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
@import '@/styles/uncharted-design-tokens';

.bar-chart-panel-row-container {
  display: flex;

  &:hover .value {
    color: black;
  }

  &.canToggleExpanded {
    cursor: pointer;

    &:hover .expand-toggle-icon {
      color: black;
    }
  }
}

.unit-width {
  width: 20px;
}

.indentation {
  width: 20px;
}

.expand-toggle-icon {
  color: $un-color-black-20;
  margin-top: 4px;
}

.value {
  color: $subdued;
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
  width: 12ch;
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
