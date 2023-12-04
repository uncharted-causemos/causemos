import _ from 'lodash';
import { REGION_ID_DELIMETER } from '@/utils/admin-level-util';
import { BreakdownData } from '@/types/Datacubes';
import { SortableTableHeaderState } from '@/types/Enums';

export enum SortOption {
  Name,
  Value,
}

// A helper function to allow TypeScript to distinguish between
//  the the root node (that is missing several properties) and
//  full nodes.
export function isStatefulDataNode(
  node: RootStatefulDataNode | StatefulDataNode
): node is StatefulDataNode {
  return (node as StatefulDataNode).name !== undefined;
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
export const extractPossibleRows = (
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
  const indentationCount = selectedLevel === 0 ? depthLevel : depthLevel - selectedLevel + 1;
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

const sortHierarchy = (
  newStatefulData: RootStatefulDataNode,
  sortValue: SortOption,
  sortDirection: SortableTableHeaderState.Up | SortableTableHeaderState.Down
) => {
  // Sort top level children (i.e. countries) without values to the bottom
  //  of the list, since if they had descendants with values, they would
  //  have values themselves, aggregated up from their descendants
  const hasOneOrMoreValues = (node: StatefulDataNode) => {
    return node.bars.length > 0;
  };
  if (sortValue === SortOption.Value) {
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
      const result = (nodeAValue as number) <= (nodeBValue as number) ? 1 : -1;
      return sortDirection === SortableTableHeaderState.Down ? result * -1 : result;
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
      const result = nodeA.name > nodeB.name ? 1 : -1;
      return sortDirection === SortableTableHeaderState.Down ? result * -1 : result;
    });
  }
  newStatefulData.children.forEach((node) => {
    if (_.has(node, 'children')) {
      sortHierarchy(node, sortValue, sortDirection);
    }
  });
  return newStatefulData;
};

// TODO: improve naming
export const constructHierarchichalDataNodeTree = (
  orderedAggregationLevelKeys: string[],
  rawData: BreakdownData,
  getColorFromTimeseriesId: (timeseriesId: string) => string,
  sortValue: SortOption,
  sortDirection: SortableTableHeaderState.Up | SortableTableHeaderState.Down
) => {
  // Whenever the raw data changes, construct a hierarchical data structure
  //  out of it, augmented with a boolean 'expanded' property to keep
  //  track of the state of the component.
  const newStatefulData: RootStatefulDataNode = { children: [] as StatefulDataNode[] };
  orderedAggregationLevelKeys.forEach((aggregationLevelKey) => {
    // Get the list of values at this aggregation level for each selected
    //  model run
    const valuesAtThisLevel = rawData[aggregationLevelKey];
    if (valuesAtThisLevel === undefined) return;
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
  sortHierarchy(newStatefulData, sortValue, sortDirection);
  return newStatefulData;
};

// Returns the maximum among bar values or zero, whichever is greater
export const findMaxVisibleBarValue = (
  node: RootStatefulDataNode | StatefulDataNode,
  levelsUntilSelectedDepth: number,
  selectedItemIds: string[],
  shouldShowDeselectedBars: boolean
) => {
  if (levelsUntilSelectedDepth === 0) {
    const values =
      isStatefulDataNode(node) &&
      (_.includes(selectedItemIds, node.path.join(REGION_ID_DELIMETER)) || shouldShowDeselectedBars)
        ? node.bars.map((bar) => bar.value)
        : [];
    return _.max(values) ?? 0;
  }
  let maxValue = 0;
  node.children.forEach((child) => {
    maxValue = Math.max(
      maxValue,
      findMaxVisibleBarValue(
        child,
        levelsUntilSelectedDepth - 1,
        selectedItemIds,
        shouldShowDeselectedBars
      )
    );
  });
  return maxValue;
};

// Returns the minimum among bar values or zero, whichever is less
export const findMinVisibleBarValue = (
  node: RootStatefulDataNode | StatefulDataNode,
  levelsUntilSelectedDepth: number,
  selectedItemIds: string[],
  shouldShowDeselectedBars: boolean
) => {
  if (levelsUntilSelectedDepth === 0) {
    const values =
      isStatefulDataNode(node) &&
      (_.includes(selectedItemIds, node.path.join(REGION_ID_DELIMETER)) || shouldShowDeselectedBars)
        ? node.bars.map((bar) => bar.value)
        : [];
    return _.min(values) ?? 0;
  }
  let minValue = 0;
  node.children.forEach((child) => {
    minValue = Math.min(
      minValue,
      findMinVisibleBarValue(
        child,
        levelsUntilSelectedDepth - 1,
        selectedItemIds,
        shouldShowDeselectedBars
      )
    );
  });
  return minValue;
};
