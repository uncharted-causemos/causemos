import { v4 as uuidv4 } from 'uuid';
import { IndexNodeType } from '@/types/Enums';
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

type findNodeReturn = { parent: ParentNode | null; found: IndexNode } | undefined;

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

export const convertPlaceholderToDataset = (
  placeholder: Placeholder,
  dataset: DatasetSearchResult,
  initialWeight: number
) => {
  const node: Dataset = {
    id: uuidv4(),
    type: IndexNodeType.Dataset,
    name: placeholder.name === '' ? dataset.displayName : placeholder.name,
    datasetId: dataset.dataId,
    datasetMetadataDocId: dataset.datasetMetadataDocId,
    datasetName: dataset.displayName,
    isInverted: false,
    isWeightUserSpecified: false,
    source: dataset.familyName,
    weight: initialWeight,
    selectedTimestamp: dataset.period.lte, // select the last timestamp we have data for
  };
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
export const findNode = (indexNodeTree: IndexNode, nodeId: string): findNodeReturn => {
  const _findNode = (node: IndexNode, parentNode: ParentNode | null): findNodeReturn => {
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

export const rebalanceInputWeights = (inputs: (Dataset | Index | Placeholder)[]) => {
  const updatedInputsList = _.cloneDeep(inputs);
  let specifiedWeightTotal = 0;
  updatedInputsList.forEach((input) => {
    if (!isPlaceholderNode(input) && input.isWeightUserSpecified === true) {
      specifiedWeightTotal += input.weight;
    }
  });
  const isUnspecifiedWeightedInput = (input: Dataset | Index | Placeholder) =>
    !isPlaceholderNode(input) && !input.isWeightUserSpecified;
  const unspecifiedWeightedInputs = updatedInputsList.filter(isUnspecifiedWeightedInput);
  const newWeight = (100 - specifiedWeightTotal) / unspecifiedWeightedInputs.length;
  updatedInputsList.forEach((input) => {
    if (isUnspecifiedWeightedInput(input)) {
      (input as Dataset | Index).weight = newWeight;
    }
  });
  return updatedInputsList;
};
