<template>
  <div>
    <h5 class="aggregation-level-title">{{ aggregationLevelType }}: <strong>{{ aggregationLevelTitle }}</strong></h5>
    <disclaimer
      :message="'NOTE: The data displayed below is for example purposes only. ' +
        'It is static and derived by averaging values from the GADM model. ' +
        'In the future these aggregations would be shown for all supported models.'"
    />
    <div class="aggregation-level-range-container">
      <input
        type="range"
        class="aggregation-level-range"
        :value="aggregationLevel"
        :min="0"
        :max="aggregationLevelCount - 1"
        @input="onRangeValueChanged"
      >
      <div
        v-for="tickIndex in aggregationLevelCount"
        :key="tickIndex"
        class="aggregation-level-tick"
        :class="{ 'hidden': (tickIndex - 1) === aggregationLevel }"
        :style="tickStyle(tickIndex)"
        @click="changeAggregationLevel(tickIndex - 1)"
      />
    </div>
    <div class="checklist-container">
      <aggregation-checklist-item
        v-for="(row, rowIndex) of visibleRows"
        :key="rowIndex"
        :item-data="row"
        :max-visible-bar-value="maxVisibleBarValue"
        @toggle-expanded="toggleExpanded(row.path)"
        @toggle-checked="toggleChecked(row.path)"
      />
    </div>
  </div>
</template>

<script>
import _ from 'lodash';
import AggregationChecklistItem from '@/components/drilldown-panel/aggregation-checklist-item';
import Disclaimer from '../widgets/disclaimer.vue';

const findNode = (tree, path) => {
  let currentNode = tree;
  for (const nodeIndex of path) {
    currentNode = currentNode.children[nodeIndex];
  }
  return currentNode;
};

const findMaxVisibleBarValue = (node, levelsUntilSelectedDepth) => {
  if (levelsUntilSelectedDepth === 0) return node.value;
  let maxValue = Number.MIN_VALUE;
  node.children.forEach(child => {
    maxValue = Math.max(maxValue, findMaxVisibleBarValue(child, levelsUntilSelectedDepth - 1));
  });
  return maxValue;
};

/**
 * Recursively traverses the metadata tree to collect the nodes that should be visible
 * in the list. It converts them into .
 *
 * @param {Object}  metadataNode The current node to examine. Originally the root of the tree.
 * @param {Array}   hiddenAncestors List of names for entries at the 'parent' level to store and later, display.
 * @param {Number}  selectedLevel The currently selected aggregation level.
 *
 * @return {Array} An array of objects with all info necessary to render the associated list item.
 */
const extractVisibleRows = (metadataNode, hiddenAncestors, selectedLevel) => {
  const depthLevel = metadataNode.path.length;
  // Parents of selected level keep track of their ancestors' names
  const _hiddenAncestors = depthLevel >= selectedLevel
    ? []
    : _.clone(hiddenAncestors);
  const isHiddenAncestor = depthLevel < selectedLevel - 1;
  if (isHiddenAncestor) {
    _hiddenAncestors.push(metadataNode.name);
  }
  // Recursively concatenate the node's visible descendants into an array
  const children = metadataNode.children.reduce((accumulator, child) => {
    return [
      ...accumulator,
      ...extractVisibleRows(child, _hiddenAncestors, selectedLevel)
    ];
  }, []);
  const visibleChildren = metadataNode.isExpanded ? children : [];
  const hasChildrenAtSelectedLevel = depthLevel === selectedLevel - 1 && children.length > 0;
  const isNodeVisible = depthLevel >= selectedLevel || hasChildrenAtSelectedLevel;
  if (!isNodeVisible) return visibleChildren;
  // Add the metadata that's required to display the entry as a row in the checklist
  return [
    checklistRowDataFromNode(metadataNode, depthLevel, _hiddenAncestors, selectedLevel),
    ...visibleChildren
  ];
};

const checklistRowDataFromNode = (node, depthLevel, hiddenAncestors, selectedLevel) => {
  const { name, value, children, isExpanded, isChecked, path } = node;
  const isSelectedAggregationLevel = depthLevel === selectedLevel;
  const showExpandToggle = children.length > 0;
  const indentationCount = depthLevel > selectedLevel
    ? (depthLevel - selectedLevel) + 1
    : 0;
  return {
    name,
    value,
    isSelectedAggregationLevel,
    showExpandToggle,
    isExpanded,
    isChecked,
    indentationCount,
    hiddenAncestors,
    path
  };
};

export default {
  name: 'AggregationChecklistPane',
  components: {
    AggregationChecklistItem,
    Disclaimer
  },
  props: {
    aggregationLevelCount: {
      type: Number,
      default: 1
    },
    aggregationLevel: {
      type: Number,
      default: 0,
      validator: (value) => {
        return value >= 0;
      }
    },
    aggregationLevelType: {
      type: String,
      default: '[Aggregation Level Type]'
    },
    aggregationLevelTitle: {
      type: String,
      default: '[Aggregation Level Title]'
    },
    rawData: {
      type: Object,
      default: () => {
        return {
          name: '[Undefined Data]',
          value: 0,
          children: []
        };
      }
    }
  },
  data: () => ({
    statefulData: undefined
  }),
  computed: {
    visibleRows() {
      if (_.isNil(this.statefulData)) return [];
      return extractVisibleRows(this.statefulData, [], this.aggregationLevel);
    },
    maxVisibleBarValue() {
      if (_.isNil(this.statefulData)) return 0;
      return findMaxVisibleBarValue(this.statefulData, this.aggregationLevel);
    }
  },
  watch: {
    rawData(n, o) {
      if (_.isEqual(n, o)) return;
      this.refresh();
    },
    aggregationLevel(n, o) {
      if (_.isEqual(n, o)) return;
      this.expandToSelectedLevel();
    }
  },
  mounted() {
    this.refresh();
  },
  methods: {
    onRangeValueChanged(event) {
      this.changeAggregationLevel(event.target.valueAsNumber);
    },
    changeAggregationLevel(newLevel) {
      this.$emit('aggregation-level-change', newLevel);
    },
    tickStyle(tickIndex) {
      const TICK_WIDTH = 8; // px
      // Tick indices are in 1..aggregationLevelCount.
      // Adjust both to be 0-indexed
      const cleanedIndex = tickIndex - 1;
      const cleanedCount = this.aggregationLevelCount - 1;
      // Space out each tick horizontally
      const percentage = (cleanedIndex / cleanedCount);
      // Adjust each tick to the left so that the last one isn't overflowing
      const errorCorrect = percentage * TICK_WIDTH;
      return { left: `calc(${percentage * 100}% - ${errorCorrect}px)` };
    },
    refresh() {
      // Construct a tree matching the raw data, augmented with
      // - 'expanded' and 'checked' states, and
      // - the path of indices to access that node
      this.statefulData = this.refreshMetadata(this.rawData, []);
      this.expandToSelectedLevel();
    },
    refreshMetadata(node, pathToNode) {
      const augmentedNode = {
        name: node.name,
        value: node.value,
        path: pathToNode,
        isExpanded: false,
        isChecked: this.isNodeChecked()
      };
      // Recursively descend through children, repeating the process
      const childrenMetadata = [];
      node.children.forEach((child, childIndex) => {
        childrenMetadata.push(this.refreshMetadata(child, [...pathToNode, childIndex]));
      });
      augmentedNode.children = childrenMetadata;
      return augmentedNode;
    },
    expandToSelectedLevel() {
      // By default, all entries with an aggregation
      //  level before the currently selected one are expanded
      const computeExpanded = (metadataNode, depthLevel) => {
        metadataNode.isExpanded = depthLevel < this.aggregationLevel;
        metadataNode.children.forEach(child => {
          computeExpanded(child, depthLevel + 1);
        });
      };
      computeExpanded(this.statefulData, 0);
    },
    toggleExpanded(path) {
      const node = findNode(this.statefulData, path);
      node.isExpanded = !node.isExpanded;
    },
    toggleChecked(path) {
      // TODO: this may need to be updated depending on how we choose to store
      //  and share the checked state of nodes (see isNodeChecked below)
      this.$emit('toggle-checked', path);
    },
    isNodeChecked() {
      // TODO: We'll need to determine some way for node selected states to be stored
      //  in a parent or ancestor of this component and passed in as a prop, so that
      //  it can be queried here, something like
      //  return checkedNodes.find(pathToNode.join('-')) !== undefined;
      return true;
    }
  }
};
</script>

<style lang="scss" scoped>
@import "~styles/wm-theme/wm-theme";
@import "~styles/variables";

$un-color-surface-30: #B3B4B5;

$track-height: 2px;
$thumb-size: 16px;
$tick-size: 8px;

.aggregation-level-title {
  text-align: center;
}

.aggregation-level-range {
  margin-top: 10px;

  &::-webkit-slider-runnable-track {
    background: $un-color-surface-30;
    height: $track-height;
  }

  &::-webkit-slider-thumb {
    margin-top: -1 * ($thumb-size - $track-height) / 2;
  }

}

.aggregation-level-range-container {
  position: relative;
}

.aggregation-level-tick {
  width: $tick-size;
  height: $tick-size;
  border: 2px solid $un-color-surface-30;
  background-color: $background-light-1;
  border-radius: 50%;
  position: absolute;
  top: -1 * ($tick-size - $track-height) / 2;
  cursor: pointer;
}

.checklist-container {
  margin-top: 20px;
}

</style>
