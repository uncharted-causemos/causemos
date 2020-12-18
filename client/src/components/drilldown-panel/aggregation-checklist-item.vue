<template>
  <div
    class="aggregation-checklist-item-container"
    :class="{ 'canToggleExpanded': itemData.showExpandToggle }"
    @click="toggleExpanded"
  >
    <i
      v-if="itemData.isSelectedAggregationLevel"
      class="fa fa-lg fa-fw unit-width agg-item-checkbox"
      :class="{
        'fa-check-square-o': itemData.isChecked,
        'fa-square-o': !itemData.isChecked,
      }"
      @click.stop="toggleChecked"
    />
    <div
      v-for="i in itemData.indentationCount"
      :key="i"
      class="indentation"
    />
    <i
      v-if="itemData.showExpandToggle"
      class="unit-width fa fa-fw"
      :class="{
        'fa-angle-down': itemData.isExpanded,
        'fa-angle-right': !itemData.isExpanded
      }"
    />
    <div
      v-else
      class="unit-width"
    />
    <div
      v-tooltip.top-start="ancestorTooltip"
      class="content"
    >
      <span class="title">
        <span class="faded">{{ ancestorPrefix }}</span>
        {{ itemData.name }}
      </span>
      <span :class="{ 'faded': !itemData.isSelectedAggregationLevel }">
        {{ itemData.value | precision-formatter }}
      </span>
      <div
        v-if="itemData.isSelectedAggregationLevel"
        class="histogram-bar"
        :class="{ 'faded': !itemData.isChecked }"
        :style="histogramBarStyle"
      />
    </div>
  </div>
</template>

<script>
const ANCESTOR_VISIBLE_CHAR_COUNT = 8;

export default {
  name: 'AggregationChecklistItem',
  props: {
    itemData: {
      type: Object,
      default: () => ({
        name: '[Aggregation Checklist Item]',
        value: 0,
        isSelectedAggregationLevel: false,
        showExpandToggle: false,
        isExpanded: false,
        isChecked: false,
        indentationCount: 0,
        hiddenAncestors: []
      })
    },
    maxVisibleBarValue: {
      type: Number,
      default: 0
    }
  },
  computed: {
    ancestorPrefix() {
      const hA = this.itemData.hiddenAncestors;
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
      const hA = this.itemData.hiddenAncestors;
      let tooltip = '';
      hA.forEach(ancestor => {
        tooltip += `${ancestor} / `;
      });
      tooltip += this.itemData.name;
      return { content: tooltip, classes: 'agg-checklist-item-ancestor-tooltip' };
    },
    histogramBarStyle() {
      const percentage = this.itemData.value / this.maxVisibleBarValue * 100;
      return { width: `${percentage}%` };
    }
  },
  methods: {
    toggleExpanded() {
      this.$emit('toggle-expanded');
    },
    toggleChecked() {
      this.$emit('toggle-checked');
    }
  }
};
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

.unit-width, .indentation {
  margin-right: 10px;
}

.content {
  flex: 1;
  display: flex;
  position: relative;

  .title {
    flex: 1;
  }
}

span.faded {
  color: #B3B4B5;
}

.histogram-bar {
  position: absolute;
  bottom: 100%;
  left: 0;
  width: 100%;
  height: 4px;
  // TODO: add support for a function parameter to determine colour
  background: blue;

  &.faded {
    background: #B3B4B5;
  }
}

</style>
