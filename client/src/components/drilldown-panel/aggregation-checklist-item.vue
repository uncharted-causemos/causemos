<template>
  <div
    class="aggregation-checklist-item-container"
    :class="{ canToggleExpanded: itemData.showExpandToggle }"
    @click="toggleExpanded"
  >
    <i
      v-if="itemData.isSelectedAggregationLevel"
      class="fa fa-lg fa-fw unit-width agg-item-checkbox"
      :class="{
        'fa-check-square-o': itemData.isChecked,
        'fa-square-o': !itemData.isChecked
      }"
      @click.stop="toggleChecked"
    />
    <div v-for="i in itemData.indentationCount" :key="i" class="indentation" />
    <i
      v-if="itemData.showExpandToggle"
      class="unit-width fa fa-fw"
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
        {{ precisionFormatter(itemData.values[0]) }}
      </span>
      <div
        v-if="itemData.isSelectedAggregationLevel"
        class="histogram-bar"
        :class="{ faded: !itemData.isChecked }"
        :style="histogramBarStyle(itemData.values[0])"
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
            :style="histogramBarStyle(value)"
          />
          <!-- TODO: pass index as well for colorization -->
        </div>
        <span :class="{ faded: !itemData.isSelectedAggregationLevel }">
          {{ precisionFormatter(value) }}
        </span>
      </div>
    </div>
  </div>
</template>

<script lang="ts">
import precisionFormatter from '@/formatters/precision-formatter';
import { defineComponent, PropType } from '@vue/runtime-core';

const ANCESTOR_VISIBLE_CHAR_COUNT = 8;

interface AggregationChecklistItemPropType {
  name: string;
  values: number[];
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
    histogramBarStyle(value: number) {
      const percentage = (value / this.maxVisibleBarValue) * 100;
      return { width: `${percentage}%` };
    }
  }
});
</script>

<style lang="scss" scoped>
.aggregation-checklist-item-container {
  display: flex;
  align-items: center;
  padding-bottom: 4px;
  margin-bottom: 7px;

  &.canToggleExpanded {
    cursor: pointer;
  }
}

.agg-item-checkbox {
  cursor: pointer;
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

.value-on-same-line {
  display: flex;
}

span.faded {
  color: #b3b4b5;
}

.histogram-bar {
  position: absolute;
  top: 100%;
  left: 0;
  width: 100%;
  height: 4px;
  // TODO: add support for a function parameter to determine colour
  background: #8767c8;

  &.faded {
    background: #b3b4b5;
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
