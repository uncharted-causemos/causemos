import { IndexNodeType } from '@/types/Enums';
import { IndexNode, Dataset, ParentNode, Index } from '@/types/Index';
import { v4 as uuidv4 } from 'uuid';

type findNodeReturn = { parent: IndexNode | null; found: IndexNode } | undefined;

export const isDatasetNode = (indexNode: IndexNode): indexNode is Dataset => {
  return indexNode.type === IndexNodeType.Dataset;
};

export const isParentNode = (indexNode: IndexNode): indexNode is ParentNode => {
  return (indexNode as ParentNode).inputs !== undefined;
};

export const createNewIndex = (): Index => {
  return {
    id: uuidv4(),
    type: IndexNodeType.Index,
    name: '',
    weight: 0,
    isWeightUserSpecified: false,
    inputs: [],
  } as Index;
};

export const createNewNode = (type: IndexNodeType) => {
  switch (type) {
    case IndexNodeType.Dataset:
      // Not yet implemented
      break;
    case IndexNodeType.Index:
      return createNewIndex();
    default:
      break;
  }
};

// Traverse the provided index node tree, find the parent node with the given parentId and add new node as a first child of the parent
export const addFirst = (
  indexNodeTree: IndexNode /* parentId: string, node: IndexNode */
): IndexNode => {
  // Not Yet Implemented
  return { ...indexNodeTree };
};

export const duplicate = (indexNodeTree: IndexNode): indexNode => {
  const newTree = JSON.parse(JSON.stringify(indexNodeTree));
  // Update ids
  const _assignId = (node: IndexNode) => {
    node.id = uuidv4();
    if (!isParentNode(node)) return;
    node.inputs.forEach(_assignId);
  };
  _assignId(newTree);
  return newTree;
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
  const _findNode = (node: IndexNode, parentNode: IndexNode | null): findNodeReturn => {
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
