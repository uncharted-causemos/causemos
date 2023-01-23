import { IndexNodeType } from '@/types/Enums';
import { IndexNode, Dataset, ParentNode, Index } from '@/types/Index';
import { v4 as uuidv4 } from 'uuid';

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

// Remove the node with given nodeId from provided index node tree
export const removeNode = (indexNodeTree: IndexNode /* nodeId: string */): IndexNode => {
  // Not Yet Implemented
  return { ...indexNodeTree };
};

// Find and updated the node with provide nodeId in the index node tree.
export const updateNode = (indexNodeTree: IndexNode /* nodeId: string */): IndexNode => {
  // Not Yet Implemented
  return { ...indexNodeTree };
};
