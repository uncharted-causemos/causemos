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
  values: (number | null)[];
  path: string[];
  isExpanded: boolean;
}

// The root of the tree. Imitates the structure of a real node
//  to simplify the recursive functions used to traverse the tree
interface RootStatefulDataNode {
  children: StatefulDataNode[];
}

// A helper function to allow TypeScript to distinguish between
//  the the root node (that is missing several properties) and
//  full nodes.
function isStatefulDataNode(
  node: RootStatefulDataNode | StatefulDataNode
): node is StatefulDataNode {
  return (node as StatefulDataNode).name !== undefined;
}

interface ChecklistRowData {
  name: string;
  values: (number | null)[];
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
  metadataNode: RootStatefulDataNode | StatefulDataNode,
  hiddenAncestorNames: string[],
  selectedLevel: number,
  deselectedItemIds: { [aggregationLevel: string]: string[] } | null,
  orderedAggregationLevelKeys: string[]
): ChecklistRowData[] => {
  // The root node is at depth level "-1" since it isn't selectable
  const depthLevel = isStatefulDataNode(metadataNode)
    ? metadataNode.path.length - 1
    : -1;
  // Parents of selected level keep track of their ancestors' names
  const _hiddenAncestorNames =
    depthLevel >= selectedLevel ? [] : _.clone(hiddenAncestorNames);
  const isHiddenAncestor = depthLevel < selectedLevel - 1;
  if (isHiddenAncestor && isStatefulDataNode(metadataNode)) {
    _hiddenAncestorNames.push(metadataNode.name);
  }
  // Recursively concatenate the node's visible descendants into an array
  const children = metadataNode.children.reduce((accumulator, child) => {
    return [
      ...accumulator,
      ...extractVisibleRows(
        child,
        _hiddenAncestorNames,
        selectedLevel,
        deselectedItemIds,
        orderedAggregationLevelKeys
      )
    ];
  }, [] as ChecklistRowData[]);
  const isExpanded = isStatefulDataNode(metadataNode)
    ? metadataNode.isExpanded
    : true;
  const visibleChildren = isExpanded ? children : [];
  const hasChildrenAtSelectedLevel =
    depthLevel === selectedLevel - 1 && children.length > 0;
  const isNodeVisible =
    depthLevel >= selectedLevel || hasChildrenAtSelectedLevel;
  if (!isNodeVisible || !isStatefulDataNode(metadataNode)) {
    return visibleChildren;
  }
  const aggregationLevel = orderedAggregationLevelKeys[depthLevel];
  const itemId = metadataNode.path.join(PATH_DELIMETER);
  const isChecked =
    deselectedItemIds === null ||
    !(deselectedItemIds[aggregationLevel] ?? []).includes(itemId);
  // Add the metadata that's required to display the entry as a row in the checklist
  return [
    checklistRowDataFromNode(
      metadataNode,
      depthLevel,
      _hiddenAncestorNames,
      selectedLevel,
      isChecked
    ),
    ...visibleChildren
  ];
};

const checklistRowDataFromNode = (
  node: StatefulDataNode,
  depthLevel: number,
  hiddenAncestorNames: string[],
  selectedLevel: number,
  isChecked: boolean
): ChecklistRowData => {
  const { name, values, children, isExpanded, path } = node;
  const isSelectedAggregationLevel = depthLevel === selectedLevel;
  const showExpandToggle = children.length > 0;
  const indentationCount =
    depthLevel > selectedLevel ? depthLevel - selectedLevel + 1 : 0;
  return {
    name,
    values,
    isSelectedAggregationLevel,
    showExpandToggle,
    isExpanded,
    isChecked,
    indentationCount,
    hiddenAncestorNames,
    path
  };
};

const PATH_DELIMETER = '__';

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
      type: Object as PropType<BreakdownData | null>,
      default: null
    },
    units: {
      type: String,
      default: null
    },
    selectedScenarioIds: {
      type: Array as PropType<string[]>,
      default: []
    },
    deselectedItemIds: {
      type: Object as PropType<{ [aggregationLevel: string]: string[] } | null>,
      default: null
    }
  },
  emits: [
    'aggregation-level-change',
    'toggle-is-item-selected',
    'select-all',
    'deselect-all'
  ],
  setup(props) {
    const {
      rawData,
      aggregationLevel,
      orderedAggregationLevelKeys,
      selectedScenarioIds,
      deselectedItemIds
    } = toRefs(props);
    const statefulData = ref<RootStatefulDataNode | null>(null);
    watchEffect(() => {
      // Whenever the raw data changes, construct a hierarchical data structure
      //  out of it, augmented with a boolean 'expanded' property to keep
      //  track of the state of the component.
      const newStatefulData = { children: [] as StatefulDataNode[] };
      orderedAggregationLevelKeys.value.forEach(aggregationLevelKey => {
        if (rawData.value === null) return;
        // Get the list of values at this aggregation level for each selected
        //  model run
        const valuesAtThisLevel = rawData.value[aggregationLevelKey];
        if (valuesAtThisLevel === undefined) return;
        const modelRunCount = selectedScenarioIds.value.length;
        const getIndexFromRunId = (modelRunId: string) =>
          selectedScenarioIds.value.findIndex(id => id === modelRunId);
        valuesAtThisLevel.forEach(({ id, values }) => {
          const path = id.split(PATH_DELIMETER);
          const name = path[path.length - 1];
          // Find where in the tree this item should be inserted
          let _path = id.split('__');
          let pointer = newStatefulData.children;
          while (_path.length > 1) {
            const nextNode = pointer.find(node => node.name === _path[0]);
            if (nextNode === undefined) {
              throw new Error(
                `Invalid path: ${path.toString()}. Node with name "${
                  _path[0]
                }" not found.`
              );
            }
            pointer = nextNode.children;
            _path = _path.splice(1);
          }
          // Initialize values for every model run to null
          const valueArray = new Array(modelRunCount).fill(null);
          // Convert values from { [modelRunId]: value } to an array where
          //  the index of each run's value comes from the selectedScenarioIds
          //  array. This is necessary to have consistent colouring with other
          //  components.
          Object.keys(values).forEach(modelRunId => {
            const modelRunIndex = getIndexFromRunId(modelRunId);
            valueArray[modelRunIndex] = values[modelRunId];
          });
          // Create stateful node and insert it into its place in the tree
          pointer.push({
            name,
            values: valueArray,
            path,
            isExpanded: false,
            children: []
          });
        });
      });
      statefulData.value = newStatefulData;
    });

    // Ensure all entries with an aggregation level before the
    //  currently selected one are expanded whenever statefulData
    //  is reinitialized or aggregationLevel is changed
    watchEffect(() => {
      if (statefulData.value === null) return;
      const computeExpanded = (
        metadataNode: RootStatefulDataNode | StatefulDataNode,
        depthLevel: number
      ) => {
        if (isStatefulDataNode(metadataNode)) {
          metadataNode.isExpanded = depthLevel < aggregationLevel.value;
        }
        metadataNode.children.forEach(child => {
          computeExpanded(child, depthLevel + 1);
        });
      };
      // Start with -1 because an aggregationLevel of 0 corresponds
      //  to a depthLevel of 1
      computeExpanded(statefulData.value, -1);
    });

    const findMaxVisibleBarValue = (
      node: RootStatefulDataNode | StatefulDataNode,
      levelsUntilSelectedDepth: number
    ) => {
      if (levelsUntilSelectedDepth === 0) {
        const values = isStatefulDataNode(node) ? node.values : [];
        return _.max(values) ?? Number.MIN_VALUE;
      }
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
      // + 1 because if aggregationLevel === 0, we need to go 1 level deeper than
      //  the root level.
      return findMaxVisibleBarValue(
        statefulData.value,
        aggregationLevel.value + 1
      );
    });

    const visibleRows = computed(() => {
      if (_.isNil(statefulData.value)) return [];
      return extractVisibleRows(
        statefulData.value,
        [],
        aggregationLevel.value,
        deselectedItemIds.value,
        orderedAggregationLevelKeys.value
      );
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
      // Traverse the tree to find the node in question
      let currentNode:
        | RootStatefulDataNode
        | StatefulDataNode
        | undefined = this.statefulData;
      for (const itemName of path) {
        currentNode = currentNode.children.find(
          child => child.name === itemName
        );
        if (currentNode === undefined) return;
      }
      if (isStatefulDataNode(currentNode)) {
        currentNode.isExpanded = !currentNode.isExpanded;
      }
    },
    toggleChecked(path: string[]) {
      const aggregationLevel = this.orderedAggregationLevelKeys[
        path.length - 1
      ];
      const itemId = path.join(PATH_DELIMETER);
      this.$emit('toggle-is-item-selected', aggregationLevel, itemId);
    },
    deselectAll() {
      this.$emit('deselect-all');
    },
    selectAll() {
      this.$emit('select-all');
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
