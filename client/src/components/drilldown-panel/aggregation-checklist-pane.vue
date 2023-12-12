<template>
  <div>
    <h5>By {{ aggregationLevelTitle }}</h5>
    <div v-if="aggregationLevelCount > 1" class="aggregation-level-range-container">
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
    <div v-if="message !== null" class="message">
      {{ message }}
    </div>
    <reference-options-list
      v-if="showReferences"
      :reference-options="referenceOptions"
      @toggle-reference-options="updateSelectedReferences"
    />
    <div v-if="hasData" class="sort-selection">
      <span>Sort by</span>
      <radio-button-group
        :selected-button-value="sortValue"
        :buttons="Object.values(SORT_OPTIONS)"
        @button-clicked="clickRadioButton"
      />
    </div>
    <div v-if="hasData" class="flex-row">
      <div v-if="checkboxType === 'radio'" class="all-radio-button" @click="setAllChecked">
        <i
          class="fa fa-lg fa-fw icon-centered"
          :class="{
            'fa-circle': isAllSelected,
            'fa-circle-o': !isAllSelected,
          }"
        />
        <span>All</span>
      </div>
      <div v-if="units !== null" class="units">
        {{ units }}
      </div>
      <!-- Render an empty div so the 'all-radio-button' stays left-aligned -->
      <div v-else />
    </div>
    <div v-else>
      <button v-if="totalDataLength > 0" class="btn btn-sm" @click="requestData">
        Load {{ numberFormatter(totalDataLength) }} values
      </button>
    </div>
    <div class="checklist-container">
      <aggregation-checklist-item
        v-for="(row, rowIndex) of displayRows"
        :key="rowIndex"
        :histogram-visible="shouldShowDeselectedBars || row.isChecked"
        :item-data="row"
        :max-visible-bar-value="maxVisibleBarValue"
        :min-visible-bar-value="minVisibleBarValue"
        :selected-timeseries-points="selectedTimeseriesPoints"
        :checkbox-type="checkboxType"
        @toggle-expanded="toggleExpanded(row.path)"
        @toggle-checked="toggleChecked(row.path)"
      />
      <collapsible-item
        v-if="allowCollapsing && rowsWithoutData.length"
        :override="{ value: true }"
      >
        <template #title>{{ rowsWithoutData.length }} more without data</template>
        <template #content>
          <aggregation-checklist-item
            v-for="(row, rowIndex) of rowsWithoutData"
            :key="rowIndex"
            :histogram-visible="shouldShowDeselectedBars || row.isChecked"
            :item-data="row"
            :max-visible-bar-value="maxVisibleBarValue"
            :min-visible-bar-value="minVisibleBarValue"
            :selected-timeseries-points="selectedTimeseriesPoints"
            :checkbox-type="checkboxType"
            @toggle-expanded="toggleExpanded(row.path)"
            @toggle-checked="toggleChecked(row.path)"
          />
        </template>
      </collapsible-item>
    </div>
    <div v-if="hasData" class="aggregation-description">
      <slot name="aggregation-description" />
    </div>
  </div>
</template>

<script lang="ts">
import _ from 'lodash';
import numberFormatter from '@/formatters/number-formatter';
import AggregationChecklistItem from '@/components/drilldown-panel/aggregation-checklist-item.vue';
import CollapsibleItem from '@/components/drilldown-panel/collapsible-item.vue';
import RadioButtonGroup from '@/components/widgets/radio-button-group.vue';
import ReferenceOptionsList from '@/components/drilldown-panel/reference-options-list.vue';
import { BreakdownData } from '@/types/Datacubes';
import { ModelRunReference } from '@/types/ModelRunReference';
import { TimeseriesPointSelection } from '@/types/Timeseries';
import { defineComponent, PropType, toRefs, watchEffect, ref, computed } from '@vue/runtime-core';
import { REGION_ID_DELIMETER } from '@/utils/admin-level-util';
import { SpatialAggregationLevel } from '@/types/Enums';
import { StatefulDataNode, RootStatefulDataNode, ChecklistRowData } from '@/types/BarChartPanel';
import { isStatefulDataNode } from '@/utils/bar-chart-panel-util';

const SORT_OPTIONS = {
  Name: { label: 'Name', value: 'name' },
  Value: { label: 'Value', value: 'value' },
};

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
const extractPossibleRows = (
  metadataNode: RootStatefulDataNode | StatefulDataNode,
  hiddenAncestorNames: string[],
  selectedLevel: number,
  selectedItemIds: string[],
  orderedAggregationLevelKeys: string[]
): ChecklistRowData[] => {
  // The root node is at depth level "-1" since it isn't selectable
  const depthLevel = isStatefulDataNode(metadataNode) ? metadataNode.path.length - 1 : -1;
  // Parents of selected level keep track of their ancestors' names
  const _hiddenAncestorNames = depthLevel >= selectedLevel ? [] : _.clone(hiddenAncestorNames);
  const isHiddenAncestor = depthLevel < selectedLevel - 1;
  if (isHiddenAncestor && isStatefulDataNode(metadataNode)) {
    _hiddenAncestorNames.push(metadataNode.name);
  }
  // Recursively concatenate the node's visible descendants into an array
  const children = metadataNode.children.reduce((accumulator, child) => {
    return [
      ...accumulator,
      ...extractPossibleRows(
        child,
        _hiddenAncestorNames,
        selectedLevel,
        selectedItemIds,
        orderedAggregationLevelKeys
      ),
    ];
  }, [] as ChecklistRowData[]);
  const isExpanded = isStatefulDataNode(metadataNode) ? metadataNode.isExpanded : true;
  const visibleChildren = isExpanded ? children : [];
  const hasChildrenAtSelectedLevel = depthLevel === selectedLevel - 1 && children.length > 0;
  const isNodeVisible = depthLevel >= selectedLevel || hasChildrenAtSelectedLevel;
  if (!isNodeVisible || !isStatefulDataNode(metadataNode)) {
    return visibleChildren;
  }
  const itemId = metadataNode.path.join(REGION_ID_DELIMETER);
  const isChecked = selectedItemIds.includes(itemId);
  // Add the metadata that's required to display the entry as a row in the checklist
  return [
    checklistRowDataFromNode(
      metadataNode,
      depthLevel,
      _hiddenAncestorNames,
      selectedLevel,
      isChecked
    ),
    ...visibleChildren,
  ];
};

const checklistRowDataFromNode = (
  node: StatefulDataNode,
  depthLevel: number,
  hiddenAncestorNames: string[],
  selectedLevel: number,
  isChecked: boolean
): ChecklistRowData => {
  const { name, bars, children, isExpanded, path } = node;
  const isSelectedAggregationLevel = depthLevel === selectedLevel;
  const showExpandToggle = children.length > 0;
  const indentationCount = depthLevel > selectedLevel ? depthLevel - selectedLevel + 1 : 0;
  return {
    name,
    bars,
    isSelectedAggregationLevel,
    showExpandToggle,
    isExpanded,
    isChecked,
    indentationCount,
    hiddenAncestorNames,
    path,
  };
};

const sortHierarchy = (newStatefulData: RootStatefulDataNode, sortValue: string) => {
  // Sort top level children (i.e. countries) without values to the bottom
  //  of the list, since if they had descendants with values, they would
  //  have values themselves, aggregated up from their descendants
  const hasOneOrMoreValues = (node: StatefulDataNode) => {
    return node.bars.length > 0;
  };
  if (sortValue === SORT_OPTIONS.Value.value) {
    newStatefulData.children.sort((nodeA, nodeB) => {
      const nodeAFirstValue = nodeA.bars.map((bar) => bar.value)[0];
      const nodeBFirstValue = nodeB.bars.map((bar) => bar.value)[0];
      const nodeAValue =
        _.isNull(nodeAFirstValue) || _.isUndefined(nodeAFirstValue) ? null : nodeAFirstValue;
      const nodeBValue =
        _.isNull(nodeBFirstValue) || _.isUndefined(nodeBFirstValue) ? null : nodeBFirstValue;
      if (_.isNull(nodeAValue) && !_.isNull(nodeBValue)) {
        // A should be sorted after B
        return 1;
      } else if (_.isNull(nodeBValue)) {
        // B should be sorted after A
        return -1;
      }
      // Sort based on value
      return (nodeAValue as number) <= (nodeBValue as number) ? 1 : -1;
    });
  } else {
    newStatefulData.children.sort((nodeA, nodeB) => {
      if (!hasOneOrMoreValues(nodeA) && hasOneOrMoreValues(nodeB)) {
        // A should be sorted after B
        return 1;
      } else if (hasOneOrMoreValues(nodeA) && !hasOneOrMoreValues(nodeB)) {
        // B should be sorted after A
        return -1;
      }
      // Sort by name
      return nodeA.name > nodeB.name ? 1 : -1;
    });
  }
  newStatefulData.children.forEach((node) => {
    if (_.has(node, 'children')) {
      sortHierarchy(node, sortValue);
    }
  });
  return newStatefulData;
};

export default defineComponent({
  name: 'AggregationChecklistPane',
  components: {
    AggregationChecklistItem,
    CollapsibleItem,
    RadioButtonGroup,
    ReferenceOptionsList,
  },
  props: {
    aggregationLevelCount: {
      type: Number,
      default: 1,
    },
    orderedAggregationLevelKeys: {
      type: Array as PropType<string[]>,
      default: [],
    },
    aggregationLevel: {
      type: Number,
      default: 0,
      validator: (value: number) => {
        return value >= 0;
      },
    },
    aggregationLevelTitle: {
      type: String,
      default: '[Aggregation Level Title]',
    },
    rawData: {
      type: Object as PropType<BreakdownData | null>,
      default: null,
    },
    totalDataLength: {
      type: Number,
      default: 0,
    },
    units: {
      type: String,
      default: null,
    },
    selectedTimeseriesPoints: {
      type: Array as PropType<TimeseriesPointSelection[]>,
      required: true,
    },
    selectedItemIds: {
      type: Object as PropType<string[]>,
      default: [],
    },
    shouldShowDeselectedBars: {
      type: Boolean,
      required: true,
    },
    showReferences: {
      type: Boolean,
      required: true,
    },
    allowCollapsing: {
      type: Boolean,
      required: true,
    },
    checkboxType: {
      type: String as PropType<'checkbox' | 'radio' | null>,
      default: null,
    },
    referenceOptions: {
      type: Array as PropType<ModelRunReference[]>,
      default: [],
    },
    message: {
      type: String as PropType<string | null>,
      default: null,
    },
  },
  emits: [
    'aggregation-level-change',
    'toggle-is-item-selected',
    'toggle-reference-options',
    'request-data',
  ],
  setup(props, { emit }) {
    const {
      rawData,
      aggregationLevel,
      orderedAggregationLevelKeys,
      shouldShowDeselectedBars,
      allowCollapsing,
      selectedTimeseriesPoints,
      selectedItemIds,
    } = toRefs(props);
    const sortValue = ref<string>(SORT_OPTIONS.Name.value);
    const statefulData = ref<RootStatefulDataNode | null>(null);
    watchEffect(() => {
      // Whenever the raw data changes, construct a hierarchical data structure
      //  out of it, augmented with a boolean 'expanded' property to keep
      //  track of the state of the component.
      const newStatefulData: RootStatefulDataNode = { children: [] as StatefulDataNode[] };
      orderedAggregationLevelKeys.value.forEach((aggregationLevelKey) => {
        if (rawData.value === null) return;
        // Get the list of values at this aggregation level for each selected
        //  model run
        const valuesAtThisLevel = rawData.value[aggregationLevelKey];
        if (valuesAtThisLevel === undefined) return;
        const getColorFromTimeseriesId = (timeseriesId: string) =>
          selectedTimeseriesPoints.value.find((point) => point.timeseriesId === timeseriesId)
            ?.color ?? '#000';
        valuesAtThisLevel.forEach(({ id, values }) => {
          // e.g. ['Canada', 'Ontario', 'Toronto']
          const path = id.split(REGION_ID_DELIMETER);
          // e.g. ['Canada', 'Ontario']
          const ancestors = path.slice(0, -1);
          // e.g. 'Toronto'
          const name = path[path.length - 1];
          // Initialize pointer to the root of the tree
          let pointer = newStatefulData.children;
          // Find where in the tree this item should be inserted
          ancestors.forEach((ancestor) => {
            const nextNode = pointer.find((node) => node.name === ancestor);
            if (nextNode === undefined) {
              throw new Error(
                `Invalid path: ${path.toString()}. Node with name "${ancestor}" not found.`
              );
            }
            pointer = nextNode.children;
          });
          // Convert values from { [timeseriesId]: value } to an array where
          //  the value of each timeseries is augmented with its color
          const valueArray = Object.keys(values)
            .filter((key) => key !== '_baseline')
            .map((timeseriesId) => {
              return {
                color: getColorFromTimeseriesId(timeseriesId),
                value: values[timeseriesId],
              };
            });
          // Create stateful node and insert it into its place in the tree
          pointer.push({
            name,
            bars: valueArray,
            path,
            isExpanded: false,
            children: [],
          });
        });
      });
      sortHierarchy(newStatefulData, sortValue.value);
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
        metadataNode.children.forEach((child) => {
          computeExpanded(child, depthLevel + 1);
        });
      };
      // Start with -1 because an aggregationLevel of 0 corresponds
      //  to a depthLevel of 1
      computeExpanded(statefulData.value, -1);
    });

    // Returns the maximum among bar values or zero, whichever is greater
    const findMaxVisibleBarValue = (
      node: RootStatefulDataNode | StatefulDataNode,
      levelsUntilSelectedDepth: number
    ) => {
      if (levelsUntilSelectedDepth === 0) {
        const values =
          isStatefulDataNode(node) &&
          (_.includes(selectedItemIds.value, node.path.join(REGION_ID_DELIMETER)) ||
            shouldShowDeselectedBars.value)
            ? node.bars.map((bar) => bar.value)
            : [];
        return _.max(values) ?? 0;
      }
      let maxValue = 0;
      node.children.forEach((child) => {
        maxValue = Math.max(maxValue, findMaxVisibleBarValue(child, levelsUntilSelectedDepth - 1));
      });
      return maxValue;
    };

    // Returns the minimum among bar values or zero, whichever is less
    const findMinVisibleBarValue = (
      node: RootStatefulDataNode | StatefulDataNode,
      levelsUntilSelectedDepth: number
    ) => {
      if (levelsUntilSelectedDepth === 0) {
        const values =
          isStatefulDataNode(node) &&
          (_.includes(selectedItemIds.value, node.path.join(REGION_ID_DELIMETER)) ||
            shouldShowDeselectedBars.value)
            ? node.bars.map((bar) => bar.value)
            : [];
        return _.min(values) ?? 0;
      }
      let minValue = 0;
      node.children.forEach((child) => {
        minValue = Math.min(minValue, findMinVisibleBarValue(child, levelsUntilSelectedDepth - 1));
      });
      return minValue;
    };

    const maxVisibleBarValue = computed(() => {
      if (_.isNil(statefulData.value)) return 0;
      // + 1 because if aggregationLevel === 0, we need to go 1 level deeper than
      //  the root level.
      return findMaxVisibleBarValue(statefulData.value, aggregationLevel.value + 1);
    });

    const minVisibleBarValue = computed(() => {
      if (_.isNil(statefulData.value)) return 0;
      // + 1 because if aggregationLevel === 0, we need to go 1 level deeper than
      //  the root level.
      return findMinVisibleBarValue(statefulData.value, aggregationLevel.value + 1);
    });

    const possibleRows = computed(() => {
      if (_.isNil(statefulData.value)) return [];
      return extractPossibleRows(
        statefulData.value,
        [],
        aggregationLevel.value,
        selectedItemIds.value,
        orderedAggregationLevelKeys.value
      );
    });

    const rowsWithData = computed(() => {
      return possibleRows.value.filter((row) => row.bars.length);
    });
    const rowsWithoutData = computed(() => {
      return possibleRows.value.filter((row) => !row.bars.length);
    });
    const displayRows = computed(() => {
      return allowCollapsing.value ? rowsWithData.value : possibleRows.value;
    });

    const hasData = computed(() => rowsWithData.value.length > 0);

    const isAllSelected = computed(() => {
      return selectedItemIds.value.length === 0;
    });

    const toggleChecked = (path: string[]) => {
      const aggregationLevel = orderedAggregationLevelKeys.value[path.length - 1];
      const itemId = path.join(REGION_ID_DELIMETER);
      emit('toggle-is-item-selected', aggregationLevel, itemId);
    };

    const setAllChecked = () => {
      // ASSUMPTION: the "All" option is only showed when "radio button" mode
      //  is active, meaning there is no more than one item
      if (selectedItemIds.value.length === 0) {
        return;
      }
      if (selectedItemIds.value.length > 1) {
        console.error(
          'setAllSelected should only be called when radio button mode is' +
            ' active, but multiple items are selected.',
          selectedItemIds.value
        );
      }
      toggleChecked(selectedItemIds.value[0].split(REGION_ID_DELIMETER));
    };

    return {
      statefulData,
      maxVisibleBarValue,
      minVisibleBarValue,
      displayRows,
      rowsWithoutData,
      hasData,
      isAllSelected,
      toggleChecked,
      setAllChecked,
      SpatialAggregationLevel,
      SORT_OPTIONS,
      sortValue,
    };
  },
  methods: {
    numberFormatter,
    clickRadioButton(value: string) {
      this.sortValue = value;
    },
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
      let currentNode: RootStatefulDataNode | StatefulDataNode | undefined = this.statefulData;
      for (const itemName of path) {
        currentNode = currentNode.children.find((child) => child.name === itemName);
        if (currentNode === undefined) return;
      }
      if (isStatefulDataNode(currentNode)) {
        currentNode.isExpanded = !currentNode.isExpanded;
      }
    },
    updateSelectedReferences(value: string) {
      this.$emit('toggle-reference-options', value);
    },
    requestData() {
      this.$emit('request-data');
    },
  },
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

.sort-selection {
  width: fit-content;
  display: flex;
  align-items: center;
  margin-top: 10px;
  margin-bottom: 10px;
  span {
    margin-right: 5px;
  }
}

.aggregation-level-range {
  margin-top: 10px;

  &::-webkit-slider-runnable-track {
    background: $un-color-surface-30;
    height: $track-height;
  }

  &::-webkit-slider-thumb {
    margin-top: -1 * calc(($thumb-size - $track-height) / 2);
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
  top: -1 * calc(($tick-size - $track-height) / 2);
  cursor: pointer;
}

.checklist-container {
  margin-top: 5px;
}

.all-radio-button {
  cursor: pointer;
  i {
    width: 16px;
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
  // If there's only one item, right-align it
  & *:only-child {
    margin-left: auto;
  }
}

.message {
  background: $background-light-2;
  color: $text-color-dark;
  padding: 5px;
}
</style>
