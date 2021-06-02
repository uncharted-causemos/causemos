<template>
  <div>
    <h5>By {{ aggregationLevelTitle }}</h5>
    <div
      v-if="aggregationLevelCount > 1"
      class="aggregation-level-range-container"
    >
      <input
        type="range"
        class="aggregation-level-range"
        :value="aggregationLevel"
        :min="0"
        :max="aggregationLevelCount - 1"
        @input="onRangeValueChanged"
      />
      <div
        v-for="tickIndex in aggregationLevelCount"
        :key="tickIndex"
        class="aggregation-level-tick"
        :class="{ hidden: tickIndex - 1 === aggregationLevel }"
        :style="tickStyle(tickIndex)"
        @click="changeAggregationLevel(tickIndex - 1)"
      />
    </div>
    <div class="flex-row">
      <div class="select-all-buttons">
        <small-text-button :label="'Select All'" @click="selectAll" />
        <small-text-button :label="'Deselect All'" @click="deselectAll" />
      </div>
      <div v-if="units !== null" class="units">
        {{ units }}
      </div>
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
    <div class="aggregation-description">
      <slot name="aggregation-description" />
    </div>
  </div>
</template>

<script lang="ts">
import _ from 'lodash';
import AggregationChecklistItem from '@/components/drilldown-panel/aggregation-checklist-item.vue';
import SmallTextButton from '@/components/widgets/small-text-button.vue';
import { BreakdownData } from '@/types/Datacubes';
import {
  defineComponent,
  PropType,
  toRefs,
  watchEffect,
  ref,
  computed
} from '@vue/runtime-core';

interface StatefulDataNode {
  name: string;
  children: StatefulDataNode[];
  value: number;
  path: string[];
  isExpanded: boolean;
  isChecked: boolean;
}

interface ChecklistRowData {
  name: string;
  value: number;
  isExpanded: boolean;
  isChecked: boolean;
  path: string[];
  isSelectedAggregationLevel: boolean;
  showExpandToggle: boolean;
  indentationCount: number;
  hiddenAncestorNames: string[];
}

/**
 * Recursively traverses the state tree to collect the nodes that should be visible
 * in the list. It converts them into a list of ChecklistRowData objects augmented
 * with all the necessary metadata for easy looping in the template.
 *
 * @param {Object}  metadataNode The current node to examine. Originally the root of the tree.
 * @param {Array}   hiddenAncestorNames List of names for entries at the 'parent' level to store and later, display.
 * @param {Number}  selectedLevel The currently selected aggregation level.
 *
 * @return {Array} An array of objects with all info necessary to render the associated list item.
 */
const extractVisibleRows = (
  metadataNode: StatefulDataNode,
  hiddenAncestorNames: string[],
  selectedLevel: number
): ChecklistRowData[] => {
  const depthLevel = metadataNode.path.length - 1; // 0-indexed
  // Parents of selected level keep track of their ancestors' names
  const _hiddenAncestorNames =
    depthLevel >= selectedLevel ? [] : _.clone(hiddenAncestorNames);
  const isHiddenAncestor = depthLevel < selectedLevel - 1;
  if (isHiddenAncestor) {
    _hiddenAncestorNames.push(metadataNode.name);
  }
  // Recursively concatenate the node's visible descendants into an array
  const children = metadataNode.children.reduce((accumulator, child) => {
    return [
      ...accumulator,
      ...extractVisibleRows(child, _hiddenAncestorNames, selectedLevel)
    ];
  }, [] as ChecklistRowData[]);
  const visibleChildren = metadataNode.isExpanded ? children : [];
  const hasChildrenAtSelectedLevel =
    depthLevel === selectedLevel - 1 && children.length > 0;
  const isNodeVisible =
    depthLevel >= selectedLevel || hasChildrenAtSelectedLevel;
  if (!isNodeVisible) return visibleChildren;
  // Add the metadata that's required to display the entry as a row in the checklist
  return [
    checklistRowDataFromNode(
      metadataNode,
      depthLevel,
      _hiddenAncestorNames,
      selectedLevel
    ),
    ...visibleChildren
  ];
};

const checklistRowDataFromNode = (
  node: StatefulDataNode,
  depthLevel: number,
  hiddenAncestorNames: string[],
  selectedLevel: number
): ChecklistRowData => {
  const { name, value, children, isExpanded, isChecked, path } = node;
  const isSelectedAggregationLevel = depthLevel === selectedLevel;
  const showExpandToggle = children.length > 0;
  const indentationCount =
    depthLevel > selectedLevel ? depthLevel - selectedLevel + 1 : 0;
  return {
    name,
    value,
    isSelectedAggregationLevel,
    showExpandToggle,
    isExpanded,
    isChecked,
    indentationCount,
    hiddenAncestorNames,
    path
  };
};

export default defineComponent({
  name: 'AggregationChecklistPane',
  components: {
    AggregationChecklistItem,
    SmallTextButton
  },
  props: {
    aggregationLevelCount: {
      type: Number,
      default: 1
    },
    orderedAggregationLevelKeys: {
      type: Array as PropType<string[]>,
      default: []
    },
    aggregationLevel: {
      type: Number,
      default: 0,
      validator: (value: number) => {
        return value >= 0;
      }
    },
    aggregationLevelTitle: {
      type: String,
      default: '[Aggregation Level Title]'
    },
    rawData: {
      type: Object as PropType<BreakdownData>,
      default: () => {
        return {} as BreakdownData;
      }
    },
    units: {
      type: String,
      default: null
    }
  },
  emits: ['aggregation-level-change', 'toggle-checked'],
  setup(props) {
    const { rawData, aggregationLevel, orderedAggregationLevelKeys } = toRefs(props);
    const statefulData = ref<StatefulDataNode | null>(null);
    watchEffect(() => {
      // Whenever the raw data changes, construct a hierarchical data structure
      //  out of it, augmented with 'expanded' and 'checked' properties to keep
      //  track of the state of the component.
      const newStatefulData = { children: [] as StatefulDataNode[] };

      orderedAggregationLevelKeys.value.forEach(adminLevelKey => {
        const regions = rawData.value[adminLevelKey];
        if (regions === undefined) return;
        regions.forEach(({ id, value }) => {
          // Create stateful node
          const path = id.split('__');
          const node: StatefulDataNode = {
            name: path[path.length - 1],
            value: value,
            path,
            isExpanded: false,
            // TODO: isChecked functionality still needs to be implemented
            isChecked: true,
            children: []
          };
          // Find where in the tree this region should be inserted
          let _path = id.split('__');
          let pointer = newStatefulData.children;
          while (_path.length > 1) {
            const nextNode = pointer.find(node => node.name === _path[0]);
            if (nextNode === undefined) return;
            pointer = nextNode?.children;
            _path = _path.splice(1);
          }
          // Insert node into its place in the tree
          pointer.push(node);
        });
      });
      statefulData.value = newStatefulData.children[0];
    });

    // Ensure all entries with an aggregation level before the
    //  currently selected one are expanded whenever statefulData
    //  is reinitialized or aggregationLevel is changed
    watchEffect(() => {
      if (statefulData.value === null) return;
      const computeExpanded = (
        metadataNode: StatefulDataNode,
        depthLevel: number
      ) => {
        metadataNode.isExpanded = depthLevel < aggregationLevel.value;
        metadataNode.children.forEach(child => {
          computeExpanded(child, depthLevel + 1);
        });
      };
      computeExpanded(statefulData.value, 0);
    });

    const findMaxVisibleBarValue = (
      node: StatefulDataNode,
      levelsUntilSelectedDepth: number
    ) => {
      if (levelsUntilSelectedDepth === 0) return node.value;
      let maxValue = Number.MIN_VALUE;
      node.children.forEach(child => {
        maxValue = Math.max(
          maxValue,
          findMaxVisibleBarValue(child, levelsUntilSelectedDepth - 1)
        );
      });
      return maxValue;
    };

    const maxVisibleBarValue = computed(() => {
      if (_.isNil(statefulData.value)) return 0;
      return findMaxVisibleBarValue(statefulData.value, aggregationLevel.value);
    });

    const visibleRows = computed(() => {
      if (_.isNil(statefulData.value)) return [];
      return extractVisibleRows(statefulData.value, [], aggregationLevel.value);
    });

    return {
      statefulData,
      maxVisibleBarValue,
      visibleRows
    };
  },
  methods: {
    onRangeValueChanged(event: any) {
      this.changeAggregationLevel(event.target.valueAsNumber);
    },
    changeAggregationLevel(newLevel: number) {
      this.$emit('aggregation-level-change', newLevel);
    },
    tickStyle(tickIndex: number) {
      const TICK_WIDTH = 8; // px
      // Tick indices are in 1..aggregationLevelCount.
      // Adjust both to be 0-indexed
      const cleanedIndex = tickIndex - 1;
      const cleanedCount = this.aggregationLevelCount - 1;
      // Space out each tick horizontally
      const percentage = cleanedIndex / cleanedCount;
      // Adjust each tick to the left so that the last one isn't overflowing
      const errorCorrect = percentage * TICK_WIDTH;
      return { left: `calc(${percentage * 100}% - ${errorCorrect}px)` };
    },
    toggleExpanded(path: string[]) {
      if (this.statefulData === null) return;
      // Nest top level elements under a dummy parent node
      //  so that each entry in `path` describes one step
      //  in the traversal.
      const temp = {
        name: '',
        path: [],
        value: 0,
        isExpanded: false,
        isChecked: false,
        children: [this.statefulData]
      };
      // Traverse the tree to find the node in question
      let currentNode: StatefulDataNode | undefined = temp;
      for (const regionName of path) {
        currentNode = currentNode.children.find(
          child => child.name === regionName
        );
        if (currentNode === undefined) return;
      }
      currentNode.isExpanded = !currentNode.isExpanded;
    },
    toggleChecked(path: string[]) {
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
    },
    deselectAll() {
      console.log('deselectAll');
    },
    selectAll() {
      console.log('selectAll');
    }
  }
});
</script>

<style lang="scss" scoped>
@import '~styles/variables';

$un-color-surface-30: #b3b4b5;

$track-height: 2px;
$thumb-size: 16px;
$tick-size: 8px;

h5 {
  margin: 0;
  margin-bottom: 5px;
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
  margin: 15px 0;
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
  margin-top: 5px;
}

.select-all-buttons {
  margin: 0;
  margin-top: 5px;
  > *:first-child {
    margin-right: 5px;
  }
}

.units {
  color: $text-color-medium;
  font-weight: bold;
}

.flex-row {
  display: flex;
  justify-content: space-between;
  align-items: flex-end;
}
</style>
