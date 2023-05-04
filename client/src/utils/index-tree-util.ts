import { v4 as uuidv4 } from 'uuid';
import { DataTransform, ProjectionAlgorithm } from '@/types/Enums';
import {
  DatasetSearchResult,
  ConceptNode,
  ConceptNodeWithDatasetAttached,
  ConceptNodeWithoutDataset,
  IndexEdgeId,
  SelectableIndexElementId,
} from '@/types/Index';
import _ from 'lodash';
import { DataConfig } from '@/types/Datacube';
import { getDefaultDataConfig } from '@/services/new-datacube-service';
import { OutputSpec } from '@/types/Outputdata';
import { WeightedComponent } from '@/types/WeightedComponent';

export type FindNodeResult =
  | { parent: ConceptNodeWithoutDataset | null; found: ConceptNode }
  | undefined;

export const isConceptNodeWithDatasetAttached = (
  indexNode: ConceptNode
): indexNode is ConceptNodeWithDatasetAttached => {
  return (indexNode as ConceptNodeWithDatasetAttached).dataset !== undefined;
};

export const isOutputIndexNode = (indexNode: ConceptNode) => {
  return indexNode.isOutputNode;
};

export const isConceptNodeWithoutDataset = (
  indexNode: ConceptNode
): indexNode is ConceptNodeWithoutDataset => {
  return (indexNode as ConceptNodeWithoutDataset).components !== undefined;
};

export const hasChildren = (indexNode: ConceptNode) => {
  return isConceptNodeWithoutDataset(indexNode) && indexNode.components.length > 0;
};

export const isEmptyNode = (indexNode: ConceptNode) => {
  return !isConceptNodeWithDatasetAttached(indexNode) && !hasChildren(indexNode);
};

export const DATASET_ICON = 'fa-table';
export const DATASET_COLOR = '#1b9e77';

export const createNewOutputIndex = () => {
  const node = createNewConceptNode();
  node.isOutputNode = true;
  node.name = 'Overall priority';
  return node;
};

export const createNewConceptNode = (): ConceptNodeWithoutDataset => {
  return {
    id: uuidv4(),
    name: '',
    isOutputNode: false,
    components: [],
  };
};

export const convertDataConfigToOutputSpec = (dataConfig: DataConfig) => {
  const outputSpec: OutputSpec = {
    modelId: dataConfig.datasetId,
    runId: dataConfig.runId,
    outputVariable: dataConfig.outputVariable,
    timestamp: dataConfig.selectedTimestamp,
    transform: DataTransform.None,
    temporalResolution: dataConfig.temporalResolution,
    temporalAggregation: dataConfig.temporalAggregation,
    spatialAggregation: dataConfig.spatialAggregation,
  };
  return outputSpec;
};

/**
 * Duplicate the node and returns newly duplicated node.
 * The new node and its children are assigned with newly generated id.
 * @param indexNode An index node
 */
export const duplicateNode = (indexNode: ConceptNode): ConceptNode => {
  const duplicated = JSON.parse(JSON.stringify(indexNode));
  // Update ids
  const _assignId = (node: ConceptNode) => {
    node.id = uuidv4();
    if (!isConceptNodeWithoutDataset(node)) return;
    node.components.forEach((weightedComponent) => {
      _assignId(weightedComponent.componentNode);
    });
  };
  _assignId(duplicated);
  return duplicated;
};

/**
 * Removes the node with given nodeId from provided index node tree children
 * Returns boolean indicating if the node was found and removed successfully.
 * @param indexNodeTree An index node
 * @param nodeId
 */
export const findAndRemoveChild = (indexNodeTree: ConceptNode, nodeId: string): boolean => {
  const result = findNode(indexNodeTree, nodeId);
  if (result?.parent) {
    const beforeLength = result.parent.components.length;
    result.parent.components = result.parent.components.filter(
      (weightedComponent) => weightedComponent.componentNode.id !== nodeId
    );
    result.parent.components = rebalanceInputWeights(result.parent.components);
    return result.parent.components.length === beforeLength - 1;
  }
  return false;
};

export const deleteEdgeFromIndexTree = (
  indexNodeTree: ConceptNode,
  nodeId: string
): ConceptNode | null => {
  const result = findNode(indexNodeTree, nodeId);
  if (result?.parent && isConceptNodeWithoutDataset(result.parent)) {
    result.parent.components = result.parent.components.filter(
      (node) => node.componentNode.id !== nodeId
    );
    result.parent.components = rebalanceInputWeights(result.parent.components);
    return result.found;
  }
  return null;
};

/**
 * Finds a node from given index node tree and returns found node and its parent.
 * Returns undefined if no node with given node id is found in the tree.
 * @param indexNodeTree An index node
 * @param nodeId An index node id
 */
export const findNode = (indexNodeTree: ConceptNode, nodeId: string): FindNodeResult => {
  const _findNode = (
    node: ConceptNode,
    parentNode: ConceptNodeWithoutDataset | null
  ): FindNodeResult => {
    if (node.id === nodeId) {
      return { parent: parentNode, found: node };
    }
    // If this node is a leaf node at this point, not found
    if (isConceptNodeWithDatasetAttached(node)) return;

    for (const child of node.components) {
      const found = _findNode(child.componentNode, node);
      if (found) return found;
    }
  };
  return _findNode(indexNodeTree, null);
};

/**
 * Finds and updates the node with matching node id with updated payload in the index node tree.
 * Returns boolean indicating if the node was found and updated successfully.
 * @param indexNodeTree An index node
 * @param updated An update node payload
 */
export const findAndUpdateNode = (indexNodeTree: ConceptNode, updated: ConceptNode): boolean => {
  const result = findNode(indexNodeTree, updated.id);
  if (result) {
    Object.assign(result.found, updated);
    return true;
  }
  return false;
};

/**
 * Recursively checks whether any nodes in the tree are grounded with datasets.
 * Returns true if at least one dataset is found, and false otherwise.
 * @param indexNodeTree An index node
 */
export const indexNodeTreeContainsDataset = (indexNodeTree: ConceptNode): boolean => {
  const _checkSubtree = (node: ConceptNode): boolean => {
    if (!isConceptNodeWithoutDataset(node)) {
      return true;
    }
    // Check if children subtrees contain datasets
    for (const child of node.components) {
      const containsDataset = _checkSubtree(child.componentNode);
      if (containsDataset) return true;
    }
    // No children contain a dataset node, so return false
    return false;
  };
  return _checkSubtree(indexNodeTree);
};

/**
 * Ensures that the weights of all nodes in a list add up to 100%.
 * - Leaf nodes without datasets don't have a weight property
 * - Doesn't modify nodes with `isWeightUserSpecified === true`
 * @param inputs A list of nodes that are direct children of a given node.
 */
export const rebalanceInputWeights = (inputs: WeightedComponent[]) => {
  const updatedInputsList = _.cloneDeep(inputs);
  // Determine how much of the 100% is taken up by nodes with user-specified weights
  let specifiedWeightTotal = 0;
  updatedInputsList.forEach((input) => {
    if (input.isWeightUserSpecified === true) {
      specifiedWeightTotal += input.weight;
    }
  });
  // Determine the new weight that will be assigned to nodes without user-specified weights.
  const isUnspecifiedWeightedInput = (input: WeightedComponent) =>
    !isEmptyNode(input.componentNode) && !input.isWeightUserSpecified;
  const unspecifiedWeightedInputs = updatedInputsList.filter(isUnspecifiedWeightedInput);
  const newWeight = (100 - specifiedWeightTotal) / unspecifiedWeightedInputs.length;
  // Set `weight = newWeight` for each node without a user-specified weight.
  updatedInputsList.forEach((input) => {
    if (isUnspecifiedWeightedInput(input)) {
      input.weight = newWeight;
    }
  });
  return updatedInputsList;
};

/**
 * Searches through an index node tree and pulls out the datasets.
 * NOTE: this function doesn't guarantee any particular result order.
 * @param node The root node of the tree that this function will explore.
 * @returns A list of dataset nodes.
 */
export const findAllDatasets = (node: ConceptNode): ConceptNodeWithDatasetAttached[] => {
  const datasets: ConceptNodeWithDatasetAttached[] = [];
  const _findAllDatasets = (node: ConceptNode) => {
    if (isConceptNodeWithDatasetAttached(node)) {
      // Found a dataset. Add it to the growing list and return.
      datasets.push(node);
      return;
    }
    // Keep searching through children, or do nothing if there are none.
    node.components
      .map((weightedComponent) => weightedComponent.componentNode)
      .forEach(_findAllDatasets);
  };
  _findAllDatasets(node);
  return datasets;
};

/**
 * Calculates the overall weight of a node in a given tree.
 * Returns 0 if the node is not found in the tree.
 * NOTE: Currently just looks for the first instance of this node.
 *  In the future we may want to modify this to look for a all instances of a given dataset,
 *  or all instances with the same aggregation and resolution options,
 *  to add up all duplicate nodes.
 * @param tree The root of the tree.
 * @param targetNode The node whose overall weight should be calculated.
 * @returns A number in the range [0, 100] that represents `targetNode`'s weight with respect to
 *  `tree`.
 */
export const calculateOverallWeight = (tree: ConceptNode, targetNode: ConceptNode) => {
  if (isEmptyNode(targetNode)) {
    return 0;
  }
  const _search = (currentNode: ConceptNode, overallWeight: number): number => {
    if (currentNode === targetNode) {
      // Found it, return the weight that we've been calculating up until this point.
      return overallWeight;
    }
    if (isConceptNodeWithDatasetAttached(currentNode) || hasChildren(currentNode) === false) {
      // Reached a leaf node without finding the target node.
      return 0;
    }
    // Keep searching through children.
    const results = currentNode.components.map((child) =>
      // Child's overall weight = child's weight * parent's overall weight / 100
      _search(child.componentNode, (overallWeight * child.weight) / 100)
    );
    return _.max(results) ?? 0;
  };
  return _search(tree, 100);
};

/** ====== Operations on a node ====== */

export const rename = (node: ConceptNode, newName: string) => {
  node.name = newName;
};

export const toggleIsInverted = (datasetNode: ConceptNodeWithDatasetAttached) => {
  datasetNode.dataset.isInverted = !datasetNode.dataset.isInverted;
};

/**
 * Adds a node to `parentNode`'s components list, then rebalances `parentNode`'s weights.
 * Note that this function also rebalances weights for `grandparentNode`(if it exists), because
 * adding a child to `parentNode` can convert it from an empty node (no weight) to a valid
 * combination of inputs (should have weight).
 * @param parentNode The node to add the child to
 * @param childNode The node that is being added to parentNode
 * @param grandparentNode The parent of parentNode
 */
export const addChild = (
  parentNode: ConceptNodeWithoutDataset,
  childNode: ConceptNode,
  grandparentNode: ConceptNodeWithoutDataset | null
) => {
  const newWeightedComponent: WeightedComponent = {
    componentNode: childNode,
    isOppositePolarity: false,
    weight: 0,
    isWeightUserSpecified: false,
  };
  parentNode.components.unshift(newWeightedComponent);
  parentNode.components = rebalanceInputWeights(parentNode.components);
  if (grandparentNode !== null) {
    grandparentNode.components = rebalanceInputWeights(grandparentNode.components);
  }
};

export const isEdge = (indexElementId: SelectableIndexElementId): indexElementId is IndexEdgeId => {
  return typeof indexElementId === 'object';
};

export interface IndexTreeActionsBase {
  findNode: (nodeId: string) => FindNodeResult;
  onSuccess: () => void;
}
/**
 * createIndexTreeActions composes and creates more complex action functions used by useIndexTree and useIndexWorkBench using given base functions provided by the base
 * @param base object containing base action functions
 */
export function createIndexTreeActions(base: IndexTreeActionsBase) {
  const { findNode, onSuccess } = base;

  const findAndRenameNode = (nodeId: string, newName: string) => {
    const node = findNode(nodeId)?.found;
    if (node === undefined) return;
    rename(node, newName);
    onSuccess();
  };

  const findAndAddChild = (parentNodeId: string, childNode: ConceptNode) => {
    const parentNode = findNode(parentNodeId);
    if (parentNode === undefined || !isConceptNodeWithoutDataset(parentNode.found)) {
      return;
    }
    addChild(parentNode.found, childNode, parentNode.parent);
  };

  const findAndAddNewChild = (parentNodeId: string) => {
    const newNode = createNewConceptNode();
    findAndAddChild(parentNodeId, newNode);
    onSuccess();
  };

  const attachDatasetToNode = async (
    nodeId: string,
    dataset: DatasetSearchResult,
    nodeNameAfterAttachingDataset: string
  ) => {
    const foundResult = findNode(nodeId);
    if (foundResult === undefined) {
      return;
    }
    const { found: node, parent } = foundResult;
    const dataConfig = await getDefaultDataConfig(dataset.dataId, dataset.outputName);
    const datasetNode: ConceptNodeWithDatasetAttached = {
      // Set starting values for new dataset node
      // Store values from the search result and pre-calculated starting weight
      id: node.id,
      name: nodeNameAfterAttachingDataset,
      dataset: {
        datasetName: dataset.displayName,
        isInverted: false,
        source: dataset.familyName,
        config: dataConfig,
        projectionAlgorithm: ProjectionAlgorithm.Auto,
      },
      isOutputNode: false,
    };
    // HACK: Update the `node` object's properties in place, as a shortcut to removing the old
    //  object from the parent's component list and then adding the new object to the component
    //  list. We should replace this shortcut with the real thing, since we need to include logic
    //  here to manually ensure the result doesn't have properties from both node types.
    Object.assign(node, datasetNode);
    // @ts-ignore
    delete node.components;
    // Parent should never be null unless we found a disconnected node.
    if (parent !== null) {
      // Update unset siblings with their new auto-balanced weight
      parent.components = rebalanceInputWeights(parent.components);
    }
    onSuccess();
  };

  const toggleDatasetIsInverted = (nodeId: string) => {
    const dataset = findNode(nodeId)?.found;
    if (dataset === undefined || !isConceptNodeWithDatasetAttached(dataset)) {
      return;
    }
    toggleIsInverted(dataset);
    onSuccess();
  };

  return {
    findAndRenameNode,
    findAndAddNewChild,
    findAndAddChild,
    attachDatasetToNode,
    toggleDatasetIsInverted,
  };
}

export const getNodeDataSourceText = (node: ConceptNode) => {
  if (!isConceptNodeWithoutDataset(node)) {
    return node.dataset.datasetName;
  }
  const componentCount = node.components.length;
  switch (componentCount) {
    case 0:
      return node.name ? 'No dataset or inputs.' : '';
    case 1:
      return '1 input.';
    default:
      return `Weighted sum of ${componentCount} inputs.`;
  }
};
