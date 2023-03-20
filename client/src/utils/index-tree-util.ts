import { v4 as uuidv4 } from 'uuid';
import { AggregationOption, IndexNodeType, TemporalResolutionOption } from '@/types/Enums';
import {
  IndexNode,
  Dataset,
  ParentNode,
  Index,
  OutputIndex,
  Placeholder,
  DatasetSearchResult,
} from '@/types/Index';
import _ from 'lodash';
import { DataConfig } from '@/types/Datacube';
import { getDefaultDataConfig } from '@/services/new-datacube-service';

export type FindNodeResult = { parent: ParentNode | null; found: IndexNode } | undefined;

export const isDatasetNode = (indexNode: IndexNode): indexNode is Dataset => {
  return indexNode.type === IndexNodeType.Dataset;
};

export const isOutputIndexNode = (indexNode: IndexNode): indexNode is OutputIndex => {
  return indexNode.type === IndexNodeType.OutputIndex;
};

export const isParentNode = (indexNode: IndexNode): indexNode is ParentNode => {
  return (indexNode as ParentNode).inputs !== undefined;
};

export const isPlaceholderNode = (indexNode: IndexNode): indexNode is Placeholder => {
  return indexNode.type === IndexNodeType.Placeholder;
};

export const hasChildren = (indexNode: IndexNode) => {
  return isParentNode(indexNode) && indexNode.inputs.length > 0;
};

export const getIndexNodeTypeIcon = (type: IndexNodeType): string => {
  switch (type) {
    case IndexNodeType.OutputIndex:
    case IndexNodeType.Index:
      return 'fa-sitemap fa-rotate-90';
    default:
      return 'fa-th';
  }
};

export const getIndexNodeTypeColor = (type: IndexNodeType): string => {
  switch (type) {
    case IndexNodeType.OutputIndex:
      return '#7570b3';
    case IndexNodeType.Index:
      return '#e7298a';
    case IndexNodeType.Placeholder:
      return '#66a61e';
    default:
      return '#1b9e77';
  }
};

export const createNewIndex = (): Index => {
  const node: Index = {
    id: uuidv4(),
    type: IndexNodeType.Index,
    name: '',
    weight: 0,
    isWeightUserSpecified: false,
    inputs: [],
  };
  return node;
};

export const createNewOutputIndex = () => {
  const node: OutputIndex = {
    id: uuidv4(),
    type: IndexNodeType.OutputIndex,
    name: 'Overall priority',
    inputs: [],
  };
  return node;
};

export const createNewPlaceholderDataset = () => {
  const node: Placeholder = {
    id: uuidv4(),
    type: IndexNodeType.Placeholder,
    name: '',
  };
  return node;
};

export const createNewDatasetNode = (spec?: Partial<Dataset>) => {
  const node: Dataset = {
    id: uuidv4(),
    type: IndexNodeType.Dataset,
    name: '',
    datasetId: '',
    datasetMetadataDocId: '',
    datasetName: '',
    isInverted: false,
    isWeightUserSpecified: false,
    outputVariable: '',
    runId: 'indicators',
    selectedTimestamp: 0,
    source: '',
    weight: 0,
    temporalResolution: TemporalResolutionOption.Month,
    temporalAggregation: AggregationOption.Mean,
    spatialAggregation: AggregationOption.Mean,
    ...spec,
  };
  return node;
};

export const convertPlaceholderToDataset = (
  placeholder: Placeholder,
  dataset: DatasetSearchResult,
  initialWeight: number,
  config: DataConfig
) => {
  const node = createNewDatasetNode({
    id: placeholder.id,
    name: placeholder.name === '' ? dataset.displayName : placeholder.name,
    datasetName: dataset.displayName,
    source: dataset.familyName,
    weight: initialWeight,
    ...config,
  });
  return node;
};

// Traverse the provided index node tree, find the parent node with the given parentId and add new node as a first child of the parent
export const addFirst = (
  indexNodeTree: IndexNode /* parentId: string, node: IndexNode */
): IndexNode => {
  // Not Yet Implemented
  return { ...indexNodeTree };
};

/**
 * Duplicate the node and returns newly duplicated node.
 * The new node and its children are assigned with newly generated id.
 * @param indexNode An index node
 */
export const duplicateNode = (indexNode: IndexNode): IndexNode => {
  const duplicated = JSON.parse(JSON.stringify(indexNode));
  // Update ids
  const _assignId = (node: IndexNode) => {
    node.id = uuidv4();
    if (!isParentNode(node)) return;
    node.inputs.forEach(_assignId);
  };
  _assignId(duplicated);
  return duplicated;
};

/**
 * Removes the node with given nodeId from provided index node tree children
 * Returns boolean indicating if the node was found and removed successfully.
 * @param indexNodeTree An index node
 */
export const findAndRemoveChild = (indexNodeTree: IndexNode, nodeId: string): boolean => {
  const result = findNode(indexNodeTree, nodeId);
  if (result?.parent && isParentNode(result.parent)) {
    const beforeLength = result.parent.inputs.length;
    result.parent.inputs = result.parent.inputs.filter((node) => node.id !== nodeId);
    result.parent.inputs = rebalanceInputWeights(result.parent.inputs);
    return result.parent.inputs.length === beforeLength - 1;
  }
  return false;
};

/**
 * Finds a node from given index node tree and returns found node and its parent.
 * Returns undefined if no node with given node id is found in the tree.
 * @param indexNodeTree An index node
 * @param nodeId An index node id
 */
export const findNode = (indexNodeTree: IndexNode, nodeId: string): FindNodeResult => {
  const _findNode = (node: IndexNode, parentNode: ParentNode | null): FindNodeResult => {
    if (node.id === nodeId) {
      return { parent: parentNode, found: node };
    }
    // If this node is a leaf node at this point, not found
    if (!isParentNode(node)) return;

    for (const child of node.inputs) {
      const found = _findNode(child, node);
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
export const findAndUpdateNode = (indexNodeTree: IndexNode, updated: IndexNode): boolean => {
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
export const indexNodeTreeContainsDataset = (indexNodeTree: IndexNode): boolean => {
  const _checkSubtree = (node: IndexNode): boolean => {
    if (isDatasetNode(node)) {
      return true;
    }
    // If this node is a leaf node that's not a dataset, return false
    if (!isParentNode(node)) return false;
    // Check if children subtrees contain datasets
    for (const child of node.inputs) {
      const containsDataset = _checkSubtree(child);
      if (containsDataset) return true;
    }
    // No children contain a dataset node, so return false
    return false;
  };
  return _checkSubtree(indexNodeTree);
};

/**
 * Ensures that the weights of all nodes in a list add up to 100%.
 * - Placeholder nodes don't have a weight property
 * - Doesn't modify nodes with `isWeightUserSpecified === true`
 * @param inputs A list of nodes that are direct children of a given Index or Output Index node.
 */
export const rebalanceInputWeights = (inputs: (Dataset | Index | Placeholder)[]) => {
  const updatedInputsList = _.cloneDeep(inputs);
  // Determine how much of the 100% is taken up by nodes with user-specified weights
  let specifiedWeightTotal = 0;
  updatedInputsList.forEach((input) => {
    if (!isPlaceholderNode(input) && input.isWeightUserSpecified === true) {
      specifiedWeightTotal += input.weight;
    }
  });
  // Determine the new weight that will be assigned to nodes without user-specified weights.
  const isUnspecifiedWeightedInput = (input: Dataset | Index | Placeholder) =>
    !isPlaceholderNode(input) && !input.isWeightUserSpecified;
  const unspecifiedWeightedInputs = updatedInputsList.filter(isUnspecifiedWeightedInput);
  const newWeight = (100 - specifiedWeightTotal) / unspecifiedWeightedInputs.length;
  // Set `weight = newWeight` for each node without a user-specified weight.
  updatedInputsList.forEach((input) => {
    if (isUnspecifiedWeightedInput(input)) {
      (input as Dataset | Index).weight = newWeight;
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
export const findAllDatasets = (node: IndexNode): Dataset[] => {
  const datasets: Dataset[] = [];
  const _findAllDatasets = (node: IndexNode) => {
    if (isDatasetNode(node)) {
      // Found a dataset. Add it to the growing list and return.
      datasets.push(node);
      return;
    }
    if (!isParentNode(node) || node.inputs.length === 0) {
      // Reached a leaf node.
      return;
    }
    // Keep searching through children.
    node.inputs.forEach(_findAllDatasets);
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
export const calculateOverallWeight = (tree: IndexNode, targetNode: IndexNode) => {
  if (isPlaceholderNode(targetNode)) {
    return 0;
  }
  const _search = (currentNode: IndexNode, overallWeight: number): number => {
    if (currentNode === targetNode) {
      // Found it, return the weight that we've been calculating up until this point.
      return overallWeight;
    }
    if (!isParentNode(currentNode) || currentNode.inputs.length === 0) {
      // Reached a leaf node without finding the target node.
      return 0;
    }
    // Keep searching through children.
    const results = currentNode.inputs.map((child) =>
      // Child's overall weight = child's weight * parent's overall weight / 100
      isPlaceholderNode(child) ? 0 : _search(child, (overallWeight * child.weight) / 100)
    );
    return _.max(results) ?? 0;
  };
  return _search(tree, 100);
};

/** ====== Operations on a node ====== */

export const rename = (node: IndexNode, newName: string) => {
  node.name = newName;
};

export const toggleIsInverted = (datasetNode: Dataset) => {
  datasetNode.isInverted = !datasetNode.isInverted;
};

export const addChild = (parentNode: ParentNode, child: Index | Dataset | Placeholder) => {
  parentNode.inputs.unshift(child);
  parentNode.inputs = rebalanceInputWeights(parentNode.inputs);
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

  const findAndAddChild = (
    parentNodeId: string,
    childType: IndexNodeType.Index | IndexNodeType.Dataset
  ) => {
    const parentNode = findNode(parentNodeId)?.found;
    if (parentNode === undefined || !isParentNode(parentNode)) {
      return;
    }
    const newNode =
      childType === IndexNodeType.Dataset ? createNewPlaceholderDataset() : createNewIndex();
    addChild(parentNode, newNode);
    onSuccess();
  };

  const attachDatasetToPlaceholder = async (nodeId: string, dataset: DatasetSearchResult) => {
    const foundResult = findNode(nodeId);
    if (foundResult === undefined || !isPlaceholderNode(foundResult.found)) {
      return;
    }
    const { found: placeholderNode, parent } = foundResult;
    const dataConfig = await getDefaultDataConfig(dataset.dataId, dataset.outputName);
    const datasetNode = convertPlaceholderToDataset(placeholderNode, dataset, 0, dataConfig);
    Object.assign(placeholderNode, datasetNode);
    // Parent should never be null unless we found a disconnected placeholder node.
    if (parent !== null) {
      // Update unset siblings with their new auto-balanced weight
      parent.inputs = rebalanceInputWeights(parent.inputs);
    }
    onSuccess();
  };

  const toggleDatasetIsInverted = (nodeId: string) => {
    const dataset = findNode(nodeId)?.found;
    if (dataset === undefined || !isDatasetNode(dataset)) {
      return;
    }
    toggleIsInverted(dataset);
    onSuccess();
  };

  return {
    findAndRenameNode,
    findAndAddChild,
    attachDatasetToPlaceholder,
    toggleDatasetIsInverted,
  };
}
